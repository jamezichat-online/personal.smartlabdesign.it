#!/usr/bin/env python3
"""reel-director · original, frame-accurate sound design.

    python3 sfx.py cues.json out.wav

cues.json = {
  "fps": 30, "durationInFrames": 600,
  "music": {"bpm": 120, "ranges": [[0, 270], [420, 540]], "bass": [45, 45, 48, 43]},   # optional groove
  "cues": [{"f": 12, "type": "swish", "gain": 0.8}, {"f": 90, "type": "whoosh", "dur": 0.5}, ...]
}
Every sound is synthesised here (numpy + scipy): no samples, no licensing.
Sample index = frame / fps * SR, so cues land on the exact frame.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)  # fixed seed: same cues -> identical audio, bit for bit


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def hp(x, hz):
    return sosfilt(butter(2, hz, "highpass", fs=SR, output="sos"), x)


def lp(x, hz):
    return sosfilt(butter(2, hz, "lowpass", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


# ---------------- recipes ----------------
def kick(c):
    t = t_axis(0.35)
    f = 45 + 110 * np.exp(-28 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def hat(c):
    t = t_axis(0.06)
    return norm(hp(noise(0.06), 7000)) * np.exp(-t / 0.012) * 0.5


def bass(c):
    t = t_axis(0.42)
    hz = c.get("hz", 55.0)
    x = np.sin(2 * np.pi * hz * t) + 0.35 * np.sin(2 * np.pi * hz * 2 * t) + 0.12 * np.sin(2 * np.pi * hz * 3 * t)
    return x * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.004))


def whoosh(c):
    d = c.get("dur", 0.6)
    t = t_axis(d)
    x = noise(d)
    # one-pole low-pass with a cutoff that sweeps up then down (peaks mid-way)
    env = np.sin(np.pi * t / d) ** 2
    cut = 300 + 5200 * env
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return norm(y) * env


def swish(c):
    d = c.get("dur", 0.16)
    t = t_axis(d)
    return norm(hp(noise(d), 2500)) * np.sin(np.pi * t / d) ** 3 * 0.7


def tick(c):
    t = t_axis(0.05)
    hz = c.get("hz", 3200)
    return np.sin(2 * np.pi * hz * t) * np.exp(-t / 0.008)


def bounce(c):
    t = t_axis(0.2)
    f = 140 + 260 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    click = hp(noise(0.2), 3000) * np.exp(-t / 0.002) * 0.4
    return body + click


def impact(c):
    t = t_axis(1.2)
    sub = np.sin(2 * np.pi * (38 + 30 * np.exp(-t * 9)) * t) * np.exp(-t / 0.45)
    burst = norm(lp(noise(1.2), 900)) * np.exp(-t / 0.12) * 0.8
    return sub + burst


def riser(c):
    d = c.get("dur", 1.5)
    t = t_axis(d)
    f = 120 * (2400 / 120) ** (t / d)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
    hiss = norm(hp(noise(d), 1500)) * 0.5
    return (tone + hiss) * (t / d) ** 2


def chime(c):
    t = t_axis(2.0)
    base = c.get("hz", 880.0)
    out = np.zeros_like(t)
    for k, (ratio, dec) in enumerate([(1, 1.4), (1.5, 1.0), (2, 0.8), (3.01, 0.5), (4.2, 0.3)]):
        out += np.sin(2 * np.pi * base * ratio * t + k) * np.exp(-t / dec) / (k + 1)
    return out * (1 - np.exp(-t / 0.002)) * 0.6


def hum(c):
    d = c.get("dur", 2.0)
    t = t_axis(d)
    x = sum(np.sin(2 * np.pi * h * t) / (i + 1) for i, h in enumerate((55, 110, 165)))
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 5.5 * t)
    fade = np.minimum(1, np.minimum(t / 0.08, (d - t) / 0.12))
    return x * trem * fade * 0.5


def click(c):
    t = t_axis(0.03)
    return hp(noise(0.03), 1800) * np.exp(-t / 0.003) * 1.2


RECIPES = {k: v for k, v in globals().items() if k in
           "kick hat bass whoosh swish tick bounce impact riser chime hum click".split()}
DEFAULT_GAIN = {"kick": 0.9, "hat": 0.35, "bass": 0.55, "whoosh": 0.55, "swish": 0.4, "tick": 0.25,
                "bounce": 0.6, "impact": 1.0, "riser": 0.5, "chime": 0.45, "hum": 0.35, "click": 0.5}
# risers end ON their frame: they are scheduled backwards from the hit
ENDS_ON_CUE = {"riser"}


def main(cues_path, out_path):
    spec = json.load(open(cues_path))
    fps, n = spec["fps"], spec["durationInFrames"]
    total = int(n / fps * SR) + SR
    mix = np.zeros((2, total))

    def place(x, frame, gain, pan=0.0, ends=False):
        start = int(round(frame / fps * SR)) - (len(x) if ends else 0)
        if start < 0:
            x, start = x[-start:], 0
        end = min(total, start + len(x))
        x = x[: end - start] * gain
        mix[0, start:end] += x * np.sqrt(0.5 * (1 - pan))
        mix[1, start:end] += x * np.sqrt(0.5 * (1 + pan))

    # groove: kick on the beat, hat on the off-beat, plucked bass per beat
    m = spec.get("music")
    if m:
        beat = fps * 60 / m.get("bpm", 120)
        notes = m.get("bass", [45, 45, 48, 43])  # MIDI notes, one per beat, cycled
        ranges = m.get("ranges") or [[m.get("from", 0), m.get("to", n)]]
        k = 0
        beats = []
        for a, b in ranges:
            f = a
            while f < b - 1e-6:
                beats.append(f)
                f += beat
        for f in beats:
            place(kick({}), f, DEFAULT_GAIN["kick"] * m.get("kickGain", 0.8))
            place(hat({}), f + beat / 2, DEFAULT_GAIN["hat"] * m.get("hatGain", 0.8), pan=0.25 if k % 2 else -0.25)
            hz = 440 * 2 ** ((notes[k % len(notes)] - 69) / 12)
            place(bass({"hz": hz}), f, DEFAULT_GAIN["bass"] * m.get("bassGain", 0.8))
            k += 1

    for c in spec["cues"]:
        typ = c["type"]
        if typ not in RECIPES:
            print(f"unknown cue type {typ!r}, skipped", file=sys.stderr)
            continue
        x = RECIPES[typ](c)
        place(x, c["f"], c.get("gain", 1.0) * DEFAULT_GAIN[typ], c.get("pan", 0.0), typ in ENDS_ON_CUE)

    # master: soft clip, normalise to -1 dBFS, 0.5 s fade-out, trim to video length
    mix = mix[:, : int(n / fps * SR)]
    mix = np.tanh(mix * 1.3)
    mix = mix / (np.max(np.abs(mix)) or 1) * 10 ** (-1 / 20)
    fade = int(0.5 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade)
    wavfile.write(out_path, SR, (mix.T * 32767).astype(np.int16))
    print(f"audio → {out_path} ({mix.shape[1] / SR:.2f}s, {len(spec['cues'])} cues)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
