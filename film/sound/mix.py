# Harrow Brook sound mix: every sound is synthesised here (numpy), placed from the simulation's own event log,
# plus TTS radio chatter (Piper, libritts_r voice). Output: 48 kHz stereo WAV for the 600 s film.
# usage: WORK=dir MASTER=5.5 python mix.py   (WORK holds ev6.jsonl, ev24.jsonl and tts/; writes WORK/mix.wav)
import json, math, sys, numpy as np, scipy.signal as ss, scipy.io.wavfile as wf
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); WORK = os.environ.get('WORK', '/tmp/a'); from lines import LINES
SR = 48000; LEN = 600.0; N = int(SR * LEN)
rng = np.random.default_rng(1944)
NATIVE = [(80, 108)]  # ranges of the cut rendered at 24 fps (their sounds come from the 24 fps log)
isnat = lambda t: any(a <= t < b for a, b in NATIVE)

# ---------------------------------------------------------------- helpers
def noise(n): return rng.standard_normal(n).astype(np.float32)
def env_exp(n, tau, att=0.0005):
    t = np.arange(n) / SR; e = np.exp(-t / tau); a = int(att * SR)
    if a > 0: e[:a] *= np.linspace(0, 1, a)
    return e.astype(np.float32)
def bp(x, lo, hi, o=2): return ss.sosfilt(ss.butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x).astype(np.float32)
def lp(x, f, o=2): return ss.sosfilt(ss.butter(o, min(f, SR * 0.45), 'lowpass', fs=SR, output='sos'), x).astype(np.float32)
def hp(x, f, o=2): return ss.sosfilt(ss.butter(o, f, 'highpass', fs=SR, output='sos'), x).astype(np.float32)
def sweep(n, f0, f1, tau=None):
    t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t / (tau or n / SR / 3)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph).astype(np.float32)
def norm(x, pk=1.0): return (x / (np.abs(x).max() + 1e-9) * pk).astype(np.float32)
def secs(s): return int(s * SR)

# ---------------------------------------------------------------- sound design (several variants of each)
def rifle(heavy=1.0):
    n = secs(0.45); x = np.zeros(n, np.float32)
    c = secs(0.0025); x[:c] += hp(noise(c), 2500) * np.linspace(1, 0, c) * 1.6            # supersonic crack
    x += lp(noise(n), 7000) * env_exp(n, 0.018, 0.0003) * 1.0                          # muzzle blast
    x += bp(noise(n), 300, 1600) * env_exp(n, 0.05, 0.001) * 0.6                       # body
    x += sweep(n, 220, 70, 0.03) * env_exp(n, 0.045, 0.001) * 0.7 * heavy              # chest thump
    return norm(x)
def mg():
    n = secs(0.3); x = np.zeros(n, np.float32)
    c = secs(0.002); x[:c] += hp(noise(c), 2500) * np.linspace(1, 0, c) * 1.3
    x += lp(noise(n), 5500) * env_exp(n, 0.012, 0.0003) + bp(noise(n), 250, 1200) * env_exp(n, 0.035, 0.001) * 0.7
    x += sweep(n, 180, 60, 0.02) * env_exp(n, 0.03) * 0.6
    return norm(x)
def cannon():
    n = secs(2.5); x = np.zeros(n, np.float32)
    c = secs(0.004); x[:c] += hp(noise(c), 1800) * np.linspace(1, 0, c) * 1.4
    x += lp(noise(n), 3500) * env_exp(n, 0.07, 0.0005) * 1.2
    x += lp(noise(n), 400) * env_exp(n, 0.35, 0.003) * 1.4
    x += sweep(n, 110, 38, 0.12) * env_exp(n, 0.3, 0.002) * 1.1
    return norm(x)
def boom(k=1.0):
    d = 3.5 + 1.5 * k; n = secs(d); x = np.zeros(n, np.float32)
    x += lp(noise(n), 2800) * env_exp(n, 0.06 * k, 0.001) * 1.3                       # blast front
    x += lp(noise(n), 160, 4) * env_exp(n, 0.5 * k, 0.012) * 3.0                       # rumble
    x += sweep(n, 90, 28, 0.25) * env_exp(n, 0.45 * k, 0.004) * 1.2                    # pressure thump
    for _ in range(int(40 * k)):                                                       # earth and debris falling back
        at = secs(rng.uniform(0.15, 2.2 * k)); m = secs(rng.uniform(0.002, 0.012))
        if at + m < n: x[at:at + m] += bp(noise(m), 1200, 5000) * env_exp(m, m / SR / 3) * rng.uniform(0.02, 0.12) * math.exp(-at / SR / 1.2)
    return norm(x)
