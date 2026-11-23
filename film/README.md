# Harrow Brook: a Steel Front film

A 10-minute cinematic rendered in the Steel Front engine (`steelfront.html`, pass 46). One radio operator leads his
squad from the southern woods, through an orchard hamlet and up Observation Hill. From the hill he calls a barrage on
the church village, crosses the ford, and fights through the village and up the lane to take the enemy's gun farm on
the north ridge.

- `steelfront.html`: the game, plus a new map, **Harrow Brook** (`MAPS.brook`). It is an autumn brook valley at first
  light, with a hamlet, a hill, a church and windmill village at the ford, and the enemy-held north ridge. It is
  playable in the sandbox map picker.
- `director.js`: the film. It spawns the units, drives the soldier, and runs the shot list, titles and fades. The film
  camera replaces the game camera only while a frame is drawn.
- `render/`: a headless renderer. `vclock.js` runs a virtual clock and a seeded `Math.random`, so every frame is
  complete and the run is repeatable. `render.js` sends the frames to ffmpeg.

```
cd render && npm i && node render.js harrow-brook.mp4                      # default: fast settings (low gfx, 640x268, 6 fps)
node render.js x.mp4 --dry                                                 # simulate only (~40 s) and log the soldier's progress
node render.js hb.mp4 --w 1024 --h 430 --fps 24                            # the shared cut: every frame rendered (~0.5 s/frame on one CPU)
node render.js hq.mp4 --gfx medium --w 1600 --h 670 --fps 24 --out-w 1920  # full quality: needs a GPU or many hours
```

If you change the route or pauses in `director.js`, re-time `SHOTS` and `TITLES` against a `--dry` log.

On a slow machine, render in segments that start and end on shot cuts (`--from 346 --len 410`, etc.) and join them
with ffmpeg. Each segment re-simulates from the start without drawing, and a stall only costs that segment.

`--interp` (motion-interpolating a low-fps capture up to 24 fps) is cheaper but breaks up small running soldiers: the
made-up frames between real ones show them faint, doubled or missing legs. The shared cut does not use it.

Close shots fall back to another framing when a building, wall, tree or bush is between the camera and the soldier
(`steelfront.html` records bush positions in `BUSHES` for this). Props that are not in those lists, such as the plank
stack by the ford road, are not checked.

## Sound

`render.js` captures pictures only, so the soundtrack is built separately in `sound/` and muxed onto the finished cut.
Every effect is synthesised in `mix.py`; no recordings are used:

1. `node sound/events.js ev6.jsonl --fps 6` (and `ev24.jsonl --fps 24`) re-runs the simulation without drawing. It logs
   every rifle and MG shot, the hero's shots and footsteps, tank guns, explosions, artillery shells and bullet whizzes
   with their time and position, plus the film camera (`FILM.camAt`) and nearby soldiers for each frame. Use the log
   whose frame rate matches the footage: the 6 and 24 fps simulations play out differently.
2. `python sound/tts.py` speaks the radio lines in `sound/lines.py` with Piper (voice `en_US-libritts_r-medium`,
   trained on LibriTTS-R, CC BY 4.0).
3. `WORK=dir MASTER=5.5 python sound/mix.py` places each sound by its distance and direction from the camera. It adds the
   valley echo, squad footsteps, wind and distant gunfire, then mixes in the radio and limits peaks to -3.5 dBFS.
   `NATIVE` lists the ranges that use the 24 fps log.
4. `python sound/asr.py mix.wav` checks that the radio stays intelligible: speech recognition gives word recall per line.

Then mux with `ffmpeg -i film.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k film-sound.mp4`.
The distant gunfire and far artillery under the mix are ambience, not tied to anything on screen.

The `"foe"` shots (6:50, 7:38, 8:16) use a long lens past his shoulder on the nearest enemy he can see, with no wall, tree or bush in the way, so the enemy shows on screen.
Elsewhere the enemy is usually 80–260 m away and only a few pixels tall. When no enemy is in view, the shot falls back
to over-the-shoulder.

He only engages an enemy he has a line of sight to (`near` in `director.js`). Before this he could fire at enemies
hidden behind cover or terrain, from 1:52 on. The battle now diverges from v7 at 1:52.67, so everything after 1:48
must be re-rendered. `render/queue.sh OUTDIR FPS "108 170" "170 238" ...` renders checkpointed segments on shot cuts
and skips any that are already done. When a wall runs right beside a follow camera (the 3:06 shed), the camera steps
out 3.5 m to the open side.

### Sound that matches its footage

`render.js` captures the sound events (and the camera it drew) during the render itself, in `OUT.events.jsonl`. It also
writes the battle it simulated without drawing before `--from` to `OUT.skip.jsonl`. With one browser running, the battle
replays exactly: a segment's lead-in matches the earlier segments' captured footage frame for frame. With a second
browser busy at the same time, it can branch (first seen at 4:03.5). So render one browser at a time, and compare each
segment's `.skip.jsonl` with the earlier segments' `.events.jsonl` before splicing them. `mix.py` takes the cut as
`CUT=cut.json`, and each piece's sounds come from its own log. Captured logs are kept in `sound/captured/`.
