"""Beat for the FLUXE TikTok spot (128 BPM, F minor).
Hook: muffled lo-fi loop + vinyl crackle → tape-stop → riser + snare roll → DROP on the transformation.
Then 4-on-the-floor with sidechained bass, supersaw stabs, hats, whooshes on cuts, impact on the end card."""
import numpy as np, wave, sys
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
BPM = 128
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def note(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)
def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + ph) % 1.0) - 1


def build(dur, drop, cuts, end_t, out_path):
    N = int((dur + 2) * SR)
    L = np.zeros(N); R = np.zeros(N)
    side = np.ones(N)                    # sidechain envelope (ducks bass/stabs on kicks)

    def add(sig, t, g=1.0, pan=0.0, dst=None):
        i = int(t * SR)
        if i >= N or i + len(sig) <= 0: return
        if i < 0: sig = sig[-i:]; i = 0
        sig = sig[:N - i]
        if sig.ndim == 2:
            L[i:i + len(sig)] += sig[:, 0] * g; R[i:i + len(sig)] += sig[:, 1] * g
        else:
            L[i:i + len(sig)] += sig * g * np.sqrt(1 - pan) ; R[i:i + len(sig)] += sig * g * np.sqrt(1 + pan)

    prog = [[41, 48, 53, 56, 60], [37, 44, 49, 53, 56], [44, 51, 56, 60, 63], [39, 46, 51, 55, 58]]  # Fm Db Ab Eb

    # ── HOOK: muffled lo-fi electric piano loop + crackle, then tape-stop
    hook_end = drop - 2 * BEAT
    n = int(hook_end * SR)
    t = np.arange(n) / SR
    lo = np.zeros(n)
    for k, ch in enumerate([[53, 56, 60, 63], [49, 53, 56, 60]]):
        a = int(k * BEAT * 2 * SR)
        for m in ch:
            f = note(m)
            seg = np.sin(2 * np.pi * f * t[: n - a]) * np.exp(-t[: n - a] * 2.2) + 0.3 * np.sin(4 * np.pi * f * t[: n - a]) * np.exp(-t[: n - a] * 5)
            lo[a:] += seg * 0.18
    # wobbling (old tape) + band-limit like a cheap speaker
    wob = 1 + 0.004 * np.sin(2 * np.pi * 0.9 * t)
    idx = np.clip(np.cumsum(wob) - 1, 0, n - 1).astype(int)
    lo = lo[idx]
    # tape-stop over the last 0.35 s
    ts = int(0.35 * SR)
    sp = np.ones(n); sp[-ts:] = np.linspace(1, 0.05, ts) ** 1.5
    pos = np.clip(np.cumsum(sp), 0, n - 1).astype(int)
    lo = lo[pos] * np.r_[np.ones(n - ts), np.linspace(1, 0, ts)]
    lo = bp(lo, 300, 2600)
    crackle = np.zeros(n)
    hits = rng.integers(0, n, int(hook_end * 60))
    crackle[hits] = rng.uniform(-1, 1, len(hits))
    crackle = hp(crackle, 1500) * 0.5 + bp(rng.standard_normal(n), 800, 4000) * 0.01
    add(lo * 0.9 + crackle, 0, 0.8)

    # ── RISER + snare roll into the drop
    rs = hook_end
    n = int((drop - rs) * SR); t = np.arange(n) / SR; x = t / (drop - rs)
    noise = rng.standard_normal(n); r = np.zeros(n)
    for a in range(0, n, 1200):
        fc = 500 + 7000 * x[a] ** 2
        r[a:a + 1200] = bp(noise[a:a + 1200], fc * 0.6, min(fc * 1.5, 20000))
    add(r * x ** 1.6, rs, 0.35)
    k = 0; tt = rs
    while tt < drop - 0.01:
        step = BEAT / (2 if tt < rs + BEAT else 4)
        sn = int(0.12 * SR); st = np.arange(sn) / SR
        snare = (bp(rng.standard_normal(sn), 1200, 7000) * np.exp(-st * 30) + np.sin(2 * np.pi * 190 * st) * np.exp(-st * 40) * 0.5)
        add(snare, tt, 0.16 + 0.3 * (tt - rs) / (drop - rs), pan=0.2 * (-1) ** k)
        tt += step; k += 1

    # ── DROP: drums
    t = drop; b = 0
    while t < end_t + 4 * BEAT:
        kn = int(0.5 * SR); kt = np.arange(kn) / SR
        f = 48 + 110 * np.exp(-kt * 32)
        kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-kt * 6.5)
        kick += bp(rng.standard_normal(kn), 2000, 7000) * np.exp(-kt * 250) * 0.25
        if t < end_t:
            add(kick, t, 0.95)
            i = int(t * SR); m = int(0.22 * SR)
            if i + m < N: side[i:i + m] = np.minimum(side[i:i + m], 1 - 0.85 * np.exp(-np.arange(m) / SR * 14))
        if b % 2 == 1 and t < end_t:     # clap on 2 & 4
            cn = int(0.25 * SR); ct = np.arange(cn) / SR
            clap = sum(np.roll(bp(rng.standard_normal(cn), 900, 5000) * np.exp(-ct * 22), int(d * SR)) for d in (0, 0.009, 0.019))
            add(clap, t, 0.33, pan=0.05)
        if t < end_t:                    # offbeat open hat + 16th closed hats
            hn = int(0.12 * SR); ht = np.arange(hn) / SR
            add(hp(rng.standard_normal(hn), 7000) * np.exp(-ht * 25), t + BEAT / 2, 0.13, pan=0.25)
            for q in (0.25, 0.75):
                cn = int(0.04 * SR); add(hp(rng.standard_normal(cn), 9000) * np.exp(-np.arange(cn) / SR * 90), t + BEAT * q, 0.06, pan=-0.3)
        t += BEAT; b += 1

    # ── DROP: sidechained bass + supersaw stabs following the progression
    bar = 4 * BEAT
    t0 = drop; c = 0
    music_L = np.zeros(N); music_R = np.zeros(N)
    while t0 < end_t:
        ch = prog[c % 4]
        n = int(bar * SR); tt = np.arange(n) / SR
        root = note(ch[0] - 12)
        bass = lp(saw(root, n) + 0.6 * np.sin(2 * np.pi * root * tt), 380) * 0.55
        stab = np.zeros(n)
        for st in (0, 0.75, 1.5, 2.5, 3.0, 3.5):        # syncopated stab rhythm (in beats)
            a = int(st * BEAT * SR); ln = int(0.22 * SR)
            if a + ln > n: continue
            e = np.exp(-np.arange(ln) / SR * 9)
            s = sum(saw(note(m) * 2 ** (d / 1200), ln, rng.random()) for m in ch[1:] for d in (-12, 0, 12))
            stab[a:a + ln] += lp(s, 3200) * e * 0.06
        i = int(t0 * SR); j = min(N, i + n)
        music_L[i:j] += (bass + stab)[: j - i]; music_R[i:j] += (bass + stab * 0.9)[: j - i]
        t0 += bar; c += 1
    L += music_L * side; R += music_R * side

    # ── whoosh on cuts
    for cu in cuts:
        n = int(0.42 * SR); tt = np.arange(n) / SR
        w = rng.standard_normal(n); o = np.zeros(n)
        for a in range(0, n, 1000):
            fc = 500 + 4500 * np.sin(np.pi * a / n)
            o[a:a + 1000] = bp(w[a:a + 1000], fc * 0.6, fc * 1.5)
        add(o * np.sin(np.pi * tt / 0.42) ** 2, cu - 0.24, 0.16, pan=rng.uniform(-0.6, 0.6))

    # ── impact on the end card (+ sub drop + bright chord tail)
    n = int(3.5 * SR); tt = np.arange(n) / SR
    f = 30 + 100 * np.exp(-tt * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    crash = hp(rng.standard_normal(n), 3000) * np.exp(-tt * 2.6) * 0.25
    chord = sum(saw(note(m + 12) * 2 ** (d / 1200), n, rng.random()) for m in prog[2][1:] for d in (-10, 0, 10))
    chord = lp(chord, 2500) * np.exp(-tt * 0.9) * 0.035
    add(boom * 0.9 + crash + chord, end_t, 0.9)

    # ── space + master
    ir_n = int(1.6 * SR); it = np.arange(ir_n) / SR
    irL = rng.standard_normal(ir_n) * np.exp(-it * 4); irR = rng.standard_normal(ir_n) * np.exp(-it * 4)
    irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
    L = L + fftconvolve(L, irL)[:N] * 0.18; R = R + fftconvolve(R, irR)[:N] * 0.18
    n_out = int(dur * SR)
    out = np.stack([L[:n_out], R[:n_out]], 1)
    fo = int(0.5 * SR); out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    out = np.tanh(out * 1.6); out /= np.abs(out).max() + 1e-9; out *= 0.92
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


if __name__ == '__main__':
    import json
    cfg = json.loads(sys.argv[1])
    build(cfg['dur'], cfg['drop'], cfg['cuts'], cfg['end'], cfg['out'])
