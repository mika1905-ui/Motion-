"""Synthesized soundtrack for the Pacha ad: Spanish house at 124 BPM.

Intro (beats 0-12): nylon-string guitar (Karplus-Strong) picking the Andalusian
cadence Am-G-F-E, flamenco palmas, a pad and a riser. Beat 12: the house beat drops
(four-on-the-floor kick, claps, off-beat hats and bass, sidechained guitar stabs).
Ends on a ringing Am strum.

    python3 pacha_music.py   # -> out/pacha_music.wav
"""
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt
import wave

SR = 44100
BPM = 124
BEAT = 60 / BPM
DROP = 12

CHORDS = {  # guitar voicings, MIDI notes low -> high
    "Am": [45, 52, 57, 60, 64],
    "G":  [43, 50, 55, 59, 62, 67],
    "F":  [41, 48, 53, 57, 60, 65],
    "E":  [40, 47, 52, 56, 59, 64],
}
BASS_ROOT = {"Am": 33, "G": 31, "F": 29, "E": 28}
# chord per beat range (start beat, chord)
PROG = [(0, "Am"), (4, "G"), (8, "F"), (10, "E"),
        (12, "Am"), (16, "G"), (20, "F"), (24, "E"), (28, "Am")]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_at(b):
    c = PROG[0][1]
    for s, name in PROG:
        if b >= s:
            c = name
    return c


def sos(kind, f, order=2):
    if kind == "band":
        return butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    return butter(order, f / (SR / 2), btype=kind, output="sos")


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR * 3
        self.bus = {k: np.zeros(self.n, np.float32) for k in
                    ["kick", "drums", "bass", "gtr", "pad", "fx"]}

    def add(self, bus, t, sig, gain=1.0):
        i = int(t * SR)
        if i >= self.n:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: self.n - i]
        self.bus[bus][i:i + len(sig)] += sig.astype(np.float32) * gain


# ---------------------------------------------------------------- instruments
rng = np.random.default_rng(1973)


def pluck(freq, dur=1.6, bright=0.5, decay=0.996):
    """Karplus-Strong string, processed one delay-line period at a time."""
    N = max(2, int(round(SR / freq)))
    total = int(dur * SR)
    y = np.zeros(total + N + 1, np.float32)
    exc = rng.uniform(-1, 1, N).astype(np.float32)
    # soften the excitation (nylon / fingertip)
    a = 1 - bright
    for i in range(1, N):
        exc[i] = (1 - a) * exc[i] + a * exc[i - 1]
    exc -= exc.mean()
    y[1:N + 1] = exc
    pos = N + 1
    while pos < len(y):
        end = min(pos + N, len(y))
        k = end - pos
        y[pos:end] = decay * 0.5 * (y[pos - N:pos - N + k] + y[pos - N - 1:pos - N - 1 + k])
        pos = end
    out = y[1:total + 1]
    env = np.minimum(1, np.arange(total) / (0.002 * SR))
    fade = np.ones(total, np.float32)
    fade[-int(0.05 * SR):] = np.linspace(1, 0, int(0.05 * SR))
    return out * env * fade


def strum(mix, t, chord, gain=0.5, down=True, spread=0.014, dur=1.4, bright=0.55):
    notes = CHORDS[chord] if down else CHORDS[chord][::-1]
    for i, m in enumerate(notes):
        mix.add("gtr", t + i * spread, pluck(hz(m), dur, bright), gain * (0.8 + 0.2 * rng.random()))


def rasgueado(mix, t, chord, gain=0.45):
    """Flamenco rolled strum: four fast finger flicks into an accent."""
    for k, dt in enumerate([0, 0.045, 0.09, 0.135]):
        strum(mix, t + dt, chord, gain * (0.45 + 0.15 * k), down=True, spread=0.006, dur=0.5, bright=0.7)
    strum(mix, t + 0.19, chord, gain * 1.1, spread=0.009, dur=1.6, bright=0.65)


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.normal(0, 1, n) * np.exp(-t * 400) * 0.25
    return np.tanh((body + click) * 1.6)


