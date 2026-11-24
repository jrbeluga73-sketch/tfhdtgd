# usage: framing.py diag.jsonl   where he sits on screen in each close shot (from render.js --dry --diag): runs of frames
# with his feet below the frame bottom or his head above the top, or him off the side/behind the camera (NDC, ±1 = frame edge)
import sys, json, re
src = open(__file__.replace('render/framing.py', 'director.js')).read()
kinds = re.findall(r'\[([\d.]+), "(\w+)"', src[src.index('const SHOTS'):src.index('const TITLES')])
CLOSE = {'follow', 'side', 'low', 'close', 'ots', 'crane'}
runs, cur = [], None
for r in map(json.loads, open(sys.argv[1])):
    k = kinds[r['i']][1]; hx, hy = r['head']; fx, fy = r['feet']
    why = None if k not in CLOSE else 'behind' if hx == 9 or fx == 9 else 'feet<bottom' if fy < -1 and k != 'close' else 'head>top' if hy > 1 else 'head<bottom' if hy < -0.9 else 'side' if max(abs(hx), abs(fx)) > 1 else None
    low = k in CLOSE and k != 'close' and why is None and (hy + fy) / 2 < -0.8  # inside the frame but crowding the bottom edge
    tag = why or ('low<-0.8' if low else None)
    if tag and cur and cur[3] == tag and cur[2] == k and r['t'] - cur[1] < 0.2: cur[1] = r['t']; cur[4] = min(cur[4], fy); cur[5] += 1; cur[6].add(r['j'])
    elif tag: cur = [r['t'], r['t'], k, tag, fy, 1, {r['j']}]; runs.append(cur)
for a, b, k, tag, fy, n, js in runs:
    if n >= 3: print(f"{int(a)//60}:{a%60:05.2f}-{int(b)//60}:{b%60:05.2f} {k:7s} framing {sorted(js)} {tag:12s} frames {n:3d} min feet y {fy:.2f}")