def thud():
    n = secs(0.6); x = lp(noise(n), 500) * env_exp(n, 0.09, 0.002) * 1.5 + sweep(n, 120, 45, 0.05) * env_exp(n, 0.1)
    return norm(x)
def whiz():
    n = secs(0.25); x = np.zeros(n, np.float32); c = secs(0.0015)
    x[:c] += hp(noise(c), 3000) * 1.5; x += bp(noise(n), 2500, 7000) * env_exp(n, 0.04, 0.003) * 0.5
    return norm(x)
def rocket():
    n = secs(1.2); x = lp(noise(n), 3000) * env_exp(n, 0.03) + bp(noise(n), 700, 2600) * env_exp(n, 0.45, 0.02) * 0.6
    return norm(x)
def whistle():  # an incoming shell: a falling whistle that swells until it lands
    n = secs(1.3); t = np.arange(n) / SR; f = 1500 - 700 * (t / t[-1]) ** 1.5
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + bp(noise(n), 900, 2200) * 0.5
    return (x * (0.05 + (t / t[-1]) ** 2.2) * np.minimum(1, (n - np.arange(n)) / secs(0.02))).astype(np.float32)
def step(run=0.0, wet=0, gear=False):
    n = secs(0.25); x = np.zeros(n, np.float32)
    if wet:  # a boot in the brook
        x += bp(noise(n), 400, 2600) * env_exp(n, 0.07, 0.004) * 1.2
        for _ in range(8):
            at = secs(rng.uniform(0.01, 0.15)); m = secs(rng.uniform(0.006, 0.02))
            if at + m < n: x[at:at + m] += sweep(m, rng.uniform(400, 900), rng.uniform(1200, 2200), m / SR) * env_exp(m, m / SR / 2) * 0.3
    else:    # heel and sole on earth, grass and grit
        x += lp(noise(n), 250) * env_exp(n, 0.018, 0.002) * (1.2 + run)
        for _ in range(int(14 + 22 * run)):
            at = secs(rng.uniform(0.0, 0.05 + 0.03 * run)); m = secs(rng.uniform(0.0004, 0.002))
            x[at:at + m] += bp(noise(m), 900, 4500) * rng.uniform(0.1, 0.5)
        x += bp(noise(n), 1500, 6000) * env_exp(n, 0.04, 0.01) * (0.08 + 0.12 * run)    # cloth and webbing
    if gear:  # kit: canteen and buckles knocking
        for f in rng.uniform(1800, 4200, 3): m = secs(0.06); x[secs(0.02):secs(0.02) + m] += np.sin(2 * np.pi * f * np.arange(m) / SR) * env_exp(m, 0.012) * 0.05
    return norm(x, 1.0)
V = {'rifle': [rifle(rng.uniform(0.8, 1.2)) for _ in range(6)], 'mg': [mg() for _ in range(6)], 'cannon': [cannon() for _ in range(4)],
     'boom1': [boom(1.0) for _ in range(5)], 'boom2': [boom(1.6) for _ in range(5)], 'thud': [thud() for _ in range(3)], 'whiz': [whiz() for _ in range(3)],
     'rocket': [rocket() for _ in range(2)], 'whistle': [whistle() for _ in range(3)],
     'step': [step(0.2) for _ in range(8)], 'run': [step(1.0) for _ in range(8)], 'rung': [step(1.0, gear=True) for _ in range(6)], 'wet': [step(0.5, 1) for _ in range(6)]}

# ---------------------------------------------------------------- buses
DRY = np.zeros((2, N), np.float32); SEND = np.zeros((2, N), np.float32); FOLEY = np.zeros((2, N), np.float32)
def place(bus, x, t, gain, pan, cut=None, send=None):
    if gain < 1e-4 or t >= LEN: return
    if cut and cut < 16000: x = lp(x, cut, 1)
    i = max(0, secs(t)); m = min(len(x), N - i)
    if m <= 0: return
    a = (pan + 1) * math.pi / 4; l, r = math.cos(a), math.sin(a)
    bus[0, i:i + m] += x[:m] * gain * l; bus[1, i:i + m] += x[:m] * gain * r
    if send: SEND[0, i:i + m] += x[:m] * send * l; SEND[1, i:i + m] += x[:m] * send * r

