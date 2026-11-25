"""On-screen text recognition for the QC checks, on every platform.

  macOS         : Apple Vision through ocrmac
  Windows/Linux : RapidOCR (ONNX Runtime; its small models ship inside the pip package)

read(png, accurate) -> [(text, confidence, (x, y, w, h))] with a normalised box and a TOP-LEFT origin.
"""
from __future__ import annotations

import sys

_rapid = None


def read(png: str, accurate: bool = True) -> list:
    if sys.platform == "darwin":
        from ocrmac import ocrmac
        res = ocrmac.OCR(png, recognition_level="accurate" if accurate else "fast", language_preference=["en-US"]).recognize()
        return [(t, float(c), (x, 1 - y - h, w, h)) for t, c, (x, y, w, h) in res]      # Vision: bottom-left origin
    global _rapid
    if _rapid is None:
        from rapidocr_onnxruntime import RapidOCR
        _rapid = RapidOCR()
    from PIL import Image
    W, H = Image.open(png).size
    res, _ = _rapid(png)
    out = []
    for box, t, c in res or []:
        xs, ys = [p[0] for p in box], [p[1] for p in box]
        out.append((t, float(c), (min(xs) / W, min(ys) / H, (max(xs) - min(xs)) / W, (max(ys) - min(ys)) / H)))
    return out
