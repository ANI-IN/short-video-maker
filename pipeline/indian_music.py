"""Original Indian-flavoured background music, synthesised locally (royalty-free: generated per video, no samples).

Layers
  tanpura   drone cycling Pa-Sa-Sa-Sa(low) with rich harmonics and a buzzing 'jawari' shimmer
  melody    sparse plucked phrases (Karplus-Strong, sitar/santoor-like) in a raga scale, never on top of itself
  tabla     a keherwa theka (Dha Ge Na Ti Na Ka Dhi Na) from synthesised bayan (gliding bass) + dayan (ringing pitch) strokes
Moods
  calm      drone + very sparse Bhupali plucks (documentary, history, mythology)
  warm      drone + Yaman phrases + soft slow theka (stories)
  upbeat    brighter drone + Bhupali phrases + 100 bpm theka (lifestyle, tips)
  tense     low drone + Marwa-ish phrases + slow heartbeat bayan (war, conflict, mystery)
Usage: indian_music.py <seconds> <mood> <out.wav> [seed]
"""
from __future__ import annotations

import sys

import numpy as np
import soundfile as sf

SR = 44100
SA = 146.83                              # Sa = D3
RAGA = {"bhupali": [0, 2, 4, 7, 9, 12, 14, 16], "yaman": [0, 2, 4, 6, 7, 9, 11, 12, 14], "marwa": [0, 1, 4, 6, 9, 11, 12, 13]}
MOOD = {"calm": dict(raga="bhupali", bpm=0, note_p=0.22, drone=0.55, bright=0.8),
        "warm": dict(raga="yaman", bpm=72, note_p=0.32, drone=0.5, bright=1.0),
        "upbeat": dict(raga="bhupali", bpm=100, note_p=0.42, drone=0.4, bright=1.2),
        "tense": dict(raga="marwa", bpm=56, note_p=0.25, drone=0.6, bright=0.7)}


def hz(semi: float, octave: int = 0) -> float:
    return SA * 2 ** (semi / 12 + octave)


def tanpura_pluck(f: float, dur: float, rng) -> np.ndarray:
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for h in range(1, 14):                                       # rich harmonic string tone
        amp = (1 / h ** 0.9) * (1 + 0.6 * np.sin(2 * np.pi * (0.15 + 0.05 * h) * t + rng.uniform(0, 6)))  # jawari shimmer
        y += amp * np.sin(2 * np.pi * f * h * (1 + rng.uniform(-0.0008, 0.0008)) * t)
    env = (1 - np.exp(-t / 0.02)) * np.exp(-t / (dur * 0.55))
    return y * env


def ks_pluck(f: float, dur: float, rng, bright: float = 1.0) -> np.ndarray:
    """Karplus-Strong plucked string with a slight upward 'meend' at the start (sitar-like)."""
    n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * 0.8
    out = np.zeros(n); damp = 0.996 if bright >= 1 else 0.993
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    t = np.arange(n) / SR
    out *= np.exp(-t / (0.9 * dur)) * (1 - np.exp(-t / 0.004))
    return out