def load(f, dt):
    rows = []
    for l in open(f):
        d = json.loads(l); d['dt'] = dt; rows.append(d)
    return rows
R6, R24 = load(f'{WORK}/ev6.jsonl', 1 / 6), load(f'{WORK}/ev24.jsonl', 1 / 24)
rows = [r for r in R6 if not isnat(r['t'])] + [r for r in R24 if isnat(r['t'])]
rows.sort(key=lambda r: r['t'])

def rel(cam, q):
    """distance and stereo pan of world point q from the film camera"""
    if not cam: return 200.0, 0.0
    p, a = np.array(cam['p']), np.array(cam['a']); f = a - p; f[1] = 0; f /= (np.linalg.norm(f) + 1e-9)
    right = np.array([-f[2], 0, f[0]])  # cross(forward, up), as the game's lookAt
    d = np.array(q) - p; dist = float(np.linalg.norm(d)) + 0.5
    return dist, float(np.clip(np.dot(d, right) / (dist + 4) * 0.9, -0.85, 0.85))
def dist_mix(dist, ref, near=1.0):
    g = near * ref / max(ref, dist)
    cut = 18000 * math.exp(-dist / 260) + 900
    return g, cut

# ---------------------------------------------------------------- the event pass
cnt = {}
last_mg = {}
for r in rows:
    cam, base = r['cam'], r['t'] - r['dt'] / 2  # an event is first drawn in the frame after its step: the sound lands within about half a frame of it
    for e in r['ev']:
        k = e['k']; t = base + (e['n'] - r['n0']); dist, pan = rel(cam, e['p'])
        cnt[k] = cnt.get(k, 0) + 1
        if k in ('rifle', 'mg', 'pshot'):
            if k == 'mg' and t - last_mg.get(e.get('id'), -9) < 0.055: continue
            last_mg[e.get('id')] = t
            g, cut = dist_mix(dist, 12); s = V['mg' if k == 'mg' else 'rifle'][rng.integers(6)]
            place(DRY, s, t, g * (0.55 if k != 'pshot' else 0.42) * rng.uniform(0.8, 1.1), pan, cut, send=0.05 + 0.12 * min(1, dist / 120))
        elif k == 'cannon':
            g, cut = dist_mix(dist, 25); place(DRY, V['cannon'][rng.integers(4)], t, g * 0.7, pan, cut, send=0.22)
        elif k == 'boom':
            big = e.get('kk', 1) >= 1.5; g, cut = dist_mix(dist, 35 if big else 25)
            place(DRY, V['boom2' if big else 'boom1'][rng.integers(5)], t, g * (1.0 if big else 0.85), pan, max(cut, 1400), send=0.28)
            if big and any(math.dist(e['p'][::2], s[::2]) < 35 for s in r['strikes']) or (big and 234 < t < 246):  # barrage shell: its whistle comes in first
                place(DRY, V['whistle'][rng.integers(3)], t - 1.3, max(0.06, min(0.25, 12 / dist)), pan * 0.5, None, send=0.05)
        elif k == 'thud':
            g, cut = dist_mix(dist, 10); place(DRY, V['thud'][rng.integers(3)], t, g * 0.6, pan, cut, send=0.1)
        elif k == 'whiz':
            place(DRY, V['whiz'][rng.integers(3)], t, 0.35, rng.uniform(-0.6, 0.6), None, send=0.04)
        elif k == 'rocket':
            g, cut = dist_mix(dist, 12); place(DRY, V['rocket'][rng.integers(2)], t, g * 0.8, pan, cut, send=0.15)
        elif k == 'pstep':
            g = 3.5 / max(3.5, dist) if dist < 45 else 0
            kind = 'wet' if e.get('wet') else ('run' if e.get('run', 0) > 0.5 else 'step'); sel = V[kind]
            if kind == 'run' and rng.random() < 0.4: sel = V['rung']
            place(FOLEY, sel[rng.integers(len(sel))], t, g * (0.22 if kind != 'step' else 0.14) * rng.uniform(0.8, 1.15) * (1 - 0.35 * e.get('cr', 0)), pan * 0.8, 12000)
