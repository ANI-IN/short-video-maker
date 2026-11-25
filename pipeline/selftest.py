"""Offline end-to-end check of this machine: no API key, no credits. Exercises every platform-specific part.
usage: video.py selftest      (CI runs it on Windows, macOS and Linux; set WHISPER_MODEL=tiny for a quick run)

  1 storyboard   plain script -> storyboard (script_to_storyboard.py)
  2 whisper      speech recognition with word timings on a sample video's audio (.venv-tts, pipeline/asr.py)
  3 ocr          on-screen text recognition on a sample frame (pipeline/ocr.py)
  4 explainroo   the explainroo engine runs (node)
  5 remotion     Remotion + headless Chromium render a still frame of a style (npx)
  6 ffmpeg       encode a short H.264 clip
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702
import json
import subprocess
import tempfile
import time
from pathlib import Path

R = plat.ROOT
T = Path(tempfile.mkdtemp(prefix="svm-selftest-"))
SAMPLE = R / "samples" / "styles" / "edtech.mp4"
results = []


def step(name, fn):
    t = time.time()
    try:
        detail = fn()
        results.append((name, True, detail))
        print(f"PASS {name:11} {detail}  ({time.time() - t:.0f}s)", flush=True)
    except Exception as e:
        msg = str(e).strip().splitlines()
        results.append((name, False, msg[-1] if msg else repr(e)))
        print(f"FAIL {name:11} {' | '.join(msg[-6:])[:900]}", flush=True)


def sh(cmd, cwd=R, timeout=900):
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        raise RuntimeError((r.stdout + "\n" + r.stderr)[-1500:])
    return r.stdout


def storyboard():
    (T / "s.txt").write_text("# What is an *API*?\nWhat does an API actually do?\n\nTwo apps cannot read each other's code.\n\n"
                             "An API is the menu one app offers another.\n\nWhich API do you use most? Tell me below.\n", encoding="utf-8")
    sh([plat.venv_python(), "pipeline/script_to_storyboard.py", T / "s.txt", "--lang", "en", "--title", "What is an API", "--out", T / "sb.json"])
    b = json.loads((T / "sb.json").read_text(encoding="utf-8"))
    assert len(b["scenes"]) == 4, b
    return f"{len(b['scenes'])} scenes"


def whisper():
    sh([plat.tool("ffmpeg"), "-nostdin", "-v", "error", "-y", "-i", SAMPLE, "-t", "12", "-vn", "-ac", "1", "-ar", "16000", T / "a.wav"])
    o = sh([plat.venv_python(".venv-tts"), "-c", "import sys, json; sys.path.insert(0, 'pipeline'); import asr; "
            f"r = asr.transcribe(r'{T / 'a.wav'}', language='en', word_timestamps=True); "
            "w = [x for s in r['segments'] for x in s['words']]; print(json.dumps({'backend': asr.BACKEND, 'text': r['text'], 'words': len(w)}))"])
    d = json.loads(o.strip().splitlines()[-1])
    assert d["words"] >= 5, d
    return f"{d['backend']}: {d['words']} words, \"{d['text'].strip()[:60]}\""


def ocr():
    sh([plat.tool("ffmpeg"), "-nostdin", "-v", "error", "-y", "-ss", "4", "-i", SAMPLE, "-frames:v", "1", "-vf", "scale=540:-2", T / "f.png"])
    o = sh([plat.venv_python(), "-c", "import sys, json; sys.path.insert(0, 'pipeline'); import ocr; "
            f"print(json.dumps([t for t, c, b in ocr.read(r'{T / 'f.png'}')]))"])
    words = json.loads(o.strip().splitlines()[-1])
    assert words, "no text found"
    return f"{len(words)} text lines, e.g. {words[0][:30]!r}"


def explainroo():
    o = sh([plat.tool("node"), R / "explainroo" / "bin" / "explainroo.js", "icons", "api"])
    return f"icons: {o.strip().splitlines()[0][:50] if o.strip() else 'ok'}"


def remotion():
    sh([plat.tool("npx"), "remotion", "still", "src/index.ts", "McpReelEn", T / "still.png", "--frame=120", "--log=error"], cwd=R / "styles" / "remotion", timeout=1200)
    assert (T / "still.png").stat().st_size > 10000
    return f"still frame {(T / 'still.png').stat().st_size // 1024} KB"


def ffmpeg():
    sh([plat.tool("ffmpeg"), "-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=30:duration=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", T / "t.mp4"])
    return f"{(T / 't.mp4').stat().st_size // 1024} KB"


print(f"Self-test on {sys.platform} (Python {sys.version.split()[0]}), temp {T}\n", flush=True)
for n, f in (("storyboard", storyboard), ("whisper", whisper), ("ocr", ocr), ("explainroo", explainroo), ("remotion", remotion), ("ffmpeg", ffmpeg)):
    step(n, f)
bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} passed" + (f"; failed: {', '.join(r[0] for r in bad)}" if bad else ""))
sys.exit(1 if bad else 0)
