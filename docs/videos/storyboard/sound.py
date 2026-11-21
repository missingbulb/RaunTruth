"""The animatic's music beds and sound effects, synthesized, and the mix that lays them under the voice.

Placeholders for scoring: each bed and effect stands for the cue a composer or sound designer would make.
"""

import numpy as np
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


PROG = {"warm": [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
        "lift": [[53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64]],
        "pop": [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]]}


def bed(name, dur):
    buf = np.zeros(int(dur * SR) + SR)
    if name in ("doc-warm", "doc-lift", "doc-light"):
        bpm, prog = (70, PROG["warm"]) if name != "doc-lift" else (76, PROG["lift"])
        beat = 60 / bpm
        step = beat / (2 if name == "doc-warm" else 4 if name == "doc-lift" else 1)
        bar, k = 4 * beat, 0
        for b in range(int(dur / bar) + 1):
            chord = prog[b % 4]
            put(buf, pad([hz(m) for m in chord] + ([hz(chord[0] + 12)] if name == "doc-lift" else []), bar + 0.6) * 0.5, b * bar)
            put(buf, pluck(hz(chord[0] - 12), 2.5) * 0.25, b * bar)
            for s in range(int(bar / step)):
                note = chord[s % 3] + (12 if name != "doc-light" else 12 * (s % 2))
                put(buf, pluck(hz(note + (12 if name == "doc-lift" and s % 4 == 3 else 0)), 1.0) * (0.13 if name != "doc-light" else 0.1), b * bar + s * step)
                k += 1
    elif name == "doc-tense":
        t = t_(dur + 1)
        drone = np.sin(2 * np.pi * hz(45) * t) * 0.5 + np.sin(2 * np.pi * hz(52) * t) * 0.25 + np.sin(2 * np.pi * hz(76) * t) * 0.03
        buf[:len(t)] += drone * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t)) * np.minimum(1, t / 2)
        for i in range(int(dur)):
            put(buf, hp(rng.standard_normal(600), 2500) * np.exp(-np.arange(600) / 60) * 0.15, i + 0.0)
    elif name in ("launch-pulse", "launch-drive"):
        beat = 0.5
        for i in range(int(dur / (beat / 2)) + 1):
            at, root = i * beat / 2, PROG["warm"][(i // 16) % 4][0] - 24
            put(buf, bass(hz(root), 0.22) * (0.35 if name == "launch-pulse" else 0.45), at)
            if i % 2:
                put(buf, hat(), at)
            if name == "launch-drive":
                if i % 2 == 0:
                    put(buf, kick() * 0.9, at)
                if i % 4 == 2:
                    put(buf, snare() * 0.6, at)
                if i % 4 == 1:
                    put(buf, sum(pluck(hz(m + 12), 0.25, 2) for m in PROG["warm"][(i // 16) % 4]) * 0.12, at)
    elif name == "launch-riser":
        t = t_(dur)
        x = t / max(dur, 0.1)
        buf[:len(t)] += hp(rng.standard_normal(len(t)), 1500) * x ** 2 * 0.25 + np.sin(2 * np.pi * np.cumsum(200 + 700 * x ** 2) / SR) * x * 0.12
        n, at = 4, 0.0
        while at < dur:
            put(buf, snare() * (0.2 + 0.5 * at / dur), at)
            at += 0.5 / (1 + 3 * at / dur)
    elif name in ("play-wonky", "play-bounce"):
        bpm = 92 if name == "play-wonky" else 110
        beat = 60 / bpm
        for i in range(int(dur / beat) + 1):
            at = i * beat
            if name == "play-wonky":
                put(buf, pluck(hz(45 - (i % 4)) * (1.01 if i % 2 else 0.99), 0.6) * 0.45, at)
                if i % 2:
                    put(buf, pluck(hz(69 - (i % 8)), 0.3, 2) * 0.12, at + beat / 2)
            else:
                chord = PROG["pop"][(i // 4) % 4]
                put(buf, pluck(hz(chord[0] - 12), 0.4) * 0.45, at) if i % 2 == 0 else None
                put(buf, hat(0.03) * 0.6, at + beat / 2)
                if i % 4 in (1, 3):
                    put(buf, snare() * 0.25, at)
                for s, m in enumerate([0, 2, 1, 2]):
                    if (i * 4 + s) % 3 != 2:
                        put(buf, pluck(hz(chord[m] + 12), 0.35, 2.5) * 0.11, at + s * beat / 4)
    return buf[:int(dur * SR)]


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
    if name == "riser":
        return bed("launch-riser", 1.6)
    raise SystemExit(f"no sound effect named {name!r}")


def mix(total, beds, effects, voices, music_gain=1.0, duck=0.35):
    """beds: [(start, name)]; effects: [(at, name)]; voices: [(at, samples)]. Returns the mixed track."""
    n = int(total * SR) + SR
    music, fx, vo = np.zeros(n), np.zeros(n), np.zeros(n)
    beds = sorted(beds)
    for k, (start, name) in enumerate(beds):
        end = beds[k + 1][0] if k + 1 < len(beds) else total + 1.5
        if name == "none":
            continue
        seg = bed(name, end - start + 1.0)
        seg = seg / max(np.sqrt((seg ** 2).mean()), 1e-9) * 0.14
        fade = np.ones(len(seg))
        f = int(0.8 * SR)
        fade[:f] = np.linspace(0, 1, f)
        fade[-f:] = np.linspace(1, 0, f)
        put(music, seg * fade, max(0, start - 0.2))
    for at, name in effects:
        x = sfx(name)
        put(fx, x / max(np.abs(x).max(), 1e-9) * (0.45 if name in ("tick", "ticks", "pop", "typing") else 0.8), at)
    for at, samples in voices:
        put(vo, samples, at)
    gate = lp((np.abs(vo) > 0.01).astype(float), 3)
    gate = np.clip(gate / max(gate.max(), 1e-9) * 1.5, 0, 1)
    music *= music_gain * (1 - (1 - duck) * gate)
    out = music + fx * 0.55 + vo
    tail = int(1.5 * SR)
    out[-tail:] *= np.linspace(1, 0, tail)
    return out / max(1.0, np.abs(out).max() / 0.95)
