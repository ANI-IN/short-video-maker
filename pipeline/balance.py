"""Frame-balance check: does the picture fill the whole 9:16 frame, or is everything crowded into one part?

For sampled frames it measures visual detail (edge density + local contrast) in 8 horizontal bands, top to bottom.
A band counts as "dead" in a frame when its detail is < 22% of that frame's busiest band. The video fails when any
band is dead in more than 40% of frames (a persistent empty zone), or the median frame has 3+ dead bands.
Usage: balance.py <video.mp4> [--every 1.0] [--json]
"""
from __future__ import annotations

import json
import subprocess
import sys

import numpy as np

W, H, BANDS = 216, 384, 8


def frames(video: str, every: float):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vf", f"fps=1/{every},scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)


def detail(fr: np.ndarray) -> np.ndarray:
    gx = np.abs(np.diff(fr, axis=1))[:-1, :]
    gy = np.abs(np.diff(fr, axis=0))[:, :-1]
    g = (gx + gy) > 14                                   # edges
    out = []
    for b in range(BANDS):
        y0, y1 = b * (H - 1) // BANDS, (b + 1) * (H - 1) // BANDS
        band = fr[y0:y1]
        out.append(g[y0:y1].mean() + 0.004 * band.std())   # edges + a little credit for tonal variation (gradients, photos)
    return np.array(out)


def check(video: str, every: float = 1.0, skip: list | None = None) -> dict:
    """skip: [(t0, t1), ...] windows not judged (real-footage scenes: a photo's own composition, e.g. open sky, isn't an
    empty layout zone)."""
    fs = frames(video, every)
    if skip:
        keep = [i for i in range(len(fs)) if not any(a <= i * every < b for a, b in skip)]
        if len(keep) >= 3:
            fs = fs[keep]
    D = np.stack([detail(f) for f in fs])                 # frames x bands
    rel = D / np.maximum(1e-6, D.max(axis=1, keepdims=True))
    dead = rel < 0.22
    band_dead_frac = dead.mean(axis=0)
    per_frame_dead = dead.sum(axis=1)
    worst = [int(i) for i in np.argsort(-band_dead_frac)[:3] if band_dead_frac[i] > 0.4]
    ok = not worst and np.median(per_frame_dead) < 3
    names = ["top", "upper", "upper-mid", "mid-high", "mid-low", "lower-mid", "lower", "bottom"]
    return {"pass": bool(ok), "frames": len(fs), "dead_band_share": {names[i]: round(float(band_dead_frac[i]), 2) for i in range(BANDS)},
            "empty_zones": [names[i] for i in worst], "median_dead_bands": float(np.median(per_frame_dead)),
            "detail_by_band": [round(float(x), 4) for x in D.mean(axis=0)]}


if __name__ == "__main__":
    r = check(sys.argv[1], float(sys.argv[sys.argv.index("--every") + 1]) if "--every" in sys.argv else 1.0)
    print(json.dumps(r, indent=1) if "--json" in sys.argv else f"{'PASS' if r['pass'] else 'FAIL'}  empty zones: {r['empty_zones'] or 'none'}  dead-share {r['dead_band_share']}")
