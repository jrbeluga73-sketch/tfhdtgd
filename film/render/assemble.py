# usage: assemble.py cut.json out_video.mp4  -- trims each piece [start,end,video,video_start,log,fps] and concatenates (re-encode, 24 fps)
import json, sys, subprocess, os
cut = json.load(open(sys.argv[1])); args = []; fl = []
for i, (a, b, v, v0, _f, _fps) in enumerate(cut):
    args += ['-i', v]; fl.append(f"[{i}:v]trim=start={a - v0}:end={b - v0},setpts=PTS-STARTPTS,fps=24,format=yuv420p[v{i}]")
fl.append(''.join(f'[v{i}]' for i in range(len(cut))) + f'concat=n={len(cut)}:v=1:a=0[out]')
subprocess.run(['ffmpeg', '-y', '-v', 'error', *args, '-filter_complex', ';'.join(fl), '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', os.environ.get('CRF', '22'), '-pix_fmt', 'yuv420p', sys.argv[2]], check=True)
