"""Narration (runs in .venv-tts, which also holds Whisper). Voices are ElevenLabs only: config/voices.json.

  voice_worker.py --board storyboard.json --lang en --out output/<slug>/voice/en [--only sceneA,sceneB]

The voice is used exactly as ElevenLabs delivers it: one request per scene (the whole scene narration, with the
neighbouring scenes sent as context so the read flows), the voice's own default settings, and no change to speed,
pauses, pitch, emphasis or EQ. The only edit is cutting what lies before the first word and after the last one
(silence, and a stray click there).
Whisper checks every take; a take Whisper mishears (CER over the language limit) or that clips is requested again with
a new seed, and the clearest take is kept.
Per-language Whisper limits: pipeline/voice_config.json.
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import argparse
import gc
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
import asr       # noqa: E402  (Whisper: MLX on Apple Silicon, faster-whisper elsewhere)
import textnorm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads(Path(os.environ.get("VOICE_CONFIG") or (ROOT / "pipeline" / "voice_config.json")).read_text())   # VOICE_CONFIG: test a variant
SR = 24000


def P(msg, **kw):
    print("@@P " + json.dumps({"step": "voice", "status": "progress", "msg": msg, **kw}, ensure_ascii=False), flush=True)


# ------------------------------------------------------------------ voices: ElevenLabs only
# The registry (config/voices.json) holds voice IDs and settings, never audio. "final" is the default narrator;
# "languages" can pin a different registry voice per language.
VOICES = json.loads((ROOT / "config" / "voices.json").read_text())
BACKENDS = ("elevenlabs",)


def default_voice(lang):
    """Registry key of the narrator for a language (the final voice unless config pins one for that language)."""
    return (VOICES.get("languages") or {}).get(lang) or VOICES["final"]


def voice_entry(v):
    """Registry entry for a key, a voice name or a raw ElevenLabs voice ID (an unknown ID gets default settings)."""
    reg = VOICES["voices"]
    if v in reg:
        return reg[v]
    for e in reg.values():
        if v in (e["voice_id"], e["name"]):
            return e
    return {"name": v, "voice_id": v, "settings": {}}


def resolve_voice(voice, conf):
    """Storyboard / character voice -> ("elevenlabs", registry key or voice ID).
    'elevenlabs:<id>', a registry key, a voice name or a 20-character voice ID is used as given. Anything else (a free
    description such as "old king, deep voice") maps to a registry voice of the matching gender, the same one every
    time for the same text, so characters keep distinct, stable voices."""
    reg = VOICES["voices"]; dv = conf.get("voice") or default_voice(conf.get("_lang", "en"))
    if not voice:
        return "elevenlabs", dv
    if voice.startswith("elevenlabs:"):
        return "elevenlabs", voice.split(":", 1)[1]
    low = voice.lower()
    if low in reg or any(voice in (e["voice_id"], e["name"]) for e in reg.values()) or re.fullmatch(r"[A-Za-z0-9]{20}", voice):
        return "elevenlabs", low if low in reg else voice
    fem = bool(re.search(r"\b(woman|female|girl|queen|lady|she|her|mother|princess)\b", low))
    pool = sorted(k for k, e in reg.items() if e.get("gender") == ("female" if fem else "male") and k != dv) or [dv]
    return "elevenlabs", pool[int(hashlib.md5(voice.encode()).hexdigest(), 16) % len(pool)]


class TTS:
    """ElevenLabs text-to-speech. The API key comes from the project's .env (or the environment) and is never logged.
    Takes are cached on disk by (voice, model, settings, text, context, seed), so a re-run costs no credits.
    No voice_settings are sent unless the registry entry sets them, so ElevenLabs uses the voice's own defaults."""
    def __init__(self):
        env = ROOT / ".env"
        self.key = next((ln.split("=", 1)[1].strip().strip('"').strip("'") for ln in env.read_text(encoding="utf-8").splitlines()
                         if ln.startswith("ELEVENLABS_API_KEY=")), None) if env.exists() else None
        self.key = self.key or os.environ.get("ELEVENLABS_API_KEY")
        if not self.key:
            raise RuntimeError("ELEVENLABS_API_KEY is missing: add it to .env or run: python3 video.py voices key (see docs/voices.md)")

    def say(self, text, lang, seed, voice, prev_text=None, next_text=None):
        import urllib.error
        import urllib.request
        e = voice_entry(voice)
        model = VOICES.get("model", "eleven_multilingual_v2"); st = e.get("settings") or {}
        h = hashlib.md5(json.dumps([e["voice_id"], model, st, text, prev_text, next_text, seed], ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
        cache = ROOT / "output" / ".cache" / "elevenlabs" / f"{h}.pcm"
        if not cache.exists():
            body = {"text": text, "model_id": model, "seed": int(seed) % 4294967295}
            if st:
                body["voice_settings"] = st
            if prev_text:
                body["previous_text"] = prev_text
            if next_text:
                body["next_text"] = next_text
            if lang in ("hi", "en"):
                body["language_code"] = lang
            req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{e['voice_id']}?output_format=pcm_24000", method="POST",
                                         headers={"xi-api-key": self.key, "Content-Type": "application/json"}, data=json.dumps(body).encode())
            for attempt in range(4):
                try:
                    with urllib.request.urlopen(req, timeout=180) as f:
                        data = f.read()
                    break
                except urllib.error.HTTPError as err:
                    msg = err.read().decode()[:300]
                    if err.code in (429, 500, 502, 503) and attempt < 3:
                        time.sleep(4 * (attempt + 1)); continue
                    raise RuntimeError(f"ElevenLabs {err.code}: {msg}")
            cache.parent.mkdir(parents=True, exist_ok=True); cache.write_bytes(data)
        return np.frombuffer(cache.read_bytes(), dtype="<i2").astype(np.float32) / 32768.0     # pcm_24000 == SR


def trim_edges(a, pad_s=(0.05, 0.08)):
    """Cut only what lies before the first word and after the last one (inside the take nothing changes): silence, and
    a stray click or breath fragment shorter than 100 ms that sits alone in that silence (ElevenLabs takes sometimes end
    with one; left in, it is an audible blip at the scene join). 5 ms fades so the cut can never click."""
    thr = max(0.012, 0.022 * float(np.abs(a).max() or 0))
    hop = int(0.01 * SR); n = len(a) // hop
    if n < 10:
        return a
    on = np.abs(a[: n * hop]).reshape(n, hop).max(1) > thr
    runs, i = [], 0
    while i < n:
        if on[i]:
            j = i
            while j < n and on[j]:
                j += 1
            runs.append([i, j]); i = j
        else:
            i += 1
    if not runs:
        return a
    while len(runs) > 1 and (runs[0][1] - runs[0][0]) * 0.01 < 0.1 and (runs[1][0] - runs[0][1]) * 0.01 >= 0.15:
        runs.pop(0)          # stray fragment before the first word
    while len(runs) > 1 and (runs[-1][1] - runs[-1][0]) * 0.01 < 0.1 and (runs[-1][0] - runs[-2][1]) * 0.01 >= 0.15:
        runs.pop()           # stray fragment after the last word
    a = a[max(0, runs[0][0] * hop - int(pad_s[0] * SR)): min(len(a), runs[-1][1] * hop + int(pad_s[1] * SR))].astype(np.float32, copy=True)
    f = min(len(a) // 4, int(0.005 * SR))
    if f > 1:
        a[:f] *= np.linspace(0, 1, f, dtype=np.float32); a[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
    return a


def score(path, text, lang):
    """Whisper check: does the take say the script? (CER against the text) and does it clip? Nothing else is judged:
    the delivery, pace and pauses are ElevenLabs' own."""
    res = asr.transcribe(str(path), language=lang)
    c = textnorm.cer(text, res["text"], lang)
    y, _ = sf.read(path, dtype="float32")
    clip = float(np.mean(np.abs(y) > 0.985))
    issues = []
    if c > CFG[lang].get("cer_max", 0.08):
        issues.append(f"misheard (CER {c:.2f})")
    if clip > 0.001:
        issues.append("clipping")
    return {"cer": round(c, 3), "heard": res["text"].strip(), "issues": issues, "ok": not issues}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", required=True); ap.add_argument("--lang", required=True, help="en | hi | hl (Hinglish)"); ap.add_argument("--out", required=True)
    ap.add_argument("--only", default=""); ap.add_argument("--max-tries", type=int, default=None)
    ap.add_argument("--mode", default="max", choices=["fast", "max", "cinematic"])
    ap.add_argument("--delivery", default="default", help="kept for compatibility; delivery is always ElevenLabs' own")
    ap.add_argument("--style", default="")
    a = ap.parse_args()
    board = json.loads(Path(a.board).read_text(encoding="utf-8")); lang = a.lang
    conf_lang = lang
    if lang == "hl":      # Hinglish: voice the Devanagari twin (English loanwords written as Indians say them) with the Hindi model
        for sc in board["scenes"]:
            sc["narration"]["hi"] = sc["narration"].get("hl_voice") or sc["narration"]["hl"]
        lang = "hi"
    conf = dict(CFG.get(conf_lang, CFG[lang])); conf["_lang"] = conf_lang
    out = Path(a.out); takes = out / "takes"; takes.mkdir(parents=True, exist_ok=True)
    max_tries = a.max_tries or {"fast": 1, "max": 3, "cinematic": 5}[a.mode]
    only = set(filter(None, a.only.split(",")))
    prev = json.loads((out / "voice_qc.json").read_text(encoding="utf-8")) if (out / "voice_qc.json").exists() and only else None

    # two-host narration: "hosts" (storyboard) trade scenes; a scene's "narrator" or its stage speaker's voice wins.
    hosts = board.get("hosts")
    if not hosts and a.style:     # a style can pin its narrator per language in styles/styles.json ("voices")
        sv = (json.loads((ROOT / "styles" / "styles.json").read_text(encoding="utf-8"))["styles"].get(a.style) or {}).get("voices") or {}
        if sv.get(lang):
            hosts = [sv[lang]]
    texts = []
    for sc in board["scenes"]:
        spoken = sc["narration"][lang].replace("*", "").strip()
        if lang == "en":
            spoken = textnorm.speak_numbers_en(spoken)     # 1631 -> sixteen thirty-one (text only; the audio is untouched)
        for name, hint in (sc.get("say") or {}).items():   # pronunciation hints: the voice reads the hint, captions keep the spelling
            spoken = re.sub(rf"\b{re.escape(name)}\b", hint, spoken)
        texts.append(spoken)
    lines = []
    for k, sc in enumerate(board["scenes"]):
        spk = (sc.get("stage") or {}).get("speaker")
        cv = next((c.get("voice") for c in board.get("characters", []) if c["id"] == spk), None)
        cv = cv.get(lang) if isinstance(cv, dict) else cv
        cv = cv or sc.get("narrator") or (hosts[k % len(hosts)] if hosts else None)
        _, v = resolve_voice(cv, conf)
        lines.append({"scene": sc["id"], "i": 0, "role": sc.get("role"), "text": sc["narration"][lang].replace("*", "").strip(), "spoken": texts[k], "_v": v,
                      "prev": texts[k - 1] if k > 0 else None, "next": texts[k + 1] if k + 1 < len(texts) else None,
                      "redo": (not only) or sc["id"] in only, "takes": []})
    if prev:   # keep the takes of scenes we are not redoing
        keep = {l["scene"]: l for l in prev["detail"]}
        for l in lines:
            if l["scene"] in keep:
                if l["redo"]:     # a re-voice asks for new takes: new seeds, never the cached ones
                    l["_base"] = len(keep[l["scene"]].get("takes", [])) + keep[l["scene"]].get("_base", 0)
                else:
                    l.update(chosen=keep[l["scene"]].get("chosen"), takes=keep[l["scene"]].get("takes", []))
    todo = [l for l in lines if l["redo"]]
    tts = TTS(); regenerated = 0
    for attempt in range(max_tries):
        need = [l for l in todo if not any(t["ok"] for t in l["takes"])]
        if not need:
            break
        P(f"pass {attempt + 1}: generating {len(need)} scene{'s' * (len(need) != 1)} with ElevenLabs")
        for n, l in enumerate(need):
            seed = (l.get("_base", 0) + attempt) * 101 + 7
            audio = trim_edges(tts.say(l["spoken"], lang, seed, l["_v"], l["prev"], l["next"]))
            f = takes / f"{l['scene']}-s{seed}.wav"
            sf.write(f, audio, SR)
            l["takes"].append({"file": str(f), "seed": seed, "attempt": attempt})
            regenerated += attempt > 0
            P(f"generated {n + 1}/{len(need)}", pct=round(100 * (n + 1) / len(need)))
        P(f"pass {attempt + 1}: Whisper-checking {len(need)} take{'s' * (len(need) != 1)}")
        for l in need:
            t = l["takes"][-1]
            t.update(score(t["file"], l["text"], lang))
            if not t["ok"]:
                P(f"redo {l['scene']}: {'; '.join(t['issues'])}")
        gc.collect()
    weak_left = []
    for l in lines:
        if l["takes"]:
            best = min(l["takes"], key=lambda t: (not t.get("ok", False), t.get("cer", 1)))
            l["chosen"] = best["file"]
            if not best.get("ok"):
                weak_left.append(f"{l['scene']}: {'; '.join(best.get('issues', []))}")
    for l in lines:
        if not l.get("chosen"):
            continue          # --only run: this scene wasn't voiced here, keep its existing wav
        aud = sf.read(l["chosen"], dtype="float32")[0]
        sf.write(out / f"{l['scene']}.wav", np.concatenate([np.zeros(int(0.04 * SR), np.float32), aud, np.zeros(int(0.12 * SR), np.float32)]), SR)
    used = sorted({voice_entry(l["_v"])["name"] for l in lines})
    qc = {"mode": a.mode, "model": "ElevenLabs " + VOICES.get("model", "") + " · " + ", ".join(used), "voice": used[0] if len(used) == 1 else used,
          "lang": lang, "lines": len(lines), "regenerated": regenerated + (prev or {}).get("regenerated", 0), "weak_left": weak_left,
          "untouched": True, "detail": [{k: v for k, v in l.items() if k not in ("redo", "prev", "next")} for l in lines]}
    (out / "voice_qc.json").write_text(json.dumps(qc, ensure_ascii=False, indent=1), encoding="utf-8")
    P(f"voice done: {len(lines)} scenes, {qc['regenerated']} regenerated, weak left: {len(weak_left)}")


if __name__ == "__main__":
    main()
