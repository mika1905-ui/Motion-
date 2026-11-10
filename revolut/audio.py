"""Synthesized sound design for the 13 s spot (120 BPM) -> spot_audio.wav"""
import numpy as np, wave
SR = 48000; DUR = 13.0; N = int(SR * DUR)
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    Rr[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

def lp(x, cutoff):
    a = np.exp(-2 * np.pi * np.asarray(cutoff) / SR) * np.ones(len(x)); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y

def env(n, att, dec):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / dec)

def kick(big=False):
    n = int(SR * (0.9 if big else 0.45)); t = np.arange(n) / SR
    f = 42 + (180 if big else 140) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / (0.35 if big else 0.17))
    s += 0.4 * rng.standard_normal(n) * np.exp(-t * 300)
    return np.tanh(s * 2.2)

def hat(open_=False):
    n = int(SR * (0.25 if open_ else 0.06)); x = rng.standard_normal(n)
    x = x - lp(x, 7000); return x * env(n, 0.001, 0.08 if open_ else 0.015)

def clap():
    n = int(SR * 0.3); x = rng.standard_normal(n); x = lp(x, 3500) - lp(x, 900)
    e = env(n, 0.001, 0.09)
    for d in (0.008, 0.017): e[int(d * SR):] += 0.6 * env(n - int(d * SR), 0.001, 0.02)
    return x * e * 2.5

def whoosh(dur, up=True):
    n = int(SR * dur); x = rng.standard_normal(n); k = np.linspace(0, 1, n)
    cut = 300 + 7000 * (k if up else 1 - k) ** 2
    return lp(x, cut) * np.sin(np.pi * k) ** 1.5

def blip(freq, dur=0.18):
    n = int(SR * dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)) * env(n, 0.002, 0.06)

def impact(dur=2.5):
    n = int(SR * dur); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 4)) / SR) * np.exp(-t / 0.9)
    noise = lp(rng.standard_normal(n), 2500 * np.exp(-t * 2) + 200) * np.exp(-t / 0.6)
    crash = (rng.standard_normal(n) - lp(rng.standard_normal(n), 5000)) * np.exp(-t / 0.8) * 0.4
    return np.tanh(1.6 * sub) + 0.9 * noise + crash

def glitch(dur):
    n = int(SR * dur); x = np.sign(np.sin(2 * np.pi * np.cumsum(rng.choice([180, 400, 900, 1600], n // 600 + 1).repeat(600)[:n]) / SR))
    gate = (rng.random(n // 480 + 1) > 0.45).repeat(480)[:n]
    return x * gate * 0.25

# intro: glitch stutter + reverse riser into the 0.5 s hit
add(glitch(0.48), 0.0, 0.5)
add(whoosh(0.5, True), 0.0, 0.9)
add(impact(1.6), 0.5, 0.9)
# card spin whooshes
add(whoosh(0.5, True), 0.95, 0.8, -0.4); add(whoosh(0.4, False), 1.5, 0.5, 0.4); add(whoosh(0.35, True), 1.98, 0.7)
# groove 0.5-8.5 and 10.5-13
for b in np.arange(0.5, 8.5, 0.5): add(kick(), b, 0.95)
for b in np.arange(10.5, 13.0, 0.5): add(kick(b == 10.5), b, 1.0)
for b in np.arange(0.75, 8.5, 0.5): add(hat(), b, 0.35, 0.3)
for b in np.arange(2.5, 8.5, 0.25): add(hat(), b, 0.18, -0.3)
for b in np.arange(3.0, 8.5, 1.0): add(clap(), b, 0.55)
for b in np.arange(10.75, 13.0, 0.5): add(hat(True), b, 0.3)
for b in np.arange(11.0, 13.0, 1.0): add(clap(), b, 0.5)
# bass line (saw, filtered) on 8ths, E minor-ish
notes = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.7]
def bass(f, dur=0.24):
    n = int(SR * dur); t = np.arange(n) / SR; saw = 2 * ((f * t) % 1) - 1
    return lp(saw, 500 + 1500 * np.exp(-t * 18)) * env(n, 0.003, 0.15)
for k, b in enumerate(np.arange(2.5, 8.5, 0.25)): add(bass(notes[k % 8]), b, 0.6)
for k, b in enumerate(np.arange(10.5, 12.8, 0.25)): add(bass(notes[k % 8]), b, 0.65)
# UI blips for each feature (pentatonic)
pent = [659, 784, 880, 988, 1175, 1319, 1175, 988, 880, 1319, 1568, 1760]
for k in range(12):
    add(blip(pent[k]), 2.5 + k * 0.5 + 0.06, 0.25, (-1) ** k * 0.5)
    add(whoosh(0.18, False), 2.5 + k * 0.5, 0.35, (-1) ** k * -0.5)
# tunnel build 8.5-10.5: riser + accelerating snare roll, gap before the drop
n = int(SR * 1.85); t = np.arange(n) / SR
riser = np.sin(2 * np.pi * np.cumsum(120 + 900 * (t / 1.85) ** 2) / SR) * (t / 1.85) ** 1.5 * 0.35
riser += lp(rng.standard_normal(n), 400 + 9000 * (t / 1.85) ** 2) * (t / 1.85) ** 2 * 0.9
add(riser, 8.5, 0.8)
tt = 8.5; step = 0.25
while tt < 10.3:
    add(clap(), tt, 0.25 + 0.4 * (tt - 8.5) / 1.8); tt += step; step = max(0.0625, step * 0.86)
for k in range(12): add(blip(1200 + k * 120, 0.08), 9.62 + k * 0.03, 0.15)
add(whoosh(0.4, True), 10.1, 1.0)
# THE DROP
add(impact(2.6), 10.5, 1.15)
add(blip(1760, 0.5), 11.25, 0.2); add(blip(2637, 0.6), 11.3, 0.12)   # shine sparkle
add(whoosh(0.3, True), 11.15, 0.4)

mix = np.stack([L, Rr], 1)
fade = np.ones(N); fade[-int(0.25 * SR):] = np.linspace(1, 0, int(0.25 * SR)); mix *= fade[:, None]
mix = np.tanh(mix * 0.9) * 0.92
with wave.open('spot_audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('peak', float(np.abs(mix).max()))
