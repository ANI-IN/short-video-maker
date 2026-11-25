"""Whisper check of a reel voiceover against its words.json: word accuracy + timing offset of matched words.
usage: (.venv-tts python) pipeline/reel_asr_check.py <reel dir> [audio]"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json, re, sys, difflib, statistics, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import asr
d = sys.argv[1]; f = sys.argv[2] if len(sys.argv) > 2 else f"{d}/voiceover.mp3"
W = json.load(open(f"{d}/words.json", encoding="utf-8"))
r = asr.transcribe(f, language="en", word_timestamps=True, condition_on_previous_text=False)
H = [w for s in r["segments"] for w in s["words"]]
n = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
a = [n(w["cap"]) for w in W]; b = [n(w["word"]) for w in H]
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
off = []; miss = []
for tag, i0, i1, j0, j1 in sm.get_opcodes():
    if tag == "equal":
        off += [H[j0 + k]["start"] - W[i0 + k]["s"] for k in range(i1 - i0)]
    else:
        miss.append((tag, " ".join(w["cap"] for w in W[i0:i1]), " ".join(h["word"] for h in H[j0:j1]), round(W[i0]["s"], 1) if i0 < len(W) else None))
print(f"match {len(off)}/{len(W)}  median offset {statistics.median(off) * 1000:.0f} ms")
for m in miss: print("  ", m)
