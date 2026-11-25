"""Text layout check via local OCR (pipeline/ocr.py: Apple Vision on macOS, RapidOCR elsewhere): finds on-screen text that collides with other text or runs off the frame.

Samples a frame every `every` seconds, OCRs it, and flags
  overlap   two different text lines whose boxes intersect by > 20% of the smaller box (text over text)
  edge      a text line touching the frame edge (cut off)
It reports the worst frames with the colliding strings so the style can be fixed. Usage: textcheck.py <video.mp4> [--every 1]
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))


def ocr(png: str):
    import ocr as _ocr
    # English OCR only: Hindi videos rely on the fixed style text zones instead
    return [{"text": t.strip(), "box": box} for t, conf, box in _ocr.read(png, accurate=True) if conf >= 0.5 and len(t.strip()) >= 2]


def inter(a, b):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx)); iy = max(0, min(ay + ah, by + bh) - max(ay, by))
    return ix * iy / max(1e-6, min(aw * ah, bw * bh))


def check(video: str, every: float = 1.0, skip: list | None = None) -> dict:
    """skip: [(t0, t1), ...] windows to ignore - the cross-dissolves between scenes, where both scenes' titles are visible
    for ~0.3 s by design (that is a transition, not a layout collision)."""
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", video, "-vf", f"fps=1/{every},scale=540:-2", str(tmp / "f%04d.png")], check=True)
    problems = []
    frames = sorted(tmp.glob("f*.png"))
    for i, f in enumerate(frames):
        if skip and any(a <= i * every <= b for a, b in skip):
            continue
        lines = ocr(str(f))
        for a in range(len(lines)):
            for b in range(a + 1, len(lines)):
                ov = inter(lines[a]["box"], lines[b]["box"])
                ta, tb = lines[a]["text"].strip("- ").lower(), lines[b]["text"].strip("- ").lower()
                if not ta or not tb or ta in tb or tb in ta:      # OCR split one string into overlapping pieces
                    continue
                if ov > 0.2:
                    problems.append({"t": round(i * every, 1), "kind": "overlap", "a": lines[a]["text"][:40], "b": lines[b]["text"][:40], "overlap": round(ov, 2)})
            x, y, w, h = lines[a]["box"]
            if x < 0.004 or x + w > 0.996:
                problems.append({"t": round(i * every, 1), "kind": "edge", "a": lines[a]["text"][:40]})
    overlaps = [p for p in problems if p["kind"] == "overlap"]
    return {"pass": len(overlaps) == 0, "frames": len(frames), "overlaps": overlaps[:12], "edge": [p for p in problems if p["kind"] == "edge"][:6]}


if __name__ == "__main__":
    r = check(sys.argv[1], float(sys.argv[sys.argv.index("--every") + 1]) if "--every" in sys.argv else 1.0)
    print(json.dumps(r, ensure_ascii=False, indent=1) if "--json" in sys.argv else
          f"{'PASS' if r['pass'] else 'FAIL'}  overlaps: {len(r['overlaps'])} {[(p['t'], p['a'], p['b']) for p in r['overlaps'][:3]]}  edge: {len(r['edge'])}")
