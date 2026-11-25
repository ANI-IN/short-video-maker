"""Render engines.

explainroo always runs: it turns the per-scene voice WAVs into the audio master (voice + ducked music + SFX)
and gives Whisper-aligned word timings. For explainroo styles it also draws the picture (captions off,
footage scenes left blank). Remotion then composites the final picture: style scenes or the explainroo base video,
footage scenes (Ken Burns + parallax), dissolves and karaoke captions. ffmpeg does the finishing pass.
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLES = ROOT / "styles"
import plat  # noqa: E402

PY_TTS = plat.venv_python(".venv-tts")
EXPLAINROO = ROOT / "explainroo" / "bin" / "explainroo.js"
REMOTION_DIR = STYLES / "remotion"
FPS = 30


def check_links() -> None:
    """macOS only, when the project sits on the iCloud Desktop, so the heavy folders live in *.nosync dirs reached through symlinks.
    iCloud has been seen replacing those symlinks with partial real folders (and renaming the link to "<name> 2"):
    Python then loads half-downloaded .so files and hangs inside dlopen/mmap. Fail fast with the fix instead."""
    if plat.WINDOWS:
        return
    bad = []
    for name in (".venv", ".venv-tts", "output"):
        link, real = ROOT / name, ROOT / f"{name}.nosync"
        if real.is_dir() and not (link.is_symlink() and link.resolve() == real.resolve()):
            bad.append(name)
    if bad:
        raise SystemExit("iCloud replaced the symlink(s) " + ", ".join(bad) + " with real folders. Fix (from the project root), per name:\n"
                         + "\n".join(f'  mv "{b}" "{b}.icloud-stray.nosync" && ln -s "{b}.nosync" "{b}" && rm -f "{b} 2"' for b in bad)
                         + "\n(copy any new files out of the stray folder into the .nosync one first)")


def load_registry() -> dict:
    return json.loads((STYLES / "styles.json").read_text())


def run(cmd: list, cwd: Path | None = None, log: Path | None = None, tail: int = 4000) -> str:
    p = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True)
    out = "\n".join(l for l in ((p.stdout or "") + (p.stderr or "")).splitlines() if "hi_dict" not in l)
    if log:
        with open(log, "a") as f:
            f.write(f"\n$ {' '.join(map(str, cmd))}\n{out[-20000:]}\n")
    if p.returncode != 0:
        raise RuntimeError(f"command failed ({p.returncode}): {' '.join(map(str, cmd))}\n{out[-tail:]}")
    return out


def _script_md(board: dict, lang: str) -> str:
    lines = [f"# {board.get('title', 'Video')}", ""]
    n = len(board["scenes"])
    for i, sc in enumerate(board["scenes"]):
        attrs = []
        if i == 0:
            attrs.append("lead=0")
        if i == n - 1:
            attrs.append("hold=0.6")
        attr = (" {" + " ".join(attrs) + "}") if attrs else ""
        text = sc["narration"].get("hl_voice") if lang == "hl" and sc["narration"].get("hl_voice") else sc["narration"][lang]
        lines += [f"## {sc['id']}{attr}", text.replace("*", ""), ""]
    return "\n".join(lines)


def build_explainroo(board: dict, lang: str, style: str, voice_dir: Path, work: Path, footage_ids: set, music: str | None) -> Path:
    """style = an explainroo style name, or '_audio' (blank scenes: audio master + timing only)."""
    style_dir = STYLES / "explainroo" / style
    proj = work / f"explainroo-{style}-{lang}"
    if proj.exists():
        shutil.rmtree(proj)
    (proj / "assets" / "narration").mkdir(parents=True)
    for f in style_dir.iterdir():
        shutil.copy(f, proj / f.name)
    shutil.copy(STYLES / "explainroo" / "_lib.js", proj / "_lib.js")
    shutil.copy(STYLES / "explainroo" / "_audio" / "style.js", proj / "blank.js")
    shown = board
    if lang == "hl":
        # Hinglish renders as language "hi" (voice/alignment), but everything ON SCREEN must be the Roman hl text
        import copy
        def roman(v):
            if isinstance(v, dict):
                if "hl" in v and isinstance(v["hl"], str):
                    return dict(v, hi=v["hl"])
                return {k: roman(x) for k, x in v.items()}
            if isinstance(v, list):
                return [roman(x) for x in v]
            return v
        shown = roman(copy.deepcopy(board))
    (proj / "board.js").write_text("export default " + json.dumps(shown, ensure_ascii=False, indent=1) + ";\n")
    (proj / "scenes.js").write_text(
        "import board from './board.js';\nimport { scene } from './style.js';\nimport { scene as blank } from './blank.js';\n"
        f"const FOOT = new Set({json.dumps(sorted(footage_ids))});\n"
        "const n = board.scenes.length;\n"
        "export default Object.fromEntries(board.scenes.map((sc, i) => [sc.id, (s) => (FOOT.has(sc.id) ? blank(s) : scene(s, sc, { i, n, board }))]));\n")
    for sc in board["scenes"]:
        shutil.copy(voice_dir / f"{sc['id']}.wav", proj / "assets" / "narration" / f"{sc['id']}.wav")
    cfg = {"title": board.get("title", "Video"), "size": "shorts", "language": lang,
           "voice": {"provider": "recording", "src": "assets/narration/"},
           "music": {"volume": 0.32}, "captions": False, "watermark": False, "cover": "auto", "defaults": "0.6",
           # Reels pacing (was explainroo's 0.35 s lead + 0.7 s hold per scene = 1.05 s of dead air at every cut; measured
           # 10.8 s of 99 s in mahabharat-doc EN). The cross-dissolve covers the cut.
           "lead": 0.12, "hold": 0.3, "end": 0.9}
    cfg.update(json.loads((style_dir / "config.json").read_text()))
    cfg.update(lead=0.12, hold=0.3, end=0.9)          # pacing is the pipeline's call, not the style's
    # Music + sound design are mixed by the pipeline (sound_design.mix_audio), not by explainroo: a niche-matched bed
    # (devotional / orchestral / modern / upbeat ...) ducked by a real sidechain so it rises in pauses, and the same
    # tasteful whoosh/ding cues for every engine. explainroo renders the narration only (no music, no built-in SFX).
    import sound_design
    import soundfile as _sf
    est = sum(_sf.info(str(voice_dir / f"{sc['id']}.wav")).duration + 0.5 for sc in board["scenes"]) + 4
    topic = " ".join(str(board.get(k, "")) for k in ("topic", "title"))
    mood = board.get("music_mood") or sound_design.mood_for(board, board.get("_style") or style, lang)
    _sf.write(proj / "music-bed.wav", sound_design.make_bed(est, mood, seed=len(topic)), sound_design.SR)
    (proj / "music.json").write_text(json.dumps({"mood": mood, "niche": sound_design.niche(board), "file": "music-bed.wav",
                                                 "credit": f"original {mood} bed, generated locally"}))
    cfg["music"] = None
    cfg["sfx"] = False
    if lang == "hl":
        cfg["language"] = "hi"                         # Hinglish is voiced/aligned as Hindi (English words in Latin script)
    (proj / "video.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2))
    (proj / "script.md").write_text(_script_md(board, lang))
    return proj


def explainroo_voice(proj: Path, log: Path) -> None:
    run([plat.tool("node"), EXPLAINROO, "voice", proj], log=log)


def _retime(words: list, voice_wav: Path, lead: float) -> int:
    """Words the aligner could not place (flagged estimated, zero-length, or one word stretched over several) are re-timed
    between their correctly aligned neighbours, following where speech actually is in the voice clip, each word getting a
    share of the voiced time proportional to its length. Seen with Hindi loanwords: Whisper hears "AI smart", the script
    says "एआई स्मार्ट", and seven caption words were stamped at 0 s."""
    import numpy as np
    import soundfile as sf
    a, sr = sf.read(str(voice_wav), dtype="float32")
    a = a if a.ndim == 1 else a.mean(1)
    hop = int(0.01 * sr)
    env = np.array([np.abs(a[i:i + hop]).max() for i in range(0, max(1, len(a) - hop), hop)])
    voiced = env > 0.04 * (env.max() or 1)
    vend = lead + len(env) * 0.01
    bad = [w.get("estimated") or (w["e"] - w["s"]) < 0.03 or (w["e"] - w["s"]) > 1.6 for w in words]
    fixed, i = 0, 0
    while i < len(words):
        if not bad[i]:
            i += 1; continue
        j = i
        while j < len(words) and bad[j]:
            j += 1
        t0 = words[i - 1]["e"] if i > 0 else lead
        t1 = words[j]["s"] if j < len(words) else vend
        f0, f1 = max(0, int((t0 - lead) * 100)), max(0, int((t1 - lead) * 100))
        frames = [k for k in range(f0, min(f1, len(voiced))) if voiced[k]] or list(range(f0, max(f0 + 1, f1)))
        weights = [max(1, len(re.sub(r"[^\w]", "", words[k]["w"]))) for k in range(i, j)]
        tot, acc = sum(weights), 0
        for k, wt in zip(range(i, j), weights):
            a0 = frames[min(len(frames) - 1, int(acc / tot * len(frames)))]
            acc += wt
            a1 = frames[min(len(frames) - 1, max(0, int(acc / tot * len(frames)) - 1))]
            words[k]["s"], words[k]["e"] = round(lead + a0 * 0.01, 3), round(lead + (a1 + 1) * 0.01, 3)
            fixed += 1
        i = j
    return fixed


def _whisper_fix(words: list, voice_wav: Path, lead: float, heard: list) -> int:
    """Place words the aligner could not (estimated / zero-length / stretched) at the time Whisper heard them, matching by
    phonetic skeleton in order inside the gap between correctly aligned neighbours. Returns how many were placed."""
    import textnorm
    bad = [w.get("estimated") or (w["e"] - w["s"]) < 0.03 or (w["e"] - w["s"]) > 1.6 for w in words]
    hk = [(textnorm.skeleton(h[0]), lead + h[1], lead + h[2]) for h in heard]
    placed, j = 0, 0
    for k, w in enumerate(words):
        if not bad[k]:
            # move the heard-word cursor past this anchor
            while j < len(hk) and hk[j][1] < w["s"] - 0.05:
                j += 1
            continue
        sk = textnorm.skeleton(w["w"])
        for m in range(j, min(len(hk), j + 4)):
            if sk and (hk[m][0] == sk or (len(sk) >= 3 and (hk[m][0].startswith(sk[:3]) or sk.startswith(hk[m][0][:3] or "#")))):
                w["s"], w["e"], w["estimated"] = round(hk[m][1], 3), round(max(hk[m][2], hk[m][1] + 0.05), 3), False
                placed += 1; j = m + 1; break
    return placed


def explainroo_timing(proj: Path, lang: str = "") -> dict:
    d = json.loads(run([plat.tool("node"), EXPLAINROO, "words", proj, "--json"]))
    # Whisper word times for scenes that have words the aligner could not place
    need = [s["scene"] for s in d["scenes"] if any(w.get("estimated") or w["end"] - w["start"] < 0.03
                                                    or w["start"] > float(s.get("duration") or 1e9) + 0.2 for w in s["words"])]
    heard = {}
    if need and lang:
        try:
            tl0 = {s["id"]: s for s in json.loads((proj / "build" / "timeline.json").read_text())["scenes"]}
            wavs = [str(proj / ((tl0.get(i) or {}).get("voice") or {}).get("url", f"build/voice/{i}.wav")) for i in need]
            r = subprocess.run([str(PY_TTS), str(Path(__file__).parent / "word_align.py"), lang] + wavs, capture_output=True, text=True)
            heard = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else {}
        except Exception:
            heard = {}
    try:
        tl = {s["id"]: s for s in json.loads((proj / "build" / "timeline.json").read_text())["scenes"]}
    except Exception:
        tl = {}
    scenes, repaired = [], 0
    for s in d["scenes"]:
        words = [{"w": w["text"], "s": round(w["start"], 3), "e": round(w["end"], 3), "estimated": bool(w.get("estimated"))} for w in s["words"]]
        # a "matched" word timed past the end of its own clip is a false match (seen: the first Hindi word of a scene anchored
        # at 24.6 s in a 12.4 s clip, dragging every later word with it) - unplace it so the Whisper fallback re-times it
        sd = float(s.get("duration") or 0)
        for w in words:
            if sd and (w["s"] > sd + 0.2 or w["e"] > sd + 0.6):
                w["estimated"] = True
        if sum(w["estimated"] for w in words) > len(words) * 0.5:
            for w in words:
                w["estimated"] = True                                          # mostly broken: re-time the whole scene
        t = tl.get(s["scene"]) or {}
        vw = proj / ((t.get("voice") or {}).get("url") or f"build/voice/{s['scene']}.wav")
        if vw.exists() and any(w["estimated"] or w["e"] - w["s"] < 0.03 for w in words):
            ld = float(t.get("lead", 0) or 0)
            if heard.get(str(vw)):
                repaired += _whisper_fix(words, vw, ld, heard[str(vw)])        # exact: where Whisper heard each word
            repaired += _retime(words, vw, ld)                                  # whatever is still unplaced: follow the voice
        # Whisper merges some names ("स्टैनली" for "स्टैन ली"): a near-zero word right after a long one shares its time
        for i in range(1, len(words)):
            a, b = words[i - 1], words[i]
            if b["e"] - b["s"] < 0.05 and a["e"] - a["s"] > 0.2 and abs(b["s"] - a["e"]) < 0.05:
                end, mid = a["e"], round(a["s"] + (a["e"] - a["s"]) * 0.6, 3)
                a["e"], b["s"], b["e"] = mid, mid, round(max(b["e"], end), 3)
        for w in words:
            w.pop("estimated", None)
        scenes.append({"id": s["scene"], "start": round(s["start"], 3), "dur": round(s["duration"], 3), "words": words})
    return {"scenes": scenes, "duration": round(scenes[-1]["start"] + scenes[-1]["dur"], 3), "repaired_words": repaired}


def explainroo_render(proj: Path, log: Path, quality: str = "final") -> Path:
    q = {"final": [], "fast": ["--quality", "fast"], "draft": ["--draft"]}[quality]
    run([plat.tool("node"), EXPLAINROO, "render", proj, "--workers", "2"] + q, log=log)
    outs = sorted((proj / "out").glob("*.mp4"), key=lambda p: p.stat().st_mtime)
    return outs[-1]


def render_remotion(props: dict, assets: list, job: str, out_mp4: Path, log: Path, scale: float = 1.0) -> Path:
    pub = REMOTION_DIR / "public" / "jobs" / job
    if pub.exists():
        shutil.rmtree(pub)
    pub.mkdir(parents=True)
    for a in assets:
        shutil.copy(a, pub / Path(a).name)
    props = dict(props, assetDir=f"jobs/{job}")
    if props.get("baseVideo"):
        props["baseVideo"] = f"jobs/{job}/{Path(props['baseVideo']).name}"
    pf = out_mp4.with_suffix(".props.json")
    pf.write_text(json.dumps(props, ensure_ascii=False))
    conc = os.environ.get("REMOTION_CONCURRENCY", "2")     # 1 on a memory-starved machine (8 GB with a render alongside)
    cmd = [plat.tool("npx"), "remotion", "render", "src/index.ts", "Main", str(out_mp4), f"--props={pf}", f"--concurrency={conc}",
           "--codec=h264", "--crf=10", "--jpeg-quality=95", "--log=error",
           "--timeout=120000", "--offthreadvideo-cache-size-in-bytes=536870912"]   # a busy machine (e.g. a Blender render alongside) can take >30 s to serve one video frame
    if scale != 1.0:
        cmd.append(f"--scale={scale}")
    total = max(30, math.ceil((float(props.get("duration", 0)) + 0.4) * 30))
    chunk = int(os.environ.get("REMOTION_CHUNK", "900"))
    if total <= chunk:
        run(cmd, cwd=REMOTION_DIR, log=log)
        return out_mp4
    # long renders in chunks: Remotion's frame extractor (offthread video) can die late in a long render on an 8 GB machine
    # ("Request closed" / frame timeout); each chunk starts a fresh one. Chunks are retried, then joined losslessly.
    parts = []
    for i, f0 in enumerate(range(0, total, chunk)):
        f1 = min(total - 1, f0 + chunk - 1)
        part = out_mp4.with_name(f"{out_mp4.stem}.part{i:02d}.mp4")
        c2 = [x if x != str(out_mp4) else str(part) for x in cmd] + [f"--frames={f0}-{f1}"]
        for attempt in range(3):
            try:
                run(c2, cwd=REMOTION_DIR, log=log); break
            except RuntimeError:
                if attempt == 2:
                    raise
        parts.append(part)
    lst = out_mp4.with_suffix(".parts.txt")
    lst.write_text("".join(f"file '{p_}'\n" for p_ in parts))
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out_mp4)], check=True)
    for p_ in parts:
        p_.unlink(missing_ok=True)
    lst.unlink(missing_ok=True)
    return out_mp4


def finish(video: Path, audio_src: Path, out: Path, log: Path, sharpen: bool = True, denoise: bool = True, mode: str = "max") -> dict:
    """Export: constant 30 fps, light sharpen (denoise off by default: it softens detail), x264 (veryfast CRF 20 / slow CRF 14 / veryslow CRF 13), two-pass loudnorm
    to -15 LUFS (a touch softer than the -14 platform target; Reels/Shorts normalise anyway) with a gentle warmth shelf."""
    # highest quality this 8 GB M2 handles comfortably: x264 is CPU-only and streams frames (no RAM risk); CRF is already the
    # quality-optimal rate control (2-pass only targets a file size), so "multi-pass" here = two-pass loudness + slow presets
    preset, crf = {"fast": ("veryfast", "20"), "max": ("slow", "14"), "cinematic": ("veryslow", "13")}[mode]
    xp = [] if mode == "fast" else ["-x264-params", "aq-mode=3:psy-rd=1.0,0.15"]    # aq-mode 3: no banding on dark/parchment gradients
    m = run(["ffmpeg", "-hide_banner", "-i", audio_src, "-vn", "-af", "highshelf=f=7000:g=-1.5,loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    js = json.loads(m[m.rfind("{"): m.rfind("}") + 1])
    ln = (f"highshelf=f=7000:g=-1.5,loudnorm=I=-15:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
          f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    vf = ["fps=30"]
    if denoise:
        vf.append("hqdn3d=1.2:1.2:3:3")
    if sharpen:
        vf.append("unsharp=5:5:0.45:3:3:0.0")
    vf.append("format=yuv420p")
    out.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", audio_src, "-map", "0:v:0", "-map", "1:a:0", "-vf", ",".join(vf),
         "-c:v", "libx264", "-preset", preset, "-crf", crf, *xp, "-profile:v", "high", "-level", "4.2", "-g", "60", "-bf", "2", "-r", "30",
         "-af", ln + ",aresample=48000", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], log=log)
    return {"loudness_in": js["input_i"]}
