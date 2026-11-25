"""Persistent learnings (self-improvement memory) — learnings.json (data) + learnings.md (readable summary, regenerated).

record(report)            after every generated video: niche, hook (text/format/score), engine/style, mode, what QC caught and fixed,
                          script-gate rewrites, voice regenerations, balance, timings.
feedback(video_id, ...)   real performance you enter after posting (views / likes / performed well|poorly) — stored separately and
                          weighted 3x above internal signals.
advice(topic)             what to lean toward / avoid for a new topic; every line says whether it rests on REAL feedback (n) or only
                          on internal QC signal (n). Research/hook/style steps read this first.
"""
from __future__ import annotations

import json
import re
import statistics
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = ROOT / "learnings.json"
MD = ROOT / "learnings.md"
REAL_W, QC_W = 3.0, 1.0


def _load() -> dict:
    return json.loads(J.read_text()) if J.exists() else {"videos": [], "feedback": []}


def _save(d: dict) -> None:
    J.write_text(json.dumps(d, ensure_ascii=False, indent=1))
    MD.write_text(render_md(d))


def niche(text: str) -> str:
    t = text.lower()
    for n, pat in [("mythology", r"mahabharat|ramayan|krishna|arjun|bhishma|draupadi|myth|epic|kurukshetra"), ("space", r"apollo|nasa|moon|space|rocket"),
                   ("history", r"histor|ancient|empire|war|king|mughal|taj|monument|independence|partition"), ("health", r"health|sleep|coffee|caffeine|eye|diet"),
                   ("tech", r"\bai\b|code|software|computer|tech|phone"), ("science", r"science|physics|brain|chemistry|biology")]:
        if re.search(pat, t):
            return n
    return "general"


def record(rep: dict) -> dict:
    d = _load()
    vid = Path(rep['output']['file']).stem   # one entry per finished file (topic x language x style)
    qc = rep.get("qc", [])
    entry = {"id": vid, "date": time.strftime("%Y-%m-%d %H:%M"), "topic": rep.get("topic"), "title": rep.get("title"), "niche": niche(f"{rep.get('topic')} {rep.get('title')}"),
             "lang": rep.get("lang"), "style": rep.get("style"), "engine": rep.get("engine"), "mode": rep.get("mode"),
             "hook": rep.get("hook"), "hook_pattern": rep.get("hook_pattern"),
             "hook_score": next((c.get("detail") for c in (rep.get("viral") or {}).get("checks", []) if c["name"] == "scroll-stop"), None),
             "qc_pass": rep.get("qc_pass"), "qc_failed_first": [c["name"] for c in (rep.get("qc_first") or []) if not c.get("pass")],
             "fixes": rep.get("fixes", []), "script_rewrites": len(rep.get("revisions", [])), "voice_regenerated": (rep.get("voice") or {}).get("regenerated"),
             "balance": next((c.get("detail") for c in qc if c["name"] == "balance"), None), "doc_fallbacks": rep.get("doc_fallbacks", []),
             "elapsed_s": (rep.get("steps") or {}).get("total"), "duration_s": (rep.get("output") or {}).get("duration_s"),
             "music_mood": (rep.get("audio") or {}).get("music_mood"),
             "known_issue_fails": [k["id"] for k in rep.get("known_issues", []) if k.get("status") == "FAIL"],
             "visual_review_issues": [i.get("what") for i in (rep.get("visual_review") or {}).get("issues", [])][:5]}
    d["videos"] = [v for v in d["videos"] if v["id"] != vid] + [entry]
    _save(d)
    return entry


def feedback(video_id: str, views: int | None = None, likes: int | None = None, rating: str | None = None, notes: str = "") -> dict:
    d = _load()
    fb = {"id": video_id, "date": time.strftime("%Y-%m-%d"), "views": views, "likes": likes, "rating": rating, "notes": notes}
    d["feedback"] = [f for f in d["feedback"] if f["id"] != video_id] + [fb]
    _save(d)
    return fb


def _real_score(d: dict) -> dict[str, float]:
    """+1 performed well / -1 poorly; with views, relative to the median of everything you've rated."""
    fb = d["feedback"]; views = [f["views"] for f in fb if f.get("views")]
    med = statistics.median(views) if views else None
    out = {}
    for f in fb:
        s = 0.0
        if f.get("rating") in ("good", "well", "performed well"): s += 1
        if f.get("rating") in ("bad", "poor", "performed poorly"): s -= 1
        if med and f.get("views"):
            s += 1 if f["views"] >= 1.5 * med else -1 if f["views"] <= 0.5 * med else 0
        if f.get("views") and f.get("likes") is not None:     # engagement: likes per view vs a typical ~4% for Reels
            lr = float(f["likes"]) / max(1.0, float(f["views"]))
            s += 0.5 if lr >= 0.06 else -0.5 if lr <= 0.02 else 0
        out[f["id"]] = max(-1.0, min(1.0, s))
    return out


