"""Procedural cinematic score for the studio spots: pad, sub pulses on the beat,
whooshes on every cut, a riser into the first cut and an impact on the end card."""
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import wave

SR = 48000

def note(n):  # MIDI -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

KEYS = {  # chord progressions (MIDI notes), one chord per bar
    'blue':  [[38, 45, 50, 53, 57], [34, 41, 46, 50, 53], [36, 43, 48, 52, 55], [33, 40, 45, 48, 52]],   # Dm Bb C Am
    'red':   [[33, 40, 45, 48, 52], [29, 36, 41, 45, 48], [31, 38, 43, 47, 50], [28, 35, 40, 44, 47]],   # Am F G E
    'light': [[40, 47, 52, 56, 59], [37, 44, 49, 52, 56], [33, 40, 45, 49, 52], [35, 42, 47, 51, 54]],   # E C#m A B
}

def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)

def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)

def env_ar(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)

def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + ph) % 1.0) - 1

def make(name, spot, path):
    rng = np.random.default_rng(11)
    dur = spot['dur']; N = int(dur * SR) + SR
    L = np.zeros(N); R = np.zeros(N)
    beat = 60 / spot['bpm']; bar = beat * 4
    light = spot['theme'] == 'light'
    prog = KEYS[spot['key']]
    end_t = spot['end']['start']
    cuts = [s[1] for s in spot['shots']][1:] + [end_t]
    first_cut = cuts[0]

    def add(sig, t, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= N: return
        sig = sig[:N - i]
        L[i:i + len(sig)] += sig * gain * (1 - pan) ** 0.5
        R[i:i + len(sig)] += sig * gain * (1 + pan) ** 0.5

    # ── pad: detuned saws through a slowly opening low-pass
    nbar = int(np.ceil(dur / bar)) + 1
    for b in range(nbar):
        chord = prog[b % len(prog)]
        n = int((bar + 1.5) * SR)
        sig_l = np.zeros(n); sig_r = np.zeros(n)
        for k, m in enumerate(chord):
            f = note(m + (12 if light else 0))
            for det, side in ((-0.09, 0), (0.0, 1), (0.08, 2)):
                s = saw(f * 2 ** (det / 12), n, rng.random())
                if side != 2: sig_l += s
                if side != 0: sig_r += s
        e = np.minimum(1, np.arange(n) / (0.6 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.2 * SR))
        cutoff = 900 if light else 650
        sig_l = lp(sig_l, cutoff) * e; sig_r = lp(sig_r, cutoff) * e
        t0 = b * bar
        g = 0.030 * (0.6 + 0.4 * min(1, t0 / max(first_cut, 0.1)))
        i = int(t0 * SR); j = min(N, i + n)
        if i >= N: continue
        L[i:j] += sig_l[:j - i] * g; R[i:j] += sig_r[:j - i] * g

    # ── sub pulse on every beat from the first cut to the end card
    t = first_cut
    k = 0
    while t < end_t - 0.05:
        n = int(0.45 * SR); tt = np.arange(n) / SR
        f = 45 + 75 * np.exp(-tt * 28)
        kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (7 if not light else 10))
        click = bp(rng.standard_normal(n), 2500, 6000) * np.exp(-tt * 180) * 0.15
        add(kick + click, t, 0.55 if k % 4 == 0 else 0.42)
        # offbeat ticks in the second half
        if t > (first_cut + end_t) / 2:
            hn = int(0.06 * SR)
            hat = bp(rng.standard_normal(hn), 6000, 14000) * np.exp(-np.arange(hn) / SR * 70)
            add(hat, t + beat / 2, 0.10, pan=0.3 if k % 2 else -0.3)
        t += beat; k += 1

    # ── riser into the first cut
    n = int(first_cut * SR)
    tt = np.arange(n) / SR; x = tt / max(first_cut, 0.1)
    noise = rng.standard_normal(n)
    riser = np.zeros(n)
    for a in range(0, n, 2400):
        seg = noise[a:a + 2400]
        fc = 300 + 5000 * x[a] ** 2
        riser[a:a + 2400] = bp(seg, fc * 0.7, min(fc * 1.4, 20000))
    tone = np.sin(2 * np.pi * np.cumsum(80 + 400 * x ** 3) / SR)
    add((riser * 0.5 + tone * 0.25) * x ** 2.2, 0, 0.35)

    # ── whoosh on every cut
    for c in cuts[:-1]:
        n = int(0.5 * SR); tt = np.arange(n) / SR
        w = rng.standard_normal(n)
        out = np.zeros(n)
        for a in range(0, n, 1200):
            fc = 400 + 3500 * np.sin(np.pi * a / n)
            out[a:a + 1200] = bp(w[a:a + 1200], fc * 0.6, fc * 1.5)
        e = np.sin(np.pi * tt / 0.5) ** 2
        add(out * e, c - 0.32, 0.22, pan=rng.uniform(-0.5, 0.5))

    # ── impact on the end card
    n = int(3.0 * SR); tt = np.arange(n) / SR
    f = 32 + 90 * np.exp(-tt * 14)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
    crash = lp(rng.standard_normal(n), 7000) * np.exp(-tt * 3.5) * 0.35
    chime = sum(np.sin(2 * np.pi * note(m + 24) * tt) for m in prog[0][1:4]) * np.exp(-tt * 1.6) * 0.06
    add(boom * 0.9 + crash + chime, end_t, 0.8)

    # ── reverb
    ir_n = int(2.2 * SR); it = np.arange(ir_n) / SR
    irL = rng.standard_normal(ir_n) * np.exp(-it * 3.2); irR = rng.standard_normal(ir_n) * np.exp(-it * 3.2)
    irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
    wetL = fftconvolve(L, irL)[:N]; wetR = fftconvolve(R, irR)[:N]
    L = L + wetL * 0.35; R = R + wetR * 0.35

    # ── master
    n_out = int(dur * SR)
    out = np.stack([L[:n_out], R[:n_out]], 1)
    fade = np.ones(n_out); fo = int(0.4 * SR); fade[-fo:] = np.linspace(1, 0, fo)
    out *= fade[:, None]
    out = np.tanh(out * 1.4)
    out /= np.abs(out).max() + 1e-9
    out *= 0.89
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
