"""Music bed + sound design + the final audio mix (all synthesised locally: royalty-free, no samples, no paid APIs).

Music mood follows the topic's NICHE (not the visual style):
  devotional  mythology / Gita / temples (India): tanpura drone, temple bells, soft harmonium pad, sparse Yaman plucks, no tabla
  orchestral  mythology / history outside India: slow string-like pad in a minor key with a low drone
  calm        Indian history / documentary: tanpura + sparse Bhupali plucks         (indian_music.py)
  tense       war / conflict / mystery (India: Marwa + heartbeat bayan; else a dark pad pulse)
  modern      tech / AI / software (any language): clean synth pad chords + soft pluck arpeggio, no Indian instruments
  upbeat      finance / money (modern pad + 104 bpm soft pulse), tips / lifestyle in India: Bhupali + theka
  warm        stories (Yaman + soft slow theka)
Mix (mix_audio): the music is DUCKED by a real sidechain on the narration: about -10 dB under speech, released over
~0.45 s so it rises in pauses and at scene changes (explainroo's span ducking held it down for the whole narration).
Sound design (sfx_track): a soft low whoosh under the hook, a short airy whoosh on each scene cut, a gentle bell/ding at
payoff beats. Levels sit 20+ dB under the voice: felt, not heard as effects.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

import indian_music as im

SR = im.SR

NICHE_RX = [
    ("devotional", r"gita|bhagavad|गीता|krishna|कृष्ण|shiva|शिव|\bram\b|ramayan|रामायण|mahabharat|महाभारत|hanuman|devotion|bhakti|temple|मंदिर|mantra|shloka|श्लोक|upanishad|vedas?\b|purana|mytholog|god\b|goddess"),
    ("tense", r"\bwar\b|battle|युद्ध|murder|mystery|crime|attack|terror|disaster|collapse"),
    ("upbeat-finance", r"financ|money|₹|rupee|stock|invest|salary|tax\b|loan|emi\b|sip\b|mutual fund|crypto|budget|पैसा|निवेश"),
    ("modern", r"\bai\b|software|computer|\btech|\bapps?\b|protocol|server|\bapi\b|developer|\bcode\b|github|\bmcp\b|openai|chatgpt|robot|startup|internet|smartphone"),
    ("history", r"histor|ancient|empire|mughal|\bking|dynasty|archae|\b1[0-9]{3}\b|apollo|freedom struggle|इतिहास"),
    ("lifestyle", r"health|sleep|diet|fitness|habit|tips|productiv|study|exam|eye strain|wellness"),
]


def niche(board: dict) -> str:
    text = " ".join(str(board.get(k, "")) for k in ("topic", "title")).lower()
    for name, rx in NICHE_RX:
        if re.search(rx, text):
            return name
    return "story"


def mood_for(board: dict, style: str, lang: str) -> str:
    """Music mood from the niche. `indian` flavour only for India-relevant videos (region != global)."""
    import footage as _f
    india = board.get("region", "india") == "india" and (lang in ("hi", "hl") or bool(_f.INDIA.search(" ".join(str(board.get(k, "")) for k in ("topic", "title")))))
    n = niche(board)
    if n == "devotional":
        return "devotional" if india else "orchestral"
    if n == "tense":
        return "tense" if india else "tense-pad"
    if n == "upbeat-finance":
        return "upbeat-modern"
    if n == "modern":
        return "modern"
    if n == "history":
        return "calm" if india else "orchestral"
    if n == "lifestyle":
        return "upbeat" if india else "upbeat-modern"
    return "warm" if india else "modern"


# ---------------------------------------------------------------- instruments
def _bell(f: float, dur: float = 4.0) -> np.ndarray:
    """Small temple bell: inharmonic partials with long decay and a slow beat between two close partials."""
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, amp, dec in ((1.0, 1.0, 1.8), (1.003, 0.6, 1.7), (2.32, 0.45, 0.9), (4.25, 0.25, 0.45), (6.76, 0.12, 0.25)):
        y += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / dec)
    y *= 1 - np.exp(-t / 0.002)
    return y


def _pad(freqs, dur: float, rng, bright: float = 0.6, attack: float = 1.2) -> np.ndarray:
    """Soft detuned-saw pad (string/synth-like), one-pole low-passed, slow attack and release."""
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.0045):
            ph = (f * (1 + det) * t + rng.uniform(0, 1)) % 1.0
            y += (2 * ph - 1) / len(freqs)
    a = 0.02 + 0.10 * bright                       # one-pole low-pass: smaller a = darker
    from scipy.signal import lfilter
    out = lfilter([a], [1, -(1 - a)], y)
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / max(0.3, attack * 0.8))
    return out * np.clip(env, 0, 1) * (1 + 0.04 * np.sin(2 * np.pi * 0.2 * t))


def _pluck(f: float, dur: float, rng) -> np.ndarray:
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return y * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.003))


def _kick(rng) -> np.ndarray:
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 60 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def _hat(rng) -> np.ndarray:
    n = int(0.06 * SR); t = np.arange(n) / SR
    h = rng.standard_normal(n); h = np.diff(np.r_[0, h])           # crude high-pass
    return h * np.exp(-t / 0.012) * 0.25


# ---------------------------------------------------------------- beds
def _semi(base: float, s: float) -> float:
    return base * 2 ** (s / 12)


def make_bed(seconds: float, mood: str, seed: int = 1) -> np.ndarray:
    if mood == "epic":
        import cine_sfx
        return cine_sfx.epic_bed(seconds, seed)
    if mood in ("calm", "warm", "upbeat", "tense"):
        return im.make(seconds, mood, seed)
    rng = np.random.default_rng(seed)
    n = int((seconds + 2) * SR); L = np.zeros(n); R = np.zeros(n)

    def add(sig, at, pan=0.0, gain=1.0):
        i = int(at * SR); j = min(n, i + len(sig))
        if i >= n or j <= i:
            return
        L[i:j] += sig[: j - i] * gain * (1 - pan) ** 0.5; R[i:j] += sig[: j - i] * gain * (1 + pan) ** 0.5

    if mood == "devotional":
        cyc = 4.8; seq = [(7, -1), (0, 0), (0, 0), (0, -1)]; t = 0.0; k = 0
        while t < seconds + 1:                                     # tanpura
            s, o = seq[k % 4]
            add(im.tanpura_pluck(im.hz(s, o), cyc * 0.9, rng), t, pan=-0.3 if (k // 4) % 2 == 0 else 0.3, gain=0.07)
            t += cyc / 4; k += 1
        t = 0.0
        while t < seconds:                                         # harmonium-like pad on Sa + Pa, long swells
            d = min(9.6, seconds - t + 1)
            add(_pad([im.hz(0, 0), im.hz(7, 0), im.hz(0, 1)], d, rng, bright=0.35, attack=2.5), t, gain=0.10)
            t += 9.6
        t = 2.0
        while t < seconds - 2:                                     # temple bell, sparse and soft
            add(_bell(im.hz(rng.choice([0, 7, 12]), 2)), t, pan=rng.uniform(-0.4, 0.4), gain=0.05)
            t += rng.uniform(7.5, 11.0)
        scale = im.RAGA["yaman"]; t = 3.0; idx = 4
        while t < seconds - 1:                                     # very sparse plucked phrases
            if rng.random() < 0.5:
                for _ in range(rng.integers(2, 5)):
                    idx = int(np.clip(idx + rng.choice([-1, -1, 1, 1, 2]), 0, len(scale) - 1))
                    add(im.ks_pluck(im.hz(scale[idx], 1), 1.6, rng, 0.8), t, pan=rng.uniform(-0.3, 0.3), gain=0.09)
                    t += rng.choice([0.5, 0.7, 0.9])
            t += rng.uniform(3.0, 5.0)
    else:
        minor = mood in ("orchestral", "tense-pad")
        root = 110.0 if mood != "modern" else 130.81            # A2 / C3
        prog = ([(0, 3, 7), (-4, 0, 3), (-2, 2, 5), (-5, -1, 2)] if minor else [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)])
        bar = {"orchestral": 4.8, "tense-pad": 5.6, "modern": 3.6, "upbeat-modern": 2.3}.get(mood, 4.0)
        t = 0.0; c = 0
        while t < seconds:
            ch = prog[c % len(prog)]
            add(_pad([_semi(root, s) for s in ch] + [_semi(root, ch[0] - 12)], bar + 0.6, rng,
                    bright={"orchestral": 0.35, "tense-pad": 0.2, "modern": 0.55, "upbeat-modern": 0.7}.get(mood, 0.5),
                    attack=1.4 if mood in ("orchestral", "tense-pad") else 0.5), t, gain=0.18)
            if mood in ("modern", "upbeat-modern"):               # soft pluck arpeggio over the chord
                step = bar / (8 if mood == "upbeat-modern" else 6)
                for i in range(8 if mood == "upbeat-modern" else 6):
                    if rng.random() < 0.75:
                        add(_pluck(_semi(root * 2, ch[i % 3] + (12 if i % 4 == 3 else 0)), 0.8, rng), t + i * step, pan=0.25 * (-1) ** i, gain=0.05)
            t += bar; c += 1
        if mood == "upbeat-modern":
            beat = 60 / 104; t = 1.0; b = 0
            while t < seconds - 1:
                if b % 2 == 0:
                    add(_kick(rng), t, gain=0.16)
                add(_hat(rng), t + beat / 2, pan=0.2, gain=0.6)
                t += beat; b += 1
        if mood == "tense-pad":
            t = 1.0
            while t < seconds - 1:
                add(_kick(rng), t, gain=0.12); add(_kick(rng), t + 0.28, gain=0.07)
                t += 1.6
    y = np.stack([L, R], 1)[: int(seconds * SR)]
    f = np.ones(len(y)); fi, fo = int(1.5 * SR), int(2.0 * SR)
    f[:fi] = np.linspace(0, 1, fi); f[-fo:] = np.linspace(1, 0, fo)
    y *= f[:, None]
    return (y / (np.abs(y).max() + 1e-9) * 0.7).astype(np.float32)


# ---------------------------------------------------------------- sound design
def whoosh(dur: float = 0.55, low: bool = False, seed: int = 3) -> np.ndarray:
    """Air whoosh: noise through a resonant band-pass whose centre sweeps up then down, swelling to the cut point."""
    rng = np.random.default_rng(seed); n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    fc = (250 if low else 700) + (900 if low else 2600) * np.sin(np.pi * t / dur) ** 2
    y = np.zeros(n); y1 = y2 = 0.0; x1 = x2 = 0.0; q = 2.5
    for i in range(n):                                            # biquad band-pass with per-sample centre frequency
        w = 2 * np.pi * fc[i] / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
        b0, b2, a0, a1, a2 = al, -al, 1 + al, -2 * c, 1 - al
        yi = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, x[i]; y2, y1 = y1, yi; y[i] = yi
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    y *= env
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)


def ding(f: float = 1318.5) -> np.ndarray:
    n = int(1.4 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t / 0.25) + 0.1 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t / 0.12)
    y *= 1 - np.exp(-t / 0.002)
    return (y / np.abs(y).max()).astype(np.float32)


def sfx_track(props: dict, total: float, transitions: bool = True) -> tuple[np.ndarray, list]:
    """Cues from the edit: hook start, each scene cut (whoosh centred ~0.1 s before the cut), payoff scenes (soft ding just
    after the cut, replacing the whoosh there). Returns stereo float32 at SR and the cue list (for the report)."""
    if props.get("cinema"):
        import cine_sfx
        return cine_sfx.cine_track(props, total)
    n = int((total + 1) * SR); y = np.zeros(n, dtype=np.float32); cues = []

    def put(sig, at, gain):
        i = max(0, int(at * SR)); j = min(n, i + len(sig))
        if j > i:
            y[i:j] += sig[: j - i] * gain

    put(whoosh(0.9, low=True, seed=11), 0.0, 0.16); cues.append(("hook-swell", 0.0))
    for k, sc in enumerate(props["scenes"][1:], 1):
        cut = float(sc["start"])
        if sc.get("role") == "payoff" and props["scenes"][k - 1].get("role") != "payoff":
            put(ding(), cut + 0.05, 0.075); cues.append(("payoff-ding", round(cut, 2)))
        elif sc.get("role") == "payoff":
            put(ding(1174.7), cut + 0.05, 0.05); cues.append(("payoff-ding-soft", round(cut, 2)))
        elif transitions:
            w = whoosh(0.5, seed=20 + k); put(w, cut - 0.32, 0.11); cues.append(("cut-whoosh", round(cut, 2)))
    return np.stack([y, y], 1), cues


# ---------------------------------------------------------------- mix
def _lufs(path: Path) -> float:
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    s = p.stderr
    return float(json.loads(s[s.rfind("{"): s.rfind("}") + 1])["input_i"])


def mix_audio(master: Path, music: Path | None, sfx: Path | None, out: Path, work: Path, music_lu_under_voice: float = 10.0) -> dict:
    """voice master (+ explainroo SFX) + music ducked by a sidechain keyed on the voice + sound design -> out (wav).
    Music level is set relative to the measured voice loudness, so every video sits the same way."""
    voice_wav = work / "mix-voice.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(master), "-vn", "-ac", "2", "-ar", str(SR), str(voice_wav)], check=True)
    info = {"ducking": "sidechain on narration: threshold -30 dBFS, ratio 3, attack 80 ms, release 500 ms (about -8 dB under speech)"}
    if not music:
        voice_wav.replace(out); return info
    vI, mI = _lufs(voice_wav), _lufs(music)
    g = 10 ** ((vI - music_lu_under_voice - mI) / 20)
    info.update(voice_lufs=vI, music_lufs_raw=mI, music_gain_db=round(20 * np.log10(g), 1))
    ins = ["-i", str(voice_wav), "-i", str(music)] + (["-i", str(sfx)] if sfx else [])
    fc = (f"[0:a]asplit=2[v][key];[1:a]volume={g:.4f},aresample={SR}[m];"
          "[m][key]sidechaincompress=threshold=0.03:ratio=3:attack=80:release=500:knee=4:makeup=1[md];[md]asplit=2[md1][mdout];"
          + ("[v][md1][2:a]amix=inputs=3:normalize=0:duration=first[mix]" if sfx else "[v][md1]amix=inputs=2:normalize=0:duration=first[mix]"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", fc, "-map", "[mix]", str(out), "-map", "[mdout]", str(work / "music-ducked.wav")], check=True)
    return info


def duck_report(work: Path, voice_stem: np.ndarray, sr: int = 16000) -> dict:
    """QC helper: level of the ducked music while the narration speaks vs. in pauses >= 0.35 s."""
    import librosa
    f = work / "music-ducked.wav"
    if not f.exists() or voice_stem is None:
        return {}
    m, _ = librosa.load(str(f), sr=sr, mono=True)
    v = voice_stem[: len(m)]; m = m[: len(v)]
    hop = int(0.05 * sr); k = len(v) // hop
    ve = np.sqrt((v[: k * hop].reshape(k, hop) ** 2).mean(1)); me = np.sqrt((m[: k * hop].reshape(k, hop) ** 2).mean(1))
    speech = ve > 0.1 * ve.max()
    quiet = ~speech
    run = np.zeros(k, bool); i = 0                               # gaps of >= 0.35 s (7 hops), skipping their first 0.25 s (release)
    while i < k:
        if quiet[i]:
            j = i
            while j < k and quiet[j]:
                j += 1
            if j - i >= 7:
                run[i + 5: j] = True
            i = j
        else:
            i += 1
    db = lambda x: 20 * np.log10(max(1e-9, float(np.sqrt((x ** 2).mean()))))
    if not speech.any() or not run.any():
        return {}
    return {"music_in_speech_db": round(db(me[speech]), 1), "music_in_gaps_db": round(db(me[run]), 1),
            "rise_in_gaps_db": round(db(me[run]) - db(me[speech]), 1), "voice_over_music_db": round(db(ve[speech]) - db(me[speech]), 1)}


if __name__ == "__main__":
    import sys
    sec, mood, out = float(sys.argv[1]), sys.argv[2], sys.argv[3]
    sf.write(out, make_bed(sec, mood, int(sys.argv[4]) if len(sys.argv) > 4 else 1), SR)