def _qc_score(v: dict) -> float:
    """Internal signal: clean first-pass QC, few fixes, few rewrites = the approach worked smoothly (not a popularity signal)."""
    s = 1.0 if v.get("qc_pass") else -1.0
    s -= 0.25 * len(v.get("fixes") or []) + 0.25 * len(v.get("qc_failed_first") or [])
    return max(-1.0, min(1.0, s))


def stats(d: dict | None = None) -> dict:
    d = d or _load(); real = _real_score(d)
    agg: dict[tuple, dict] = {}
    for v in d["videos"]:
        for key in (("style", v.get("style")), ("hook", v.get("hook_pattern") or "?"), ("niche-style", f"{v.get('niche')}:{v.get('style')}")):
            a = agg.setdefault(key, {"n": 0, "real_n": 0, "w": 0.0, "sum": 0.0})
            a["n"] += 1
            if v["id"] in real:
                a["real_n"] += 1; a["sum"] += REAL_W * real[v["id"]]; a["w"] += REAL_W
            a["sum"] += QC_W * _qc_score(v); a["w"] += QC_W
    return {f"{k[0]}|{k[1]}": dict(a, score=round(a["sum"] / a["w"], 2) if a["w"] else 0) for k, a in agg.items()}


def advice(topic: str) -> list[str]:
    d = _load(); st = stats(d); n = niche(topic); out = []
    for key, a in sorted(st.items(), key=lambda kv: -abs(kv[1]["score"])):
        kind, val = key.split("|", 1)
        if kind == "niche-style" and not val.startswith(n + ":"):
            continue
        basis = f"REAL feedback (n={a['real_n']})" if a["real_n"] else f"internal QC signal only (n={a['n']}, no real performance data yet)"
        verdict = "lean toward" if a["score"] > 0.3 else "avoid / fix first" if a["score"] < -0.3 else "neutral"
        if verdict != "neutral":
            out.append(f"{verdict}: {kind} '{val}' (score {a['score']:+.2f}) — {basis}")
    return out[:8] or [f"no learnings yet for niche '{n}' — recommendations are best guesses"]


def render_md(d: dict) -> str:
    st = stats(d); real = _real_score(d)
    L = ["# Learnings (auto-generated — edit learnings.json, not this file)", "",
         "Read before research / hook / style decisions on a new video. Real performance (entered with video.py feedback) is weighted 3x above internal QC signal;",
         "every pattern says which it rests on.", "", "## Patterns"]
    for key, a in sorted(st.items(), key=lambda kv: -kv[1]["n"]):
        basis = f"real feedback n={a['real_n']}" if a["real_n"] else "internal QC only"
        L.append(f"- {key.replace('|', ': ')} — used {a['n']}×, score {a['score']:+.2f} ({basis})")
    notes = []
    for v in d["videos"]:
        if v.get("fixes"):
            notes.append(f"- {v['style']} ({v['niche']}, {v['lang']}): QC needed {len(v['fixes'])} fix round(s): " + "; ".join(a for f in v["fixes"] for a in f.get("actions", []))[:200])
        if v.get("doc_fallbacks"):
            notes.append(f"- documentary cuts fell back for {len(v['doc_fallbacks'])} scene(s) in '{v['title']}': {v['doc_fallbacks'][:3]}")
        if v.get("script_rewrites"):
            notes.append(f"- script gate rewrote {v['script_rewrites']} line(s) in '{v['title']}' before voice")
    L += ["", "## Observations"] + (notes or ["- none yet"])
    L += ["", "## Videos", "| video | niche | style | hook | QC | real feedback |", "|---|---|---|---|---|---|"]
    for v in d["videos"]:
        fb = next((f for f in d["feedback"] if f["id"] == v["id"]), None)
        fbs = (f"{fb.get('rating') or ''} {('views ' + str(fb['views'])) if fb.get('views') else ''}".strip() + f" ({real[v['id']]:+.0f})") if fb else "—"
        L.append(f"| {v['id']} | {v['niche']} | {v['style']} | {(v.get('hook') or '')[:60]} | {'pass' if v.get('qc_pass') else 'FAIL'} | {fbs} |")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    import sys
    if sys.argv[1:2] == ["advice"]:
        print("\n".join(advice(" ".join(sys.argv[2:]))))
    elif sys.argv[1:2] == ["show"]:
        print(MD.read_text() if MD.exists() else "no learnings yet")
