# usage: onscreen.py OUT.events.jsonl FOV [ASPECT]   where he sat on screen in the frames actually drawn (camera logged at
# render time), as NDC (±1 = frame edge): head (1.7 m above his feet) and feet, min/max per second
import sys, json, math
fov = float(sys.argv[2]); asp = float(sys.argv[3]) if len(sys.argv) > 3 else 1024 / 430; k = 1 / math.tan(fov / 2)
def pr(c, q):
    f = [c['a'][i] - c['p'][i] for i in range(3)]; n = math.hypot(*f); f = [v / n for v in f]
    r = [f[2], 0, -f[0]]; n = math.hypot(*r); r = [v / n for v in r]
    u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]
    d = [q[i] - c['p'][i] for i in range(3)]; z = sum(d[i] * f[i] for i in range(3))
    return (9, 9) if z <= 0.05 else (sum(d[i] * r[i] for i in range(3)) / z * k / asp, sum(d[i] * u[i] for i in range(3)) / z * k)
sec = {}
for row in map(json.loads, open(sys.argv[1])):
    c, p = row['cam'], row['pl']
    if not c: continue
    h, f = pr(c, [p[0], p[1] + 1.7, p[2]]), pr(c, p); s = sec.setdefault(int(row['t']), [9, -9, 9, -9, 0])
    s[0] = min(s[0], f[1]); s[1] = max(s[1], h[1]); s[2] = min(s[2], h[0], f[0]); s[3] = max(s[3], h[0], f[0]); s[4] += 1
for t, (fy, hy, x0, x1, n) in sorted(sec.items()):
    print(f"{t // 60}:{t % 60:02d} frames {n:2d}  feet y min {fy:+.2f}  head y max {hy:+.2f}  x {x0:+.2f}..{x1:+.2f}" + ("  OUT" if fy < -1 or hy > 1 or x0 < -1 or x1 > 1 else ""))
