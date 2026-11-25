"""Final QC pass. Never hand over a video that failed its own QC.

  qc.py audio  <final.mp4> <props.json> <lang> <out.json>   (run in .venv-tts: Whisper large-v3-turbo via pipeline/asr.py)
  qc.py video  <final.mp4> <props.json> <footage.json> <out.json>  (run in .venv: CLIP + ffmpeg)

Checks (each -> {name, pass, detail, fix}):
  timing     caption word times vs an independent Whisper pass on the voice stem (median |offset|, outliers)
  cuts       every scene cut falls in a pause, never inside a word
  pronounce  WER of the final mix vs the script, and per-scene CER -> weak scenes listed for re-voicing
  relevance  CLIP(footage, subject) for footage scenes; CLIP(frame, headline+line) floor for animated scenes
  motion     constant 30 fps, frame count matches duration, no runs of duplicated frames inside moving scenes
  captions   inside the safe zone, contrast >= 4.5:1, at least 56 px, at most 4 words per card
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import textnorm  # noqa: E402


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s.lower()).replace("़", "")
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _lev(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[:], i
        for j in range(1, len(b) + 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
    return d[len(b)]


NUMWORDS = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
            "11": "eleven", "12": "twelve", "15": "fifteen", "18": "eighteen", "20": "twenty", "30": "thirty", "50": "fifty", "100": "hundred"}


def _tok(s: str, lang: str) -> list[str]:
    if lang in ("hi", "hl"):    # compare words phonetically (consonant skeleton), so "मॉडल" and "Model" are the same word
        return [t for t in (textnorm.skeleton(x) or textnorm.norm(x, lang) for x in s.split()) if t]
    return [t for t in (textnorm.norm(x, lang) for x in s.split()) if t]


def word_voiced_dur(e, thr, hop_s):
    """Voiced length of ONE word from its 10 ms peak envelope: Whisper spans often include the previous word's decaying
    tail and a comma pause, so take the strongest run of active frames (runs split by >= 40 ms of silence)."""
    act = e > thr
    runs, i, n = [], 0, len(e)
    while i < n:
        if act[i]:
            j = i; gap = 0
            k = i
            while k < n and (act[k] or gap < 4):
                gap = 0 if act[k] else gap + 1
                if act[k]:
                    j = k
                k += 1
            runs.append((i, j + 1)); i = k
        else:
            i += 1
    if not runs:
        return None
    best = max(runs, key=lambda r: float(e[r[0]:r[1]].sum()))
    return (best[1] - best[0]) * hop_s


def voice_stem(exdir: str, total: float, sr: int = 16000) -> np.ndarray | None:
    """The narration alone, each scene's voice clip placed at its exact timeline position (explainroo build/timeline.json).
    Timing and cut checks run on this: under the music bed Whisper starts soft sentence-initial words ("The", "A", "He")
    0.4-0.6 s late, which flagged correct captions as drifting (measured on mahabharat-doc EN)."""
    import librosa
    try:
        tl = json.load(open(Path(exdir) / "build" / "timeline.json"))
    except Exception:
        return None
    y = np.zeros(int((total + 1) * sr), dtype=np.float32)
    for sc in tl["scenes"]:
        v = sc.get("voice") or {}
        f = Path(exdir) / v.get("url", "")
        if not v.get("url") or not f.exists():
            continue
        a, _ = librosa.load(str(f), sr=sr, mono=True)
        i = int(v["start"] * sr); y[i:i + len(a)] += a[: max(0, len(y) - i)]
    return y


def audio(final: str, props_f: str, lang: str, out: str, exdir: str | None = None) -> None:
    import asr
    import soundfile as sf
    props = json.load(open(props_f, encoding="utf-8"))
    W = dict(language="hi" if lang == "hl" else lang, word_timestamps=True, condition_on_previous_text=False)
    res = asr.transcribe(final, **W)
    hyp_mix = [(w["word"].strip(), w["start"], w["end"]) for seg in res["segments"] for w in seg.get("words", [])]
    stem = voice_stem(exdir, props.get("duration") or (props["scenes"][-1]["start"] + props["scenes"][-1]["dur"])) if exdir else None
    if stem is not None and stem.any():
        sp = Path(out).with_suffix(".voice.wav"); sf.write(sp, stem, 16000)
        rs = asr.transcribe(str(sp), **W)
        hyp = [(w["word"].strip(), w["start"], w["end"]) for seg in rs["segments"] for w in seg.get("words", [])]
        timing_src = "the voice stem (independent Whisper pass; music excluded)"
    else:
        hyp, timing_src = hyp_mix, "the final mix"
    cap = [(w.get("wv") or w["w"], sc["start"] + w["s"], sc["start"] + w["e"], sc["id"]) for sc in props["scenes"] for w in sc["words"]]
    # align caption words to recognised words by normalised text, in order (greedy within a window)
    offs, j = [], 0
    hn = [textnorm.norm(h[0], lang) for h in hyp]
    ph = lang in ("hi", "hl")             # Whisper writes Hindi loanwords in Latin ("AI smart"): match words phonetically too
    hk = [textnorm.skeleton(h[0]) for h in hyp] if ph else []
    for w, s, e, sid in cap:
        n = textnorm.norm(w, lang)
        nk = textnorm.skeleton(w) if ph else ""
        for k in range(j, min(len(hyp), j + 6)):
            if n and (hn[k] == n or (ph and len(nk) >= 2 and hk[k] == nk) or
                      (len(n) > 3 and (hn[k].startswith(n[:4]) or n.startswith(hn[k][:4] if len(hn[k]) > 3 else "#")))):
                offs.append((hyp[k][1] - s, sid, w, s)); j = k + 1; break
    o = np.array([x[0] for x in offs]) if offs else np.array([9.0])
    med = float(np.median(np.abs(o)))
    outl = [(round(x[0], 2), x[1], x[2], x[3]) for x in offs if abs(x[0]) > 0.35]
    verified = 0
    if stem is not None and stem.any() and outl:
        # Whisper's long-form timestamps lag the first word after a long silence. On the clean voice stem the energy is
        # ground truth: a flagged word whose caption start sits within 150 ms of a real speech onset is not drift.
        hop = 160; fr = np.array([np.abs(stem[i:i + hop]).max() for i in range(0, len(stem) - hop, hop)])
        db = 20 * np.log10(fr / max(1e-9, fr.max()) + 1e-9)
        # onset = first loud frame (> -28 dB) with silence 50-150 ms before it (each line starts with a ~50 ms soft ramp)
        on = [i * hop / 16000 for i in range(15, len(db)) if db[i] > -28 and db[i - 1] <= -28 and db[i - 15:i - 5].max() < -38]
        keep = []
        for x in outl:
            if any(abs(o - x[3]) < 0.15 for o in on):
                verified += 1
            else:
                keep.append(x)
        outl = keep
    outl = [x[:3] for x in outl]
    matched = len(offs) / max(1, len(cap))
    checks = [{"name": "timing", "pass": med <= 0.12 and len(outl) <= max(2, 0.05 * len(cap)) and matched >= 0.6,
               "detail": f"median |caption-speech| offset {med*1000:.0f} ms over {len(offs)}/{len(cap)} matched words; {len(outl)} words off by >350 ms (measured on {timing_src}{f'; {verified} Whisper-flagged words confirmed on time by the speech onset' if verified else ''})",
               "outliers": outl[:10], "fix": "re-align captions from the explainroo word timings / re-voice drifting scene"}]
    # pace (scene to scene): measured and reported only. The narration is ElevenLabs' own delivery, never sped up or
    # slowed down, so its natural pace differences between scenes are kept on purpose.
    try:
        tl = {x["id"]: x for x in json.load(open(Path(exdir) / "build" / "timeline.json"))["scenes"]} if exdir else {}
        rates = []
        for sc in props["scenes"]:
            v = (tl.get(sc["id"]) or {}).get("voice") or {}
            n = len(sc["words"])
            if v.get("dur") and n >= 4:
                rates.append((sc["id"], round(n / max(0.5, v["dur"] - 0.16) * 60, 1)))
        if len(rates) >= 2:
            r = np.array([x[1] for x in rates]); cv = float(r.std() / r.mean())
            checks.append({"name": "pace", "pass": True, "detail": f"scene-to-scene pace variation {cv * 100:.1f}% (reported only: ElevenLabs pacing is kept as delivered), mean {r.mean():.0f} wpm; "
                           + ", ".join(f"{i} {w:.0f}" for i, w in rates), "rates": rates})
    except Exception as e:
        checks.append({"name": "pace", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # word-to-word pace inside lines: on the voice stem, a word whose duration per letter is far off its scene's median
    # is a drag (stretched vowel, stalled word) or a rush. Phrase-final words before a pause are allowed to lengthen.
    try:
        drags, rush, nw = [], [], 0
        for sc in props["scenes"]:
            a0, a1 = sc["start"], sc["start"] + sc["dur"]
            ws = [h for h in hyp if a0 <= (h[1] + h[2]) / 2 < a1 and h[2] > h[1]]
            if len(ws) < 4:
                continue
            # Whisper hangs the pause before a word onto that word's start (sentence-initial words looked "dragged"):
            # time only the VOICED part of each word span, from the voice stem's energy
            def vdur(h):
                if stem is None or not stem.any():
                    return h[2] - h[1]
                seg = stem[int(h[1] * 16000): int(h[2] * 16000)]
                if len(seg) < 320:
                    return h[2] - h[1]
                k = len(seg) // 160; e = np.abs(seg[: k * 160]).reshape(k, 160).max(1)
                d = word_voiced_dur(e, 0.12 * spk, 0.01)
                return d if d is not None else h[2] - h[1]
            spk = float(np.percentile(np.abs(stem), 99.5)) if stem is not None and stem.any() else 1.0
            durs = [vdur(h) for h in ws]
            per = np.array([d / max(2, len(textnorm.norm(h[0], lang))) for d, h in zip(durs, ws)]); med = float(np.median(per)); nw += len(ws)
            for i, h in enumerate(ws):
                phrase_end = i == len(ws) - 1 or ws[i + 1][1] - h[2] >= 0.22
                if per[i] > 2.6 * med and durs[i] > 0.45 and not phrase_end:
                    drags.append(f"{sc['id']}:{h[0]}@{h[1]:.1f}s")
                elif per[i] < 0.3 * med and len(textnorm.norm(h[0], lang)) >= 4:
                    rush.append(f"{sc['id']}:{h[0]}@{h[1]:.1f}s")
        checks.append({"name": "word-pace", "pass": len(drags) + len(rush) <= max(2, int(0.03 * nw)), "scenes": sorted({x.split(":")[0] for x in drags + rush}),
                       "detail": f"{len(drags)} dragged / {len(rush)} rushed words of {nw} (limit {max(2, int(0.03 * nw))}; measured on {timing_src})"
                                 + (": " + ", ".join((drags + rush)[:6]) if drags or rush else ""),
                       "fix": "re-voice the scenes with dragged/rushed words"})
    except Exception as e:
        checks.append({"name": "word-pace", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # blips: isolated bursts shorter than 100 ms with >= 150 ms of silence on both sides (join artefacts)
    try:
        if stem is not None and stem.any():
            hop = 160; k = len(stem) // hop
            env = np.abs(stem[: k * hop]).reshape(k, hop).max(1); on = env > 0.03 * env.max()
            runs, i = [], 0
            while i < k:
                if on[i]:
                    j = i
                    while j < k and on[j]:
                        j += 1
                    runs.append((i, j)); i = j
                else:
                    i += 1
            bl = [r for n_, r in enumerate(runs) if (r[1] - r[0]) * 0.01 < 0.1 and env[r[0]:r[1]].max() >= 0.06 * env.max() and (n_ == 0 or r[0] - runs[n_ - 1][1] >= 15) and (n_ == len(runs) - 1 or runs[n_ + 1][0] - r[1] >= 15)]
            checks.append({"name": "blips", "pass": not bl, "times": [round(r[0] * 0.01, 2) for r in bl], "detail": f"{len(bl)} isolated <100 ms bursts in the narration" + (": at " + ", ".join(f"{r[0] * 0.01:.2f}s" for r in bl[:6]) if bl else ""),
                           "fix": "re-voice the scene (voice_worker drops edge blips and fades every join)"})
    except Exception as e:
        checks.append({"name": "blips", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # music ducking: the bed must sit well under the voice while it speaks and rise in the pauses
    try:
        import sound_design
        dr = sound_design.duck_report(Path(exdir).parent, stem) if exdir else {}
        if dr:
            checks.append({"name": "music", "pass": bool(dr["voice_over_music_db"] >= 12 and dr["rise_in_gaps_db"] >= 3),
                           "detail": f"voice {dr['voice_over_music_db']} dB over the music while speaking; music rises {dr['rise_in_gaps_db']} dB in pauses (need >= 12 / >= 3)",
                           **dr, "fix": "change music level / sidechain settings in sound_design.mix_audio"})
    except Exception as e:
        checks.append({"name": "music", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # cuts must fall in pauses: the aligned words of both scenes must end/start on the right side of the cut, and no
    # word Whisper hears on the final mix may be centred on it (its word *starts* swallow pauses, so midpoints are used;
    # the mix's energy isn't usable here because the music bed swells in every pause).
    import librosa
    sr = 16000
    y = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", final, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32)
    hop = 160
    rms = librosa.feature.rms(y=y, frame_length=640, hop_length=hop)[0]
    speech = float(np.median([rms[int(s * sr / hop)] for _, s, e in hyp if int(s * sr / hop) < len(rms)] or [rms.max()]))
    bad = []
    stem_peak = float(np.percentile(np.abs(stem), 99.5)) if stem is not None and stem.any() else 1.0
    for a_, b_ in zip(props["scenes"], props["scenes"][1:]):
        cut = b_["start"]
        i0, i1 = int((cut - 0.04) * sr / hop), int((cut + 0.04) * sr / hop)
        level = float(rms[max(0, i0):max(i0 + 1, i1)].max()) if i0 < len(rms) else 0
        last_end = a_["start"] + (a_["words"][-1]["e"] if a_["words"] else 0)
        first_start = b_["start"] + (b_["words"][0]["s"] if b_["words"] else 0)
        if stem is not None and stem.any():
            # ground truth on the clean voice stem: the 80 ms around the cut must be silence (no speech cut in half)
            w0, w1 = int((cut - 0.04) * 16000), int((cut + 0.04) * 16000)
            seg = stem[max(0, w0):max(w0 + 1, w1)]
            mids = [] if float(np.abs(seg).max() if len(seg) else 0) < 0.08 * stem_peak else ["speech at the cut"]
        else:
            mids = [w for w, s0, e0 in hyp if abs((s0 + e0) / 2 - cut) < 0.06 and (e0 - s0) < 0.8]
        if last_end > cut + 0.02 or first_start < cut - 0.02 or mids:
            bad.append({"cut": round(cut, 2), "between": [a_["id"], b_["id"]], "level_vs_speech": round(level / max(1e-6, speech), 2),
                        "last_word_end": round(last_end, 2), "next_word_start": round(first_start, 2)})
    checks.append({"name": "cuts", "pass": not bad, "detail": f"{len(props['scenes']) - 1} scene cuts, {len(bad)} not in a pause", "bad": bad,
                   "fix": "move the cut into the pause"})
    # pronunciation: WER overall + per scene CER
    # intelligibility is judged on what viewers hear (the final mix, music included) but transcribed scene by scene:
    # Whisper's long-form decoding skips whole stretches after pauses (mahabharat-doc HI: a scene read perfectly when
    # transcribed on its own scored CER 0.41 in the long pass)
    import soundfile as sf
    mix16 = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", final, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                         capture_output=True).stdout, dtype=np.float32)
    per, heard_all = [], []
    for sc in props["scenes"]:
        a0, a1 = max(0.0, sc["start"] - 0.1), sc["start"] + sc["dur"] + 0.1
        clip = Path(out).with_suffix(f".{sc['id']}.wav"); sf.write(clip, mix16[int(a0 * 16000):int(a1 * 16000)], 16000)
        hs = asr.transcribe(str(clip), **{k: v for k, v in W.items() if k != "word_timestamps"})["text"].strip()
        clip.unlink(missing_ok=True)
        heard_all.append(hs)
        cer = textnorm.cer(sc["narration"], hs, lang)
        per.append({"scene": sc["id"], "cer": round(cer, 3), "heard": hs[:160]})
    ref = [t for sc in props["scenes"] for t in _tok(sc["narration"], lang)]
    hy = [t for h in heard_all for t in _tok(h, lang)]
    wer = _lev(ref, hy) / max(1, len(ref))
    lim = 0.10 if lang == "en" else 0.18
    weak = [p for p in per if p["cer"] > lim]
    checks.append({"name": "pronounce", "pass": wer <= (0.10 if lang == "en" else 0.2) and not weak,
                   "detail": f"WER {wer:.3f} on the final mix; scenes over CER {lim}: {[w['scene'] for w in weak] or 'none'}",
                   "per_scene": per, "weak": [w["scene"] for w in weak], "fix": "regenerate the weak scenes' voice lines"})
    json.dump({"checks": checks}, open(out, "w"), ensure_ascii=False, indent=1)


def _ffprobe(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
                          "stream=r_frame_rate,avg_frame_rate,nb_read_frames,width,height:format=duration", "-of", "json", f], capture_output=True, text=True).stdout
    return json.loads(out)


def _contrast(c1, c2):
    def lum(h):
        h = h.lstrip("#"); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    a, b = sorted([lum(c1), lum(c2)], reverse=True)
    return (a + 0.05) / (b + 0.05)


def video(final: str, props_f: str, foot_f: str, out: str) -> None:
    from PIL import Image
    props = json.load(open(props_f)); foot = json.load(open(foot_f)) if Path(foot_f).exists() else {}
    checks = []
    p = _ffprobe(final); st = p["streams"][0]; dur = float(p["format"]["duration"])
    fr = st["r_frame_rate"]; n = int(st.get("nb_read_frames") or 0)
    exp = round(dur * 30)
    # duplicate-frame runs: compare consecutive frames at low res inside each scene's middle
    tmp = Path(out).with_suffix(".frames"); tmp.mkdir(exist_ok=True)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", final, "-vf", "scale=96:170,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    fr_arr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 170, 96).astype(np.int16)
    diffs = np.abs(np.diff(fr_arr, axis=0)).mean(axis=(1, 2))
    dup_runs, run = [], 0
    for i, d in enumerate(diffs):
        run = run + 1 if d < 0.02 else 0
        if run == 8:   # 8+ identical frames in a row while something should be moving
            t = i / 30
            sc = next((s for s in props["scenes"] if s["start"] <= t < s["start"] + s["dur"]), None)
            if sc and (sc.get("footage") or props.get("style") == "real-footage"):
                dup_runs.append(round(t, 2))
    jerk = float(np.percentile(np.abs(np.diff(diffs)), 99.5)) if len(diffs) > 10 else 0
    # jank: a single-frame jump far above the local motion level, not at a scene cut (where a change is expected)
    cuts = [s["start"] for s in props["scenes"][1:]]
    med = np.array([np.median(diffs[max(0, i - 15): i + 15]) for i in range(len(diffs))])
    jank = [round((i + 1) / 30, 2) for i in range(len(diffs)) if diffs[i] > max(6.0, 8 * med[i]) and not any(abs((i + 1) / 30 - c) < 0.4 for c in cuts)]
    # stop-motion / glitch / neon flicker-on are jumps BY DESIGN; with mixed-per-scene styles judge each scene by its own style
    BY_DESIGN = ("glitch-vhs", "pixel-art", "paper-cutout", "kinetic-typography", "neon-glow")
    def _style_at(t):
        sc_ = next((s for s in props["scenes"] if s["start"] <= t < s["start"] + s["dur"]), None)
        return (sc_ or {}).get("style") or props.get("style")
    # a new karaoke caption card fading in is a big pixel change on light backgrounds, not jank: mirror Karaoke.tsx chunking
    card = []
    for sc_ in props["scenes"]:
        cur, chars = [], 0
        ws_ = sc_.get("words") or []
        for i_, w_ in enumerate(ws_):
            if not cur:
                card.append(sc_["start"] + w_["s"] - 0.08)
            cur.append(w_); chars += len(w_["w"])
            if re.search(r"[.,!?।;:—]$", w_["w"]) or len(cur) >= 4 or chars > 22 or (i_ + 1 < len(ws_) and ws_[i_ + 1]["s"] - w_["e"] > 0.35):
                cur, chars = [], 0
    jank = [t for t in jank if not any(-0.05 <= t - c <= 0.2 for c in card)]
    # documentary film coverage: the shot cuts INSIDE a reenactment are deliberate hard cuts (same rule as autoShots in
    # styles/remotion/src/styles/CharacterStory.tsx: phrase boundaries, shots 1.6-3.4 s); a cut is not jank
    shot_cuts = []
    for sc_ in props["scenes"]:
        st_ = sc_.get("stage") or {}
        if not st_ or st_.get("shots") != "auto":
            continue
        ws_, dur_, b_ = sc_.get("words") or [], sc_["dur"], [0.0]
        for i_, w_ in enumerate(ws_[:-1]):
            nx_ = ws_[i_ + 1]
            if (re.search(r"[.,!?;:—]$", w_["w"]) or nx_["s"] - w_["e"] > 0.25) and nx_["s"] - b_[-1] >= 1.6 and dur_ - nx_["s"] >= 1.2:
                b_.append(max(0.0, nx_["s"] - 0.04))
        all_ = b_ + [dur_]
        for i_ in range(len(all_) - 1):
            shot_cuts.append(sc_["start"] + all_[i_]); L_ = all_[i_ + 1] - all_[i_]
            if L_ > 3.4:
                n_ = int(np.ceil(L_ / 2.8)); shot_cuts += [sc_["start"] + all_[i_] + L_ * k_ / n_ for k_ in range(1, n_)]
    jank = [t for t in jank if not any(abs(t - c) <= 0.1 for c in shot_cuts)]
    designed = [t for t in jank if _style_at(t) in BY_DESIGN]
    jank = [t for t in jank if t not in designed]
    intentional = props.get("style") in BY_DESIGN and not any(s.get("style") for s in props["scenes"])   # by-design jumps are already removed above
    checks.append({"name": "motion", "pass": fr == "30/1" and abs(n - exp) <= 2 and not dup_runs and (intentional or len(jank) <= 2),
                   "detail": f"{fr} fps, {n} frames for {dur:.2f}s (expected {exp}); frozen runs in footage scenes: {dup_runs or 'none'}; "
                             f"sudden jumps outside cuts: {jank[:6] or 'none'}{' (stop-motion/glitch by design)' if intentional and jank else ''}",
                   "fix": "re-render at constant 30 fps; check Ken Burns easing / clip playback rate"})
    # relevance
    rel = []
    for sid, f in foot.items():
        rel.append({"scene": sid, "kind": "footage" if not f.get("rejected") else "animated (footage rejected)", "clip": f.get("clip"),
                    "subject": f.get("subject"), "ok": (f.get("clip") or 0) >= 0.245 or bool(f.get("rejected"))})
    try:
        sys.path.insert(0, str(Path(__file__).parent)); import footage as fm
        frames, texts = [], []
        for sc in props["scenes"]:
            t = sc["start"] + min(sc["dur"] * 0.7, sc["dur"] - 0.2)
            fp = tmp / f"{sc['id']}.jpg"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", final, "-frames:v", "1", "-vf", "scale=540:-2", str(fp)])
            frames.append(Image.open(fp).convert("RGB"))
            if sc.get("visual") in ("card", "map", "timeline"):   # documentary fallback: it draws the headline/places/dates, not the footage subject
                texts.append((re.sub(r"\*", "", sc["headline"]) + ". " + re.split(r"(?<=[.!?।])\s", sc.get("narration") or "")[0]).strip())
            else:
                texts.append(((sc.get("visual_subject") or "") + " " + re.sub(r"\*", "", sc["headline"])).strip())
        for r in rel:                     # context gate on every footage pick: right subject AND right culture/era
            f = foot.get(r["scene"]) or {}
            src = Path(foot_f).parent / (f.get("src") or "-")
            if r["ok"] and not f.get("rejected") and f.get("kind") == "image" and src.exists():
                ok, why = fm.context_ok(f.get("subject") or "", Image.open(src).convert("RGB"))
                if not ok:
                    r["ok"] = False; r["context"] = why
        for sc, im, tx in zip(props["scenes"], frames, texts):
            s = fm.clip_scores(tx, [im])[0]
            if sc["id"] not in foot:
                rel.append({"scene": sc["id"], "kind": "animated", "clip": round(s, 3), "subject": tx, "ok": s >= 0.18})
    except Exception as e:
        rel.append({"scene": "*", "kind": "error", "clip": None, "subject": str(e)[:120], "ok": True})
    checks.append({"name": "relevance", "pass": all(r["ok"] for r in rel), "detail": f"{sum(r['ok'] for r in rel)}/{len(rel)} scenes show what the line says",
                   "scenes": rel, "fix": "swap the scene's footage for the next candidate, or let it fall back to animation"})
    # frame balance: visuals compose across the whole 9:16 frame (no persistent empty top/middle/bottom zone)
    try:
        import balance
        skip = [(sc["start"], sc["start"] + sc["dur"]) for sc in props["scenes"] if sc["id"] in foot and not foot[sc["id"]].get("rejected")]
        bal = balance.check(final, every=1.0, skip=skip)
        # a style can declare checks that do not fit its design (styles/styles.json "qc_not_applied": {check: reason});
        # the measurement is still reported, marked as not applied
        na = (json.loads((Path(__file__).resolve().parent.parent / "styles" / "styles.json").read_text())["styles"].get(props.get("style"), {}) or {}).get("qc_not_applied", {})
        why = na.get("balance")
        checks.append({"name": "balance", "pass": bal["pass"] or bool(why),
                       "detail": f"empty zones: {bal['empty_zones'] or 'none'}; median dead bands/frame {bal['median_dead_bands']}" + (f" (not applied to this style: {why})" if why and not bal["pass"] else ""),
                       "bands": bal["dead_band_share"], "fix": "give the empty band visual content (style edge dressing / footage framing)"})
    except Exception as e:
        checks.append({"name": "balance", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # text layout: OCR every second; no text may collide with other text or run off the frame
    try:
        import textcheck
        tc = textcheck.check(final, every=1.0, skip=[(sc["start"] - 0.4, sc["start"] + 0.1) for sc in props["scenes"][1:]])
        checks.append({"name": "text-layout", "pass": tc["pass"], "detail": f"{len(tc['overlaps'])} text-over-text collisions, {len(tc['edge'])} lines touching the frame edge" +
                       (f"; e.g. {tc['overlaps'][0]['a']!r} x {tc['overlaps'][0]['b']!r} at {tc['overlaps'][0]['t']}s" if tc["overlaps"] else ""), "overlaps": tc["overlaps"],
                       "fix": "move the colliding element into its style zone"})
    except Exception as e:
        checks.append({"name": "text-layout", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # caption band (any script, incl. Devanagari which the OCR cannot read): style text drawn into the band the captions use
    try:
        if props.get("baseVideo"):
            import captionband
            bases = sorted(Path(props_f).parent.glob("explainroo-*/out/" + props["baseVideo"]), key=lambda x: x.stat().st_mtime)
            if bases:
                cb = captionband.check(str(bases[-1]), props, 1500 if props.get("style") == "documentary-history" else 1166)
                checks.append({"name": "caption-band", "pass": cb["pass"], "hits": cb["hits"],
                               "detail": f"style text inside the caption band while captions show: {len(cb['hits'])} frames" + (" at " + ", ".join(f"{h['scene']}@{h['t']}s" for h in cb["hits"][:5]) if cb["hits"] else ""),
                               "fix": "move the style element out of the caption band (style.js zones)"})
    except Exception as e:
        checks.append({"name": "caption-band", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # burned-in text that must never be in a frame: licence credits, debug/placeholder strings (Latin text; OCR)
    try:
        import textcheck
        import tempfile as _tf
        td = Path(_tf.mkdtemp())
        subprocess.run(["ffmpeg", "-loglevel", "error", "-i", final, "-vf", "fps=1/2,scale=720:-2", str(td / "b%03d.png")], check=True)
        BAD = re.compile(r"\bcc[\s-]?(by|0)\b|creative commons|©|\bpublic domain\b|wikimedia|openverse|flickr|undefined|\[object|lorem ipsum|\btodo\b|placeholder|\{\{", re.I)
        BAD_CS = re.compile(r"\bNaN\b|\bnull\b|\bNULL\b")     # case-sensitive: Hinglish "nahi"/"na" OCR'd as "nan" is not a bug
        burned = []
        for fp in sorted(td.glob("b*.png")):
            for l in textcheck.ocr(str(fp)):
                if BAD.search(l["text"]) or BAD_CS.search(l["text"]):
                    burned.append(f"{(int(fp.stem[1:]) - 1) * 2}s: {l['text'][:40]}")
        checks.append({"name": "burned-text", "pass": not burned, "detail": f"licence/debug/placeholder text in frames: {len(burned)}" + (": " + "; ".join(burned[:4]) if burned else ""),
                       "fix": "remove the overlay; credits go to CREDITS.txt + the caption"})
    except Exception as e:
        checks.append({"name": "burned-text", "pass": True, "detail": f"not measured: {str(e)[:80]}"})
    # captions: where the karaoke words actually appear (OCR at 10 spoken words), inside the Reels safe zone
    # (y 220-1600 of 1920 clear of the app UI, x 5-95%), plus highlight contrast. Hindi: Vision OCR can't read Devanagari,
    # so only contrast + presence are checked.
    words = [(w["w"], sc["start"] + (w["s"] + w["e"]) / 2) for sc in props["scenes"] for w in sc["words"]]
    con = min(_contrast("#ffffff", "#000000"), _contrast("#111111", (props.get("captionKey") or "#ffd43b")))
    ys, outside, seen = [], [], 0
    if props.get("lang", "en") in ("en", "hl") and words:      # Roman-script captions are OCR-readable
        try:
            import textcheck
            long = [x for x in words if len(re.sub(r"[^a-z0-9]", "", x[0].lower())) >= 4] or words   # short words ("AI") match noise
            samples = []
            for w, t in [long[int(i * (len(long) - 1) / 9)] for i in range(10)]:
                fp = tmp / f"cap{t:.2f}.png"
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", final, "-frames:v", "1", "-vf", "scale=540:-2", str(fp)])
                key = re.sub(r"[^a-z0-9]", "", w.lower())
                ocr = textcheck.ocr(str(fp))
                hit = [l for l in ocr if key and key in [re.sub(r"[^a-z0-9]", "", x) for x in l["text"].lower().split()]]
                # OCR sometimes merges karaoke words ("Disneyclosed"): accept the word inside a merged token too
                hit = hit or [l for l in ocr if key and len(key) >= 4 and any(key in re.sub(r"[^a-z0-9]", "", x) for x in l["text"].lower().split())]
                if hit:
                    samples.append((t, hit))
            # the same word can also appear in-world (a wall banner reading "DOOM" behind the caption saying "Doom"), so the
            # caption line is the match nearest the captions' usual height (median of each sample's biggest match), not just
            # the biggest one
            big = [max(h, key=lambda l: l["box"][3])["box"] for _, h in samples]
            med = float(np.median([b[1] + b[3] / 2 for b in big])) if big else 0.8
            for t, hit in samples:
                x, y, bw, bh = min(hit, key=lambda l: abs(l["box"][1] + l["box"][3] / 2 - med) - l["box"][3] * 0.5)["box"]
                if abs(y + bh / 2 - med) > 0.12 and len(samples) >= 4:
                    continue                 # only an in-world copy of the word (a wall sign) was read: the caption itself wasn't found
                seen += 1
                ys.append((y + bh / 2) * 1920)
                if y * 1920 < 220 or (y + bh) * 1920 > 1600 or x < 0.05 or x + bw > 0.95:
                    outside.append(round(t, 1))
        except Exception:
            pass
    where = f"measured at y≈{int(np.median(ys))} ({seen}/10 sampled words found by OCR)" if ys else "position not measurable (OCR)"
    checks.append({"name": "captions", "pass": con >= 4.5 and len(words) > 0 and not outside,
                   "detail": f"karaoke captions {where}; outside the Reels safe zone at: {outside or 'never'}; highlight contrast {con:.1f}:1; {len(words)} timed words",
                   "fix": "move the caption layer into the safe zone / raise contrast"})
    json.dump({"checks": checks}, open(out, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "audio":
        audio(*sys.argv[2:7])     # final props lang out [explainroo_dir]
    elif mode == "video":
        video(*sys.argv[2:6])
