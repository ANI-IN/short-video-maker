"""Virality gate (Instagram Reels): a script must pass BOTH this and the humaniser (pipeline/humanize.py).

  scroll-stop   first sentence lands in <= ~3 s (words / rate) and carries tension, a number or a direct "you" (hooks.py rubric >= 60)
  pacing        no scene longer than 14 s of speech, no sentence over 22 words, overall rate in the Reels band for the style
  payoff        the payoff scenes mention what the hook promised (shared key terms), so no bait-and-switch
  reaction      the closing line invites a topic-specific reaction (a question / "which" / "send" / "save") — not a generic outro
Usage: viral.py <storyboard.json> <lang> [--style name]
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hooks  # noqa: E402
import humanize  # noqa: E402

STOP = {"en": set("the a an of to in on and or but is are was were it its this that with for as at by from be been have has had you your i we they he she his her their them our".split()),
        "hi": set("का की के है हैं था थे और में से को ने पर भी तो यह वह एक हो कि".split())}


STOP["hl"] = STOP["en"] | set("ka ki ke hai hain tha the aur mein se ko ne par bhi toh to yeh ye woh wo ek ho kya kaise kyun nahi bhi hi".split())


def keyterms(text: str, lang: str) -> set[str]:
    ws = re.findall(r"[\wऀ-ॿ]+", text.lower())
    return {w for w in ws if w not in STOP[lang] and (len(w) > 3 or w.isdigit())}


HOOK_BAR = 79   # = the Hindi MCP hook ("एआई स्मार्ट है, पर अंधा है।", 79.5) the user rated as working; English must match it


def check(board: dict, lang: str, style: str = "") -> dict:
    sc = board["scenes"]; T = lambda s: s["narration"][lang]
    # documentary narration now runs brisker than default (voice_worker doc pace: en 190 / hi 172 / hl 178 wpm vs 160/155/158,
    # from the reference analysis), so its speech per scene is ~12 % shorter, not longer as the old calm profile assumed
    rate = {"en": 2.8, "hi": 2.3, "hl": 2.6}[lang] * ({"en": 1.19, "hi": 1.11, "hl": 1.13}[lang] if style == "documentary-history" else 1.0)
    out = []
    hook = T(sc[0]); first = humanize.sentences(hook)[0]
    # Hook tournament (hard gate, every language): at least 4 distinct candidate openings for THIS language must be in the
    # storyboard ("hook_candidates": {"<lang>": [{"hook", "format", "fit"}, ...]}), the video must open with the top-ranked
    # one, and it must score >= HOOK_BAR (the level of the Hindi MCP hook the user rated as working). A flat opener can't pass.
    cands = (board.get("hook_candidates") or {}).get(lang) or []
    cands = [c if isinstance(c, dict) else {"hook": c} for c in cands]
    # a hook beat can be two sentences (number + question): when the narration opens with a candidate, judge that whole
    # beat - the tournament scored it that way, so the gate must too
    nrm = lambda x: re.sub(r"\W+", " ", x.lower()).strip()
    for c in cands:
        if c.get("hook") and len(c["hook"]) > len(first) and nrm(hook).startswith(nrm(c["hook"])):
            first = c["hook"]
    uniq = {re.sub(r"\W+", " ", c["hook"].lower()).strip() for c in cands if c.get("hook")}
    ranked = hooks.rank(cands, lang) if cands else []
    fit = next((float(c.get("fit", 6)) for c in cands if c.get("hook", "").strip().startswith(first.strip()[:25])), float(board.get("hook_fit", 6)))
    h = hooks.score(first, lang, fit)
    top = ranked[0] if ranked else None
    opens_with_top = bool(top) and (top["hook"].strip()[:25].lower() == first.strip()[:25].lower() or h["total"] >= top["total"] - 1.0)
    ok = len(uniq) >= 4 and opens_with_top and h["total"] >= HOOK_BAR and h["seconds"] <= 3.6
    why = [] if ok else [m for m, bad in ((f"only {len(uniq)} distinct hook candidates (need 4+)", len(uniq) < 4),
                                         ("the video does not open with the top-ranked hook", not opens_with_top),
                                         (f"hook score {h['total']} < {HOOK_BAR}", h["total"] < HOOK_BAR),
                                         (f"first line ~{h['seconds']}s (> 3.6 s)", h["seconds"] > 3.6)) if bad]
    out.append({"name": "scroll-stop", "pass": ok,
                "detail": f"first line ~{h['seconds']}s, hook score {h['total']} (bar {HOOK_BAR}), {len(uniq)} candidates"
                          + (f", top: {top['hook'][:60]!r} {top['total']}" if top else "") + (f" | {'; '.join(why)}" if why else ""),
                "line": first, "ranked": [(r["hook"], r["total"]) for r in ranked[:5]]})
    long_scenes = [s["id"] for s in sc if len(T(s).split()) / rate > 14]
    long_sents = [x for s in sc for x in humanize.sentences(T(s)) if len(x.split()) > 22]
    out.append({"name": "pacing", "pass": not long_scenes and not long_sents,
                "detail": f"scenes over 14 s: {long_scenes or 'none'}; sentences over 22 words: {len(long_sents)}"})
    hk = keyterms(hook + " " + json.dumps(sc[0].get("headline", ""), ensure_ascii=False), lang)
    pay = [s for s in sc if s.get("role") == "payoff"] or sc[len(sc) // 2:-1]
    pk = keyterms(" ".join(T(s) for s in pay), lang)
    shared = sorted(hk & pk)
    out.append({"name": "payoff", "pass": len(shared) >= 1, "detail": f"hook terms paid off in the payoff: {shared[:6] or 'NONE'}"})
    end = T(sc[-1])
    react = re.search({"en": r"\?|\b(which|what|who|send|share|save|tag|tell me|comment)\b",
                       "hl": r"\?|\b(kaun|kya|kaunsa|bhejo|bhej do|share|save|tag|batao|comment)\b"}.get(lang, r"\?|(कौन|क्या|भेजिए|भेजें|भेजो|शेयर|सेव|बताइए|बताएँ|बताओ|कमेंट)"), end, re.I)
    generic = re.search(humanize.GENERIC_CTA[lang], end, re.I)
    topical = len(keyterms(end, lang) & keyterms(" ".join(T(s) for s in sc[:-1]), lang)) >= 1
    out.append({"name": "reaction", "pass": bool(react) and topical and not generic,
                "detail": f"closing line: invites a reaction={bool(react)}, tied to the topic={topical}, generic outro={bool(generic)}", "line": end})
    return {"pass": all(c["pass"] for c in out), "checks": out}


if __name__ == "__main__":
    b = json.loads(Path(sys.argv[1]).read_text())
    st = sys.argv[sys.argv.index("--style") + 1] if "--style" in sys.argv else ""
    print(json.dumps(check(b, sys.argv[2], st), ensure_ascii=False, indent=1))
