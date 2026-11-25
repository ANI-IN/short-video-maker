"""Turn a plain script into a storyboard, with no AI step.

  .venv/bin/python pipeline/script_to_storyboard.py script.txt --lang en --title "What is an API" --out output/my-video/storyboard.json

Rules: a blank line starts a new scene. A scene may open with a line "# Headline with a *keyword*"; otherwise the
headline is made from the scene's first words. The first scene is the hook, the last one the call to action.
A line "- item" adds a bullet (shown as numbered cards by styles that use `items`).
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import argparse
import json
import re
from pathlib import Path

EMOJI = {"hook": "🤔", "problem": "⚠️", "payoff": "💡", "cta": "💬"}
ICON = {"hook": "circle-help", "problem": "triangle-alert", "payoff": "lightbulb", "cta": "message-circle"}


def auto_headline(text: str) -> str:
    words = re.sub(r"[^\w\s'%₹-]", "", text.split(".")[0]).split()[:5]
    if not words:
        return "…"
    k = max(range(len(words)), key=lambda i: len(words[i]))
    words[k] = f"*{words[k]}*"
    return " ".join(words)


def build(script: str, lang: str, title: str) -> dict:
    blocks = [b.strip() for b in re.split(r"\n\s*\n", script.strip()) if b.strip()]
    if len(blocks) == 1:                                   # one paragraph: two sentences per scene
        ss = [s.strip() for s in re.split(r"(?<=[.!?।])\s+", blocks[0]) if s.strip()]
        blocks = [" ".join(ss[i:i + 2]) for i in range(0, len(ss), 2)]
    scenes = []
    for i, b in enumerate(blocks):
        lines = [l.strip() for l in b.splitlines() if l.strip()]
        head = lines.pop(0)[1:].strip() if lines and lines[0].startswith("#") else None
        items = [l[1:].strip() for l in lines if l.startswith("-")]
        text = " ".join(l for l in lines if not l.startswith("-")) or " ".join(items)
        role = "hook" if i == 0 else "cta" if i == len(blocks) - 1 and len(blocks) > 1 else "problem" if i == 1 and len(blocks) > 3 else "payoff"
        sc = {"id": f"s{i + 1}", "role": role, "narration": {lang: text}, "headline": {lang: head or auto_headline(text)}, "emoji": EMOJI[role], "icon": ICON[role]}
        if lang == "hl":
            sc["narration"]["hl_voice"] = text
        if items:
            sc["items"] = [{lang: x} for x in items[:4]]
        scenes.append(sc)
    return {"title": title, "topic": title, "slug": re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40] or "video", "source": "own-script", "scenes": scenes}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("script"); ap.add_argument("--lang", default="en", choices=["en", "hi", "hl"]); ap.add_argument("--title", default="My video"); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    board = build(Path(a.script).read_text(), a.lang, a.title)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(board, ensure_ascii=False, indent=1))
    print(f"{len(board['scenes'])} scenes -> {a.out}")