def tabla(kind: str, rng) -> np.ndarray:
    n = int(0.5 * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    if kind in ("dha", "ge", "dhi"):                              # bayan: low membrane with downward pitch glide
        f = 95 * np.exp(-t * 3.5) + 62
        y += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22) * 0.9
    if kind in ("dha", "na", "dhi", "tin"):                       # dayan: ringing pitched stroke (tuned to Sa above)
        f0 = hz(0, 1)
        y += (np.sin(2 * np.pi * f0 * t) + 0.5 * np.sin(2 * np.pi * f0 * 2.01 * t) + 0.3 * np.sin(2 * np.pi * f0 * 2.98 * t)) * np.exp(-t / (0.16 if kind != "tin" else 0.08)) * 0.55
    if kind in ("ti", "ka"):                                      # closed strokes: short damped click
        y += rng.standard_normal(n) * np.exp(-t / 0.012) * 0.35 + np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.03) * 0.3
    y[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return y


def make(seconds: float, mood: str = "calm", seed: int = 1) -> np.ndarray:
    m = MOOD.get(mood, MOOD["calm"]); rng = np.random.default_rng(seed)
    n = int((seconds + 2) * SR); L = np.zeros(n); R = np.zeros(n)

    def add(sig, at, pan=0.0, gain=1.0):
        i = int(at * SR); j = min(n, i + len(sig))
        if i >= n:
            return
        L[i:j] += sig[: j - i] * gain * (1 - pan) ** 0.5; R[i:j] += sig[: j - i] * gain * (1 + pan) ** 0.5

    # tanpura: Pa Sa Sa Sa(low), one cycle ~ 4.4 s, two instruments panned
    cyc = 4.4 if mood != "upbeat" else 3.6
    seq = [(7, -1), (0, 0), (0, 0), (0, -1)]
    t = 0.0; k = 0
    while t < seconds + 1:
        semi, octv = seq[k % 4]
        add(tanpura_pluck(hz(semi, octv), cyc * 0.9, rng), t, pan=-0.35 if (k // 4) % 2 == 0 else 0.35, gain=0.12 * m["drone"])
        t += cyc / 4; k += 1
    # melody: sparse phrases (3-6 notes stepping through the raga), rests between phrases
    scale = RAGA[m["raga"]]; t = 1.5; idx = 3
    while t < seconds - 1:
        if rng.random() < m["note_p"] * 2.2:
            for _ in range(rng.integers(3, 7)):
                idx = int(np.clip(idx + rng.choice([-2, -1, -1, 1, 1, 2]), 0, len(scale) - 1))
                d = rng.choice([0.35, 0.5, 0.7]) * (1.0 if mood != "upbeat" else 0.7)
                add(ks_pluck(hz(scale[idx], 1), 1.6, rng, m["bright"]), t, pan=rng.uniform(-0.3, 0.3), gain=0.16)
                t += d
        t += rng.uniform(1.8, 3.6) if mood in ("calm", "tense") else rng.uniform(1.0, 2.2)
    # tabla theka
    if m["bpm"]:
        beat = 60 / m["bpm"]
        theka = ["dha", "ge", "na", "ti", "na", "ka", "dhi", "na"] if mood != "tense" else ["dha", None, None, None, "ge", None, None, None]
        t = 2.0; b = 0
        while t < seconds:
            s = theka[b % 8]
            if s:
                add(tabla(s, rng), t + rng.uniform(-0.006, 0.006), pan=0.1, gain=(0.22 if b % 8 == 0 else 0.16) * (0.8 if mood == "warm" else 1.0))
            t += beat / 2 if mood == "upbeat" else beat; b += 1
    # fade in/out, gentle low-pass smoothing, normalise
    y = np.stack([L, R], 1)[: int(seconds * SR)]
    f = np.ones(len(y)); fi, fo = int(1.2 * SR), int(2.0 * SR)
    f[:fi] = np.linspace(0, 1, fi); f[-fo:] = np.linspace(1, 0, fo)
    y *= f[:, None]
    k = np.ones(3) / 3
    y = np.stack([np.convolve(y[:, c], k, "same") for c in range(2)], 1)
    return (y / (np.abs(y).max() + 1e-9) * 0.7).astype(np.float32)


def mood_for(board: dict, style: str) -> str:
    text = " ".join(str(board.get(k, "")) for k in ("topic", "title")).lower()
    if any(w in text for w in ("war", "battle", "kurukshetra", "death", "murder", "mystery", "raid")):
        return "tense" if style != "character-story" else "warm"
    if style in ("documentary-history", "real-footage", "old-film", "map-geo-pins", "timeline-roadmap"):
        return "calm"
    if style in ("character-story", "paper-cutout", "whiteboard", "chalkboard", "notebook-doodle"):
        return "warm"
    return "upbeat"


if __name__ == "__main__":
    sec, mood, out = float(sys.argv[1]), sys.argv[2], sys.argv[3]
    sf.write(out, make(sec, mood, int(sys.argv[4]) if len(sys.argv) > 4 else 1), SR)
    print("wrote", out)
