#!/bin/bash
# Re-renders the film after a battle change in checkpointed segments that start and end on shot cuts.
# usage: [SUB=4] render/queue.sh OUTDIR FPS "A B" "B C" ...   (SUB: render.js --sub) A finished segment (OUTDIR/sA.done) is skipped on a re-run.
cd "$(dirname "$0")"; out=$1 fps=$2; shift 2; mkdir -p "$out"
for seg in "$@"; do set -- $seg; [ -f "$out/s$1.done" ] && continue
  node render.js "$out/s$1.mp4" --w 1024 --h 430 --fps "$fps" ${SUB:+--sub $SUB} --from "$1" --len "$2" > "$out/s$1.log" 2>&1 && touch "$out/s$1.done"
done
