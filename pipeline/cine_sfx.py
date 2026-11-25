"""Cinematic score + scene-synced sound effects, all synthesised locally (no samples, royalty-free).

epic_bed(seconds)          dark trailer-style bed: low drone, minor string pad, 8th-note string ostinato that builds, taiko hits
cine_track(props, total)   per scene: an ambience bed ("amb") + timed one-shots ("sfx": [[name, t_rel], ...]) + cut whooshes/booms
Storyboard per scene:  "amb": "storm|lab|magic|hangar|cosmic|space|wind|fire|fog|hall",  "sfx": [["thunder", 0.5], ...]
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 44100


def _t(d):
    return np.arange(int(d * SR)) / SR


def _bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def _lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def _hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def _brown(n, rng):
    w = rng.standard_normal(n)
    b = lfilter([1], [1, -0.995], w)
    return b / (np.abs(b).max() + 1e-9)


def _norm(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-9) * peak


def _saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1


# ------------------------------------------------------------------ one-shots
def thunder(rng, dur=5.0):
    t = _t(dur); n = len(t)
    crack = _hp(rng.standard_normal(n), 1500) * np.exp(-t / 0.05) * 0.8
    rumble = _lp(_brown(n, rng), 140, 4) * np.exp(-t / 1.6) * (1 - np.exp(-t / 0.08))
    rumble *= 1 + 0.6 * _lp(rng.standard_normal(n), 6) * 30
    mid = _bp(rng.standard_normal(n), 200, 900) * np.exp(-t / 0.5) * 0.3
    return _norm(crack + rumble * 1.6 + mid)


def boom(rng, dur=3.0, f0=55):
    """cinematic impact: pitch-dropping sub + noise transient + low brass 'braam'."""
    t = _t(dur)
    f = f0 + 45 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1)
    hit = _lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.06)
    br = sum(_saw(f0 * m * (1 + d), t) for m in (1, 1.5, 2) for d in (-0.003, 0.003))
    br = _lp(br, 400) * np.minimum(1, t / 0.05) * np.exp(-t / 0.9) * 0.25
    return _norm(sub + hit * 0.6 + br)


def taiko(rng):
    t = _t(0.9)
    f = 70 + 50 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    skin = _bp(rng.standard_normal(len(t)), 150, 1200) * np.exp(-t / 0.03)
    return _norm(body + skin * 0.5)


def step(rng):
    """armoured footstep: thud + short metal clank."""
    t = _t(0.5)
    thud = np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 40)) * t) * np.exp(-t / 0.07)
    clank = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / d) for f, d in ((870, 0.08), (1390, 0.05), (2210, 0.03), (3170, 0.02)))
    grit = _bp(rng.standard_normal(len(t)), 300, 3000) * np.exp(-t / 0.02)
    return _norm(thud + 0.22 * clank * rng.uniform(0.6, 1.0) + 0.3 * grit)


def shimmer(rng, dur=2.2):
    t = _t(dur)
    y = np.zeros(len(t))
    for k in range(14):
        f = rng.uniform(1800, 5200); g = rng.uniform(-300, 300)
        y += np.sin(2 * np.pi * (f * t + g * t * t / 2)) * rng.uniform(0.3, 1)
    env = np.minimum(1, t / (dur * 0.35)) * np.exp(-np.maximum(0, t - dur * 0.35) / (dur * 0.3))
    air = _bp(rng.standard_normal(len(t)), 2000, 8000) * 0.4
    return _norm((y / 14 + air) * env)


def magic_burst(rng):
    t = _t(1.6)
    sub = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 3) + 40) / SR) * np.exp(-t / 0.5)
    whsh = _bp(rng.standard_normal(len(t)), 400, 5000) * np.exp(-t / 0.25)
    return _norm(sub + 0.5 * whsh + 0.4 * shimmer(rng, 1.6))


def powerup(rng, dur=2.4):
    t = _t(dur)
    f = 70 * (9 ** (t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    nz = _bp(rng.standard_normal(len(t)), 500, 6000) * (t / dur) ** 2
    env = (t / dur) ** 1.5 * np.minimum(1, (dur - t) / 0.05)
    return _norm((tone * 0.6 + nz * 0.5) * env)


def zap(rng, dur=0.35):
    t = _t(dur)
    y = _hp(rng.standard_normal(len(t)), 2000) * (rng.random(len(t)) < 0.15)
    buzz = _saw(120, t) * 0.4
    return _norm((y + buzz) * np.exp(-t / (dur * 0.4)))


def beam(rng, dur=2.6):
    t = _t(dur)
    buzz = sum(_saw(f, t, rng.uniform(0, 1)) for f in (98, 147, 196.5)) / 3
    buzz = _lp(buzz, 1800) * (1 + 0.3 * np.sin(2 * np.pi * 11 * t))
    roar = _bp(rng.standard_normal(len(t)), 300, 4000) * 0.6
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.3)
    return _norm((buzz + roar) * env) * 0.9 + 0.5 * boom(rng, dur, 50)[: len(t)]


def servo(rng, dur=0.9):
    t = _t(dur)
    f = 260 + 380 * np.sin(np.pi * t / dur)
    w = _bp(_saw(1, np.cumsum(f) / SR), 200, 2500)
    clicks = np.zeros(len(t)); clicks[[0, len(t) - 400]] = 1
    clicks = lfilter([1], [1, -0.97], clicks) * np.sin(2 * np.pi * 3000 * t)
    return _norm(w * np.sin(np.pi * t / dur) ** 0.5 + clicks * 0.5)


def riser(rng, dur=1.8):
    t = _t(dur)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t)); seg = int(0.05 * SR)
    for i in range(0, len(t), seg):
        c = 300 + 6000 * (i / len(t)) ** 2
        out[i:i + seg] = _bp(nz[i:i + seg + 2000], c * 0.7, min(c * 1.4, 18000))[: len(out[i:i + seg])]
    return _norm(out * (t / dur) ** 2)


def whoosh(rng, dur=0.7):
    t = _t(dur)
    nz = _bp(rng.standard_normal(len(t)), 250, 3000)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return _norm(nz * env)


ONE = {"thunder": thunder, "boom": boom, "taiko": taiko, "step": step, "shimmer": shimmer, "burst": magic_burst,
       "powerup": powerup, "zap": zap, "beam": beam, "servo": servo, "riser": riser, "whoosh": whoosh}
GAIN = {"thunder": 0.55, "boom": 0.5, "taiko": 0.35, "step": 0.16, "shimmer": 0.16, "burst": 0.35, "powerup": 0.26,
        "zap": 0.12, "beam": 0.32, "servo": 0.12, "riser": 0.2, "whoosh": 0.16}


# ------------------------------------------------------------------ ambiences (looping beds, quiet)
def ambience(kind, dur, rng):
    t = _t(dur); n = len(t)
    w = rng.standard_normal(n)
    if kind == "storm":
        rain = _hp(w, 2500) * 0.25 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * t))
        wind = _bp(_brown(n, rng), 120, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1))
        y = rain + wind
    elif kind == "lab":
        y = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((50, 0.5), (100, 0.35), (150, 0.15), (60.3, 0.25)))
        y += _bp(w, 2000, 6000) * 0.04
    elif kind == "magic":
        y = _bp(w, 3000, 9000) * 0.2 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t)) + np.sin(2 * np.pi * 110 * t) * 0.15
    elif kind == "hangar":
        y = _lp(_brown(n, rng), 200) + np.sin(2 * np.pi * 59 * t) * 0.2 + _bp(w, 800, 1600) * 0.03
    elif kind == "cosmic":
        y = _bp(w, 1500, 7000) * 0.3 * (0.5 + 0.5 * (t / dur)) + np.sin(2 * np.pi * 55 * t) * 0.4 * (t / dur)
    elif kind == "space":
        y = np.sin(2 * np.pi * 41 * t) * 0.5 + np.sin(2 * np.pi * 41.7 * t) * 0.5 + _bp(w, 400, 2500) * 0.08
    elif kind == "wind":
        y = _bp(_brown(n, rng), 150, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t)) + _bp(w, 300, 900) * 0.05
    elif kind == "fire":
        roar = _lp(_brown(n, rng), 300) * 1.2
        pops = (rng.random(n) < 0.0008).astype(float)
        pops = lfilter([1], [1, -0.9], pops) * _hp(w, 1500) * 6
        y = roar + pops
    elif kind == "fog":
        y = _lp(_brown(n, rng), 90) + np.sin(2 * np.pi * 36.7 * t) * 0.3
    elif kind == "hall":
        crack = (rng.random(n) < 0.0004).astype(float)
        crack = lfilter([1], [1, -0.85], crack) * _hp(w, 2000) * 5
        y = _lp(_brown(n, rng), 160) * 0.6 + crack
    else:
        return np.zeros(n)
    fade = np.minimum(1, np.minimum(t / 0.25, (dur - t) / 0.25))
    return _norm(y) * fade


AMB_GAIN = {"storm": 0.10, "lab": 0.06, "magic": 0.06, "hangar": 0.07, "cosmic": 0.07, "space": 0.07, "wind": 0.07,
            "fire": 0.11, "fog": 0.08, "hall": 0.06}


def cine_track(props: dict, total: float, seed: int = 7):
    rng = np.random.default_rng(seed)
    n = int((total + 2) * SR); y = np.zeros(n); cues = []

    def put(sig, at, gain):
        i = max(0, int(at * SR)); j = min(n, i + len(sig))
        if j > i:
            y[i:j] += sig[: j - i] * gain

    scenes = props["scenes"]
    for k, sc in enumerate(scenes):
        st, du = float(sc["start"]), float(sc["dur"])
        if sc.get("amb"):
            put(ambience(sc["amb"], du + 0.3, rng), st, AMB_GAIN.get(sc["amb"], 0.06))
        for name, tr in sc.get("sfx", []):
            put(ONE[name](rng), st + float(tr), GAIN[name]); cues.append((name, round(st + float(tr), 2)))
        if k > 0:
            put(whoosh(rng, 0.6), st - 0.4, 0.12); cues.append(("cut", round(st, 2)))
    put(boom(rng, 3.5, 45), 0.0, 0.45); cues.append(("open-boom", 0.0))
    return np.stack([y, y * 0.98], 1).astype(np.float32), cues


def epic_bed(seconds: float, seed: int = 1) -> np.ndarray:
    """D minor trailer bed: drone, string pad (i-VI-iv-V), 8th ostinato from ~8 s that thickens, taiko on downbeats."""
    import sound_design as sd
    rng = np.random.default_rng(seed)
    n = int((seconds + 3) * SR); L = np.zeros(n); R = np.zeros(n)

    def add(sig, at, pan=0.0, gain=1.0):
        i = int(at * SR); j = min(n, i + len(sig))
        if i >= n or j <= i:
            return
        L[i:j] += sig[: j - i] * gain * (1 - pan) ** 0.5; R[i:j] += sig[: j - i] * gain * (1 + pan) ** 0.5

    D = 73.42  # D2
    t = _t(seconds + 2)
    drone = _lp(sum(_saw(D / 2 * (1 + d), t, rng.uniform(0, 1)) for d in (-0.002, 0.002)), 160) * 0.5
    drone *= np.minimum(1, t / 3.0)
    add(drone, 0, gain=0.16)
    bpm = 92; beat = 60 / bpm; bar = beat * 4
    prog = [(0, 3, 7), (-4, 0, 3), (-7, -4, 0), (-5, -1, 2)]     # Dm  Bb  Gm  A
    tt = 0.0; c = 0
    while tt < seconds:
        ch = prog[c % 4]
        add(sd._pad([D * 2 ** (s / 12) * 2 for s in ch] + [D * 2 ** (ch[0] / 12)], bar * 2 + 0.8, rng, bright=0.3, attack=1.6), tt, gain=0.17)
        tt += bar * 2; c += 1
    # ostinato
    tt = 8.0; i = 0
    while tt < seconds - 1:
        ch = prog[int(tt / (bar * 2)) % 4]
        f = D * 2 ** (ch[0] / 12) * (2 if i % 8 in (2, 6) else 1)
        tn = _t(beat * 0.5)
        note = _lp(sum(_saw(f * (1 + d), tn) for d in (-0.003, 0.003)), 900) * np.exp(-tn / 0.12)
        build = min(1.0, 0.35 + (tt - 8) / 40)
        add(note, tt, pan=0.25 * (-1) ** i, gain=0.09 * build)
        tt += beat / 2; i += 1
    # taiko on bar 1 of every 2 bars after 4 s, doubled in the last third
    tt = 4.0; b = 0
    while tt < seconds - 1:
        add(taiko(rng), tt, gain=0.22)
        if tt > seconds * 0.6:
            add(taiko(rng), tt + beat * 1.5, gain=0.14)
        tt += bar * 2 if tt < seconds * 0.6 else bar; b += 1
    out = np.stack([L, R], 1)
    return (out / (np.abs(out).max() + 1e-9) * 0.7).astype(np.float32)
