"""The videos' own music: each bed composed in code from plucked strings, mallets, pads, bass and light drums,
placed in a stereo room. Deterministic, so a re-render gives the same score.
"""

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 44100


def _sos(kind, f):
    return butter(2, f, kind, fs=SR, output="sos")


def lp(x, f):
    return sosfilt(_sos("low", f), x, axis=0)


def hp(x, f):
    return sosfilt(_sos("high", f), x, axis=0)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


class Track:
    def __init__(self, dur):
        self.buf = np.zeros((int(dur * SR) + 2 * SR, 2))

    def add(self, x, at, pan=0.0, gain=1.0):
        i = int(at * SR)
        if i >= len(self.buf) or i < 0:
            return
        n = min(len(x), len(self.buf) - i)
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + n, 0] += x[:n] * gain * left
        self.buf[i:i + n, 1] += x[:n] * gain * right


def string(f, dur=1.5, damp=0.996, bright=0.6, seed=0):
    """Karplus-Strong plucked string."""
    rng = np.random.default_rng(seed + int(f))
    n = max(2, int(round(SR / f)))
    burst = lp(rng.uniform(-1, 1, n), 1200 + 6000 * bright)
    x = np.zeros(int(dur * SR))
    x[:n] = burst
    a = np.zeros(n + 2)
    a[0], a[n], a[n + 1] = 1, -0.5 * damp, -0.5 * damp
    y = lfilter([1.0], a, x)
    return y / (np.abs(y).max() + 1e-9) * np.minimum(1, (dur - t_(dur)) / 0.05)


def mallet(f, dur=0.9, kind="marimba"):
    t = t_(dur)
    if kind == "marimba":
        parts = ((1, 1, 6), (3.93, 0.35, 18), (9.2, 0.12, 40))
    elif kind == "glock":
        parts = ((1, 1, 2.5), (2.76, 0.4, 5), (5.4, 0.2, 9))
    else:  # woodblock
        parts = ((1, 1, 35), (2.3, 0.5, 50))
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in parts)
    return y * np.minimum(1, t / 0.002)


def pad(freqs, dur, bright=1800, attack=1.2):
    t = t_(dur)
    y = np.zeros(len(t))
    for f in freqs:
        for d in (-0.06, 0, 0.07):
            fr = f * 2 ** (d / 12)
            y += sum(np.sin(2 * np.pi * fr * k * t + k) / k ** 1.6 for k in (1, 2, 3))
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / attack)
    return lp(y, bright) * env / (3 * len(freqs))


def tuba(f, dur, bend=0.0):
    t = t_(dur)
    fr = f * 2 ** (bend * t / dur / 12)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    return lp(y, 700) * np.minimum(1, t / 0.03) * np.exp(-t * 2.5) * np.minimum(1, (dur - t) / 0.03)


def bass(f, dur):
    t = t_(dur)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return y * np.minimum(1, t / 0.008) * np.exp(-t * 3.5)


def kick():
    t = t_(0.4)
    return np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-t * 28)) / SR) * np.exp(-t * 8)


def noise(dur, seed):
    return np.random.default_rng(seed).standard_normal(int(dur * SR))


def brush(seed):
    t = t_(0.12)
    return hp(noise(0.12, seed), 5000) * np.exp(-t * 35) * 0.3


def clap(seed):
    t = t_(0.25)
    y = np.zeros(len(t))
    for k, off in enumerate((0, 0.011, 0.023)):
        i = int(off * SR)
        y[i:] += hp(noise(0.25, seed + k), 1200)[: len(y) - i] * np.exp(-t[: len(y) - i] * 30)
    return y * 0.4


def snare(seed):
    t = t_(0.22)
    return (hp(noise(0.22, seed), 1500) * 0.6 + np.sin(2 * np.pi * 190 * t) * 0.5) * np.exp(-t * 20)


