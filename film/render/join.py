# usage: join.py NEW.skip.jsonl[.gz] REF1 [REF2...]  compare battle state per t (hero pos, alive, nearby soldiers, events)
import sys, json, gzip
def rd(p):
    f = gzip.open(p, 'rt') if p.endswith('.gz') else open(p)
    return {round(r['t'], 3): r for r in map(json.loads, f) if r}
def key(r):
    return json.dumps([r.get('pl'), r.get('alive'), r.get('near'), [(e['k'], e.get('p'), e.get('team'), e.get('id')) for e in r.get('ev', [])], r.get('strikes')])
new = rd(sys.argv[1]); ref = {}
for p in sys.argv[2:]: ref.update(rd(p))
common = sorted(set(new) & set(ref)); bad = [t for t in common if key(new[t]) != key(ref[t])]
print(f"common {len(common)} frames t={common[0] if common else None}..{common[-1] if common else None}  mismatches {len(bad)}  first {bad[:3]}")