print('events', cnt)

# squad footsteps from the soldiers near the camera (their positions per frame; a step every stride)
acc, lastp = {}, {}
for r in rows:
    cam = r['cam']; seen = set()
    for sid, x, y, z, team in r['near']:
        seen.add(sid); q = (x, y, z)
        if sid in lastp:
            dd = math.dist(lastp[sid][::2], q[::2]); spd = dd / r['dt']
            if dd < 6: acc[sid] = acc.get(sid, 0) + dd
            stride = 0.95 if spd > 4 else 0.7
            if acc.get(sid, 0) > stride and spd > 0.6:
                acc[sid] = 0; dist, pan = rel(cam, q)
                if dist < 30:
                    kind = 'run' if spd > 4 else 'step'
                    place(FOLEY, V[kind][rng.integers(8)], r['t'] - r['dt'] * rng.random(), 2.5 / max(2.5, dist) * 0.11 * rng.uniform(0.7, 1.1), pan * 0.8, 9000)
        lastp[sid] = q
    for sid in list(lastp):
        if sid not in seen: del lastp[sid]

# ---------------------------------------------------------------- the valley's echo: early slaps off the slopes and a darkening tail
def valley_ir():
    n = secs(3.0); ir = np.zeros((2, n), np.float32); t = np.arange(n) / SR
    for c in range(2):
        tail = noise(n) * np.exp(-t / 0.75); tail = lp(tail, 3500) * 0.6 + lp(tail, 900) * 0.4
        ir[c] = tail * np.minimum(1, t / 0.06)
        for at, g in ((0.11 + 0.02 * c, 0.7), (0.27 - 0.015 * c, 0.5), (0.46 + 0.03 * c, 0.35), (0.8 - 0.04 * c, 0.2)):
            s = secs(at); m = secs(0.04); ir[c, s:s + m] += lp(noise(m), 2500) * env_exp(m, 0.008) * g * 3
    return ir / np.abs(ir).sum(axis=1, keepdims=True).max() * 25
IR = valley_ir()
WET = np.stack([ss.oaconvolve(SEND[c], IR[c])[:N] for c in range(2)]).astype(np.float32)

# ---------------------------------------------------------------- ambience: wind, rustle and the battle beyond the frame (not tied to events)
def smooth_rand(n, rate, lo, hi):
    k = max(2, int(n / SR * rate) + 2); pts = rng.uniform(lo, hi, k)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), pts).astype(np.float32)
AMB = np.zeros((2, N), np.float32)
gust = smooth_rand(N, 0.15, 0.35, 1.0) ** 2
for c in range(2):
    AMB[c] += lp(noise(N), 380, 2) * gust * 0.10           # wind
    AMB[c] += bp(noise(N), 1500, 5000) * gust ** 1.5 * 0.012  # grass and leaves
# how hot the battle is (distant gunfire density per minute of the film, from the timeline)
heat = np.interp(np.arange(0, LEN, 1.0), [0, 70, 85, 130, 150, 260, 270, 325, 340, 430, 440, 515, 530, 575, 600],
                 [0.25, 0.3, 0.8, 0.9, 0.45, 0.4, 0.9, 0.9, 0.5, 0.45, 0.9, 0.9, 0.35, 0.2, 0.1])
DIST = np.zeros((2, N), np.float32); DSEND = np.zeros((2, N), np.float32)
t = 0.0
while t < LEN - 2:  # far rifles and machine guns: sparse pops, then bursts
    h = heat[int(t)]; t += rng.exponential(1.6 / h)
    pan = rng.uniform(-0.9, 0.9); burst = rng.random() < 0.35; g = rng.uniform(0.03, 0.09) * h
    for j in range(rng.integers(4, 12) if burst else 1):
        tt = t + j * rng.uniform(0.06, 0.09) if burst else t
        s = lp(V['mg' if burst else 'rifle'][rng.integers(6)], rng.uniform(1000, 2200), 1); i = secs(tt); m = min(len(s), N - i)
        if m > 0:
            a = (pan + 1) * math.pi / 4
            for c, w in ((0, math.cos(a)), (1, math.sin(a))): DIST[c, i:i + m] += s[:m] * g * w; DSEND[c, i:i + m] += s[:m] * g * w * 0.9
