# Harrow Brook sound pass: the radio chatter, one Piper TTS clip per line (WORK/tts/NN.wav). usage: WORK=dir VOICE=en_US-libritts_r-medium.onnx PIPER=piper python tts.py
import sys, subprocess; import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); WORK = os.environ.get('WORK', '/tmp/a'); from lines import LINES, SPK
for i, (t, w, txt) in enumerate(LINES):
    subprocess.run([os.environ.get('PIPER', 'piper'), '-m', os.environ.get('VOICE', 'en_US-libritts_r-medium.onnx'), '-s', str(SPK[w]), '--length-scale', '0.92' if w != 'SGT' else '0.85', '-f', f'{WORK}/tts/{i:02d}.wav'], input=txt.encode(), capture_output=True, check=True)
