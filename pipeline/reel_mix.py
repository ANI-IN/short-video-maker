"""SFX bed + voice master for the system-design reels (two-pass loudnorm to -14 LUFS, TP -1).
usage: .venv/bin/python pipeline/reel_mix.py <reel dir> <props.json> "<kind>:<src word idx>[:dB] ..."
kinds: thud | pop | ding.  Indices are in the props' authoring space (remapped through props.map when present);
a ping is added automatically at every chapter start."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json, subprocess, sys, numpy as np, soundfile as sf
O, P = sys.argv[1], sys.argv[2]; spec = sys.argv[3].split() if len(sys.argv) > 3 else []
SR = 44100; props = json.load(open(P)); w = props["words"]; mp = props.get("map")
dur = round(w[-1]["e"] + 1.0, 2); s = lambda i: w[min(mp[i] if mp else i, len(w) - 1)]["s"]
rng = np.random.default_rng(5)
def thud(db=-8):
    n = int(0.55 * SR); t = np.arange(n) / SR; f = 110 * np.exp(-t * 3.0) + 48
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5) + np.convolve(rng.normal(0, 1, n) * np.exp(-t * 90) * 0.35, np.ones(8) / 8, 'same')
    return x / np.abs(x).max() * 10 ** (db / 20)
def ping(fr, db=-24):
    n = int(0.4 * SR); t = np.arange(n) / SR; x = (np.sin(2 * np.pi * fr * t) + 0.35 * np.sin(2 * np.pi * fr * 2.01 * t)) * np.exp(-t * 14) * np.minimum(1, t / 0.004)
    return x / np.abs(x).max() * 10 ** (db / 20)
def pop(db=-29):
    n = int(0.12 * SR); t = np.arange(n) / SR; x = np.sin(2 * np.pi * (600 * np.exp(-t * 25) + 300) * t) * np.exp(-t * 40); return x / np.abs(x).max() * 10 ** (db / 20)
def ding(db=-21):
    n = int(0.9 * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(1318.5, 1, 5), (1975.5, 0.5, 7), (2637, 0.25, 9)]) * np.minimum(1, t / 0.003)
    return x / np.abs(x).max() * 10 ** (db / 20)
K = {"thud": thud, "pop": pop, "ding": ding}
cues = []
starts = [x["s"] for i, x in enumerate(w) if i and x["chapter"] != w[i - 1]["chapter"]]
for k, t0 in enumerate(starts): cues.append((t0 - 0.08, ping([1800, 1700, 1850, 1750][k % 4])))
for c in spec:
    p = c.split(":"); f = K[p[0]]; cues.append((s(int(p[1])), f(float(p[2])) if len(p) > 2 else f()))
sfx = np.zeros(int((dur + 1) * SR))
for t0, x in cues:
    i = int(t0 * SR); sfx[i:i + len(x)] += x[:len(sfx) - i]
sf.write(f"{O}/sfx.wav", sfx[:int(dur * SR)].astype(np.float32), SR)
voice = f"{O}/voiceover.mp3"     # the ElevenLabs take exactly as delivered
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", voice, "-i", f"{O}/sfx.wav", "-filter_complex",
  f"[0:a]aresample=44100,apad,atrim=0:{dur}[v];[1:a]atrim=0:{dur}[s];[v][s]amix=inputs=2:normalize=0:duration=first[m]", "-map", "[m]", "-ac", "2", f"{O}/mix_raw.wav"], check=True)
r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", f"{O}/mix_raw.wav", "-af", "loudnorm=I=-14:TP=-1:LRA=7:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(r[r.rfind("{"):r.rfind("}") + 1])
af = f"loudnorm=I=-14:TP=-1:LRA=7:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", f"{O}/mix_raw.wav", "-af", af, "-ar", "48000", f"{O}/mix_master.wav"], check=True)
r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", f"{O}/mix_master.wav", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
i = r.find("Integrated"); print(f"{len(cues)} cues, dur {dur}s |", " ".join(r[i:i + 400].split())[:200])
