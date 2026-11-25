"""Hook tournament: score 4-8 candidate opening lines and pick the strongest.

Rubric (from the Reels research: the first 1-3 s decide retention; text on screen from frame 0; tension then payoff):
  speakable   <= ~3 s to say (EN ~2.8 words/s, HI ~2.3) — 0..20
  specific    a number, a proper noun or a concrete object — 0..20
  tension     contradiction / myth-bust / open loop / question — 0..20
  stakes      second person or a personal stake ("you", "your", "आप") — 0..10
  concrete    concrete nouns over abstractions — 0..10
  clean       no stock AI phrasing (humanize.BANNED) — 0 or 20 (gate)
The research agent adds `fit` (0..10, niche fit from what's working on Reels); total = heuristic*0.85 + fit*1.5.
Usage: hooks.py <hooks.json> <lang>  -> prints ranked list. hooks.json = [{"hook": "...", "fit": 0-10, "format": "..."}]
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import humanize  # noqa: E402

TENSION = {"en": r"\b(never|not|wasn't|isn't|didn't|myth|wrong|lie|actually|really|secret|nobody|no one|stranger|why|how|what if|but)\b|\?",
           "hi": r"(नहीं|कभी|झूठ|सच|असल|राज़|राज|कोई नहीं|क्यों|कैसे|लेकिन|पर)|\?"}
YOU = {"en": r"\b(you|your|you're|you've)\b", "hi": r"(आप|आपको|आपने|तुम|तुम्हें)"}
# Hinglish (Roman): English cues + Roman Hindi ones
TENSION["hl"] = (r"\b(never|not|myth|wrong|lie|actually|really|secret|nobody|stranger|why|how|but|nahi|kabhi|jhooth|sach|asal|raaz|"
                  r"koi nahi|kyun|kaise|lekin|par)\b|\?")
YOU["hl"] = r"\b(you|your|aap|aapko|aapne|tum|tumhe|tumhare)\b"
ABSTRACT = r"\b(things|stuff|world|life|journey|secrets|facts|amazing|incredible|interesting)\b"


def score(hook: str, lang: str, fit: float = 5.0) -> dict:
    first = re.split(r"(?<=[.!?।])\s+", hook.strip())[0]
    words = first.split()
    secs = len(words) / {"en": 2.8, "hi": 2.3, "hl": 2.6}.get(lang, 2.5)
    s_speak = 20 if secs <= 3.2 else max(0, 20 - (secs - 3.2) * 8)
    s_spec = min(20, 10 * bool(re.search(r"\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\w+teen|twenty|thirty|forty|fifty|hundred|thousand|million|billion)\b|(एक|दो|तीन|चार|पाँच|पांच|दस|अठारह|बीस|सौ|हज़ार|लाख|करोड़)", hook, re.I)) +
                 10 * bool(re.search(r"(?<!^)\b[A-Z][a-z]+", hook) or re.search(r"[ऀ-ॿ]{4,}", hook) or
                           (re.match(r"^[A-Z][a-z]{4,}", hook) and not re.match(r"^(there|these|those|their|maybe|every|never|socho|dekho|suno|agar|kabhi|kya|yeh|woh)\b", hook, re.I))))
    if lang == "hl" and s_spec < 20 and re.search(r"\b(ek|do|teen|chaar|char|paanch|das|athaarah|bees|sau|hazaar|lakh|crore)\b", hook, re.I):
        s_spec = min(20, s_spec + 10)
    s_ten = 20 if re.search(TENSION[lang], hook, re.I) else 6
    s_you = 10 if re.search(YOU[lang], hook, re.I) else 3
    s_conc = 4 if re.search(ABSTRACT, hook, re.I) else 10
    banned = [p for p in humanize.BANNED.get(lang, []) if re.search(p, hook, re.I)]
    s_clean = 0 if banned else 20
    heur = s_speak + s_spec + s_ten + s_you + s_conc + s_clean
    total = round(heur * 0.85 + fit * 1.5, 1)
    return {"hook": hook, "total": total, "heuristic": heur, "fit": fit, "seconds": round(secs, 1),
            "parts": {"speakable": round(s_speak), "specific": s_spec, "tension": s_ten, "stakes": s_you, "concrete": s_conc, "clean": s_clean},
            "banned": banned}


def rank(cands: list[dict], lang: str) -> list[dict]:
    out = [dict(c, **score(c["hook"], lang, float(c.get("fit", 5)))) for c in cands]
    return sorted(out, key=lambda r: -r["total"])


if __name__ == "__main__":
    cands = json.loads(Path(sys.argv[1]).read_text())
    for r in rank(cands, sys.argv[2] if len(sys.argv) > 2 else "en"):
        print(f"{r['total']:5.1f}  ({r['seconds']}s)  {r['hook']}   {r['parts']}{'  BANNED ' + str(r['banned']) if r['banned'] else ''}")
