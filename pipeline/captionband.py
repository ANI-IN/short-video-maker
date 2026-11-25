"""Caption-band collision check that works for ANY script (macOS Vision OCR cannot read Devanagari, so the OCR-based
text-layout check was blind on Hindi videos: a shloka label sat right on the captions and passed).

explainroo draws the style layer (titles, labels, numbers) into the base video WITHOUT captions; Remotion adds captions on
top. So text-like ink inside the caption band of the BASE video, at a moment the captions are on screen, is a collision.
"Ink" = share of band pixels with a strong local edge (text strokes); plain parchment, gradients and soft art stay low.
Usage: captionband.py <base.mp4> <props.json> <caption_y>
"""
from __future__ import annotations

import json
import subprocess
import sys

import numpy as np

W, H = 1080, 1920


def ink(gray: np.ndarray) -> float:
    gx = np.abs(np.diff(gray, axis=1))[:-1, :]; gy = np.abs(np.diff(gray, axis=0))[:, :-1]
    return float(((gx > 55) | (gy > 55)).mean())


def check(base: str, props: dict, cap_y: int, fps: float = 2.0, limit: float = 0.008) -> dict:
    y0, y1 = max(0, cap_y - 72), min(H, cap_y + 52)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", base, "-vf", f"fps={fps},crop=885:{y1 - y0}:65:{y0},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    n = len(raw) // (885 * (y1 - y0))
    frames = np.frombuffer(raw[: n * 885 * (y1 - y0)], dtype=np.uint8).reshape(n, y1 - y0, 885).astype(np.int16)
    hits = []
    for i in range(n):
        t = i / fps
        sc = next((s for s in props["scenes"] if s["start"] <= t < s["start"] + s["dur"]), None)
        if not sc or not sc.get("words") or sc.get("footage") or sc.get("visual") == "reenact":
            continue                     # footage / reenactment scenes are drawn by Remotion, not in the base layer
        tl = t - sc["start"]
        if tl < sc["words"][0]["s"] - 0.1 or tl > sc["words"][-1]["e"] + 0.4 or tl < 0.45 or sc["dur"] - tl < 0.45:
            continue                     # captions not on screen, or inside a dissolve
        v = ink(frames[i])
        if v > limit:
            hits.append({"t": round(t, 1), "scene": sc["id"], "ink": round(v, 3)})
    return {"pass": not hits, "band": [y0, y1], "frames": n, "hits": hits[:12]}


if __name__ == "__main__":
    print(json.dumps(check(sys.argv[1], json.load(open(sys.argv[2])), int(sys.argv[3])), indent=1))
