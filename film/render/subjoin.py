# usage: subjoin.py SUB.events.jsonl K REF...   a --sub K render against the 6 fps battle: its last drawn frame of each
# simulated frame (t + (K-1)/(6K)) must hold the same battle as the 6 fps log at t, and its events over the K frames the same events.
# NOCAM=1: for a render whose camera differs from REF's: skip `near` (soldiers near the camera) and soldier ids (numbered in
# the order the log first meets them), and compare the hero, the strikes and every event's kind, place and team
import sys, json, gzip, os
NOCAM = os.environ.get('NOCAM') == '1'
def rows(p): return [json.loads(l) for l in (gzip.open(p, 'rt') if p.endswith('.gz') else open(p)) if l.strip()]
K = int(sys.argv[2]); sub = rows(sys.argv[1]); ref = {}
for p in sys.argv[3:]: ref.update({round(r['t'], 3): r for r in rows(p)})
ev = lambda es: sorted(json.dumps([e['k'], e.get('p'), e.get('team'), None if NOCAM else e.get('id')]) for e in es)
n = bad = 0; first = []
for i in range(0, len(sub) - K + 1, K):
    g = sub[i:i + K]; t = round(g[0]['t'], 3); r = ref.get(t)
    if not r: continue
    n += 1; a, b = g[-1], r
    same = [a['pl'], a['alive'], None if NOCAM else a['near'], a['strikes']] == [b['pl'], b['alive'], None if NOCAM else b['near'], b['strikes']] and ev(sum((x['ev'] for x in g), [])) == ev(b['ev'])
    if not same: bad += 1; first.append(t)
print(f"simulated frames compared {n}  mismatches {bad}  first {first[:3]}")
