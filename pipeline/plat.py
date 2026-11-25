"""Cross-platform helpers (macOS, Windows, Linux): virtualenv interpreters, external tools, UTF-8 text."""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WINDOWS = os.name == "nt"
APPLE_SILICON = sys.platform == "darwin" and platform.machine() == "arm64"


def _load_optional_env() -> None:
    """Optional tuning values from .env (never the API key, which is read only where it is used)."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for ln in env.read_text(encoding="utf-8", errors="replace").splitlines():
        k, _, v = ln.partition("=")
        v = v.split("#")[0].strip().strip('"').strip("'")
        if k.strip() in ("REMOTION_CONCURRENCY", "REMOTION_CHUNK", "ASR_BACKEND", "WHISPER_MODEL") and v:
            os.environ.setdefault(k.strip(), v)


_load_optional_env()


def venv_python(name: str = ".venv") -> Path:
    """The Python inside a project virtualenv (.venv or .venv-tts)."""
    return ROOT / name / ("Scripts/python.exe" if WINDOWS else "bin/python")


def tool(name: str) -> str:
    """Full path of a command-line tool (on Windows this finds npx.cmd / npm.cmd, which a bare "npx" would not)."""
    return shutil.which(name) or name


def ensure_utf8() -> None:
    """Every text file in the project is UTF-8 (Hindi scripts, emoji). Windows' default encoding is not, so on Windows
    re-run the script once in Python's UTF-8 mode; child processes inherit it through PYTHONUTF8."""
    os.environ["PYTHONUTF8"] = "1"
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if WINDOWS and not sys.flags.utf8_mode:
        sys.exit(subprocess.call([sys.executable, "-X", "utf8", *sys.argv]))
