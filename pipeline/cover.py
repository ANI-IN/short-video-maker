"""Auto-select the scroll-stopping cover frame.

Samples frames every 0.25 s, drops anything within 0.45 s of a scene cut or mid-motion (frame-difference spike: transition/
motion-blur frames), then scores: sharpness (Laplacian variance), contrast, colourfulness, readable large text (macOS Vision OCR:
the hook/headline legible on the cover), and a bonus for the first scene (the hook). Writes <out>.cover.jpg at full size.
Usage: cover.py <video.mp4> <props.json> <out.jpg>
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))


def _frames(video: str, step: float, w: int = 270, h: int = 480):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vf", f"fps=1/{step},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w, 3)


def _ocr_score(img: Image.Image) -> tuple[float, str]:
    try:
        import ocr
        with tempfile.TemporaryDirectory() as td:          # a directory, not NamedTemporaryFile: Windows can't reopen an open temp file
            img.save(f"{td}/f.png")
            res = ocr.read(f"{td}/f.png", accurate=False)
        big = [(t, c, b) for t, c, b in res if b[3] > 0.03 and c > 0.6 and len(t) > 2]   # text at least 3% of frame height
        words = sum(len(t.split()) for t, _, _ in big)
        return (min(1.0, words / 6.0) if words <= 14 else 0.6), " / ".join(t for t, _, _ in big)[:120]
    except Exception:
        return 0.3, ""


def pick(video: str, props: dict, out: str, step: float = 0.25) -> dict:
    F = _frames(video, step).astype(np.float32)
    gray = F.mean(axis=3)
    cuts = [s["start"] for s in props["scenes"][1:]]
    diffs = np.r_[0, np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2))]
    cands = []
    for i, g in enumerate(gray):
        t = i * step
        if t < 0.3 or any(abs(t - c) < 0.45 for c in cuts) or t > props["duration"] - 0.6:
            continue
        if diffs[i] > np.percentile(diffs, 80):          # mid-motion / transition
            continue
        lap = np.abs(np.diff(g, 2, axis=0)).mean() + np.abs(np.diff(g, 2, axis=1)).mean()
        rgb = F[i]; rg = rgb[..., 0] - rgb[..., 1]; yb = 0.5 * (rgb[..., 0] + rgb[..., 1]) - rgb[..., 2]
        colour = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
        cands.append({"t": round(t, 2), "sharp": float(lap), "contrast": float(g.std()), "colour": float(colour)})
    if not cands:
        cands = [{"t": 1.0, "sharp": 1, "contrast": 1, "colour": 1}]
    for k in ("sharp", "contrast", "colour"):
        m = max(c[k] for c in cands) or 1
        for c in cands:
            c[k + "_n"] = c[k] / m
    cands.sort(key=lambda c: -(0.4 * c["sharp_n"] + 0.3 * c["contrast_n"] + 0.3 * c["colour_n"]))
    top = cands[:8]
    tmp = Path(tempfile.mkdtemp())
    for c in top:   # OCR + full-res check only on the shortlist
        fp = tmp / f"{c['t']}.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(c["t"]), "-i", video, "-frames:v", "1", "-vf", "scale=540:-2", str(fp)])
        c["text"], c["text_read"] = _ocr_score(Image.open(fp))
        hook = props["scenes"][0]; c["hook"] = 1.0 if c["t"] < hook["start"] + hook["dur"] else 0.0
        c["score"] = round(0.3 * c["sharp_n"] + 0.2 * c["contrast_n"] + 0.2 * c["colour_n"] + 0.2 * c["text"] + 0.1 * c["hook"], 3)
    best = max(top, key=lambda c: c["score"])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(best["t"]), "-i", video, "-frames:v", "1", "-q:v", "2", out], check=True)
    return {"file": out, "t": best["t"], "score": best["score"], "text_read": best.get("text_read", ""), "considered": len(cands)}


if __name__ == "__main__":
    print(json.dumps(pick(sys.argv[1], json.loads(Path(sys.argv[2]).read_text()), sys.argv[3]), ensure_ascii=False, indent=1))
