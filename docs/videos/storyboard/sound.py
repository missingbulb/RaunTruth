"""The animatic's music beds and sound effects, synthesized, and the mix that lays them under the voice.

Placeholders for scoring: each bed and effect stands for the cue a composer or sound designer would make.
"""

import numpy as np

import music as music_beds
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lp(x, f):
    return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def put(buf, x, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n]


def pluck(f, dur=1.2, bright=1.0):
    t = t_(dur)
    out = sum(np.sin(2 * np.pi * k * f * t) * np.exp(-t * (2.2 + k * 1.6 / bright)) / k ** 1.3 for k in range(1, 7))
    return out * np.minimum(1, t / 0.004)


def pad(freqs, dur, attack=0.8):
    t = t_(dur)
    out = sum(np.sin(2 * np.pi * f * d * t + p) for f in freqs for d, p in ((1, 0), (1.003, 1.3), (0.997, 2.1)))
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / attack)
    return lp(out, 2400) * env / (3 * len(freqs))


def kick():
    t = t_(0.35)
    f = 45 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat(dur=0.05):
    t = t_(dur)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 90) * 0.35


def snare():
    t = t_(0.2)
    return (bp(rng.standard_normal(len(t)), 1500, 6000) * 0.6 + np.sin(2 * np.pi * 185 * t) * 0.5) * np.exp(-t * 22)


def bass(f, dur):
    t = t_(dur)
    return lp(np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) + 0.2 * np.sign(np.sin(2 * np.pi * f * t)), 900) \
        * np.minimum(1, t / 0.01) * np.exp(-t * 3)


def sfx(name):
    if name == "click":
        t = t_(0.03)
        return (np.sin(2 * np.pi * 3000 * t) * 0.5 + hp(rng.standard_normal(len(t)), 2000) * 0.3) * np.exp(-t * 250)
    if name == "tick":
        t = t_(0.04)
        return np.sin(2 * np.pi * 1600 * t) * np.exp(-t * 140) * 0.35
    if name in ("clicks", "ticks", "typing"):
        out, at, gap = np.zeros(int(2.4 * SR)), 0.0, 0.32
        while at < 2.2:
            put(out, sfx("click" if name != "ticks" else "tick") * (0.8 if name != "typing" else 0.5), at)
            at += gap if name != "typing" else 0.06 + rng.random() * 0.12
            gap = max(0.05, gap * 0.85) if name == "clicks" else 0.15
        return out
    if name in ("whoosh", "swish"):
        dur = 0.9 if name == "whoosh" else 0.45
        t = t_(dur)
        n = rng.standard_normal(len(t))
        env = np.sin(np.pi * t / dur) ** 2
        return (lp(n, 900) * (1 - t / dur) + bp(n, 1500, 5000) * (t / dur)) * env * 0.6
    if name in ("thud", "hit", "stamp"):
        t = t_(0.6)
        body = np.sin(2 * np.pi * np.cumsum(40 + 90 * np.exp(-t * 25)) / SR) * np.exp(-t * 7)
        out = body + lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 18) * 0.4
        if name == "hit":
            out += hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 6) * 0.2 + sum(np.sin(2 * np.pi * hz(m) * t) for m in (57, 64, 69)) * np.exp(-t * 3) * 0.12
        if name == "stamp":
            put(out, sfx("click"), 0)
        return out * 0.8
    if name in ("chime", "ding"):
        f = 880 if name == "chime" else 1320
        t = t_(2.5)
        return sum(np.sin(2 * np.pi * f * r * t) * a * np.exp(-t * d) for r, a, d in ((1, 0.5, 1.5), (2.76, 0.2, 3), (5.4, 0.1, 5))) * 0.5
    if name == "pop":
        t = t_(0.08)
        return np.sin(2 * np.pi * np.cumsum(500 + 1500 * t / 0.08) / SR) * np.exp(-t * 40) * 0.5
    if name == "boing":
        t = t_(0.7)
        return np.sin(2 * np.pi * np.cumsum(180 + 120 * t + 40 * np.sin(2 * np.pi * 14 * t)) / SR) * np.exp(-t * 4) * 0.45
    if name == "scribble":
        out, at = np.zeros(int(1.8 * SR)), 0.0
        while at < 1.6:
            d = 0.08 + rng.random() * 0.15
            t = t_(d)
            put(out, bp(rng.standard_normal(len(t)), 2500, 7000) * np.sin(np.pi * t / d) * (0.4 + 0.3 * np.sin(2 * np.pi * 18 * t)), at)
            at += d + rng.random() * 0.05
        return out * 0.6
    if name == "snap":
        t = t_(0.25)
        crack = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 60)
        return crack + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90) * 0.4 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 30) * 0.2
    if name == "riser":
        return music_beds.bed("launch-riser", 1.6).mean(axis=1)
    raise SystemExit(f"no sound effect named {name!r}")


REPORT = {}


def mix(total, beds, effects, voices, duck=0.3):
    """beds: [(start, name)]; effects: [(at, name)]; voices: [(at, samples)]. Returns the stereo mix, (n, 2)."""
    n = int(total * SR) + SR
    music, fx, vo = np.zeros((n, 2)), np.zeros(n), np.zeros(n)
    beds = sorted(beds)
    for k, (start, name) in enumerate(beds):
        end = beds[k + 1][0] if k + 1 < len(beds) else total + 1.5
        if name == "none":
            continue
        seg = music_beds.bed(name, end - start + 1.2)
        seg = seg / max(np.sqrt((seg ** 2).mean()), 1e-9) * 0.13
        f = int(0.7 * SR)
        fade = np.ones(len(seg))
        fade[:f], fade[-f:] = np.linspace(0, 1, f), np.linspace(1, 0, f)
        i0 = int(max(0, start - 0.2) * SR)
        m = min(len(seg), n - i0)
        music[i0:i0 + m] += (seg * fade[:, None])[:m]
    for at, name in effects:
        x = sfx(name)
        put(fx, x / max(np.abs(x).max(), 1e-9) * (0.45 if name in ("tick", "ticks", "pop", "typing", "scribble") else 0.8), at)
    for at, samples in voices:
        put(vo, hp(samples, 90), at)
    gate = lp((np.abs(vo) > 0.01).astype(float), 3)
    gate = np.clip(gate / max(gate.max(), 1e-9) * 1.5, 0, 1)
    music *= (1 - (1 - duck) * gate)[:, None]
    under = gate > 0.6
    if under.any():
        rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-12)
        REPORT["music_under_voice_db"] = round(20 * np.log10(rms(music[under].mean(axis=1)) / rms(vo[under])), 1)
    out = music + (fx * 0.55 + vo)[:, None]
    tail = int(1.5 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)[:, None]
    return out / max(1.0, np.abs(out).max() / 0.95)
