"""Contact sheet of a video: frames every <step> s, labelled with the time. usage: reel_sheet.py video.mp4 out_prefix [step] [cols] [rows]"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import subprocess, sys, json
from PIL import Image, ImageDraw
v, out = sys.argv[1], sys.argv[2]; step = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 7; rows = int(sys.argv[5]) if len(sys.argv) > 5 else 3
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", v], capture_output=True, text=True).stdout)
ts = [round(step * k + 0.5, 2) for k in range(int((dur - 0.5) / step) + 1)]; tw = 270
frames = []
for t in ts:
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(t), "-i", v, "-frames:v", "1", "-vf", f"scale={tw}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    from io import BytesIO
    im = Image.open(BytesIO(raw)).convert("RGB"); d = ImageDraw.Draw(im); d.rectangle([0, 0, 58, 18], fill=(0, 0, 0)); d.text((4, 3), f"{t:.1f}s", fill=(255, 220, 0)); frames.append(im)
th = frames[0].height; per = cols * rows
for s in range(0, len(frames), per):
    sh = Image.new("RGB", (cols * tw, rows * th), (40, 40, 40))
    for k, im in enumerate(frames[s:s + per]): sh.paste(im, ((k % cols) * tw, (k // cols) * th))
    sh.save(f"{out}{s // per + 1}.jpg", quality=88)
print(len(frames), "frames ->", (len(frames) + per - 1) // per, "sheets")
