"""One-time setup for a fresh clone, on macOS, Windows or Linux.  Safe to re-run.

  macOS / Linux :  python3 install.py     (or ./setup.sh)
  Windows       :  py -3.12 install.py    (or setup.cmd)

Creates the two Python environments, downloads the explainroo engine at the tested commit, installs the Remotion
packages and creates .env. Uses only the Python standard library, so it runs before anything is installed.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WINDOWS = os.name == "nt"
EXPLAINROO_REPO = "https://github.com/vincentsch/explainroo.git"
EXPLAINROO_COMMIT = "6b618b5117dd4a2c7df13900907da2726bec4c1b"   # v0.6.2, the version this project is tested with
HINT = {
    "darwin": {"node": "brew install node", "ffmpeg": "brew install ffmpeg", "git": "xcode-select --install"},
    "win32": {"node": "winget install OpenJS.NodeJS.LTS", "ffmpeg": "winget install Gyan.FFmpeg", "git": "winget install Git.Git"},
    "linux": {"node": "install Node 20+ from https://nodejs.org or your package manager", "ffmpeg": "sudo apt install ffmpeg", "git": "sudo apt install git"},
}.get(sys.platform if sys.platform in ("darwin", "win32") else "linux")


def say(msg):
    print(f"\n== {msg}", flush=True)


def run(cmd, cwd=ROOT):
    subprocess.run([str(c) for c in cmd], cwd=cwd, check=True)


def need(name):
    path = shutil.which(name)
    if not path:
        sys.exit(f"Missing: {name}.  Install it ({HINT.get(name, 'see README, Prerequisites')}), open a new terminal, and run this again.")
    return path


def venv_py(name):
    return ROOT / name / ("Scripts/python.exe" if WINDOWS else "bin/python")


def make_env(name, req):
    say(f"Python environment: {name}")
    if not venv_py(name).exists():
        run([sys.executable, "-m", "venv", ROOT / name])
    run([venv_py(name), "-m", "pip", "install", "--quiet", "--upgrade", "pip"])
    run([venv_py(name), "-m", "pip", "install", "--quiet", "-r", ROOT / req])


def main():
    say("Checking prerequisites")
    if sys.version_info[:2] != (3, 12):
        print(f"Python {sys.version.split()[0]} found. This project is tested on Python 3.12; "
              "other versions may fail to install the pinned packages.")
        if sys.version_info < (3, 11):
            sys.exit("Python 3.11 or newer is required. Install Python 3.12 and run this file with it.")
    node, npm = need("node"), need("npm")
    ffmpeg = need("ffmpeg"); need("ffprobe"); git = need("git")
    major = int(subprocess.run([node, "-p", "process.versions.node.split('.')[0]"], capture_output=True, text=True).stdout.strip() or 0)
    if major < 20:
        sys.exit(f"Node {major} found; version 20 or newer is needed.")
    ffv = subprocess.run([ffmpeg, "-version"], capture_output=True, text=True).stdout.split("\n")[0]
    print(f"python {sys.version.split()[0]} · node {major} · {' '.join(ffv.split()[:3])} · {sys.platform}")

    make_env(".venv", "requirements.txt")
    make_env(".venv-tts", "requirements-voice.txt")

    say("explainroo engine (third-party, MIT) at the tested commit")
    ex = ROOT / "explainroo"
    if not (ex / "bin" / "explainroo.js").exists():
        run([git, "clone", "--quiet", EXPLAINROO_REPO, ex])
        run([git, "-C", ex, "checkout", "--quiet", EXPLAINROO_COMMIT])
    if not (ex / "node_modules").exists():
        run([npm, "ci", "--silent"], cwd=ex)

    say("Remotion styles")
    rem = ROOT / "styles" / "remotion"
    if not (rem / "node_modules").exists():
        run([npm, "ci", "--silent"], cwd=rem)

    say("Local files")
    (ROOT / "output").mkdir(exist_ok=True)
    if not (ROOT / ".env").exists():
        shutil.copy(ROOT / ".env.example", ROOT / ".env")
        print("Created .env: add your ELEVENLABS_API_KEY to it (or run: video.py voices key).")

    py = "py" if WINDOWS else "python3"
    say(f"Done.  Next:  add ELEVENLABS_API_KEY to .env, then run:  {py} video.py doctor")


if __name__ == "__main__":
    main()
