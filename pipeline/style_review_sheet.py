"""Contact sheet for reviewing every style preview side by side: one row per style, frames at fixed fractions.
usage: .venv/bin/python pipeline/style_review_sheet.py [out.jpg]   (reads samples/styles/*.mp4)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import subprocess, sys
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "output" / "style-review.jpg"
FR = (0.15, 0.4, 0.65, 0.9); TW = 180
vids = sorted((ROOT / "samples" / "styles").glob("*.mp4"))
rows = []
for v in vids:
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(v)], capture_output=True, text=True).stdout)
    ims = []
    for f in FR:
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{d * f:.2f}", "-i", str(v), "-frames:v", "1", "-vf", f"scale={TW}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
        ims.append(Image.open(BytesIO(raw)).convert("RGB"))
    rows.append((v.stem, ims))
th = rows[0][1][0].height; per = 3
W = per * (len(FR) * TW + 10); H = ((len(rows) + per - 1) // per) * (th + 22)
sh = Image.new("RGB", (W, H), (30, 30, 30)); dr = ImageDraw.Draw(sh)
for k, (name, ims) in enumerate(rows):
    x0 = (k % per) * (len(FR) * TW + 10); y0 = (k // per) * (th + 22)
    dr.text((x0 + 4, y0 + 4), name, fill=(255, 220, 0))
    for j, im in enumerate(ims):
        sh.paste(im, (x0 + j * TW, y0 + 20))
sh.save(out, quality=85); print(out, len(rows), "styles")
