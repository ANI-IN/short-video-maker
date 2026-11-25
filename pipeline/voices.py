"""Manage the ElevenLabs voices this project uses (registry: config/voices.json).

  video.py voices list [--filter TEXT]       every voice in the registry; * marks the default narrator
  video.py voices use KEY                    make KEY the default narrator for every new video
  video.py voices use KEY --lang hi          use KEY only for one language (en, hi, hl); "--lang hi final" resets it
  video.py voices add VOICE_ID [--name N]    add a voice from YOUR ElevenLabs account (checked with ElevenLabs first)
  video.py voices remove KEY                 remove a voice you added
  video.py voices test "A line" [--voice KEY]   speak a line (about 1 credit per character) -> output/voice-tests/*.mp3
  video.py voices account                    is the key valid, plan, credits used / left
  video.py voices key                        type your API key (hidden) and save it to .env after checking it

Voices are used exactly as ElevenLabs provides them: no voice settings are stored or sent.
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702
import argparse
import hashlib
import json
import re
import time

import eleven

F = plat.ROOT / "config" / "voices.json"


def load():
    return json.loads(F.read_text(encoding="utf-8"))


def save(v):
    F.write_text(json.dumps(v, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(prog="video.py voices", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list"); p.add_argument("--filter", default="")
    p = sub.add_parser("use"); p.add_argument("key"); p.add_argument("--lang", choices=["en", "hi", "hl"])
    p = sub.add_parser("add"); p.add_argument("voice_id"); p.add_argument("--name")
    p = sub.add_parser("remove"); p.add_argument("key")
    p = sub.add_parser("test"); p.add_argument("text"); p.add_argument("--voice")
    sub.add_parser("account"); sub.add_parser("key")
    a = ap.parse_args()
    v = load()

    if a.cmd == "list":
        langs = {k: x for k, x in (v.get("languages") or {}).items() if x}
        print(f"Model: {v['model']} · default narrator: {v['final']}" + (f" · per language: {langs}" if langs else ""))
        for k, e in v["voices"].items():
            line = f"{k} {e['name']} {e.get('gender', '')} {e.get('accent', '')} {e.get('recommended_for', '')} {e.get('description', '')}"
            if a.filter.lower() not in line.lower():
                continue
            mark = "*" if k == v["final"] else " "
            print(f"{mark} {k:12} {e['voice_id']}  {e['name']} · {', '.join(x for x in (e.get('gender'), (e.get('age') or '').replace('_', ' '), e.get('accent')) if x)}"
                  + (" · yours" if e.get("custom") else ""))
            if e.get("recommended_for") or e.get("tagline"):
                print(f"  {'':12} {e.get('tagline') or ''}{' - ' if e.get('tagline') and e.get('recommended_for') else ''}{e.get('recommended_for') or ''}")
        print("\nUse one for every video:  video.py voices use KEY · for one video: video.py script ... --voice KEY")
        return 0

    if a.cmd == "use":
        if a.key not in v["voices"] and not (a.lang and a.key == "final"):
            sys.exit(f"Unknown voice '{a.key}'. See: video.py voices list")
        if a.lang:
            v.setdefault("languages", {})[a.lang] = None if a.key == "final" else a.key
            print(f"{a.lang}: " + ("uses the default narrator" if a.key == "final" else f"uses {v['voices'][a.key]['name']}"))
        else:
            v["final"] = a.key; print(f"Default narrator: {v['voices'][a.key]['name']}")
        save(v); return 0

    if a.cmd == "add":
        vid = a.voice_id.strip()
        if not re.fullmatch(r"[A-Za-z0-9]{20}", vid):
            sys.exit("A voice ID is 20 letters and digits. In ElevenLabs: Voices → ⋯ → Copy voice ID.")
        if not eleven.key():
            sys.exit("Add your ElevenLabs API key first (video.py voices key, or ELEVENLABS_API_KEY in .env).")
        code, raw = eleven.call(f"/v1/voices/{vid}")
        if code != 200:
            sys.exit(f"ElevenLabs does not find this voice in your account ({raw.decode()[:160]}). Voice Library voices must be added to My Voices first.")
        d = json.loads(raw); lab = d.get("labels") or {}
        name = (a.name or d.get("name") or vid).strip(); k = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:30] or vid.lower()
        v["voices"][k] = {"name": name, "voice_id": vid, "tagline": "", "gender": lab.get("gender"), "age": lab.get("age"), "accent": lab.get("accent"),
                          "tone": lab.get("descriptive"), "use_case": lab.get("use_case"), "recommended_for": "", "description": (d.get("description") or "").strip(),
                          "preview_url": d.get("preview_url"), "custom": True}
        save(v); print(f"Added '{k}' ({name}). Make it the default:  video.py voices use {k}"); return 0

    if a.cmd == "remove":
        e = v["voices"].get(a.key)
        if not e:
            sys.exit(f"Unknown voice '{a.key}'.")
        if a.key == v["final"]:
            sys.exit("That is the default narrator. Choose another default first (video.py voices use KEY).")
        del v["voices"][a.key]
        v["languages"] = {k: (None if x == a.key else x) for k, x in (v.get("languages") or {}).items()}
        save(v); print(f"Removed {a.key}."); return 0

    if a.cmd == "test":
        k = a.voice or v["final"]; e = v["voices"].get(k)
        if not e:
            sys.exit(f"Unknown voice '{k}'. See: video.py voices list")
        if not eleven.key():
            sys.exit("Add your ElevenLabs API key first (video.py voices key, or ELEVENLABS_API_KEY in .env).")
        text = a.text.strip()[:500]
        h = hashlib.md5(json.dumps([e["voice_id"], v["model"], text]).encode()).hexdigest()[:10]
        out = plat.ROOT / "output" / "voice-tests" / f"{k}-{h}.mp3"
        if not out.exists():
            body = {"text": text, "model_id": v["model"]}
            if e.get("settings"):
                body["voice_settings"] = e["settings"]
            code, raw = eleven.call(f"/v1/text-to-speech/{e['voice_id']}?output_format=mp3_44100_128", body, timeout=120)
            if code != 200:
                sys.exit(f"ElevenLabs: {raw.decode()[:200]}")
            out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(raw)
            print(f"Spoke {len(text)} characters (about {len(text)} credits).")
        print(f"Saved: {out.relative_to(plat.ROOT).as_posix()}  (open it in any audio player)"); return 0

    if a.cmd == "account":
        d = eleven.account()
        if not d["key_set"]:
            print("No API key yet. Run:  video.py voices key   (or put ELEVENLABS_API_KEY=... in .env)"); return 1
        if not d["valid"]:
            print(f"The key was not accepted: {d.get('error')}"); return 1
        if d.get("limit"):
            left = d["limit"] - (d.get("used") or 0)
            reset = time.strftime("%d/%m/%Y", time.localtime(d["resets"])) if d.get("resets") else "?"
            print(f"Key OK · plan: {d.get('plan')} · {d.get('used'):,} of {d['limit']:,} credits used · {left:,} left · resets {reset}")
        else:
            print("Key OK · " + (d.get("note") or ""))
        return 0

    if a.cmd == "key":
        import getpass
        k = getpass.getpass("Paste your ElevenLabs API key (input is hidden): ").strip()
        if not re.fullmatch(r"[A-Za-z0-9_\-]{20,120}", k):
            sys.exit("That does not look like an API key. Copy it again from ElevenLabs → Developers → API keys.")
        code, raw = eleven.call("/v1/voices", api_key=k)
        if code != 200:
            sys.exit(f"ElevenLabs rejected this key: {raw.decode()[:160]}")
        env = eleven.ENV
        lines = [ln for ln in (env.read_text(encoding="utf-8").splitlines() if env.exists() else []) if not ln.startswith("ELEVENLABS_API_KEY=")]
        env.write_text("\n".join(lines + [f"ELEVENLABS_API_KEY={k}"]) + "\n", encoding="utf-8")
        if not plat.WINDOWS:
            os.chmod(env, 0o600)
        print("Saved to .env (git-ignored). Check it any time with:  video.py voices account"); return 0


if __name__ == "__main__":
    sys.exit(main())
