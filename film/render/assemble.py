# usage: [CRF=23] [GRADE=a,b,g] assemble.py cut.json out_video.mp4  -- trims each piece [start,end,video,video_start,log,fps] and concatenates (re-encode, 24 fps)
import json, sys, subprocess, os
cut = json.load(open(sys.argv[1])); args = []; fl = []
for i, (a, b, v, v0, _f, _fps) in enumerate(cut):
    args += ['-i', v]; fl.append(f"[{i}:v]trim=start={a - v0}:end={b - v0},setpts=PTS-STARTPTS,fps=24,format=yuv420p[v{i}]")
# GRADE="a,b,g;...": a local exposure lift (gamma up to g, ramped over 1 s at each end) between film times a and b
gr = [tuple(map(float, x.split(','))) for x in os.environ.get('GRADE', '').split(';') if x]
post = ''.join(f",eq=gamma='1+{g - 1}*clip(min(t-{a},{b}-t),0,1)':eval=frame" for a, b, g in gr)
fl.append(''.join(f'[v{i}]' for i in range(len(cut))) + f'concat=n={len(cut)}:v=1:a=0{post}[out]')
subprocess.run(['ffmpeg', '-y', '-v', 'error', *args, '-filter_complex', ';'.join(fl), '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', os.environ.get('CRF', '22'), '-pix_fmt', 'yuv420p', sys.argv[2]], check=True)
