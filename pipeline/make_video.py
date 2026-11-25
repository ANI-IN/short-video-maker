#!/usr/bin/env python3
"""Storyboard JSON + style + ONE language -> finished 1080x1920 MP4 (modes: fast | max | cinematic).

  .venv/bin/python pipeline/make_video.py --storyboard output/<slug>/storyboard.json --style real-footage --lang en

Steps (each prints a machine-readable progress line "@@P {json}"):
  lint      script humaniser rules (pipeline/humanize.py) — stock AI phrasing fails the run
  voice     ElevenLabs narration (config/voices.json), pauses from punctuation, one steady pace per line and scene,
            every line Whisper-checked and regenerated if weak (pipeline/voice_worker.py, runs in .venv-tts)
  footage   licensed photos (Openverse) / clips (Wikimedia Commons) for footage scenes, CLIP-ranked to the line
  timing    explainroo: audio master (voice + ducked music) + Whisper word timings
  base      explainroo picture for explainroo styles (captions off; footage scenes left blank)
  composite Remotion: style scenes / base video + footage scenes (Ken Burns + parallax) + dissolves + karaoke captions
  export    ffmpeg: 30 fps, light sharpen (no denoise), x264 by mode (veryfast CRF 20 / slow 14 / veryslow 13), two-pass loudnorm -15 LUFS
  qc        timing drift, cuts, pronunciation, relevance, motion, captions -> auto-fix + re-render (0 / 2 / 4 rounds by mode)
"""
from __future__ import annotations

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import plat; plat.ensure_utf8()  # noqa: E401,E702  (Windows: UTF-8 mode)
import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import engines  # noqa: E402
import humanize  # noqa: E402
import viral  # noqa: E402

ROOT = engines.ROOT
PY_TTS = plat.venv_python(".venv-tts")
PY = plat.venv_python(".venv")


def P(step: str, status: str, msg: str = "", **kw):
    print("@@P " + json.dumps({"step": step, "status": status, "msg": msg, "t": round(time.time(), 1), **kw}, ensure_ascii=False), flush=True)


def L(v, lang):
    if v is None:
        return None
    if isinstance(v, dict) and ("en" in v or "hi" in v or "hl" in v):
        return v.get(lang) or v.get("en") or v.get("hi")
    if isinstance(v, dict):
        return {k: L(x, lang) for k, x in v.items()}
    if isinstance(v, list):
        return [L(x, lang) for x in v]
    return v


