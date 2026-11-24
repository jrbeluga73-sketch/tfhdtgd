# usage: foescreen.py OUT.events.jsonl FOV A B [ASPECT]   the enemy soldiers in the frames actually drawn between film times A and B
# (camera logged at render time; enemies within 35 m of the camera, from `near`): per second, the nearest one's distance and
# where he sits on screen as NDC (±1 = frame edge): his head (1.2 m, kneeling) and feet, and his height as a share of the frame
import sys, json, math
fov, a, b = map(float, sys.argv[2:5]); asp = float(sys.argv[5]) if len(sys.argv) > 5 else 1024 / 430; k = 1 / math.tan(fov / 2); sec = {}
def pr(c, q, _fov):  # as onscreen.py
    f = [c['a'][i] - c['p'][i] for i in range(3)]; n = math.hypot(*f); f = [v / n for v in f]
    r = [f[2], 0, -f[0]]; n = math.hypot(*r); r = [v / n for v in r]
    u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]
    d = [q[i] - c['p'][i] for i in range(3)]; z = sum(d[i] * f[i] for i in range(3))
    return (9, 9) if z <= 0.05 else (sum(d[i] * r[i] for i in range(3)) / z * k / asp, sum(d[i] * u[i] for i in range(3)) / z * k)
for row in map(json.loads, open(sys.argv[1])):
    if not a <= row['t'] < b or not row['cam']: continue
    c = row['cam']; best = None
    for _id, x, y, z, team in row['near']:
        if team != 1: continue
        d = math.dist(c['p'], [x, y, z]); h, f = pr(c, [x, y + 1.2, z], fov), pr(c, [x, y, z], fov)
        if h[0] != 9 and abs(h[0]) < 1 and -1 < h[1] < 1 and (best is None or d < best[0]): best = (d, h, f)
    s = sec.setdefault(int(row['t']), [0, 0, []]); s[0] += 1
    if best: s[1] += 1; s[2].append(best)
for t, (n, k, L) in sorted(sec.items()):
    if not L: print(f"{t // 60}:{t % 60:02d} frames {n:2d}  no enemy on screen"); continue
    d, h, f = min(L); print(f"{t // 60}:{t % 60:02d} frames {n:2d}  enemy on screen in {k:2d}  nearest {d:4.1f} m  head {h[0]:+.2f},{h[1]:+.2f}  feet y {f[1]:+.2f}  height {(h[1] - f[1]) / 2:.0%} of frame")
