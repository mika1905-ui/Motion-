"""Synthetischer Soundtrack (nur numpy) – synchron zu den Schnitten des Gesamtvideos.
Ausgabe: out/soundtrack.wav (48 kHz, Stereo)."""
import numpy as np, wave, os, sys

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 30.4
FOLD = 10.4                     # ab hier startet der Fold-Teil
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N); SEND = np.zeros(N)

def t_arr(n): return np.arange(n) / SR
def fft_filter(x, lo=0, hi=SR / 2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi < SR / 2: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def add(sig, at, gain=1.0, pan=0.0, send=0.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]
    if i < 0 or not len(sig): return
    l, r = gain * np.sqrt((1 - pan) / 2), gain * np.sqrt((1 + pan) / 2)
    L[i:i + len(sig)] += sig * l; R[i:i + len(sig)] += sig * r; SEND[i:i + len(sig)] += sig * send * gain

# --- Bausteine ---
def kick(dur=.45, f0=160, f1=42):
    t = t_arr(int(dur * SR)); f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + .3 * np.sin(ph) * np.exp(-t * 60)
def noise(dur): return rng.standard_normal(int(dur * SR))
def impact(big=1.0):
    d = 2.6; t = t_arr(int(d * SR))
    boom = np.sin(2 * np.pi * 38 * t + 3 * np.exp(-t * 6)) * np.exp(-t * 1.6)
    crack = fft_filter(noise(d), 60, 1800) * np.exp(-t * 4.5) * .35
    return (kick(d, 220, 38) * .9 + boom * .8 * big + crack * big)
def whoosh(dur=1.0, peak=.7):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    env = np.where(t < peak, (t / peak) ** 2.5, ((1 - t) / (1 - peak)) ** 1.5)
    x = noise(dur); half = n // 2
    lo = fft_filter(x, 200, 1500); hi = fft_filter(x, 1500, 9000)
    mix = lo * (1 - t) + hi * t * .8          # „Sweep“ von dunkel nach hell
    return mix * env * .8
def riser(dur=1.5, f0=180, f1=1400):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** t; ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * .25 + fft_filter(noise(dur), 2000, 12000) * .35) * t ** 2.2
def hat(dur=.05):
    t = t_arr(int(dur * SR)); return fft_filter(noise(dur), 7000) * np.exp(-t * 90)
def clap():
    d = .35; t = t_arr(int(d * SR)); x = fft_filter(noise(d), 900, 5000)
    env = np.exp(-t * 18) + .6 * np.exp(-np.maximum(t - .012, 0) * 30) * (t > .012)
    return x * env * .7
def ping(freq, dur=1.2):
    t = t_arr(int(dur * SR))
    return (np.sin(2 * np.pi * freq * t) + .3 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t * 4)
def saw(freq, dur, detune=0.0):
    t = t_arr(int(dur * SR)); out = 0
    for d in (-detune, 0, detune):
        out = out + 2 * ((t * freq * (1 + d)) % 1) - 1
    return out / 3

# --- 1. Pad / Drone (durchgehend, öffnet sich im Fold-Teil) ---
chord = [55, 82.41, 110, 130.81, 164.81, 196]          # A-Moll add9 Farbe
pad = sum(saw(f, DUR, .004) for f in chord)
pad_dark = fft_filter(pad, 30, 500); pad_open = fft_filter(pad, 30, 2600)
tt = t_arr(N)
open_amt = np.clip((tt - FOLD + .2) / 3, 0, 1) * (tt < FOLD + 16.5)
env = np.clip(tt / 2.5, 0, 1) * np.clip((DUR - tt) / 1.2, 0, 1)
padsig = (pad_dark * (1 - open_amt) + pad_open * open_amt) * env * .16
add(padsig, 0, pan=-.15, send=.4); add(np.roll(padsig, 900), 0, .9, pan=.15)
sub = np.sin(2 * np.pi * 55 * tt) * np.clip(tt / 9, 0, 1) * (tt < FOLD) * .12
add(sub, 0)

# --- 2. Teaser-Teil (Spot) ---
add(riser(1.9, 120, 900), 0.1, .5, send=.5)
add(impact(.8), 2.0, .9, send=.35)
for i, f in enumerate([880, 1318.5, 1760]): add(ping(f), 2.05 + i * .12, .07, pan=(-.5 + i * .5), send=.8)
add(whoosh(1.0, .8), 4.25, .9, pan=-.3)
add(impact(.6), 5.05, .75, send=.35)
for b in np.arange(5.05, 7.6, .5): add(kick(.3, 120, 45), b, .35)
add(whoosh(.8, .75), 7.0, .8, pan=.3)
add(impact(.5), 7.6, .6, send=.3)
for b in np.arange(7.6, 10.2, .25): add(hat(), b, .18, pan=.4)
add(riser(1.6, 200, 2000), 8.8, .7, send=.4)

# --- 3. DROP: Fold-Teil mit Beat (120 BPM) ---
add(impact(1.3), FOLD, 1.15, send=.5)
beat_end = FOLD + 16.55
for k, b in enumerate(np.arange(FOLD, beat_end, .5)):
    if FOLD + 2.2 < b < FOLD + 2.7: continue                     # kurze Pause vor dem Aufklappen
    add(kick(), b, .8)
    add(hat(), b + .25, .25, pan=.35)
    if k % 2 == 1: add(clap(), b, .45, pan=-.1, send=.3)
for b in np.arange(FOLD + 7.6, beat_end, .125): add(hat(.03), b, .08, pan=-.4)

add(riser(1.0, 300, 1800), FOLD + 1.7, .6, send=.4)
add(whoosh(1.6, .45), FOLD + 2.5, 1.0, send=.3)                   # Aufklappen
add(impact(.7), FOLD + 2.7, .6, send=.3)
for i, f in enumerate([1046.5, 1318.5, 1568, 2093, 2637]):        # Boot-Sparkle
    add(ping(f, 1.4), FOLD + 4.5 + i * .09, .06, pan=np.sin(i), send=.9)
add(whoosh(.7, .6), FOLD + 5.2, .5, pan=.4)                       # Widget-Flip
for at in (7.6, 9.8, 12.0):                                       # Feature-Hits
    add(whoosh(.5, .85), FOLD + at - .45, .7, pan=-.2)
    add(impact(.55), FOLD + at, .7, send=.4)
    add(ping(1760, .8), FOLD + at + .02, .05, send=.9)
add(whoosh(2.3, .5), FOLD + 14.25, .9, send=.3)                   # 360°-Spin
for i, at in enumerate((14.6, 15.2, 15.8, 16.3)): add(ping([1318.5, 1568, 1760, 2093][i], .9), FOLD + at, .06, send=.8)
add(riser(.9, 400, 2400), FOLD + 15.65, .5)
add(impact(1.4), FOLD + 16.55, 1.15, send=.6)                     # Endcard
for i, f in enumerate([440, 659.25, 880, 1318.5]): add(ping(f, 2.5), FOLD + 16.6 + i * .06, .06, send=1)

# --- Reverb (exponentielles Rausch-IR) + Master ---
ir_t = t_arr(int(2.2 * SR)); ir = fft_filter(rng.standard_normal(len(ir_t)), 200, 7000) * np.exp(-ir_t * 2.6)
ir /= np.sqrt(np.sum(ir ** 2))
def conv(x):
    n = len(x) + len(ir); return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
wet = conv(SEND) * .35
L += wet; R += np.roll(wet, 700)
fade = np.clip((DUR - tt) / .8, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / .95
os.makedirs('out', exist_ok=True)
with wave.open('out/soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('out/soundtrack.wav', DUR, 's')
