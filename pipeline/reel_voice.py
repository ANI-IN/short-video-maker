"""ElevenLabs voiceover with word timings for the system-design reels.

usage: (.venv python) pipeline/reel_voice.py output/reels/<x> --voice <id> [--lang en]
The voice is used exactly as ElevenLabs delivers it: the voice's own default settings, no speed or pause changes.
reads  <dir>/script.json  [{chapter, cap, voice}]  (cap and voice must have the same token count)
writes <dir>/voiceover.mp3, alignment.json, words.json  [{cap, voice, sent, chapter, s, e}]
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import argparse, base64, json, os, urllib.error, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("dir"); ap.add_argument("--voice", required=True)
ap.add_argument("--lang", default="en"); ap.add_argument("--model", default="eleven_multilingual_v2")
a = ap.parse_args()
key = os.environ.get("ELEVENLABS_API_KEY") or [l.split("=", 1)[1].strip().strip('"').strip("'") for l in open(".env", encoding="utf-8") if l.startswith("ELEVENLABS_API_KEY=")][0]
S = json.load(open(f"{a.dir}/script.json", encoding="utf-8"))
body = {"text": " ".join(s["voice"] for s in S), "model_id": a.model, "language_code": a.lang}     # no voice_settings: the voice's own defaults
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice}/with-timestamps?output_format=mp3_44100_128",
                             method="POST", headers={"xi-api-key": key, "Content-Type": "application/json"}, data=json.dumps(body).encode())
try:
    r = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    raise SystemExit(f"ElevenLabs error {e.code}: {e.read().decode()[:400]}")
open(f"{a.dir}/voiceover.mp3", "wb").write(base64.b64decode(r["audio_base64"]))
json.dump({"alignment": r["alignment"], "settings": {k: v for k, v in body.items() if k != "text"}, "voice": a.voice}, open(f"{a.dir}/alignment.json", "w", encoding="utf-8"), ensure_ascii=False)
al = r["alignment"]; words = []; cur = ""; s0 = e0 = None
for c, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
    if c.isspace():
        if cur: words.append((cur, s0, e0)); cur = ""
        continue
    if not cur: s0 = s
    cur += c; e0 = e
if cur: words.append((cur, s0, e0))
cap = []
for si, s in enumerate(S):
    cs, vs = s["cap"].split(), s["voice"].split()
    assert len(cs) == len(vs), f"sentence {si}: cap/voice token count differs"
    cap += [{"cap": c, "voice": v, "sent": si, "chapter": s["chapter"]} for c, v in zip(cs, vs)]
bad = [(i, w[0], cap[i]["voice"]) for i, w in enumerate(words) if i < len(cap) and w[0] != cap[i]["voice"]]
print("words", len(words), len(cap), "mismatch", bad[:5])
for i, (w, s, e) in enumerate(words): cap[i].update(s=round(s, 3), e=round(e, 3))
json.dump(cap, open(f"{a.dir}/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
n = len(cap); dur = words[-1][2]
print(f"end {dur:.2f}s  pace {n / dur:.2f} words/s")
