"""Map word indices of one narration (e.g. Hinglish) onto another (e.g. English) sentence by sentence, so a Remotion reel
authored against the first word list animates on the matching words of the second.
usage: python3 pipeline/reel_anchor_map.py <src words.json> <dst words.json> <out map.json> [--tsx file.tsx] [--fix i=j ...]"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json, re, sys, difflib
EQ = {  # source token -> destination token (lower-case, punctuation stripped)
 'pehla': 'first', 'doosra': 'second', 'teesra': 'third', 'teen': 'three', 'teeno': 'three', 'paise': 'money', 'pachaas': '50', 'sau': '100',
 'bayaasi': '82', 'roz': 'day', 'dost': 'friend', 'bank': 'bank', 'kal': 'tomorrow', 'naya': 'new', 'nayi': 'new', 'tum': 'you', 'tumne': 'you',
 'tumhe': 'you', 'tumhara': 'your', 'poocha': 'question', 'interview': 'interview', 'galat': 'wrong', 'adhoora': 'incomplete', 'ratta': 'memorised',
 'samajh': 'understood', 'sawaal': 'question', 'chhote': 'small', 'kaato': 'cut', 'badlo': 'turn', 'numbers': 'numbers', 'save': 'store',
 'mehenga': 'expensive', 'dobara': 'retrain', 'chhuttiyan': 'leaves', 'kaise': 'how', 'chai': 'tea', 'waale': 'seller', 'scan': 'scan',
 'daala': 'enter', 'katte': 'debits', 'credit': 'credit', 'ding': 'ding', 'refund': 'refund', 'warna': 'or', 'agle': 'next', 'din': 'day',
 'kat': 'debited', 'pahunche': 'arrives', 'hissa': 'part', 'at': 'at', 'comment': 'comments', 'batao': 'comments', 'bhejo': 'send', 'bheje': 'send',
 'dono': 'both', 'yahi': "that's", 'list': 'list', 'poochta': 'asks', 'bhejta': 'replies', 'chunta': 'picks', 'decide': 'decides', 'baat': 'talks',
 'kaam': 'works', 'karta': None, 'jawaab': 'answer', 'sabse': 'closest', 'likhta': 'writes', 'style': 'style', 'fresh': 'fresh', 'chhota': 'small',
 'bada': 'big', 'kyun': 'why', 'into': 'times', 'plus': 'plus', 'sirf': 'only', 'nahi': 'not', 'mails': 'mails', 'mail': 'mail', 'search': 'search',
 'program': 'program', 'tool': 'tool', 'tools': 'tools', 'format': 'format', 'protocol': 'protocol', 'context': 'context', 'model': 'model',
 'app': 'app', 'switch': 'switch', 'success': 'success', 'message': 'message', 'pin': 'pin', 'check': 'checks', 'amount': 'amount', 'done': 'done',
}
n = lambda s: re.sub(r"[^a-z0-9']", "", s.lower()).replace("'s", "")
def build(src, dst, fixes):
    m = [None] * len(src)
    for s in sorted({x['sent'] for x in src}):
        a = [i for i, x in enumerate(src) if x['sent'] == s]; b = [j for j, x in enumerate(dst) if x['sent'] == s]
        ta = [EQ.get(n(src[i]['cap']), n(src[i]['cap'])) or '#' for i in a]; tb = [n(dst[j]['cap']) for j in b]
        pairs = []
        for blk in difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_matching_blocks():
            pairs += [(blk.a + k, blk.b + k) for k in range(blk.size)]
        pairs = [(-1, -1)] + pairs + [(len(a), len(b))]
        for (p0, q0), (p1, q1) in zip(pairs, pairs[1:]):
            if 0 <= p0 < len(a): m[a[p0]] = b[q0]
            for p in range(p0 + 1, p1):  # interpolate unmatched source words inside the gap
                f = (p - p0) / (p1 - p0); q = round(q0 + f * (q1 - q0)); m[a[p]] = b[min(max(q, 0), len(b) - 1)]
    for fx in fixes: i, j = map(int, fx.split('=')); m[i] = j
    return m
if __name__ == '__main__':
    src = json.load(open(sys.argv[1])); src = src['words'] if isinstance(src, dict) else src
    dst = json.load(open(sys.argv[2])); dst = dst['words'] if isinstance(dst, dict) else dst
    args = sys.argv[4:]; tsx = args[args.index('--tsx') + 1] if '--tsx' in args else None
    fixes = args[args.index('--fix') + 1:] if '--fix' in args else []
    m = build(src, dst, fixes); json.dump(m, open(sys.argv[3], 'w'))
    if tsx:
        used = sorted({int(x) for x in re.findall(r"\bwe?\((\d+)\)", open(tsx).read())} | {int(x) for x in (args[args.index('--extra') + 1].split(',') if '--extra' in args else [])})
        for i in used:
            if i >= len(src): print(f"{i:4d} (beyond end)"); continue
            j = m[i]; print(f"{i:4d} {src[i]['cap']:<16} s{src[i]['sent']:<3}-> {j:4d} {dst[j]['cap']:<16} | {' '.join(x['cap'] for x in dst[max(0,j-3):j+3])}")