def room(x, size=1.4, wet=0.22, seed=3):
    """A stereo room: two decorrelated decays convolved in."""
    t = t_(size)
    out = np.zeros((len(x) + len(t) - 1, 2))
    for ch in range(2):
        ir = lp(noise(size, seed + ch), 5000) * np.exp(-t * 4.5 / size)
        ir /= np.sqrt((ir ** 2).sum())
        out[:, ch] = fftconvolve(x.mean(axis=1) if x.ndim == 2 else x, ir)
    dry = np.zeros_like(out)
    dry[: len(x)] = x if x.ndim == 2 else np.stack([x, x], 1)
    return dry * (1 - wet) + out * wet * 2.2


C, G, AM, F, E = [48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48], [40, 44, 47]


def play_bounce(dur):
    """Bouncy: plucked bass, marimba hook, brushes and claps, a glockenspiel sparkle at each phrase's end."""
    bpm, tr = 112, Track(dur)
    beat = 60 / bpm
    prog = [C, G, AM, F]
    hook = [0, None, 2, 1, None, 2, 0, 1]
    for bar in range(int(dur / (4 * beat)) + 1):
        chord, b0 = prog[bar % 4], bar * 4 * beat
        root = chord[0] - 12
        for at, m in ((0, root), (1.5, root + 12), (2, root + 7 - 12 if chord != AM else root + 7 - 12), (3.5, root + 12)):
            tr.add(string(hz(m), 0.6, 0.99, 0.3, bar), b0 + at * beat, -0.1, 0.55)
        for k, idx in enumerate(hook):
            if idx is not None:
                tr.add(mallet(hz(chord[idx] + 24 + (12 if bar % 8 == 7 and k == 7 else 0))), b0 + k * beat / 2, 0.35, 0.32)
        for k in range(8):
            tr.add(brush(bar * 8 + k), b0 + k * beat / 2 + (0.012 if k % 2 else 0), 0.5, 0.5 if k % 2 else 0.3)
        tr.add(clap(bar), b0 + beat, -0.2, 0.5)
        tr.add(clap(bar + 50), b0 + 3 * beat, -0.2, 0.5)
        tr.add(kick() * 0.5, b0, 0, 0.6)
        tr.add(kick() * 0.5, b0 + 2.5 * beat, 0, 0.4)
        tr.add(pad([hz(m + 12) for m in chord], 4 * beat + 0.6, 1400) * 0.9, b0, 0, 0.35)
        if bar % 4 == 3:
            for k, m in enumerate((72, 76, 79, 84)):
                tr.add(mallet(hz(m), 1.6, "glock"), b0 + 3 * beat + k * beat / 4, 0.6, 0.12)
    return room(tr.buf, 1.1, 0.18)


def play_wonky(dur):
    """The pain section: a tuba sagging downhill, woodblocks, a marimba that can't quite find the key."""
    bpm, tr = 90, Track(dur)
    beat = 60 / bpm
    line = [45, 44, 43, 42]
    for bar in range(int(dur / (4 * beat)) + 1):
        b0 = bar * 4 * beat
        for k, m in enumerate(line):
            tr.add(tuba(hz(m - 12), beat * 0.9, -0.6 if k == 3 else 0), b0 + k * beat, -0.15, 0.7)
            tr.add(mallet(hz(76 - k) * (1.012 if k % 2 else 0.99), 0.4, "wood"), b0 + k * beat + beat / 2, 0.4, 0.25)
        if bar % 2 == 1:
            for k, m in enumerate((69, 68, 66)):
                tr.add(mallet(hz(m) * 0.995, 0.7), b0 + 3 * beat + k * beat / 3, 0.3, 0.22)
    return room(tr.buf, 0.9, 0.15)


