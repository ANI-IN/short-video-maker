"""Script humaniser / slop linter (no "Humanise" skill is installed, so the rules live here).

Checks narration for stock AI phrasing, uniform rhythm, repeated sentence openers and template transitions.
Usage: python pipeline/humanize.py <storyboard.json> [--lang en]   -> prints JSON {pass, score, issues[]}
Hard fails: any banned phrase. Warnings: rhythm/openers/transitions (the writer should fix them anyway).
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
import re
import statistics
import sys

BANNED = {
    "en": [
        r"in today'?s (fast[- ]paced|modern|digital) world", r"here'?s the (twist|kicker|thing|catch)", r"let that sink in", r"buckle up",
        r"game[- ]?changer", r"\bdelve", r"\bdive (in|into|deep)", r"\bunlock", r"\bunleash", r"you won'?t believe", r"mind[- ]?blowing",
        r"it'?s (important|worth) (to note|noting)", r"in conclusion", r"picture this", r"imagine a world", r"plot twist", r"the truth is",
        r"little[- ]known", r"ever wondered", r"stay tuned", r"smash (that|the) (like|subscribe)", r"without further ado", r"\bjourney\b",
        r"\btapestry", r"testament to", r"\bnavigat(e|ing) the", r"\blandscape of", r"\brealm\b", r"\belevate", r"\bseamless", r"\bharness",
        r"\bembark", r"symphony of", r"in the world of", r"when it comes to", r"not just .{1,40} but", r"it'?s not just", r"\bcrucial\b",
        r"\bmoreover\b", r"\bfurthermore\b", r"\bultimately\b", r"\bfascinating\b", r"\bintriguing\b", r"secrets? (that|they) don'?t want",
        r"what (happens|happened) next (will|is)", r"the answer (may|might|will) surprise you", r"\bgame plan\b", r"at the end of the day",
        r"little did (they|he|she|we|anyone) know", r"the results? (was|were) (shocking|astonishing|staggering)", r"but that'?s not all", r"fast[- ]forward to",
        r"needless to say", r"believe it or not", r"what'?s more", r"and the best part\??", r"here'?s (where|why|what) it gets",
        r"you'?ll never guess", r"the (shocking|surprising) truth", r"hold on to your", r"spoiler alert",
    ],
    "hi": [
        r"आज की (तेज़|तेज) (रफ़्तार|रफ्तार) (वाली )?दुनिया", r"यकीन नहीं (होगा|करेंगे)", r"होश उड़ा", r"दिमाग़? हिला", r"अंत में,? हम कह सकते",
        r"सफ़र|सफर पर निकल", r"ग़ौर करने वाली बात", r"जादुई दुनिया", r"रहस्यमयी दुनिया", r"आइए जानते हैं", r"चलिए शुरू करते हैं",
    ],
}
SOFT = {"en": [r"^so,? ", r"^now,? ", r"^well,? ", r"^basically"], "hi": [r"^तो,? ", r"^अब,? "]}
# forced drama: words a person rarely uses when telling a friend something
DRAMA = {"en": r"\b(shocking(ly)?|insane(ly)?|mind[- ]?blowing|unbelievabl[ey]|jaw[- ]dropping|earth[- ]shattering|(?<!the )(?<!this )epic(?!'s)(ally)?|legendary|absolutely (wild|crazy))\b",
         "hi": r"(चौंकाने वाला|हैरान कर देने वाला|होश उड़ा देने वाला|दिमाग़ हिला)"}
# generic marketing CTA (fails unless the closing line is tied to this topic)
GENERIC_CTA = {"en": r"(follow for more|like and subscribe|smash (the|that)|don'?t forget to (like|follow|subscribe)|hit the (like|bell)|follow (me|us) for|subscribe for more|comment below if)",
               "hi": r"(लाइक और सब्सक्राइब|फ़ॉलो करें|फॉलो करें|सब्सक्राइब करें|फ़ॉलो कीजिए|फॉलो कीजिए|बेल आइकन)"}

# Hinglish (Roman script, code-mixed): the English stock phrases + their Hinglish forms
BANNED["hl"] = BANNED["en"] + [r"yakeen nahi (hoga|karoge)", r"hosh ud (jayenge|jaenge)", r"aapke hosh", r"chaliye shuru karte hain",
                               r"aaj ki (tez|fast) (raftaar|duniya)", r"rehasyamayi duniya", r"jaadui duniya"]
SOFT["hl"] = [r"^so,? ", r"^toh,? ", r"^ab,? ", r"^basically"]
DRAMA["hl"] = DRAMA["en"][:-3] + r"|hosh uda|dimaag hila|shocking hai)\b"
GENERIC_CTA["hl"] = (r"(like,? share (and|aur|&) subscribe|like aur subscribe|follow (karo|karein|kijiye) (for more|aur)|channel ko subscribe|"
                     r"bell icon|follow for more|like and subscribe)")
GENERIC_CTA["hi"] = GENERIC_CTA["hi"][:-1] + r"|बेल आइकन|चैनल को सब्सक्राइब|लाइक, शेयर)"

# Indian audience: western units/currency/number words fail unless the storyboard says the topic is about elsewhere ("region": "global")
NUMW = r"(\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred|thousand|a few|several)"
WESTERN = r"(\$\s?\d|\bUSD\b|\bdollars?\b|\bmillions?\b|\bbillions?\b|\b" + NUMW + r"\s+(miles?|feet|foot(?! soldiers?)(?!ball)|pounds?|inches|ounces)\b|°\s?F\b|\bfahrenheit\b|" \
          r"\b\d{1,2}/\d{1,2}/\d{2,4}\b(?# date written MM/DD is ambiguous))"
# mythological / historical names: frequent Western or sloppy transliterations -> the correct form
NAME_FIX = {r"\bYudhisthira?\b": "Yudhishthira", r"\bYudhisthir\b": "Yudhishthir", r"\bDhritrashtra\b": "Dhritarashtra",
            r"\bDhritarashtr\b": "Dhritarashtra", r"\bAshwathama\b": "Ashwatthama", r"\bAshvatthama\b": "Ashwatthama",
            r"\bDraupati\b": "Draupadi", r"\bKurukshethra\b": "Kurukshetra", r"\bKurushetra\b": "Kurukshetra",
            r"\bDuryodhan(?!a)\b(?=.*Duryodhana)": "Duryodhana", r"\bRamayan\b(?=.*Ramayana)": "Ramayana", r"\bHanumaan\b": "Hanuman",
            r"\bBheeshma\b": "Bhishma", r"\bArjunah\b": "Arjuna", r"\bKrisna\b": "Krishna", r"\bSanjay(?!a)\b(?=.*Sanjaya)": "Sanjaya",
            "धृतराष्ट(?!्र)": "धृतराष्ट्र", "युधिष्ठर": "युधिष्ठिर", "अश्वथामा": "अश्वत्थामा", "द्रौपती": "द्रौपदी", "भिष्म": "भीष्म", "कुरूक्षेत्र": "कुरुक्षेत्र"}

# English purity (English variant only): no Hindi / Hinglish words, even ones common in Indian English speech.
# Exceptions: proper nouns (people, places, epics), acronyms, and lakh/crore (Indian number words the localisation rule requires).
HINGLISH_WORDS = set("""jugaad jugaads yaar yaara bhai bhaiya behen didi desi accha achha acha arre arey haan han nahi nahin matlab kya kyun toh
bas sab theek thik chalo chal dekho suno ji paisa paise wala wale wali wallah dhaba bindaas jhakaas funda fundas timepass gaana filmy pakka chalta
jaldi abhi bilkul ekdum zabardast mast sahi galat dost dosti log logon kaam bakwas jhakkas chakka dhamaka masala naya purana bahut bohot thoda
zyada kitna kaise kaisa kaun kahan yahan wahan aur lekin magar phir bhi sirf jab tab agar hai hain tha thi hoga karo karna kar kiya diya liya
namaste namaskar shukriya dhanyavaad arrey oye haanji theekhai chaiwala""".split())
ALLOWED_INDIAN_EN = {"lakh", "lakhs", "crore", "crores", "rupee", "rupees"}
_DICT = None


def _english_dict() -> set:
    """Webster's word list + the misaki US/GB pronunciation lexicons (178k modern words incl. inflections). Note: these
    contain some Hindi loanwords (jugaad, desi), which is why HINGLISH_WORDS is checked first and always fails."""
    global _DICT
    if _DICT is None:
        _DICT = set()
        try:
            _DICT |= {w.strip().lower() for w in open("/usr/share/dict/words", encoding="utf-8", errors="ignore")}
        except Exception:
            pass
        try:
            import glob as _g, os as _o, misaki
            for f in _g.glob(_o.path.join(_o.path.dirname(misaki.__file__), "data", "*_*.json")):
                if _o.path.basename(f)[:3] in ("us_", "gb_"):
                    _DICT |= {k.lower() for k in json.load(open(f))}
        except Exception:
            pass
    return _DICT


def _englishish(w: str, d: set) -> bool:
    if w in d:
        return True
    for suf, rep in (("'s", ""), ("s", ""), ("es", ""), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"), ("ly", ""), ("ies", "y"),
                     ("er", ""), ("ers", ""), ("est", ""), ("res", "er"), ("re", "er"), ("ised", "ize"), ("ise", "ize"), ("our", "or"), ("n't", "")):
        if w.endswith(suf) and (w[: -len(suf)] + rep) in d:
            return True
    return False


def purity_en(board: dict) -> list:
    """Issues for non-English words in the English script (narration + on-screen text)."""
    d, out = _english_dict(), []
    for sc in board["scenes"]:
        texts = [sc["narration"].get("en", "") if isinstance(sc["narration"], dict) else sc["narration"]]
        hl = sc.get("headline")
        texts.append(hl.get("en", "") if isinstance(hl, dict) else str(hl or ""))
        for it in sc.get("items") or []:
            texts.append(it.get("en", "") if isinstance(it, dict) else str(it))
        for t in texts:
            if re.search(r"[\u0900-\u097F]", t):
                out.append({"level": "fail", "scene": sc["id"], "rule": "language-purity", "text": t[:60], "fix": "English variant: no Devanagari text"})
            for sent in re.split(r"(?<=[.!?])\s+", t.replace("*", "")):
                toks = re.findall(r"[A-Za-z][A-Za-z'’-]*", sent)
                for i, tok in enumerate(toks):
                    w = tok.lower().replace("’", "'").strip("'-")
                    if not w or w in ALLOWED_INDIAN_EN:
                        continue
                    if w in HINGLISH_WORDS or (w.endswith("s") and len(w) > 4 and w[:-1] in HINGLISH_WORDS):
                        out.append({"level": "fail", "scene": sc["id"], "rule": "language-purity", "text": tok,
                                    "fix": f"'{tok}' is Hindi/Hinglish: the English variant must be 100% English (e.g. jugaad -> workaround / hack)"})
                        continue
                    proper = tok[:1].isupper()       # names / places / brands (Hindi words are caught above even when capitalised)
                    if proper or tok.isupper() or "-" in w and all(_englishish(x, d) or not x for x in w.split("-")):
                        continue
                    if len(w) > 3 and not _englishish(w, d):
                        out.append({"level": "warn", "scene": sc["id"], "rule": "language-purity-check", "text": tok,
                                    "fix": "not a dictionary English word: make sure it is English (not Hindi/Hinglish)"})
    return out


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?।])\s+", text.strip()) if s.strip()]


def lint(board: dict, lang: str) -> dict:
    issues = []
    scenes = board["scenes"]
    all_s = []
    for sc in scenes:
        txt = sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"]
        for pat in BANNED.get(lang, []):
            m = re.search(pat, txt, re.I)
            if m:
                issues.append({"level": "fail", "scene": sc["id"], "rule": "stock-phrase", "text": m.group(0), "fix": "say it the way a person would, specific to this topic"})
        ss = sentences(txt)
        all_s += [(sc["id"], s) for s in ss]
        if txt.count("—") + txt.count(" - ") > 2:
            issues.append({"level": "warn", "scene": sc["id"], "rule": "dash-overuse", "text": "many dashes", "fix": "use full stops; spoken scripts breathe in sentences"})
        if txt.count("!") > 1:
            issues.append({"level": "warn", "scene": sc["id"], "rule": "exclamation-overuse", "text": txt, "fix": "one exclamation at most; let the fact carry it"})
    # forced drama (more than one dramatic adjective = fail; one = warn)
    hits = [(sc["id"], m.group(0)) for sc in scenes for m in re.finditer(DRAMA[lang], (sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"]), re.I)]
    for sid, w in hits:
        issues.append({"level": "fail" if len(hits) > 1 else "warn", "scene": sid, "rule": "forced-drama", "text": w, "fix": "describe it the way you'd tell a friend; let the fact be the drama"})
    # generic CTA bolted on the end
    last = scenes[-1]; lt = last["narration"][lang] if isinstance(last["narration"], dict) else last["narration"]
    if re.search(GENERIC_CTA[lang], lt, re.I):
        issues.append({"level": "fail", "scene": last["id"], "rule": "generic-cta", "text": re.search(GENERIC_CTA[lang], lt, re.I).group(0),
                       "fix": "close with a thought or question tied to THIS topic that makes people comment/share/save (e.g. ask which detail surprised them)"})
    # English variant: language purity (hard gate)
    if lang == "en":
        issues += purity_en(board)
    # Indian audience localisation + name accuracy (whole script)
    full = " ".join((sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"]) + " " +
                    (sc.get("headline", {}).get(lang, "") if isinstance(sc.get("headline"), dict) else str(sc.get("headline", ""))) for sc in scenes)
    if board.get("region", "india") == "india":
        for m in re.finditer(WESTERN, full, re.I):
            issues.append({"level": "fail", "scene": "*", "rule": "western-units", "text": m.group(0),
                           "fix": "Indian audience: ₹/rupaye, lakh/crore, km/kg/°C, DD/MM dates (or set \"region\": \"global\" for a topic about elsewhere)"})
    for pat, good in NAME_FIX.items():
        m = re.search(pat, full)
        if m:
            issues.append({"level": "fail", "scene": "*", "rule": "name-spelling", "text": m.group(0), "fix": f"write it '{good}'"})
    # info dumps: a sentence that is mostly a list (3+ commas with numbers, or 4+ comma items)
    for sid, sent in [(sc["id"], x) for sc in scenes for x in sentences(sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"])]:
        if sent.count(",") >= 4 or (sent.count(",") >= 3 and len(re.findall(r"\d", sent)) >= 3):
            issues.append({"level": "warn", "scene": sid, "rule": "list-dump", "text": sent[:80], "fix": "tell it as a train of thought: one fact per sentence, connect them"})
    # same connector opening several scenes
    starts = [" ".join(sentences(sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"])[0].split()[:1]).lower().strip(",.") for sc in scenes]
    for w in set(starts):
        if w and starts.count(w) >= 3:
            issues.append({"level": "warn", "scene": "*", "rule": "repeated-connector", "text": w, "fix": f"'{w}' opens {starts.count(w)} scenes; vary the transitions"})
    # rhythm
    lens = [len(s.split()) for _, s in all_s]
    if len(lens) >= 5 and statistics.pstdev(lens) < 2.5:
        issues.append({"level": "warn", "scene": "*", "rule": "uniform-rhythm", "text": f"sentence lengths {lens}", "fix": "mix 3-5 word punches with 12-18 word sentences"})
    for sid, s in all_s:
        if len(s.split()) > 26:
            issues.append({"level": "warn", "scene": sid, "rule": "long-sentence", "text": s, "fix": "split it; nobody says 26+ words in one breath"})
        for pat in SOFT.get(lang, []):
            if re.search(pat, s, re.I):
                issues.append({"level": "warn", "scene": sid, "rule": "filler-opener", "text": s.split()[0], "fix": "start on the content"})
    # repeated openers
    firsts = [re.sub(r"[^\wऀ-ॿ]", "", s.split()[0].lower()) for _, s in all_s if s.split()]
    for i in range(2, len(firsts)):
        if firsts[i] and firsts[i] == firsts[i - 1] == firsts[i - 2]:
            issues.append({"level": "warn", "scene": all_s[i][0], "rule": "repeated-opener", "text": firsts[i], "fix": "vary how sentences start"})
    if firsts:
        top = max(set(firsts), key=firsts.count)
        if firsts.count(top) / len(firsts) > 0.3 and len(firsts) >= 6:
            issues.append({"level": "warn", "scene": "*", "rule": "opener-monotony", "text": top, "fix": f"'{top}' opens {firsts.count(top)} of {len(firsts)} sentences"})
    # template transitions between scenes ("Fact one. Fact two." / "Next," / "Number three.")
    heads = [sentences(sc["narration"][lang] if isinstance(sc["narration"], dict) else sc["narration"])[0].split()[:2] for sc in scenes if sc.get("narration")]
    templ = [h for h in heads if h and re.match(r"(fact|number|next|tip|reason|point|step|one|two|three|four|five|first|second|third|पहला|दूसरा|तीसरा|चौथा|पाँचवाँ|तथ्य|नंबर|अगला)\b", h[0], re.I)]
    if len(templ) >= 3:
        issues.append({"level": "warn", "scene": "*", "rule": "template-transitions", "text": " / ".join(" ".join(h) for h in templ),
                       "fix": "bridge scenes the way you'd talk ('And it gets worse.', 'That's not even the strange part.') instead of numbering every one"})
    fails = sum(1 for i in issues if i["level"] == "fail")
    warns = sum(1 for i in issues if i["level"] == "warn" and i["rule"] != "language-purity-check")   # review flags don't use the budget
    return {"pass": fails == 0 and warns <= 2, "score": max(0, 100 - 25 * fails - 6 * warns), "fails": fails, "warns": warns, "issues": issues}


if __name__ == "__main__":
    b = json.load(open(sys.argv[1]))
    lang = sys.argv[sys.argv.index("--lang") + 1] if "--lang" in sys.argv else (b.get("lang") or "en")
    print(json.dumps(lint(b, lang), ensure_ascii=False, indent=1))