def clap(bright=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    env = np.zeros(n)
    for d in [0, 0.011, 0.022]:
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) * 120)
    env += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) * 18) * 0.6
    return sosfilt(sos("band", (900, 2600 * bright)), noise * env) * 1.6


def palma():
    """Flamenco hand clap: drier and brighter than the house clap."""
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return sosfilt(sos("band", (1400, 5500)), rng.normal(0, 1, n) * np.exp(-t * 70)) * 1.3


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    s = sosfilt(sos("high", 7500), rng.normal(0, 1, n))
    return s * np.exp(-t * (14 if open_ else 90))


def bass_note(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    saw = 2 * ((t * f) % 1) - 1
    sub = np.sin(2 * np.pi * f * t)
    s = sosfilt(sos("low", 420), saw) * 0.6 + sub * 0.8
    env = np.minimum(1, t / 0.004) * np.exp(-t * 5)
    return np.tanh(s * env * 1.4)


def pad(chord, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in CHORDS[chord][1:5]:
        for det in (-0.12, 0.12):
            f = hz(m + 12) * 2 ** (det / 12)
            s += 2 * ((t * f + rng.random()) % 1) - 1
    s = sosfilt(sos("low", 1500), s)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.4)
    return s * env * 0.05


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.normal(0, 1, n)
    out = np.zeros(n)
    steps = 40
    for i in range(steps):
        a, b = i * n // steps, (i + 1) * n // steps
        fc = 400 * (12000 / 400) ** (i / steps)
        out[a:b] = sosfilt(sos("band", (fc * 0.7, min(fc * 1.4, 20000))), x[max(0, a - 2000):b])[-(b - a):]
    return out * (t / dur) ** 2 * 0.6


def reverb_ir(sec=2.2, damp=3.2):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = rng.normal(0, 1, (2, n)) * np.exp(-t * damp)
    ir = np.stack([sosfilt(sos("low", 6000), c) for c in ir])
    ir[:, : int(0.012 * SR)] = 0
    return ir / np.abs(ir).sum(1, keepdims=True) * 25


# ---------------------------------------------------------------- arrangement
def arrange(dur):
    mix = Mix(dur)
    B = BEAT
    total_beats = int(dur / B) + 1

    # --- intro guitar: rasgueado on each chord, fingerpicked arpeggio in between
    for s, c in PROG:
        if s >= DROP:
            break
        rasgueado(mix, max(s * B - 0.19, 0.0), c, 0.42)
    arp = [0, 2, 3, 4, 3, 2, 4, 3]  # string indices per 8th
    for e in range(2, DROP * 2):
        b = e / 2
        c = chord_at(b)
        if b in [s for s, _ in PROG]:
            continue
        notes = CHORDS[c]
        m = notes[arp[e % 8] % len(notes)]
        mix.add("gtr", b * B, pluck(hz(m), 1.2, 0.45), 0.42)
    # little phrygian lead over the E chord: F -> E (the flamenco half-step)
    for b, m in [(10.5, 65), (11.0, 64), (11.25, 65), (11.5, 68), (11.75, 69)]:
        mix.add("gtr", b * B, pluck(hz(m + 12), 0.8, 0.6), 0.38)

    # palmas from bar 2, syncopated (beats 2, 3.5, 4 of each bar)
    for b in range(4, DROP):
        for off in ([0.0, 0.5] if b % 4 in (1, 3) else [0.0]):
            if b % 4 != 0:
                mix.add("drums", (b + off) * B, palma(), 0.35)
    mix.add("pad", 0, np.concatenate([pad("Am", 4 * B), pad("G", 4 * B), pad("F", 2 * B), pad("E", 2 * B)]), 1.0)
    mix.add("fx", 7 * B, riser(5 * B), 0.9)
    # snare roll into the drop
    for k in range(16):
        b = 10 + k / 8
        mix.add("drums", b * B, clap(0.8), 0.12 + 0.35 * k / 16)

    # --- drop: house groove
    last = total_beats - 1
    for b in range(DROP, last):
        mix.add("kick", b * B, kick(), 0.95)
        if b % 2 == 1:
            mix.add("drums", b * B, clap(), 0.55)
        mix.add("drums", (b + 0.5) * B, hat(True), 0.22)
        for q in (0.25, 0.75):
            mix.add("drums", (b + q) * B, hat(), 0.09)
        c = chord_at(b)
        mix.add("bass", (b + 0.5) * B, bass_note(BASS_ROOT[c], B * 0.45), 0.55)
        # guitar stabs: syncopated house pattern (and-of-1, 2-and, and-of-3)
        if b % 4 in (0, 2):
            strum(mix, (b + 0.5) * B, c, 0.3, down=(b % 4 == 0), spread=0.007, dur=0.45, bright=0.7)
        if b % 4 == 1:
            strum(mix, (b + 0.75) * B, c, 0.26, down=False, spread=0.007, dur=0.4, bright=0.7)
    # drop impact: big strum + crash
    rasgueado(mix, DROP * B - 0.19, "Am", 0.5)
    n = int(2.5 * SR); t = np.arange(n) / SR
    crash = sosfilt(sos("high", 3500), rng.normal(0, 1, n)) * np.exp(-t * 1.6)
    mix.add("fx", DROP * B, crash, 0.22)
    # lead riff after the drop, call & response with the stabs
    lead = [(13.0, 76), (13.5, 77), (14.0, 76), (15.0, 74), (15.5, 72), (17.0, 71), (17.5, 72), (18.0, 74),
            (21.0, 77), (21.5, 76), (22.0, 74), (23.0, 72), (25.0, 77), (25.5, 80), (26.0, 81)]
    for b, m in lead:
        mix.add("gtr", b * B, pluck(hz(m), 0.9, 0.6), 0.3)
    # outro: final Am rasgueado on the end card
    rasgueado(mix, 28 * B - 0.19, "Am", 0.5)
    mix.add("fx", 28 * B, crash, 0.18)
    return mix


def render_music(path, dur=15.0):
    mix = arrange(dur)
    n = mix.n
    t = np.arange(n) / SR
    B = BEAT
    # sidechain ducking from the kick (only after the drop)
    beat_pos = (t / B) % 1
    duck = np.where(t >= DROP * B - 0.01, 1 - 0.55 * np.exp(-beat_pos * 9), 1.0).astype(np.float32)
    # the intro has no drums, so lift it so it doesn't sound tiny next to the drop
    intro = np.clip((DROP * B - t) / 0.3, 0, 1).astype(np.float32)
    lift = 1 + 1.4 * intro
    mix.bus["pad"] *= lift
    mix.bus["drums"] *= 1 + 0.8 * intro
    gtr = mix.bus["gtr"] * lift
    gtr = sosfilt(sos("high", 90), gtr)
    ir = reverb_ir()
    wet = np.stack([fftconvolve(gtr + mix.bus["pad"] * 0.5 + mix.bus["drums"] * 0.15, ir[c])[:n] for c in range(2)])
    pan_l = np.array([1.0, 0.85])[:, None]
    dry = (mix.bus["kick"] + mix.bus["bass"] * duck)[None, :] * np.ones((2, 1))
    dry = dry + (gtr * duck)[None, :] * pan_l + (mix.bus["pad"] * duck)[None, :] + mix.bus["drums"][None, :] \
        + mix.bus["fx"][None, :]
    out = dry + wet * 0.22 * duck[None, :]
    out = out[:, : int(dur * SR)]
    # fade the last 0.4 s, gentle glue + limit
    fl = int(0.4 * SR)
    out[:, -fl:] *= np.linspace(1, 0, fl) ** 1.5
    out = np.tanh(out * 1.1 / max(1e-6, np.percentile(np.abs(out), 99.9)) * 0.85)
    out /= np.abs(out).max() / 0.95
    pcm = (out.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


if __name__ == "__main__":
    import os
    os.makedirs("out", exist_ok=True)
    print(render_music("out/pacha_music.wav"))
