"""Instagram post kit: a ready-to-paste caption + hashtags in the video's language.

Uses the storyboard's "instagram" block (written by the script step from the same Reels research as the hook). If it is missing,
builds a careful fallback from the script itself: the hook line, one line of payoff, the closing question, and hashtags from the
topic's key terms + niche tags. Writes <base>.caption.txt and returns {"caption", "hashtags", "source"}.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import humanize  # noqa: E402

NICHE = {
    "history": ["#history", "#historyfacts", "#historybuff", "#didyouknow"], "myth": ["#mythology", "#indianmythology", "#mahabharat", "#epic"],
    "space": ["#space", "#nasa", "#apollo11", "#spacehistory"], "india": ["#india", "#incredibleindia", "#indianhistory"],
    "science": ["#science", "#sciencefacts", "#learnsomethingnew"], "health": ["#health", "#wellness", "#healthtips"],
    "gita": ["#bhagavadgita", "#krishna", "#jaishreekrishna", "#gita", "#motivation"],
    "tech": ["#tech", "#ai", "#technology", "#aitools", "#developers", "#techindia", "#coding"],
}
HI_NICHE = {"gita": ["#गीता", "#bhagavadgita", "#krishna"], "history": ["#इतिहास", "#history"], "myth": ["#महाभारत", "#mahabharat", "#mythology"], "india": ["#भारत", "#india"]}


def _niches(text: str) -> list[str]:
    t = text.lower(); out = []
    if re.search(r"gita|bhagavad|गीता|श्लोक|shloka", t): out.append("gita")   # Gita content is its own Reels niche (devotion + motivation)
    if re.search(r"histor|ancient|empire|\bwar\b|\bking|mughal|taj|\b1[0-9]{3}\b|apollo", t): out.append("history")
    if re.search(r"mahabharat|krishna|arjun|bhishma|draupadi|kurukshetra|ramayan|mytholog|\bepic\b", t): out.append("myth")
    if re.search(r"apollo|nasa|\bmoon\b|\bspace\b|rocket|\borbit", t): out.append("space")
    if re.search(r"\bindia|agra|delhi|mahabharat|taj mahal|kurukshetra|hindi", t): out.append("india")
    if not out and re.search(r"\bai\b|software|computer|\btech|\bapps?\b|protocol|\bserver|\bapi\b|developer|\bcode\b|github|\bmcp\b|openai|anthropic", t): out.append("tech")
    if not out and re.search(r"science|physics|chemistry|biology|neuro|\bbrain\b", t): out.append("science")
    if not out and re.search(r"health|sleep|caffeine|coffee|diet|eye strain|wellness", t): out.append("health")
    return out or ["history"] if "history" in t else out or ["science"]


NUMWORD = re.compile(r"^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|hundred|thousand|million|the|this|that|they|when|what|which|there|here|then|and|but|nearly|by|on|in|if|you|your|honestly|almost)$", re.I)


def _proper_tags(board: dict, lang: str, text: str) -> list[str]:
    """Names that carry the topic. A name = a capitalised word that is NOT at the start of a sentence (so "The", "Lost",
    "Historians" never count); consecutive names are joined (Shah Jahan -> #shahjahan). Kept if said twice, or if it is
    also in the title/topic."""
    names = []
    for sent in re.split(r"(?<=[.!?])\s+", text):
        toks = re.findall(r"[A-Za-z']+", sent)
        i = 1
        while i < len(toks):
            if toks[i][:1].isupper() and len(toks[i]) > 2 and not NUMWORD.match(toks[i]):
                j = i
                while j + 1 < len(toks) and toks[j + 1][:1].isupper() and not NUMWORD.match(toks[j + 1]):
                    j += 1
                names.append("".join(toks[i:j + 1])); i = j + 1
            else:
                i += 1
    cnt = {n: names.count(n) for n in set(names)}
    head = (board.get("title", "") + " " + board.get("topic", "")).lower().replace(" ", "")
    keep = sorted([n for n in cnt if cnt[n] >= 2 or n.lower() in head], key=lambda n: (-(n.lower() in head), -cnt[n]))
    tags = [re.sub(r"[^0-9a-z]", "", re.sub(r"'s$", "", n.lower())) for n in keep]
    return list(dict.fromkeys("#" + t for t in tags if len(t) >= 4))[:4]


def build(board: dict, lang: str) -> dict:
    ig = board.get("instagram") or {}
    if isinstance(ig.get("caption"), dict):
        ig = {"caption": ig["caption"].get(lang), "hashtags": ig.get("hashtags", {}).get(lang) if isinstance(ig.get("hashtags"), dict) else ig.get("hashtags")}
    if ig.get("caption"):
        tags = ig.get("hashtags") or []
        return {"caption": ig["caption"].strip(), "hashtags": tags, "source": "script step (Reels research)"}
    sc = board["scenes"]; T = lambda s: s["narration"][lang].replace("*", "")
    hs = humanize.sentences(T(sc[0]))
    hook = " ".join(hs) if len(" ".join(hs)) <= 170 else " ".join(hs[:2])     # the whole hook beat, not a fragment of it
    pay = next((s for s in sc if s.get("role") == "payoff"), sc[len(sc) // 2])
    narr = lambda x: (x.get("stage") or {}).get("speaker") in (None, "narrator")
    if not narr(pay):                      # a character's line out of context reads oddly in a caption: use the narrator's
        pay = next((s for s in sc[1:] if s.get("role") == "payoff" and narr(s)), None) or next((s for s in sc[len(sc) // 2:] if narr(s)), pay)
    payline = humanize.sentences(T(pay))[0]
    ends = humanize.sentences(T(sc[-1]))
    qi = max((i for i, x in enumerate(ends) if x.rstrip().endswith("?")), default=None)
    end = " ".join(ends[qi:]) if qi is not None else ends[-1]          # the script's own question (+ "Comment mein batao")
    q = end if qi is not None or end.endswith("?") else {"en": "Which part surprised you most?", "hl": "Sabse zyada kya surprise kiya? Comment mein batao"}.get(lang, "आपको सबसे ज़्यादा क्या चौंकाया? कमेंट में बताइए")
    caption = f"{hook}\n\n{payline}\n\n{q} 👇"
    topic = f"{board.get('title', '')} {board.get('topic', '')} " + " ".join(T(s) for s in sc)
    niches = _niches(topic)
    tags = []
    for n in niches:                       # up to 3 per niche so every niche is represented
        tags += ((HI_NICHE.get(n, []) if lang == "hi" else []) + NICHE.get(n, []))[:3 if len(niches) > 1 else 6]
    # names / acronyms from the topic itself (MCP, OpenAI...) and, for Hindi/Hinglish, the English script when it exists
    topic_txt = f"{board.get('topic', '')} {board.get('title', '')}"
    acr = ["#" + a.lower() for a in re.findall(r"\b[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*\b", topic_txt) if len(a) >= 2]
    full = re.findall(r"\(([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})\)|([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})(?= \()", topic_txt)
    acr += ["#" + "".join(x).replace(" ", "").lower() for f in full for x in f if x]
    if lang in ("hi", "hl"):
        acr += ["#techinhindi"] if "tech" in niches else []
    tags = list(dict.fromkeys(tags[:8] + acr)) + _proper_tags(board, lang, " ".join(s["narration"]["en"] if isinstance(s["narration"], dict) and "en" in s["narration"] else T(s) for s in sc) + " " + board.get("title", ""))
    tags = list(dict.fromkeys(tags + ["#reels"]))[:12]      # a focused set: niche + the names in the story + #reels
    return {"caption": caption, "hashtags": tags, "source": "fallback from the script (no instagram block in the storyboard)"}


def write(board: dict, lang: str, out_base: Path) -> dict:
    kit = build(board, lang)
    # footage licences (CC BY / BY-SA need attribution) go in the caption, never into the frame
    cr = out_base.parent / (out_base.name + ".CREDITS.txt")
    lines = [l.split(": ", 1)[-1] for l in (cr.read_text().splitlines()[1:] if cr.exists() else []) if l.strip()]
    kit["credits"] = lines
    credit_block = ("\n\n" + {"en": "Visuals: ", "hl": "Visuals: "}.get(lang, "चित्र: ") + " | ".join(lines)) if lines else ""
    (out_base.parent / (out_base.name + ".caption.txt")).write_text(kit["caption"] + credit_block + "\n\n" + " ".join(kit["hashtags"]) + "\n")
    return kit


if __name__ == "__main__":
    b = json.loads(Path(sys.argv[1]).read_text())
    print(json.dumps(build(b, sys.argv[2]), ensure_ascii=False, indent=1))
