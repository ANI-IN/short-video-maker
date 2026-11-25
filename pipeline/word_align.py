"""Word timestamps for selected scene voice clips (runs in .venv-tts: Whisper via pipeline/asr.py).
Used to re-time caption words explainroo's aligner could not place (Hindi loanwords Whisper writes in Latin).
Usage: word_align.py <lang> <wav> [<wav> ...] -> JSON {wav: [[word, start, end], ...]}
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
import sys

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import asr  # noqa: E402

lang = {"hl": "hi"}.get(sys.argv[1], sys.argv[1])
out = {}
for f in sys.argv[2:]:
    r = asr.transcribe(f, language=lang, word_timestamps=True, condition_on_previous_text=False)
    out[f] = [[w["word"].strip(), round(float(w["start"]), 3), round(float(w["end"]), 3)] for s in r["segments"] for w in s.get("words", [])]
print(json.dumps(out, ensure_ascii=False))
