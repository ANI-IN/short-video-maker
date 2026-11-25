"""Short Video Maker: one command for everything, on macOS, Windows and Linux.

Run it with the Python you installed (it switches to the project's own environments by itself):
  macOS / Linux : python3 video.py <command> ...
  Windows       : py video.py <command> ...

Commands
  doctor                         check the setup (tools, environments, engines, ElevenLabs key and credits)
  selftest                       offline end-to-end check of this machine (no API key, no credits)
  styles [--group NAME]          list every style with the command that uses it
  voices <list|use|add|test|account|key>   manage ElevenLabs voices (see: video.py voices -h)
  script FILE --title T [opts]   make a video from your own script (plain text, blank line = new scene)
  make STORYBOARD --style S [opts]   make a video from a storyboard JSON (what /make-video writes)
  list                           list the videos made on this computer, newest first
  feedback VIDEO_ID [--views N] [--likes N] [--rating good|bad]   record how a posted video did
  samples [STYLE ...]            re-render the style previews in samples/styles/ (uses credits once)
  styles-doc                     regenerate docs/styles.md from styles/styles.json

Options for `script` and `make`: --lang en|hi|hl (default en) · --mode fast|max|cinematic (default max)
  · --name NAME · --out DIR · --voice KEY (script only; a key from `video.py voices list`)
Videos are written to output/<name>/final/<name>.mp4. See README.md.
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WIN = os.name == "nt"
if WIN:     # the Windows console defaults to a legacy code page; style labels and paths may hold non-ASCII text
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def venv(name=".venv"):
    p = ROOT / name / ("Scripts/python.exe" if WIN else "bin/python")
    if not p.exists():
        sys.exit(f"{name} is missing. Run the setup first:  {'setup.cmd' if WIN else './setup.sh'}")
    return str(p)


def run(args, env_name=".venv"):
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    return subprocess.call([venv(env_name), *map(str, args)], cwd=ROOT, env=env)


def slug(s):
    return (re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40].rstrip("-") or "video") + "-" + time.strftime("%m%d-%H%M")


def styles_cmd(argv):
    reg = json.loads((ROOT / "styles" / "styles.json").read_text(encoding="utf-8"))["styles"]
    grp = argv[argv.index("--group") + 1].lower() if "--group" in argv else None
    py = "py" if WIN else "python3"
    last = None
    for k, s in sorted(reg.items(), key=lambda kv: (kv[1].get("group", ""), kv[1].get("n", 0))):
        if grp and grp not in s.get("group", "").lower():
            continue
        if s.get("group") != last:
            print(f"\n== {s.get('group')}"); last = s.get("group")
        print(f"  {k:22} {s.get('label', k)}\n  {'':22} {s.get('best_for', '')}\n  {'':22} {py} video.py script my-script.txt --title \"My video\" --style {k}")
    print(f"\nPreviews: samples/styles/<style>.mp4 · gallery with every command: docs/styles.md")
    return 0


def script_cmd(argv):
    import argparse
    ap = argparse.ArgumentParser(prog="video.py script")
    ap.add_argument("file"); ap.add_argument("--title", required=True); ap.add_argument("--style", default=json.loads((ROOT / "styles" / "styles.json").read_text(encoding="utf-8"))["default"])
    ap.add_argument("--lang", default="en", choices=["en", "hi", "hl"]); ap.add_argument("--mode", default="max", choices=["fast", "max", "cinematic"])
    ap.add_argument("--name"); ap.add_argument("--out"); ap.add_argument("--voice")
    a = ap.parse_args(argv)
    name = a.name or slug(a.title)
    out = Path(a.out) if a.out else ROOT / "output" / name
    out.mkdir(parents=True, exist_ok=True)
    sb = out / "storyboard.json"
    if run(["pipeline/script_to_storyboard.py", a.file, "--lang", a.lang, "--title", a.title, "--out", sb]):
        return 1
    if a.voice:
        b = json.loads(sb.read_text(encoding="utf-8")); b["hosts"] = [a.voice]
        sb.write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
    # your own words are used as written: the hook / wording gates are advisory for own scripts
    return run(["pipeline/make_video.py", "--storyboard", sb, "--style", a.style, "--lang", a.lang, "--mode", a.mode,
                "--out", out, "--name", name, "--allow-lint-fail"])


def make_cmd(argv):
    import argparse
    ap = argparse.ArgumentParser(prog="video.py make")
    ap.add_argument("storyboard"); ap.add_argument("--style", required=True)
    ap.add_argument("--lang", default="en", choices=["en", "hi", "hl"]); ap.add_argument("--mode", default="max", choices=["fast", "max", "cinematic"])
    ap.add_argument("--name"); ap.add_argument("--out"); ap.add_argument("--allow-lint-fail", action="store_true")
    a = ap.parse_args(argv)
    args = ["pipeline/make_video.py", "--storyboard", a.storyboard, "--style", a.style, "--lang", a.lang, "--mode", a.mode]
    args += ["--name", a.name] if a.name else []
    args += ["--out", a.out] if a.out else []
    args += ["--allow-lint-fail"] if a.allow_lint_fail else []
    return run(args)


def list_cmd(argv):
    rows = []
    for r in (ROOT / "output").glob("*/final/*.report.json"):
        if "style-sample" in r.parts:
            continue
        try:
            d = json.loads(r.read_text(encoding="utf-8"))
            if d.get("output"):
                rows.append((r.stat().st_mtime, d))
        except Exception:
            pass
    if not rows:
        print("No videos yet. Make one:  " + ("py" if WIN else "python3") + " video.py script my-script.txt --title \"My video\"")
        return 0
    for t, d in sorted(rows, key=lambda x: -x[0]):
        f = Path(d["output"]["file"])
        try:
            f = f.resolve().relative_to((ROOT / "output").resolve())
            f = Path("output") / f
        except ValueError:
            pass
        print(f"{time.strftime('%d/%m/%Y %H:%M', time.localtime(t))}  {d.get('style', ''):20} {d.get('lang', '')}  "
              f"{d['output'].get('duration_s', 0):5.1f}s  QC {'pass' if d.get('qc_pass') else 'fail/skipped'}  {f.as_posix()}")
    return 0


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print(__doc__); return 0
    cmd, argv = sys.argv[1], sys.argv[2:]
    if cmd == "doctor":
        return run(["pipeline/doctor.py", *argv])
    if cmd == "selftest":
        return run(["pipeline/selftest.py", *argv])
    if cmd == "styles":
        return styles_cmd(argv)
    if cmd == "voices":
        return run(["pipeline/voices.py", *argv])
    if cmd == "script":
        return script_cmd(argv)
    if cmd == "make":
        return make_cmd(argv)
    if cmd == "list":
        return list_cmd(argv)
    if cmd == "feedback":
        return run(["pipeline/feedback.py", *argv])
    if cmd == "styles-doc":
        return run(["pipeline/styles_doc.py"])
    if cmd == "samples":
        return run(["pipeline/render_samples.py", *argv])
    print(f"Unknown command: {cmd}\n"); print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main())
