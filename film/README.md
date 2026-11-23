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
