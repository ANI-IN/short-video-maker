"""Shared text normalisation for intelligibility scoring (TTS benchmark, voice QC, final QC).

Whisper writes numbers as digits and Hindi with spelling variants (पाँच/पांच, nukta, spacing), while scripts spell
numbers out. Without this, a correctly spoken line can look like a 40% error. Both sides go through `norm()`.
"""
from __future__ import annotations

import re
import unicodedata

EN = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
      "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
      "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
      "hundred": 100, "thousand": 1000, "million": 1000000, "first": 1, "second": 2, "third": 3, "tenth": 10}
EN_ORD = {"first": "1st", "second": "2nd", "third": "3rd", "tenth": "10th"}
HI = {"शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11,
      "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "पच्चीस": 25,
      "तीस": 30, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90, "सौ": 100, "हज़ार": 1000, "हजार": 1000,
      "लाख": 100000, "करोड़": 10000000, "करोड": 10000000}
# full 1-99 (Hindi number words are irregular); extras for spelling variants
for _i, _w in enumerate("एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे".split(), 1):
    HI.setdefault(_w, _i)
for _w, _v in {"सौ": 100, "हज़ार": 1000, "हजार": 1000, "चौसठ": 64, "उन्चास": 49}.items():
    HI.setdefault(_w, _v)

HI_ORD = {"पहला": "1", "दूसरा": "2", "तीसरा": "3", "चौथा": "4", "पांचवां": "5", "दसवें": "10वें", "दसवां": "10वां"}


