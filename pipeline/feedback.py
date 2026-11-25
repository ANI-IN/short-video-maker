"""Record how a posted video performed; future scripts lean toward what really worked (learnings.md).
usage: video.py feedback VIDEO_ID [--views N] [--likes N] [--rating good|bad] [--notes TEXT]
VIDEO_ID is the video's file name without .mp4 (see: video.py list)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702
import argparse

import learnings

ap = argparse.ArgumentParser(prog="video.py feedback", description=__doc__)
ap.add_argument("video_id"); ap.add_argument("--views", type=int); ap.add_argument("--likes", type=int)
ap.add_argument("--rating", choices=["good", "bad"]); ap.add_argument("--notes", default="")
a = ap.parse_args()
if a.views is None and a.likes is None and not a.rating:
    sys.exit("Give at least one of --views, --likes or --rating.")
learnings.feedback(a.video_id, views=a.views, likes=a.likes, rating=a.rating, notes=a.notes)
print(f"Saved. learnings.md now reflects it.")