t = 2.0
while t < LEN - 4:  # far artillery: low rolls of thunder
    t += rng.uniform(5, 15) / (0.5 + heat[int(t)]); s = lp(V['boom2'][rng.integers(5)], rng.uniform(220, 420), 2); i = secs(t); m = min(len(s), N - i)
    if m > 0:
        a = (rng.uniform(-0.8, 0.8) + 1) * math.pi / 4; g = rng.uniform(0.08, 0.22)
        for c, w in ((0, math.cos(a)), (1, math.sin(a))): DIST[c, i:i + m] += s[:m] * g * w; DSEND[c, i:i + m] += s[:m] * g * w * 1.2
DWET = np.stack([ss.oaconvolve(DSEND[c], IR[c])[:N] for c in range(2)]).astype(np.float32)
AMB += DIST * 0.6 + DWET * 0.8

# ---------------------------------------------------------------- radio chatter: band-limited, a little overdriven, squelch at each end
RADIO = np.zeros(N, np.float32); duck = np.zeros(N, np.float32)
for i, (t0, who, txt) in enumerate(LINES):
    sr, v = wf.read(f'{WORK}/tts/{i:02d}.wav'); v = v.astype(np.float32) / 32768
    v = ss.resample_poly(v, SR, sr).astype(np.float32)
    v = bp(v, 320, 3200, 3); v = np.tanh(v / (np.abs(v).max() + 1e-9) * 2.6) / np.tanh(2.6)
    v = bp(v, 300, 3400, 2); v = norm(v, 1.0)
    pre, post = secs(0.09), secs(0.16); n = pre + len(v) + post; x = np.zeros(n, np.float32)
    x[pre:pre + len(v)] += v
    hiss = bp(noise(n), 500, 4000) * 0.045; x += hiss
    x[:secs(0.006)] += noise(secs(0.006)) * 0.4                                 # key-up click
    x[pre + len(v):] += bp(noise(post), 400, 5000) * np.linspace(0.6, 0, post)   # squelch tail
    s = secs(t0); m = min(n, N - s); RADIO[s:s + m] += x[:m] * 0.17
    duck[s:s + m] = 1
duck = ss.sosfilt(ss.butter(1, 3, fs=SR, output='sos'), duck).clip(0, 1).astype(np.float32)

# ---------------------------------------------------------------- the mix
FX = DRY + WET * 0.9
mix = FX * 0.62 * (1 - 0.6 * duck) + FOLEY * 0.9 * (1 - 0.3 * duck) + AMB * 1.0 * (1 - 0.35 * duck) + RADIO[None] * 1.0
fade = np.ones(N, np.float32); a = secs(3.0); fade[:a] = np.linspace(0, 1, a) ** 2; b = secs(6.0); fade[-b:] = np.linspace(1, 0, b) ** 1.5
mix *= fade * float(__import__('os').environ.get('MASTER', '4.0'))
# peak limiter: 5 ms look-ahead, 0.25 s release, ceiling -1.5 dBFS
ceil = 10 ** (-3.5 / 20); pk = np.abs(mix).max(axis=0)
need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
la = secs(0.005)
from scipy.ndimage import minimum_filter1d
need = minimum_filter1d(need, 2 * la + 1)
rel_k = 1 - math.exp(-1 / (0.25 * SR))
red = 1 - need  # reduction amount; release by a one-pole filter on the peak-held reduction
red = np.maximum(red, ss.lfilter([rel_k], [1, -(1 - rel_k)], red).astype(np.float32))
gain = 1 - red
mix = (mix * gain).clip(-ceil, ceil)
_s = np.unique(np.nonzero(gain < 0.79)[0] // SR); print('seconds with >2 dB limiting:', len(_s), _s[:80].tolist())
print('limiter: samples reduced >1 dB', int((gain < 0.89).sum()), 'max reduction dB', round(20 * math.log10(max(gain.min(), 1e-6)), 1))
wf.write(f'{WORK}/mix.wav', SR, (mix.T * 32767).astype(np.int16))
for nm, b in (('fx', FX * 0.62), ('foley', FOLEY * 0.9), ('amb', AMB * 0.55), ('radio', RADIO)):
    print(nm, 'peak', round(float(np.abs(b).max()), 3), 'rms dB', round(20 * math.log10(float(np.sqrt((b ** 2).mean())) + 1e-9), 1))
