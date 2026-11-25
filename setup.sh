#!/bin/sh
# One-time setup on macOS or Linux (the work is done by install.py).   Usage: ./setup.sh
cd "$(dirname "$0")" || exit 1
PY="$(command -v python3.12 || command -v python3)"
[ -n "$PY" ] || { echo "Missing: Python 3.12.  macOS: brew install python@3.12 · Linux: your package manager"; exit 1; }
exec "$PY" install.py "$@"