def _hi_fold(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.replace("़", "")            # nukta
    s = s.replace("ँ", "").replace("ं", "")   # nasalisation marks: Whisper drops/adds them freely (कौरवों ~ कौरवो)
    s = s.replace("।", " ").replace("॥", " ")  # danda = full stop
    s = s.replace("ृ", "्रि").replace("ी", "ि").replace("ू", "ु")   # same sound, spelt either way by Whisper (दृष्टि ~ द्रिष्टी)
    s = s.replace("ॉ", "ा").replace("ऑ", "आ")
    return s


_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def en_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("" if n % 10 == 0 else " " + _ONES[n % 10])
    if n < 1000:
        return _ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + en_words(n % 100))
    for div, name in ((10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")):
        if n >= div:
            return en_words(n // div) + " " + name + ("" if n % div == 0 else " " + en_words(n % div))
    return str(n)


def en_year(n: int) -> str:
    if 2000 <= n <= 2009:
        return en_words(n)
    hi, lo = divmod(n, 100)
    return en_words(hi) + (" hundred" if lo == 0 else (" oh " + _ONES[lo] if lo < 10 else " " + en_words(lo)))


def _ordinal(w: str) -> str:
    parts = w.split(); last = parts[-1]
    irregular = {"one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth", "nine": "ninth", "twelve": "twelfth"}
    last = irregular.get(last, last[:-1] + "ieth" if last.endswith("y") else last + "th")
    return " ".join(parts[:-1] + [last])


def speak_numbers_en(text: str) -> str:
    """Digits -> how a narrator says them: 1631 -> sixteen thirty one, 20,000 -> twenty thousand, 14th -> fourteenth."""
    def rep(m):
        raw, suf = m.group(1), (m.group(2) or "").lower()
        n = int(raw.replace(",", ""))
        if suf in ("st", "nd", "rd", "th"):
            return _ordinal(en_words(n))
        if len(raw) == 4 and 1100 <= n <= 2099:
            return en_year(n)
        return en_words(n)
    def indian(n: int) -> str:            # Indian audience: lakh / crore, never million
        cr, rest = divmod(n, 10_000_000); lk, rest = divmod(rest, 100_000)
        parts = ([en_words(cr) + " crore"] if cr else []) + ([en_words(lk) + " lakh"] if lk else []) + ([en_words(rest)] if rest else [])
        return " ".join(parts) or "zero"
    def rep_in(m):
        n = int(m.group(1).replace(",", ""))
        return indian(n) if n >= 100_000 else rep(m)
    text = re.sub(r"₹\s?([\d,]+(?:\.\d+)?)(?:\s*(lakh|crore|thousand|hundred)\b)?", lambda m: f"{m.group(1)} {m.group(2) + ' ' if m.group(2) else ''}rupees", text)
    text = re.sub(r"\b(\d{1,2}(?:,\d{2})+,\d{3})\b", lambda m: indian(int(m.group(1).replace(",", ""))), text)   # 1,00,000 grouping
    return re.sub(r"\b(\d{1,3}(?:,\d{3})+|\d+)(st|nd|rd|th)?\b", rep_in, text)


# English numbers spoken in Hinglish but written in Devanagari ("ट्वेंटी-ट्वेंटी-एट" = 2028, "फिफ्टीन-परसेंट" = 15%):
# Whisper writes them as digits, so the voice check must read them as digits too (they scored as "misheard" before)
EN_DEV = {"ज़ीरो": 0, "जीरो": 0, "वन": 1, "टू": 2, "थ्री": 3, "फ़ोर": 4, "फोर": 4, "फ़ाइव": 5, "फाइव": 5, "सिक्स": 6, "सेवन": 7, "एट": 8,
          "नाइन": 9, "टेन": 10, "इलेवन": 11, "ट्वेल्व": 12, "थर्टीन": 13, "फ़ोर्टीन": 14, "फोर्टीन": 14, "फ़िफ़्टीन": 15, "फिफ्टीन": 15,
          "सिक्सटीन": 16, "सेवनटीन": 17, "एटीन": 18, "नाइनटीन": 19, "ट्वेंटी": 20, "थर्टी": 30, "फ़ोर्टी": 40, "फोर्टी": 40,
          "फ़िफ़्टी": 50, "फिफ्टी": 50, "सिक्स्टी": 60, "सिक्सटी": 60, "सेवेंटी": 70, "सेवंटी": 70, "एटी": 80, "नाइंटी": 90}


def en_dev_numbers(s: str) -> str:
    def one(m):
        parts = [x for x in re.split(r"[-\s]", m.group(0)) if x]
        pct = parts[-1] in ("परसेंट", "पर्सेंट")
        if pct:
            parts = parts[:-1]
        vals = [EN_DEV.get(x) for x in parts]
        if not vals or None in vals:
            return m.group(0)
        nums, cur = [], None                      # "twenty twenty eight" -> 20, 28 -> "2028"; "fifteen" -> 15
        for v in vals:
            if cur is not None and cur % 10 == 0 and cur >= 20 and v < 10:
                cur += v
            else:
                if cur is not None:
                    nums.append(cur)
                cur = v
        nums.append(cur)
        return "".join(str(n) for n in nums) + ("%" if pct else "")
    names = "|".join(sorted(map(re.escape, list(EN_DEV) + ["परसेंट", "पर्सेंट"]), key=len, reverse=True))
    return re.sub(rf"(?<![ऀ-ॿ])(?:{names})(?:-(?:{names}))*(?![ऀ-ॿ])", one, s)


def norm(text: str, lang: str = "en") -> str:
    """Lowercase, fold variants, spell-out numbers -> digits, drop punctuation and spaces."""
    s = re.sub(r"(\d)\s*,\s*(\d{3})\b", r"\1,\2", text.lower())
    s = re.sub(r"\bdr\.?(?=\s|$)", "doctor", s)                       # Whisper abbreviates "Doctor Doom" -> "Dr. Doom"     # Whisper sometimes writes "100 ,000"
    # Whisper writes "$1.2 billion" / "$86 million" where the script says "one point two billion dollars": read the symbol
    # as the word after the amount, and a decimal point as "point" (digits after it one by one)
    s = re.sub(r"\$\s?(\d[\d,]*(?:\.\d+)?)(\s*(?:thousand|million|billion|trillion|crore|lakh))?", lambda m: f"{m.group(1)}{m.group(2) or ''} dollars", s)
    s = re.sub(r"(\d+)\.(\d+)", lambda m: m.group(1) + " point " + " ".join(m.group(2)), s)
    lang = "hi" if lang == "hl" else lang                          # Hinglish is voiced/checked from its Devanagari twin
    if lang == "hi":
        s = en_dev_numbers(s)
        s = _hi_fold(s)
        for w, d in HI_ORD.items():
            s = re.sub(rf"(?<![ऀ-ॿ]){_hi_fold(w)}(?![ऀ-ॿ])", d, s)
        toks = s.split()
        out = []
        run: list[int] = []          # a spoken compound: उन्नीस सौ बासठ -> 1962, दो हज़ार पाँच -> 2005 (Whisper writes digits)
        def flush():
            if not run:
                return
            total, cur = 0, 0
            for v in run:
                if v == 100:
                    cur = (cur or 1) * 100
                elif v == 1000:
                    total += (cur or 1) * 1000; cur = 0
                else:
                    cur += v
            out.append(str(total + cur)); run.clear()
        for t in toks:
            core = re.sub(r"[^\wऀ-ॿ]", "", t)
            v = HI.get(core) if core in HI else _hi_folded().get(core)
            if v is None and core.isdigit():
                v = None
            if v is not None and v <= 1000 and (v != 100 and v != 1000 or run):
                run.append(v)
                if core != t:          # trailing punctuation ends the compound
                    flush()
                continue
            flush()
            out.append(str(v) if v is not None and v < 1000 else t)
        flush()
        s = " ".join(out)
    else:
        s = speak_numbers_en(s).replace("-", " ")
    s = re.sub(r"[^\wऀ-ॿ]", "", s)
    return s


def _lev(r: str, h: str) -> float:
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[:], i
        for j in range(1, len(h) + 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


# Phonetic consonant skeleton, shared by Devanagari and Latin, so a correctly spoken English loanword scores the same
# whichever script Whisper writes it in ("प्रोटोकॉल" ~ "protocol" -> "prtkl"; "एमसीपी" ~ "MCP" -> letters spelled out).
_DEV = {"क": "k", "ख": "k", "ग": "g", "घ": "g", "ङ": "n", "च": "c", "छ": "c", "ज": "j", "झ": "j", "ञ": "n", "ट": "t", "ठ": "t",
        "ड": "d", "ढ": "d", "ण": "n", "त": "t", "थ": "t", "द": "d", "ध": "d", "न": "n", "प": "p", "फ": "f", "ब": "b", "भ": "b",
        "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "s", "ष": "s", "स": "s", "ह": "", "क़": "k", "ख़": "k", "ग़": "g",
        "ज़": "j", "ड़": "r", "ढ़": "r", "फ़": "f", "ळ": "l", "ं": "n"}
_LETTER = {"a": "", "b": "b", "c": "s", "d": "d", "e": "", "f": "f", "g": "j", "h": "c", "i": "", "j": "j", "k": "k", "l": "l", "m": "m",
           "n": "n", "o": "", "p": "p", "q": "k", "r": "r", "s": "s", "t": "t", "u": "", "v": "v", "w": "dblyu", "x": "ks", "y": "v", "z": "j"}
_SPELLED = {"ए": "", "बी": "b", "सी": "s", "डी": "d", "ई": "", "एफ़": "f", "एफ": "f", "जी": "j", "एच": "c", "आई": "", "जे": "j", "के": "k",
            "एल": "l", "एम": "m", "एन": "n", "ओ": "", "पी": "p", "क्यू": "k", "आर": "r", "एस": "s", "टी": "t", "यू": "", "वी": "v",
            "एक्स": "ks", "वाई": "v", "ज़ेड": "j", "ज़ी": "j"}


HI_FOLDED = None


def _hi_folded() -> dict:
    global HI_FOLDED
    if HI_FOLDED is None:
        HI_FOLDED = {_hi_fold(k): v for k, v in HI.items()}
    return HI_FOLDED


def skeleton(text: str) -> str:
    global HI_FOLDED
    if HI_FOLDED is None:
        HI_FOLDED = {_hi_fold(k): v for k, v in HI.items()}
    out = []
    text = re.sub(r"\b[Dd]r\.?(?=\s|$)", "Doctor", text)
    for w in re.findall(r"[A-Za-z]+|[ऀ-ॿ]+|\d+", en_dev_numbers(unicodedata.normalize("NFC", text))):
        if re.fullmatch(r"[A-Z]{2,5}", w):                     # acronym read letter by letter: MCP -> m s p
            out.append("".join(_LETTER[c.lower()] for c in w)); continue
        if re.fullmatch(r"[a-zA-Z]+", w):
            x = re.sub(r"c(?=[eiy])", "s", w.lower())         # soft c: decisions ~ डिसीज़न्स, city ~ सिटी
            for a_, b_ in (("ph", "f"), ("ck", "k"), ("ch", "c"), ("sh", "s"), ("th", "t"), ("dh", "d"), ("kh", "k"), ("gh", "g"),
                           ("bh", "b"), ("q", "k"), ("x", "ks"), ("w", "v"), ("z", "j"), ("c", "k")):
                x = x.replace(a_, b_)
            x = re.sub(r"m(?=[bp])", "n", x)                   # November ~ नवंबर (anusvara)
            out.append(re.sub(r"[aeiouyh]", "", x)); continue
        if w.isdigit():
            out.append(w); continue
        hw = _hi_fold(w)
        if hw in HI_FOLDED:                                     # दस / सौ -> 10 / 100, like Whisper writes them
            out.append(str(HI_FOLDED[hw])); continue
        out.append("".join(_DEV.get(ch, "") for ch in w))
    return re.sub(r"(.)\1+", r"\1", "".join(out))


def cer(ref: str, hyp: str, lang: str = "en") -> float:
    c = _lev(norm(ref, lang), norm(hyp, lang))
    if lang in ("hi", "hl"):     # Hindi tech speech: Whisper writes English loanwords in Latin; compare phonetically too
        sr = skeleton(ref)
        if sr:
            c = min(c, _lev(sr, skeleton(hyp)))
    return c


if __name__ == "__main__":
    tests = [("Wait. Eighteen armies? That's nearly four million men.", "Wait, 18 armies. That's nearly 4 million men.", "en"),
             ("Set a timer and look twenty feet away for twenty seconds.", "Set a timer and look 20 feet away for 20 seconds.", "en"),
             ("Bhishma fell on the tenth day", "Bhishma fell on the 10th day", "en"),
             ("रुकिए, अठारह सेनाएँ? यानी क़रीब चालीस लाख योद्धा!", "रुकिये 18 सेनाई यानी करीब 40 लाक योधा", "hi"),
             ("महाभारत युद्ध के पाँच राज़", "महा भारत युद्ध के पांच राज", "hi"),
             ("अप्रैल, उन्नीस सौ बासठ।", "अप्रेल 1962", "hi"),
             ("उन्नीस सौ बासठ में उसकी कीमत थी बारह सेंट।", "1962 में उसकी कीमत थी 12 सेंट.", "hi"),
             ("दो हज़ार पंद्रह में टोबी केबल।", "2015 में टोबी केबल", "hi"),
             ("नाम रखा, डॉक्टर डूम।", "नाम रख्खा, Dr. Doom.", "hi"),
             ("Lee named him Doctor Doom.", "Lee named him Dr. Doom.", "en"),
             ("भारत में पंद्रह करोड़ रुपये के टिकट", "भारत में 15 करोड रुपे के टिकेट", "hi")]
    for r, h, l in tests:
        print(l, round(cer(r, h, l), 3), norm(r, l), "|", norm(h, l))
