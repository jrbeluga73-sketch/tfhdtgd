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
browser busy at the same time, it can branch (first seen at 4:03.5). Even alone a run can branch: a segment drawn
from 3:58 branched at 4:03.5 twice, and one 9:04 segment branched at 4:06 during its lead-in. The cause is not yet
found, so check every join. So render one browser at a time, and compare each
segment's `.skip.jsonl` with the earlier segments' `.events.jsonl` before splicing them. `mix.py` takes the cut as
`CUT=cut.json`, and each piece's sounds come from its own log. Captured logs are kept in `sound/captured/`.

**Why runs branched (found).** The game's sound code draws from the battle's random stream: `noiseHit` calls
`Math.random()` only when `voice()` admits the sound, and `voice()` counts sounds that the audio thread releases in real
time (`onended`). Under load, a sound was dropped at a different moment, which shifted every later draw. Two runs
identical to 4:03.0 differed by one call there (`noiseHit < sfxBoom < explode`). `director.js` now sets
`voice = () => true` for the film. Two concurrent runs are then identical over 0:00–7:00, and the battle matches the
old one up to 4:02, so footage before 3:58 is kept. Captures made with this fix are in `sound/captured/fixed/`.

**v14 coverage.** Every segment from 0:00 to 10:00 was rendered with the fix, one browser at a time, and its sound comes
from the events captured in that render. Each lead-in from 6:02 on matches the fixed battle on every frame before it
(up to 3,264 frames for the 9:04 segment), so 0:00–1:20 and 1:38–10:00 are one battle. 1:20–1:38 is rendered at 24 fps; a 1/24 s
timestep gives a close but different battle (the hero is 0.45–0.76 m from his 6 fps position, with the same soldiers
near him), so the 1:20 and 1:38 cuts join two very close battles. Known framing bug: when the follow camera takes its
high fallback (1:33–1:38), it keeps aiming ahead and the hero drops to the bottom edge of the frame.

**v15.** The game steps its battle in pieces of at most 50 ms per drawn frame, so a 6 fps frame is 50+50+50+17 ms of
steps and a 24 fps frame is one 42 ms step, and the two give different battles. `render.js --fps 6 --sub 4` runs the
game's 6 fps frame unchanged and draws after each of its steps: 24 drawn frames a second of exactly the 6 fps battle,
spaced 50/50/50/17 ms of battle time (the director keeps its clock on the simulated frame; the camera and titles run on the
drawn time, `FILM.tc`). A frame slowed by a kill or hit has fewer steps, and its last drawing is held. A first version
advanced the clock in four 50/50/50/17 ms pieces instead; the game's kill slow-down scales a whole frame, so that one
drifted from 1:35.8 on.
`render/subjoin.py` checks such a render against the 6 fps logs. The high fallbacks of the follow and over-the-shoulder
shots now aim just ahead of him instead of 10–30 m ahead. `render.js --dry --diag d.jsonl` logs where he sits on screen
in every frame and `render/framing.py d.jsonl` lists the runs where a close shot loses him: with the old aim, 1:32.8–1:37.8
and 4:25.5–4:37.8 (feet below the frame); with the new aim, none. 1:20–1:38, 4:22–4:38 and 7:38–7:54 are re-rendered
this way (`sound/captured/fixed/cut15.json`, logs `*.sub24.*`); each matches the 6 fps battle on every simulated frame
(`subjoin.py`) and in its lead-in (`join.py`), so all of 0:00–10:00 is one battle. `render/onscreen.py OUT.events.jsonl FOV`
measures where he sat in the frames actually drawn. The rest of the film is still 6 fps frames shown four times.

**v16.** 8:16–8:32 (the second foe shot) is re-rendered with `--sub 4` (`cut16.json`, logs `s496-512.sub24.*`), so 24
drawn frames a second now cover 1:20–1:38, 4:22–4:38, 7:38–7:54 and 8:16–8:32 (66 s). The hero in the shed's shadow
(3:07–3:13) is lifted a little with a local exposure grade in `assemble.py` (`GRADE=186.5,193.5,1.45`: gamma up to 1.45, ramped
over 1 s at each end); the footage and battle are unchanged, but he is still dark against the wall. At 8:20 the 8:16 foe shot has no enemy in view and shows its over-the-shoulder framing. Not fixed: at 7:51 the 7:38 foe shot cuts to a second enemy
about 186 m away who does not read on screen, so it ends on the farmhouse; outside the foe shots enemies are still a few
pixels tall.