def mark_emphasis(words, sc, lang, wav):
    """Caption pop follows the VOICE: a word the narrator actually leans on (>= 2.5 dB louder than the scene's median word)
    or a *keyword* of the headline gets emph=1 (bigger pop in Karaoke.tsx); at most one per ~5 words, loudest first."""
    hl = L(sc.get("headline", ""), lang) if sc.get("headline") else ""
    keys = {k.strip(".,!?।").lower() for m in re.findall(r"\*([^*]+)\*", hl) for k in m.split()}
    db = [None] * len(words)
    try:
        import soundfile as _sf
        a, sr = _sf.read(str(wav), dtype="float32")
        a = a.mean(1) if a.ndim > 1 else a
        for i, w in enumerate(words):
            seg = a[max(0, int((w["s"] - 0.12) * sr)): max(0, int((w["e"] - 0.12) * sr))]
            if len(seg) > sr * 0.06:
                db[i] = 20 * np.log10(float(np.sqrt((seg ** 2).mean())) + 1e-9)
    except Exception:
        pass
    vals = [d for d in db if d is not None]
    med = float(np.median(vals)) if vals else 0.0
    FUNC = {"में", "का", "की", "के", "है", "हैं", "और", "से", "को", "पर", "ने", "भी", "तो", "ही", "यह", "ये", "वो", "था", "थी", "the", "a", "an", "of",
            "to", "in", "and", "is", "are", "was", "it", "that", "this", "for", "on", "with", "but", "mein", "ka", "ki", "ke", "hai", "aur", "se", "ko"}
    cand = sorted([(db[i] - med if db[i] is not None else 0) + (3 if w["w"].strip(".,!?।*").lower() in keys else 0), i]
                  for i, w in enumerate(words) if len(w["w"].strip(".,!?।")) >= 3 and w["w"].strip(".,!?।*").lower() not in FUNC)
    cap = max(1, len(words) // 5); out = [dict(w) for w in words]; n = 0
    for score_, i in reversed(cand):
        if score_ < 2.5 or n >= cap:
            break
        if any(out[j].get("emph") for j in range(max(0, i - 2), min(len(out), i + 3))):
            continue
        out[i]["emph"] = 1; n += 1
    return out


def build_props(board, lang, style, timing, picks, base=None, vdir=None):
    tm = {s["id"]: s for s in timing["scenes"]}
    scenes = []
    for sc in board["scenes"]:
        t = tm[sc["id"]]
        flat = {k: L(v, lang) for k, v in sc.items() if k not in ("narration", "footage")}
        words = t["words"]
        if lang == "hl":   # Hinglish: speech/timing follow the Devanagari twin, captions show the Roman words one-for-one
            roman = sc["narration"]["hl"].replace("*", "").split()
            if len(roman) == len(words):
                words = [dict(w, w=r, wv=w["w"]) for w, r in zip(words, roman)]   # wv: the spoken (Devanagari) form, for QC
        if vdir is not None:
            words = mark_emphasis(words, sc, lang, Path(vdir) / f"{sc['id']}.wav")
        flat.update(narration=(sc["narration"].get("hl_voice") if lang == "hl" and sc["narration"].get("hl_voice") else sc["narration"][lang]).replace("*", ""),
                    start=t["start"], dur=t["dur"], words=words,
                    visual_subject=(sc.get("footage") or {}).get("subject", "") or sc.get("render_subject", ""))
        st = sc.get("stage")
        if st and style == "documentary-history" and isinstance(flat.get("stage"), dict) and "shots" not in flat["stage"]:
            flat["stage"] = dict(flat["stage"], shots="auto")   # film coverage: wide / medium / close / insert / reverse, hard cuts
        if st and not flat["visual_subject"]:
            bgw = {"court": "a royal palace hall with pillars", "throne-room": "a dark royal throne room", "battlefield": "a dusty battlefield with flags",
                   "forest": "a green forest", "river": "a river bank", "village": "a village with huts", "night": "a starry night"}.get(st.get("background"), "a palace")
            sets = ", ".join(x["kind"].replace("-", " ") for x in st.get("set", []))
            flat["visual_subject"] = f"a flat 2D cartoon of {len(st.get('cast', []))} people in costume in {bgw}" + (f" with a {sets}" if sets else "")
        p = picks.get(sc["id"])
        flat["footage"] = ({k: p.get(k) for k in ("kind", "src", "fg", "blur", "w", "h", "credit", "render")} if p and not p.get("rejected") else None)
        scenes.append(flat)
    if board.get("characters"):
        # character-story: every scene gets the cast list (names in this language); first appearances get a name tag
        chars = [dict({k: L(v, lang) for k, v in c.items() if k != "voice"}, id=c["id"]) for c in board["characters"]]
        seen = set()
        for sc in scenes:
            sc["characters"] = chars
            for c in (sc.get("stage") or {}).get("cast", []):
                if c["id"] not in seen and style != "documentary-history":   # documentary: no name tags (text lives in the world)
                    c["intro"] = True; seen.add(c["id"])
    reg = engines.load_registry()["styles"].get(style, {})
    return {"style": style, "lang": lang, "title": board.get("title", ""), "duration": timing["duration"], "scenes": scenes,
            "baseVideo": base, "captionKey": reg.get("captionKey"), "cinema": bool(board.get("cinema"))}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--storyboard", required=True)
    ap.add_argument("--style", required=True)
    ap.add_argument("--lang", required=True, choices=["en", "hi", "hl"], help="en English, hi Hindi, hl Hinglish (Roman captions, Devanagari voice text)")
    ap.add_argument("--out")
    ap.add_argument("--name")
    ap.add_argument("--mode", default="max", choices=["fast", "max", "cinematic"],
                    help="fast draft (~3-6 min/120s) | max quality (~20-30 min/120s) | cinematic-max (up to ~2 h/120s)")
    ap.add_argument("--rounds", type=int, default=None, help="max auto-fix rounds after QC (default by mode: 0/2/4)")
    ap.add_argument("--allow-lint-fail", action="store_true")
    ap.add_argument("--skip-qc", action="store_true", help="style samples only: no QC pass")
    ap.add_argument("--voice-only", action="store_true", help="generate + check the voice, then stop (to render 3D shots to the voice's length)")
    a = ap.parse_args()
    engines.check_links()

    reg = engines.load_registry()
    styles = reg["styles"]
    if a.style not in styles:
        sys.exit(f"unknown style {a.style!r}. Choose one of: {', '.join(styles)}")
    st = styles[a.style]
    sb = Path(a.storyboard).resolve()
    board = json.loads(sb.read_text())
    lang = a.lang
    mode = a.mode
    rounds_max = a.rounds if a.rounds is not None else {"fast": 0, "max": 2, "cinematic": 4}[mode]
    doc = a.style == "documentary-history"
    root = Path(a.out).resolve() if a.out else sb.parent
    work = root / "work"; work.mkdir(parents=True, exist_ok=True)
    log = work / f"pipeline-{lang}.log"
    slug = board.get("slug") or sb.parent.name
    base_name = a.name or f"{slug}-{a.style}-{lang}"
    job = f"{slug}-{lang}"
    t0 = time.time()
    report = {"title": board.get("title"), "topic": board.get("topic"), "lang": lang, "style": a.style, "engine": st["engine"], "mode": mode,
              "hook_pattern": board.get("hook_pattern"), "hook": board["scenes"][0]["narration"][lang], "steps": {}, "fixes": []}

    def step_time(name, t):
        # cumulative across QC fix rounds (a re-render's voice/composite time adds to the first pass, it doesn't replace it)
        report["steps"][name] = round(report["steps"].get(name, 0) + time.time() - t, 1)

    # ---- lint
    t = time.time(); P("lint", "start", "script gate: humaniser checklist + Instagram virality checks (both must pass before any voice/render)")
    lint = humanize.lint(board, lang); report["lint"] = lint
    vir = viral.check(board, lang, a.style); report["viral"] = vir
    report["revisions"] = board.get("revisions", [])
    ok = lint["fails"] == 0 and vir["pass"]
    P("lint", "done" if ok else "fail", f"humaniser {lint['score']} ({lint['fails']} fails, {lint['warns']} warnings) · virality " +
      " ".join(f"{c['name']}={'ok' if c['pass'] else 'FAIL'}" for c in vir["checks"]), issues=lint["issues"][:12], viral=vir["checks"])
    step_time("lint", t)
    if not ok and not a.allow_lint_fail:
        (root / "final").mkdir(exist_ok=True)
        (root / "final" / f"{base_name}.report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        sys.exit("script gate failed: rewrite the flagged lines (humaniser fails and/or virality checks) before voice/render")

    vdir = root / "voice" / lang
    vkey = __import__("hashlib").sha1(json.dumps([[s["id"], s["narration"][lang], s["narration"].get("hl_voice") if lang == "hl" else "", (s.get("stage") or {}).get("speaker")] for s in board["scenes"]]
                                                 + [board.get("characters"), (ROOT / "pipeline" / "voice_config.json").read_text(), (ROOT / "config" / "voices.json").read_text(), mode, doc, st.get("voices"),
                                                    __import__("hashlib").md5((ROOT / "pipeline" / "voice_worker.py").read_bytes()).hexdigest()],
                                                 ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    def voice(only=None):
        qf = vdir / "voice_qc.json"
        if not only and qf.exists() and json.loads(qf.read_text()).get("key") == vkey and all((vdir / f"{s['id']}.wav").exists() for s in board["scenes"]):
            q = json.loads(qf.read_text())
            report["voice"] = {k: q[k] for k in ("model", "voice", "lines", "regenerated", "weak_left", "emphasis_shaped") if k in q}
            P("voice", "done", f"reused QC-checked voice ({q['model']}, {q['lines']} lines)"); return
        t = time.time(); P("voice", "start", "ElevenLabs voice (as delivered), Whisper-checking every scene" + (f" (redo {only})" if only else ""))
        cmd = [PY_TTS, ROOT / "pipeline" / "voice_worker.py", "--board", sb, "--lang", lang, "--out", vdir, "--mode", mode,
               "--delivery", "documentary" if doc else "default", "--style", a.style]
        if only:
            cmd += ["--only", ",".join(only)]
        # watchdog: the voice step can stall (network or Whisper on a memory-starved machine): restart it after 10 minutes without progress.
        # No progress line for 10 min -> kill the worker and start it once more.
        import queue, threading
        for attempt in (1, 2):
            vsplit, vmark = report.setdefault("voice_profile", {}), [time.time()]
            p = subprocess.Popen([str(c) for c in cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            qq = queue.Queue(); threading.Thread(target=lambda: [qq.put(x) for x in p.stdout] + [qq.put(None)], daemon=True).start()
            tail, hung = [], False
            while True:
                try:
                    line = qq.get(timeout=600)
                except queue.Empty:
                    hung = True; p.kill(); break
                if line is None:
                    break
                line = line.rstrip()
                tail = (tail + [line])[-30:]
                if line.startswith("@@P "):
                    print(line, flush=True)
                    # split the voice step: TTS generation vs Whisper checking vs regeneration (profiling)
                    for tag, key in (("Whisper-checking", "voice_tts_s"), ("voice done", "voice_whisper_qc_s")):
                        if tag in line and key not in vsplit:
                            vsplit[key] = round(time.time() - vmark[0], 1); vmark[0] = time.time()
                with open(log, "a") as f:
                    f.write(line + "\n")
            if not hung:
                break
            P("voice", "progress", f"voice worker made no progress for 10 min (GPU hang) - restarting it (attempt {attempt + 1})")
        if p.wait() != 0:
            P("voice", "fail", "\n".join(tail[-8:])); sys.exit("voice failed")
        q = json.loads((vdir / "voice_qc.json").read_text())
        q["key"] = vkey; (vdir / "voice_qc.json").write_text(json.dumps(q, ensure_ascii=False, indent=1))
        report["voice"] = {k: q[k] for k in ("model", "voice", "lines", "regenerated", "weak_left") if k in q}
        P("voice", "done", f"{q['model']} · {q['lines']} lines · {q['regenerated']} regenerated · weak left: {q['weak_left'] or 'none'}")
        step_time("voice", t)

    # ---- footage
    picks = {}
    want_foot = a.style == "real-footage" or any(sc.get("visual") in ("footage", "auto") and not sc.get("render") for sc in board["scenes"])
    # documentary-history: per-scene source decided by the script; resolved after footage (fallback chain below)
    fdir = root / "footage"
    def fetch_footage():
        nonlocal picks
        t = time.time(); P("footage", "start", "searching Openverse / Wikimedia Commons and ranking by relevance")
        b2 = json.loads(json.dumps(board))
        if a.style == "real-footage":
            for sc in b2["scenes"]:
                if sc.get("footage") and sc.get("visual", "auto") != "anim":
                    sc["visual"] = "footage"
        for sc in b2["scenes"]:
            fo = sc.get("footage")
            if fo:
                qs = fo.get("queries", [])
                if mode == "fast":
                    fo["queries"] = qs[:2]
                elif mode == "cinematic":   # more query variations per scene -> tighter matches
                    extra = [f"{q} {suf}" for q in qs[:2] for suf in (("painting", "historic photograph") if doc else ("photo", "close up"))]
                    fo["queries"] = list(dict.fromkeys(qs + extra))[:7]
                    fo["prefer"] = fo.get("prefer", "any")
        bf = work / "board-footage.json"
        bf.write_text(json.dumps(b2, ensure_ascii=False))
        code = ("import sys, json; sys.path.insert(0, 'pipeline'); import footage; from pathlib import Path; "
                f"footage.fetch_all(json.load(open({str(bf)!r})), Path({str(fdir)!r}))")
        r = subprocess.run([str(PY), "-c", code], cwd=ROOT, capture_output=True, text=True)
        with open(log, "a") as f:
            f.write(r.stdout + r.stderr)
        if r.returncode != 0:
            P("footage", "fail", r.stderr[-600:]); sys.exit("footage failed")
        picks = json.loads((fdir / "footage.json").read_text())
        ok = [k for k, v in picks.items() if not v.get("rejected")]
        rej = [k for k, v in picks.items() if v.get("rejected")]
        why = sorted({("not relevant enough" if "relevance" in (picks[k].get("rejected") or "") else "download/search error") for k in rej})
        P("footage", "done", f"{len(ok)} scenes with real footage{(', ' + str(len(rej)) + ' stayed animated (' + ' / '.join(why) + ')') if rej else ''}",
          picks={k: {"clip": v.get("clip"), "kind": v.get("kind"), "title": (v.get("credit") or {}).get("title"), "rejected": v.get("rejected")} for k, v in picks.items()})
        step_time("footage", t)
    # footage search (network + CPU/CLIP) and voice generation (GPU) don't depend on each other: run them side by side
    import threading
    foot_err = []
    def _foot():
        try:
            fetch_footage()
        except SystemExit as e:
            foot_err.append(str(e))
    th = threading.Thread(target=_foot, daemon=True) if want_foot else None
    if th:
        th.start()
    voice()
    if th:
        th.join()
        if foot_err:
            sys.exit(foot_err[0])
    if a.voice_only:
        P("voice", "done", "voice-only: stopping before render"); return
    # original renders (e.g. Blender shots in footage/<file>.mp4): used as this scene's footage, never searched for
    for sc in board["scenes"]:
        if sc.get("render"):
            f = fdir / sc["render"]
            if not f.exists():
                sys.exit(f"render missing: {f}")
            picks[sc["id"]] = {"scene": sc["id"], "kind": "video", "src": sc["render"], "w": 1080, "h": 1920, "render": True,
                               "credit": {"title": "Original 3D render (Blender)", "creator": "this channel", "license": "own work", "source": "blender"}}

    final = root / "final" / f"{base_name}.mp4"

    def resolve_doc():
        """documentary-history: footage that wasn't found/relevant falls back to reenactment (if staged) -> map (places)
        -> timeline (steps) -> engraved card; explainroo draws map/timeline/card, Remotion draws footage/reenactment."""
        if not doc:
            return []
        changes = []
        for sc in board["scenes"]:
            v = sc.get("visual", "auto")
            got = sc["id"] in picks and not picks[sc["id"]].get("rejected")
            if v in ("footage", "auto") and not got:
                nv = "reenact" if sc.get("stage") else "map" if sc.get("places") else "timeline" if sc.get("steps") else "card"
                changes.append(f"{sc['id']}: footage -> {nv}"); sc["visual"] = nv
            elif v in ("footage", "auto") and got:
                sc["visual"] = "footage"
        return changes

    def render_all():
        doc_changes = resolve_doc()
        if doc_changes:
            report["doc_fallbacks"] = doc_changes
            P("footage", "progress", "documentary cuts: " + "; ".join(doc_changes))
        foot_ids = ({k for k, v in picks.items() if not v.get("rejected")} | {sc["id"] for sc in board["scenes"] if sc.get("visual") == "reenact"}
                    # mixed per scene: a scene drawn by another style is left blank in the explainroo base, or the base's own
                    # version of it bleeds through the dissolves
                    | {sc["id"] for sc in board["scenes"] if sc.get("style") and sc["style"] != a.style})
        # ---- timing (+ base for explainroo styles)
        t = time.time(); P("timing", "start", "aligning words with Whisper and building the audio master")
        ex_style = a.style if st["engine"] == "explainroo" else "_audio"
        board["_style"] = a.style
        proj = engines.build_explainroo(board, lang, ex_style, vdir, work, foot_ids, st.get("music"))
        engines.explainroo_voice(proj, log)
        timing = engines.explainroo_timing(proj, lang)
        P("timing", "done", f"{timing['duration']:.1f}s, {sum(len(s['words']) for s in timing['scenes'])} timed words"
                            + (f" ({timing['repaired_words']} re-timed from the voice: the aligner could not place them)" if timing.get("repaired_words") else ""))
        step_time("timing", t)
        t = time.time()
        P("base", "start", "rendering explainroo scenes (motion blur)" if ex_style != "_audio" else "mixing voice + music")
        base_mp4 = engines.explainroo_render(proj, log, ({"fast": "fast", "max": "final", "cinematic": "final"}[mode]) if ex_style != "_audio" else "draft")
        P("base", "done", base_mp4.name); step_time("base", t)
        # ---- composite
        t = time.time(); P("composite", "start", "Remotion: scenes, footage motion, dissolves, karaoke captions")
        assets = [fdir / p[k] for p in picks.values() if not p.get("rejected") for k in ("src", "fg", "blur") if p.get(k)]
        base_rel = None
        if ex_style != "_audio":
            assets.append(base_mp4); base_rel = base_mp4.name
        props = build_props(board, lang, a.style, timing, picks, base_rel, vdir)
        (work / f"props-{lang}.json").write_text(json.dumps(props, ensure_ascii=False))
        comp = engines.render_remotion(props, assets, job, work / f"composite-{lang}.mp4", log)
        P("composite", "done", comp.name); step_time("composite", t)
        # ---- export
        t = time.time(); P("export", "start", {"fast": "x264 veryfast CRF 20", "max": "x264 slow CRF 14", "cinematic": "x264 veryslow CRF 13"}[mode] + " · 30 fps · light sharpen · loudnorm -15 LUFS")
        clean = False   # no denoise: it softens detail; output stays crisp (light unsharp only)
        # audio: narration master + niche music bed (sidechain-ducked) + whoosh/ding cues from the edit
        import sound_design, soundfile as _sf
        mj = json.loads((proj / "music.json").read_text()) if (proj / "music.json").exists() else {}
        sfx_wav = work / f"sfx-{lang}.wav"
        sfx, cues = sound_design.sfx_track(props, props["duration"])
        _sf.write(sfx_wav, sfx, sound_design.SR)
        t_mix = time.time(); mix_wav = work / f"mix-{lang}.wav"
        mix = sound_design.mix_audio(base_mp4, proj / mj["file"] if mj else None, sfx_wav, mix_wav, work, board.get("_music_lu", 8.0 if a.style == "documentary-history" else 10.0))   # documentary: fuller bed (reference ~6.6 dB under the voice)
        report["audio"] = {"music_mood": mj.get("mood"), "niche": mj.get("niche"), "sfx_cues": cues, **mix}
        step_time("music_sfx_mix", t_mix)
        engines.finish(comp, mix_wav, final, log, sharpen=a.style != "pixel-art", denoise=clean, mode=mode)
        P("export", "done", str(final)); step_time("export", t)
        return props

    def qc(props):
        t = time.time(); P("qc", "start", "timing · cuts · pronunciation · relevance · motion · captions")
        pf = work / f"props-{lang}.json"
        qa, qv = work / f"qc-audio-{lang}.json", work / f"qc-video-{lang}.json"
        exd = sorted(work.glob(f"explainroo-*-{lang}"), key=lambda p: p.stat().st_mtime)
        # audio QC (Whisper, GPU) and video QC (CLIP / OCR, CPU) run side by side
        p2 = subprocess.Popen([str(PY), "pipeline/qc.py", "video", str(final), str(pf), str(fdir / "footage.json"), str(qv)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        r1 = subprocess.run([str(PY_TTS), "pipeline/qc.py", "audio", str(final), str(pf), lang, str(qa)] + ([str(exd[-1])] if exd else []), cwd=ROOT, capture_output=True, text=True)
        o2, e2 = p2.communicate()
        r2 = subprocess.CompletedProcess(p2.args, p2.returncode, o2, e2)
        with open(log, "a") as f:
            f.write(r1.stdout + r1.stderr + r2.stdout + r2.stderr)
        checks = (json.loads(qa.read_text())["checks"] if qa.exists() else [{"name": "audio-qc", "pass": False, "detail": r1.stderr[-400:]}]) + \
                 (json.loads(qv.read_text())["checks"] if qv.exists() else [{"name": "video-qc", "pass": False, "detail": r2.stderr[-400:]}])
        P("qc", "done" if all(c["pass"] for c in checks) else "fail", f"{sum(c['pass'] for c in checks)}/{len(checks)} checks pass",
          checks=[{"name": c["name"], "pass": c["pass"], "detail": c["detail"]} for c in checks])
        step_time(f"qc{len(report['fixes'])}", t)
        return checks

    report["slug"] = slug
    props = render_all()
    if a.skip_qc:
        report.update(qc=[], qc_pass=True, output={"file": str(final), "duration_s": props["duration"]}, note="sample render, QC skipped")
        (root / "final" / f"{base_name}.report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
        P("done", "done", str(final)); return
    checks = qc(props)
    report["qc_first"] = [{"name": c["name"], "pass": c["pass"], "detail": c["detail"]} for c in checks]
    rounds = 0
    while not all(c["pass"] for c in checks) and rounds < rounds_max:
        rounds += 1
        did = []
        by = {c["name"]: c for c in checks}
        if not by.get("pronounce", {}).get("pass", True):
            weak = by["pronounce"].get("weak") or []
            if weak:
                voice(only=weak); did.append(f"re-voiced weak scenes {weak}")
        if not by.get("relevance", {}).get("pass", True):
            bad = [s["scene"] for s in by["relevance"].get("scenes", []) if not s["ok"]]
            for sid in bad:
                if sid in picks and not picks[sid].get("rejected"):
                    picks[sid]["rejected"] = "QC: relevance below threshold"   # fall back to the animated scene
                    did.append(f"dropped weak footage on {sid} (scene animated instead)")
        if not by.get("timing", {}).get("pass", True):
            # captions drift where the aligner mis-timed a scene's words: new takes for those scenes give a clean re-alignment
            drift = sorted({w[1] for w in (by["timing"].get("outliers") or []) if isinstance(w, (list, tuple)) and len(w) > 2})
            if drift:
                voice(only=drift); did.append(f"re-voiced scenes with caption drift {drift}")
        redo = set()
        if not by.get("blips", {}).get("pass", True):      # join blips: re-voice the scenes they fall in (worker drops edge blips)
            for tb in by["blips"].get("times", []):
                redo |= {s["id"] for s in props["scenes"] if s["start"] - 0.3 <= tb < s["start"] + s["dur"] + 0.3}
        if not by.get("word-pace", {}).get("pass", True):
            redo |= set(by["word-pace"].get("scenes", []))
        if redo:
            voice(only=sorted(redo)); did.append(f"re-voiced scenes with blips / dragged words {sorted(redo)}")
        if not by.get("music", {}).get("pass", True):
            board["_music_lu"] = board.get("_music_lu", 10.0) + (3.0 if by["music"].get("voice_over_music_db", 99) < 12 else 0.0)
            did.append(f"music bed {board['_music_lu']:.0f} LU under the voice")
        if not did:
            if any(f["actions"] and f["actions"][0].startswith("re-render (no targeted") for f in report["fixes"]):
                P("fix", "fail", "no targeted fix left for: " + ", ".join(c["name"] for c in checks if not c["pass"]))
                break                      # a second blind re-render never changes the result: stop and report honestly
            did.append("re-render (no targeted fix available) to rule out a transient render glitch")
        report["fixes"].append({"round": rounds, "failed": [c["name"] for c in checks if not c["pass"]], "actions": did})
        P("fix", "start", f"round {rounds}: " + "; ".join(did))
        props = render_all()
        checks = qc(props)
    report["qc"] = checks
    report["qc_pass"] = all(c["pass"] for c in checks)
    report["output"] = {"file": str(final), "duration_s": props["duration"]}
    if (fdir / "CREDITS.txt").exists():
        shutil.copy(fdir / "CREDITS.txt", root / "final" / f"{base_name}.CREDITS.txt")
        report["credits"] = str(root / "final" / f"{base_name}.CREDITS.txt")
    # post kit: cover frame + Instagram caption/hashtags, then learnings memory
    try:
        import cover, post_kit, learnings
        P("post", "start", "picking the cover frame and writing the Instagram caption + hashtags")
        cv = cover.pick(str(final), props, str(root / "final" / f"{base_name}.cover.jpg"))
        kit = post_kit.write(board, lang, root / "final" / base_name)
        report["cover"] = cv; report["instagram"] = kit
        P("post", "done", f"cover at {cv['t']}s · {len(kit['hashtags'])} hashtags", cover=cv["file"], instagram=kit)
    except Exception as e:
        P("post", "fail", f"post kit: {str(e)[:200]}")
    # full known-issues checklist + the frame sheet for the visual self-review (every video, the whole list)
    try:
        import known_issues
        t = time.time()
        sheet = root / "final" / f"{base_name}.sheet.jpg"
        subprocess.run([plat.tool("node"), str(ROOT / "explainroo" / "bin" / "explainroo.js"), "sheet", str(final)], capture_output=True, timeout=300)
        report["review_sheet"] = str(sheet) if sheet.exists() else None
        report["known_issues"] = known_issues.score(report)
        report["review_prompt"] = known_issues.review_prompt(report, str(sheet))
        bad = [k["id"] for k in report["known_issues"] if k["status"] == "FAIL"]
        rev = [k["id"] for k in report["known_issues"] if k["status"] == "review"]
        P("known-issues", "done" if not bad else "fail", f"{sum(k['status'] == 'pass' for k in report['known_issues'])}/{len(report['known_issues'])} pass"
          + (f"; FAIL: {', '.join(bad)}" if bad else "") + (f"; needs visual review: {', '.join(rev)}" if rev else ""))
        step_time("known_issues", t)
    except Exception as e:
        P("known-issues", "fail", str(e)[:200])
    report["steps"]["total"] = round(time.time() - t0, 1)
    (root / "final" / f"{base_name}.report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    try:
        import learnings
        learnings.record(report)
    except Exception as e:
        print("learnings:", e)
    P("done", "done" if report["qc_pass"] else "fail", str(final), report=str(root / "final" / f"{base_name}.report.json"), qc_pass=report["qc_pass"])
    if not report["qc_pass"]:
        sys.exit("QC still failing after auto-fix rounds — see the report; not handing this over as finished")


if __name__ == "__main__":
    main()