def doc(dur, lift=False, light=False):
    """Warm piano-like strings over a soft pad; lift adds movement and a higher voicing."""
    bpm = 76 if lift else 68
    beat, tr = 60 / bpm, Track(dur)
    prog = [F, C, G, AM] if lift else [AM, F, C, G]
    for bar in range(int(dur / (4 * beat)) + 1):
        chord, b0 = prog[bar % 4], bar * 4 * beat
        tr.add(pad([hz(m + 12) for m in chord] + [hz(chord[0])], 4 * beat + 1.2, 1600 if not lift else 2400), b0, 0, 0.55 if not light else 0.35)
        tr.add(string(hz(chord[0] - 12), 3, 0.998, 0.3, bar), b0, -0.2, 0.4)
        steps = 8 if lift else 4 if light else 6
        for k in range(steps):
            m = chord[k % 3] + 24 + (12 if lift and k % 4 == 3 else 0)
            tr.add(string(hz(m), 1.6, 0.997, 0.5, bar * 9 + k), b0 + k * 4 * beat / steps, 0.3 * ((k % 2) * 2 - 1), 0.22)
    return room(tr.buf, 2.2, 0.3)


def tense(dur):
    tr, t = Track(dur), t_(dur + 1)
    drone = (np.sin(2 * np.pi * hz(33) * t) * 0.6 + np.sin(2 * np.pi * hz(40) * t) * 0.3 + pad([hz(57), hz(64)], dur + 1, 900, 2.5)[: len(t)])
    tr.add(drone * (0.75 + 0.25 * np.sin(2 * np.pi * 0.2 * t)) * np.minimum(1, t / 2.5), 0, 0, 0.8)
    for i in range(int(dur / 0.85)):
        tr.add(mallet(hz(88), 0.15, "wood"), i * 0.85, 0.6 * (1 if i % 2 else -1), 0.08)
    return room(tr.buf, 2.5, 0.35)


def launch(dur, drive=True):
    bpm, tr = 120, Track(dur)
    beat = 60 / bpm
    prog = [AM, F, C, G]
    for bar in range(int(dur / (4 * beat)) + 1):
        chord, b0 = prog[bar % 4], bar * 4 * beat
        for k in range(8):
            tr.add(bass(hz(chord[0] - 12), beat / 2 * 0.9), b0 + k * beat / 2, 0, 0.55)
            tr.add(brush(bar * 8 + k), b0 + k * beat / 2 + beat / 4, 0.4, 0.5)
        if drive:
            for k in range(4):
                tr.add(kick(), b0 + k * beat, 0, 0.8)
            tr.add(snare(bar), b0 + beat, 0, 0.5)
            tr.add(snare(bar + 99), b0 + 3 * beat, 0, 0.5)
            for k in (1, 3, 5, 7):
                for m in chord:
                    tr.add(string(hz(m + 12), 0.3, 0.99, 0.9, k), b0 + k * beat / 2, 0.3, 0.12)
        tr.add(pad([hz(m + 12) for m in chord], 4 * beat + 0.4, 2600), b0, 0, 0.3)
    return room(tr.buf, 1.0, 0.15)


def riser(dur):
    t = t_(dur)
    x = t / max(dur, 0.1)
    y = hp(noise(dur, 9), 1500) * x ** 2 * 0.35 + np.sin(2 * np.pi * np.cumsum(220 + 900 * x ** 2) / SR) * x * 0.15
    tr = Track(dur)
    tr.add(y, 0)
    at = 0.0
    while at < dur:
        tr.add(snare(int(at * 100)) * (0.2 + 0.6 * at / dur), at, 0, 0.6)
        at += 0.5 / (1 + 4 * at / dur)
    return room(tr.buf, 0.8, 0.15)


BEDS = {"play-bounce": play_bounce, "play-wonky": play_wonky, "doc-warm": doc,
        "doc-lift": lambda d: doc(d, lift=True), "doc-light": lambda d: doc(d, light=True), "doc-tense": tense,
        "launch-drive": launch, "launch-pulse": lambda d: launch(d, drive=False), "launch-riser": riser}


def bed(name, dur):
    if name not in BEDS:
        raise SystemExit(f"no music bed named {name!r}")
    return BEDS[name](dur)[: int(dur * SR)]
