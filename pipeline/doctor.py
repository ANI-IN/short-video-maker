"""Setup check: is everything this project needs installed and working on this computer?
usage: video.py doctor [--no-key]   (exit code 1 when a required item is missing; --no-key: CI, skip the API key)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702
import shutil
import subprocess

import eleven

R = plat.ROOT
FIX = {"darwin": {"node": "brew install node", "ffmpeg": "brew install ffmpeg", "git": "xcode-select --install", "setup": "./setup.sh"},
       "win32": {"node": "winget install OpenJS.NodeJS.LTS", "ffmpeg": "winget install Gyan.FFmpeg", "git": "winget install Git.Git", "setup": "setup.cmd"},
       }.get(sys.platform, {"node": "install Node 20+ (nodejs.org or nvm)", "ffmpeg": "sudo apt install ffmpeg", "git": "sudo apt install git", "setup": "./setup.sh"})


def out(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=120).stdout.strip()
    except Exception:
        return ""


rows = []          # (name, ok, detail, required)
node = shutil.which("node")
nv = out([node, "-p", "process.versions.node"]) if node else ""
rows.append(("Node.js 20+", bool(nv) and int(nv.split(".")[0]) >= 20, nv or f"missing: {FIX['node']}", True))
for t in ("ffmpeg", "ffprobe"):
    rows.append((t, bool(shutil.which(t)), shutil.which(t) or f"missing: {FIX['ffmpeg']}", True))
rows.append(("git", bool(shutil.which("git")), shutil.which("git") or f"missing: {FIX['git']}", True))
for env, mods in ((".venv", "torch, transformers, librosa, PIL"), (".venv-tts", "asr backend")):
    py = plat.venv_python(env)
    if not py.exists():
        rows.append((f"Python environment {env}", False, f"missing: run {FIX['setup']}", True)); continue
    code = ("import torch, transformers, librosa, PIL, ocr" if env == ".venv" else
            "import asr, importlib; importlib.import_module('mlx_whisper' if asr.BACKEND == 'mlx' else 'faster_whisper'); print(asr.BACKEND)")
    r = subprocess.run([str(py), "-c", f"import sys; sys.path.insert(0, 'pipeline'); {code}"], cwd=R, capture_output=True, text=True)
    rows.append((f"Python environment {env}", r.returncode == 0, (r.stdout.strip() or "ok") if r.returncode == 0 else f"broken: re-run {FIX['setup']} ({r.stderr.strip().splitlines()[-1][:80] if r.stderr.strip() else ''})", True))
rows.append(("explainroo engine", (R / "explainroo" / "bin" / "explainroo.js").exists() and (R / "explainroo" / "node_modules").exists(), f"run {FIX['setup']}" if not (R / "explainroo" / "node_modules").exists() else "ok", True))
rows.append(("Remotion styles", (R / "styles" / "remotion" / "node_modules").exists(), "ok" if (R / "styles" / "remotion" / "node_modules").exists() else f"run {FIX['setup']}", True))
acc = {"key_set": True, "valid": True, "note": "skipped (--no-key)"} if "--no-key" in sys.argv else eleven.account()
if not acc["key_set"]:
    rows.append(("ElevenLabs API key", False, "missing: put ELEVENLABS_API_KEY=... in .env (or run: video.py voices key)", True))
elif not acc["valid"]:
    rows.append(("ElevenLabs API key", False, f"not accepted: {acc.get('error')}", True))
else:
    det = f"{acc.get('plan')} plan · {acc['limit'] - (acc.get('used') or 0):,} of {acc['limit']:,} credits left" if acc.get("limit") else (acc.get("note") or "ok")
    rows.append(("ElevenLabs API key", True, det, True))
cl = shutil.which("claude") or os.environ.get("CLAUDE_BIN")
rows.append(("Claude Code", bool(cl), out([cl, "--version"]) if cl else "not found: see README § Claude Code", False))
free = shutil.disk_usage(R).free / 1e9
rows.append(("Free disk space", free > 5, f"{free:.0f} GB" + ("" if free > 5 else " (keep at least 5 GB free)"), False))

w = max(len(r[0]) for r in rows)
for name, ok, det, req in rows:
    print(f"{'OK ' if ok else ('!! ' if req else '-- ')} {name:{w}}  {det}")
missing = [r[0] for r in rows if r[3] and not r[1]]
print("\nAll required items are ready." if not missing else f"\nMissing: {', '.join(missing)}")
sys.exit(1 if missing else 0)
