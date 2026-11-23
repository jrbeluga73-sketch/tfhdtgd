# Harrow Brook: a Steel Front film

A 10-minute cinematic rendered in the Steel Front engine (`steelfront.html`, pass 46). One radio operator leads his
squad from the southern woods, through an orchard hamlet and up Observation Hill. From the hill he calls a barrage on
the church village, then crosses the ford into the village.

- `steelfront.html`: the game, plus a new map, **Harrow Brook** (`MAPS.brook`). It is an autumn brook valley at first
  light, with a hamlet, a hill, a church and windmill village at the ford, and the enemy-held north ridge. It is
  playable in the sandbox map picker.
- `director.js`: the film. It spawns the units, drives the soldier, and runs the shot list, titles and fades. The film
  camera replaces the game camera only while a frame is drawn.
- `render/`: a headless renderer. `vclock.js` runs a virtual clock and a seeded `Math.random`, so every frame is
  complete and the run is repeatable. `render.js` sends the frames to ffmpeg.

```
cd render && npm i && node render.js harrow-brook.mp4                      # default: fast settings (low gfx, 640x268, 6 fps)
node render.js hq.mp4 --gfx medium --w 1600 --h 670 --fps 24 --out-w 1920  # full quality: needs a GPU or many hours
```
