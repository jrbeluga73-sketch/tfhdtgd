# Harrow Brook sound pass: checks the radio lines are intelligible in a mixed track (speech recognition, word recall per line). usage: python asr.py mix.wav
import sys, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); WORK = os.environ.get('WORK', '/tmp/a'); from lines import LINES
from faster_whisper import WhisperModel
m = WhisperModel('base.en', device='cpu', compute_type='int8')
sr, x = wf.read(sys.argv[1]); x = x.astype(np.float32).mean(axis=1) / 32768
ok = 0
for i, (t0, w, txt) in enumerate(LINES):
    seg = x[int((t0 - 0.2) * sr):int((t0 + 5.0) * sr)]; seg = ss.resample_poly(seg, 1, 3).astype(np.float32)
    segs, _ = m.transcribe(seg, language='en', beam_size=3); hyp = ' '.join(s.text.strip() for s in segs)
    import re; norm = lambda s: re.sub(r'[^a-z ]', '', s.lower()).split()
    ref = norm(txt); h = set(norm(hyp)); hit = sum(wd in h for wd in ref) / len(ref); ok += hit
    print(f'{t0:6.1f} {hit:4.0%} | {txt} | {hyp}')
print('mean word recall', ok / len(LINES))
