"""Re-render the style gallery previews (fast mode, English, QC skipped) into samples/styles/<style>.mp4 + .jpg poster.
Manual only: normal generation never calls this. Needs ELEVENLABS_API_KEY (takes are cached, so every style after the
first re-uses the same narration and costs no credits).
usage: python3 video.py samples [style ...]   (default: every style in styles/styles.json)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702
import json
import shutil
import subprocess
import time

ROOT = plat.ROOT
REG = json.loads((ROOT / "styles" / "styles.json").read_text(encoding="utf-8"))["styles"]
styles = sys.argv[1:] or list(REG)
(ROOT / "samples" / "styles").mkdir(parents=True, exist_ok=True)
ff = plat.tool("ffmpeg")
for st in styles:
    d = ROOT / "output" / "style-sample" / st; d.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / REG[st]["example_storyboard"], d / "storyboard.json")
    t = time.time()
    with open(d / "run.log", "w", encoding="utf-8") as log:
        r = subprocess.run([str(plat.venv_python()), "pipeline/make_video.py", "--storyboard", str(d / "storyboard.json"), "--style", st, "--lang", "en",
                            "--mode", "fast", "--skip-qc", "--allow-lint-fail", "--name", st], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    if r.returncode:
        print(f"FAIL {st}  (see {d / 'run.log'})"); continue
    mp4, jpg = ROOT / "samples" / "styles" / f"{st}.mp4", ROOT / "samples" / "styles" / f"{st}.jpg"
    subprocess.run([ff, "-nostdin", "-v", "error", "-y", "-i", str(d / "final" / f"{st}.mp4"), "-vf", "scale=540:-2", "-c:v", "libx264", "-crf", "26",
                    "-preset", "slow", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(mp4)], check=True)
    dur = float(subprocess.run([plat.tool("ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)], capture_output=True, text=True).stdout)
    subprocess.run([ff, "-nostdin", "-v", "error", "-y", "-ss", f"{dur * 0.4:.2f}", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", str(jpg)], check=True)
    print(f"OK   {st}  {time.time() - t:.0f}s", flush=True)
