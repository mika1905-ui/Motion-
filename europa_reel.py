"""Café Europa Bielefeld – 15 s Instagram reel (1080x1920, 30 fps, 128 BPM).

    python3 europa_reel.py                 # -> out/cafe_europa_reel.mp4
    python3 europa_reel.py --preview 1 3 9 # single PNG frames for checks

Own footage: drop .mp4/.mov files into clips/ (filmed in the club, or clips you have
the rights to). They are used, in name order, as the background of the scenes
(darkened + colour-graded); the graphics stay on top. Without clips/ the whole
reel is generated: club lights, lasers, haze and a jumping crowd.
"""
import argparse, glob, math, os, subprocess, wave
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
BPM = 128
BEAT = 60 / BPM
DUR = 32 * BEAT                       # 15.0 s
OUT = "out/cafe_europa_reel.mp4"
FONT = "/usr/share/fonts/opentype/inter/"

NAME = "CAFÉ EUROPA"
CITY = "BIELEFELD"
ADDRESS = ("Jahnplatz 4", "33602 Bielefeld")
HANDLE = "@cafe_europa_bi"

# scenes in beats: (start, end, kind, extra)
DAYS = [("MITTWOCH", (40, 170, 255)), ("FREITAG", (255, 40, 170)), ("SAMSTAG", (255, 190, 50))]
SCENES = [(0, 6, "intro"), (6, 10, "day0"), (10, 14, "day1"), (14, 18, "day2"),
          (18, 24, "crowd"), (24, 32, "end")]


def font(name, size):
    return ImageFont.truetype(FONT + name, size)


def clamp(x):
    return min(max(x, 0.0), 1.0)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def back_out(x, s=1.9):
    x = clamp(x) - 1
    return 1 + x * x * ((s + 1) * x + s)


def pulse(t, decay=7.0):
    """1 on every beat, decaying until the next one."""
    return math.exp(-decay * ((t % BEAT)))


def scene_at(t):
    b = t / BEAT
    for s, e, k in SCENES:
        if s <= b < e:
            return k, (t - s * BEAT), (e - s) * BEAT
    return SCENES[-1][2], t - SCENES[-1][0] * BEAT, (SCENES[-1][1] - SCENES[-1][0]) * BEAT


# ----------------------------------------------------------------- background
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
RNG = np.random.default_rng(7)
HAZE = cv2.GaussianBlur(RNG.random((H // 8, W // 8)).astype(np.float32), (0, 0), 6)
HAZE = cv2.resize((HAZE - HAZE.min()) / (HAZE.max() - HAZE.min()), (W * 2, H), interpolation=cv2.INTER_CUBIC)


def beams(t, cols, amp):
    """Moving-head light beams from the ceiling, additive float image."""
    img = np.zeros((H, W, 3), np.float32)
    n = 6
    for i in range(n):
        ox = (i + 0.5) / n * W
        ang = math.sin(t * (0.9 + 0.17 * i) + i * 1.7) * 0.55
        dx, dy = math.sin(ang), math.cos(ang)
        # distance of each pixel to the beam axis
        rx, ry = XX - ox, YY + 40
        along = rx * dx + ry * dy
        perp = np.abs(rx * dy - ry * dx)
        width = 18 + along * 0.11
        m = np.clip(1 - perp / np.maximum(width, 1), 0, 1) ** 2 * np.exp(-along / 2600) * (along > 0)
        c = np.array(cols[i % len(cols)], np.float32) / 255
        img += m[..., None] * c * amp
    return img


def lasers(t, col, amp):
    img = np.zeros((H, W), np.uint8)
    d = ImageDraw.Draw(Image.fromarray(img))
    pil = Image.fromarray(img)
    d = ImageDraw.Draw(pil)
    cx, cy = W / 2, 330
    for i in range(14):
        a = math.pi / 2 + (i - 6.5) * 0.12 + math.sin(t * 2.1) * 0.35
        d.line([(cx, cy), (cx + math.cos(a) * 2600, cy + math.sin(a) * 2600)], fill=255, width=3)
    m = np.asarray(pil).astype(np.float32) / 255
    glow = cv2.GaussianBlur(m, (0, 0), 9) * 2.2
    m = np.clip(m + glow, 0, 1.6)
    return m[..., None] * (np.array(col, np.float32) / 255) * amp


# crowd: rows of people, back to front
PEOPLE = []
for row in range(3):
    n = 9 + row * 2
    for i in range(n):
        PEOPLE.append(dict(row=row, x=(i + RNG.uniform(-0.35, 0.35)) / (n - 1) * (W + 160) - 80,
                           s=0.75 + row * 0.32 + RNG.uniform(-0.06, 0.06),
                           ph=RNG.uniform(0, 1), arms=RNG.integers(0, 3), jump=RNG.uniform(0.5, 1.0)))
PEOPLE.sort(key=lambda p: p["row"])


def crowd(t, rim, base_y, alpha=1.0):
    """Silhouette crowd jumping on the beat; returns (mask, rimlight) float images."""
    pil = Image.new("L", (W, H), 0)
    rim_pil = Image.new("L", (W, H), 0)
    d, dr = ImageDraw.Draw(pil), ImageDraw.Draw(rim_pil)
    for p in PEOPLE:
        s = p["s"]
        ph = (t / BEAT + p["ph"] * 0.3) % 1
        hop = math.sin(math.pi * ph) ** 2 * 38 * s * p["jump"]
        x = p["x"] + math.sin(t * 1.3 + p["ph"] * 9) * 10
        y = base_y + p["row"] * 150 - hop
        hr = 44 * s
        shade = int(255 * (0.55 + 0.22 * p["row"]))
        # body
        d.rounded_rectangle([x - 70 * s, y + hr * 1.6, x + 70 * s, H + 40], radius=int(50 * s), fill=shade)
        d.ellipse([x - hr, y - hr, x + hr, y + hr], fill=shade)
        d.rectangle([x - 18 * s, y + hr * 0.7, x + 18 * s, y + hr * 1.9], fill=shade)
        # arms
        wave_a = math.sin((t / BEAT + p["ph"]) * math.pi) * 0.35
        sh_y = y + hr * 2.1
        for side in (-1, 1):
            up = p["arms"] == 2 or (p["arms"] == 1 and side == 1)
            sx = x + side * 62 * s
            if up:
                a = -math.pi / 2 + side * (0.35 + wave_a)
                ex, ey = sx + math.cos(a) * 120 * s, sh_y + math.sin(a) * 120 * s
                hx, hy = ex + math.cos(a - side * 0.25) * 115 * s, ey + math.sin(a - side * 0.25) * 115 * s
                d.line([(sx, sh_y), (ex, ey), (hx, hy)], fill=shade, width=int(30 * s), joint="curve")
                d.ellipse([hx - 17 * s, hy - 17 * s, hx + 17 * s, hy + 17 * s], fill=shade)
        # rim light along the top of the head
        if p["row"] < 2:
            dr.arc([x - hr, y - hr, x + hr, y + hr], 215, 325, fill=int(255 * (1 - 0.4 * p["row"])), width=max(2, int(4 * s)))
    m = np.asarray(pil).astype(np.float32) / 255 * alpha
    r = cv2.GaussianBlur(np.asarray(rim_pil).astype(np.float32) / 255, (0, 0), 2.5) * alpha
    return m, r


PARTICLES = RNG.random((140, 4))


def sparkles(t, col, amp):
    pil = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(pil)
    for px, py, sp, sz in PARTICLES:
        x = (px * W + math.sin(t * 0.7 + py * 20) * 40) % W
        y = (py * H - t * (40 + 120 * sp)) % H
        r = 1.5 + sz * 4
        tw = 0.5 + 0.5 * math.sin(t * 9 + px * 50)
        d.ellipse([x - r, y - r, x + r, y + r], fill=int(255 * tw))
    m = cv2.GaussianBlur(np.asarray(pil).astype(np.float32) / 255, (0, 0), 1.8) * 2
    return m[..., None] * (np.array(col, np.float32) / 255) * amp


# ----------------------------------------------------------------- user clips
CLIPS = sorted(glob.glob("clips/*.mp4") + glob.glob("clips/*.mov") + glob.glob("clips/*.MOV"))


def clip_frame(idx, t_local):
    path = CLIPS[idx % len(CLIPS)]
    cap = cv2.VideoCapture(path)
    cap.set(cv2.CAP_PROP_POS_MSEC, t_local * 1000)
    ok, fr = cap.read()
    cap.release()
    if not ok:
        return None
    h, w = fr.shape[:2]
    sc = max(W / w, H / h) * (1.06 + 0.04 * t_local / 3)   # slow push-in
    fr = cv2.resize(fr, (int(w * sc) + 1, int(h * sc) + 1))
    y0, x0 = (fr.shape[0] - H) // 2, (fr.shape[1] - W) // 2
    return cv2.cvtColor(fr[y0:y0 + H, x0:x0 + W], cv2.COLOR_BGR2RGB).astype(np.float32) / 255


# ----------------------------------------------------------------- text
def text_layer(draws):
    """draws: list of (text, font, centre(x,y), fill RGBA, scale, glow colour or None)."""
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for txt, f, (cx, cy), fill, sc, gcol in draws:
        if sc <= 0.01 or fill[3] <= 0:
            continue
        bb = f.getbbox(txt)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        tile = Image.new("RGBA", (tw + 40, th + 40), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((20 - bb[0], 20 - bb[1]), txt, font=f, fill=fill)
        if sc != 1:
            tile = tile.resize((max(1, int(tile.width * sc)), max(1, int(tile.height * sc))), Image.LANCZOS)
        pos = (int(cx - tile.width / 2), int(cy - tile.height / 2))
        base.alpha_composite(tile, dest=pos) if 0 <= pos[0] and 0 <= pos[1] else base.paste(tile, pos, tile)
        if gcol:
            g = Image.new("RGBA", tile.size, gcol + (0,))
            g.putalpha(tile.getchannel("A"))
            glow.paste(g, pos, g)
    return base, glow.filter(ImageFilter.GaussianBlur(26))


def over(img, rgba):
    a = np.asarray(rgba).astype(np.float32) / 255
    return img * (1 - a[..., 3:]) + a[..., :3] * a[..., 3:]


def add_glow(img, rgba, k=1.6):
    a = np.asarray(rgba).astype(np.float32) / 255
    return img + a[..., :3] * a[..., 3:] * k


F_HUGE = font("InterDisplay-Black.otf", 190)
F_DAY = font("InterDisplay-Black.otf", 200)
F_BIG = font("InterDisplay-Black.otf", 120)
F_MED = font("InterDisplay-Bold.otf", 64)
F_SM = font("Inter-SemiBold.otf", 46)
F_TAG = font("InterDisplay-ExtraBold.otf", 54)


def wrap_name(sc, a, gcol, y=860):
    return [("CAFÉ", F_HUGE, (W / 2, y - 105), (255, 255, 255, a), sc, gcol),
            ("EUROPA", F_HUGE, (W / 2, y + 105), (255, 255, 255, a), sc, gcol)]


# ----------------------------------------------------------------- frame
def frame(t):
    kind, tl, sd = scene_at(t)
    beat_p = pulse(t)
    img = np.zeros((H, W, 3), np.float32)

    if kind.startswith("day"):
        di = int(kind[3])
        col = DAYS[di][1]
    elif kind == "intro":
        col = (150, 80, 255)
    elif kind == "crowd":
        col = (255, 60, 140)
    else:
        col = (255, 190, 50)
    colf = np.array(col, np.float32) / 255

    # background: user clip or generated club
    scene_idx = [s[2] for s in SCENES].index(kind)
    bg = clip_frame(scene_idx, tl) if CLIPS and kind != "end" else None
    if bg is not None:
        g = bg.mean(axis=2, keepdims=True)
        img = (bg * 0.55 + g * colf * 0.45) * (0.55 + 0.25 * beat_p)
    else:
        img += (0.03 + 0.05 * colf) * np.ones_like(img)
        cols = [col, (255, 255, 255), DAYS[(scene_idx + 1) % 3][1]]
        img += beams(t, cols, 0.33 + 0.25 * beat_p)
        if kind in ("day0", "day1", "day2", "crowd"):
            img += lasers(t, col, 0.55 * (0.4 + 0.6 * beat_p))
        hz = HAZE[:, int((t * 40) % W): int((t * 40) % W) + W]
        img += hz[..., None] * colf * 0.12
        img += sparkles(t, (255, 240, 220), 0.6)
        if kind in ("crowd", "end", "intro") or kind.startswith("day"):
            base_y = {"crowd": 1180, "end": 1500, "intro": 1460}.get(kind, 1380)
            m, r = crowd(t, col, base_y)
            img = img * (1 - m[..., None]) + m[..., None] * (0.015 + colf * 0.02)
            img += r[..., None] * (colf * 0.8 + 0.4)

    # soft dark plate behind the headline area for legibility
    if kind != "end":
        cy = {"crowd": 560}.get(kind, 880)
        plate = np.exp(-(((XX - W / 2) / 620) ** 2 + ((YY - cy) / 300) ** 2))
        img *= (1 - 0.6 * plate)[..., None]

    # strobe hit on the first beats of every scene
    if kind != "end" and tl < BEAT * 0.5:
        img += (1 - tl / (BEAT * 0.5)) ** 2 * 0.5

    # vignette
    v = 1 - 0.55 * (((XX - W / 2) / (W * 0.75)) ** 2 + ((YY - H / 2) / (H * 0.7)) ** 2)
    img *= np.clip(v, 0.25, 1)[..., None]

    # ---------- typography
    draws = []
    gcol = tuple(int(c) for c in col)
    if kind == "intro":
        k = back_out(tl / 0.45)
        draws += wrap_name(1.35 - 0.35 * k + 0.03 * beat_p, int(255 * clamp(tl / 0.15)), gcol)
        a = int(255 * clamp((tl - 0.9) / 0.3))
        draws.append(("— " + CITY + " —", F_MED, (W / 2, 1120 + 30 * (1 - ease_out((tl - 0.9) / 0.4))),
                      (255, 255, 255, a), 1, None))
        a2 = int(255 * clamp((tl - 1.6) / 0.25))
        draws.append(("HIER WIRD GEFEIERT", F_TAG, (W / 2, 330), (*gcol, a2), 1, gcol))
    elif kind.startswith("day"):
        di = int(kind[3])
        day, _ = DAYS[di]
        k = back_out(tl / 0.35)
        out_k = clamp((tl - sd + 0.18) / 0.18)
        sc = (0.55 + 0.45 * k + 0.05 * beat_p) * (1 + 0.6 * out_k)
        a = int(255 * (1 - out_k))
        draws.append(("JEDEN", F_MED, (W / 2, 690), (255, 255, 255, a), 1, None))
        draws.append((day, F_DAY, (W / 2, 860),
                      (255, 255, 255, a), sc * (0.8 if len(day) > 7 else 0.92), gcol))
        sub = ["WEEKEND WARM-UP", "WEEKEND START", "BIG NIGHT"][di]
        draws.append((sub, F_TAG, (W / 2, 1030), (*gcol, int(a * clamp((tl - 0.3) / 0.2))), 1, gcol))
        # day counter chips
        for j, (dn, dc) in enumerate(DAYS):
            on = j <= di
            draws.append((dn[:2], F_TAG, (W / 2 + (j - 1) * 170, 330),
                          (*(dc if on else (90, 90, 90)), 255 if on else 120), 1.0 + (0.15 * beat_p if j == di else 0),
                          dc if j == di else None))
    elif kind == "crowd":
        a = int(255 * clamp(tl / 0.2))
        draws.append(("PARTY", F_HUGE, (W / 2, 470 - 20 * beat_p), (255, 255, 255, a), 1 + 0.04 * beat_p, gcol))
        draws.append(("BIS IN DEN MORGEN", F_TAG, (W / 2, 640), (*gcol, int(255 * clamp((tl - 0.5) / 0.2))), 1, gcol))
        draws.append(("Dein Spot am Jahnplatz", F_SM, (W / 2, 730),
                      (255, 255, 255, int(220 * clamp((tl - 1.2) / 0.3))), 1, None))
    else:  # end card
        k = ease_out(tl / 0.5)
        draws += wrap_name(0.8, int(255 * k), (255, 190, 50), y=520 - 40 * (1 - k))
        a2 = int(255 * clamp((tl - 0.4) / 0.3))
        draws.append(("MI · FR · SA", F_BIG, (W / 2, 900), (255, 190, 50, a2), 1 + 0.03 * beat_p, (255, 190, 50)))
        a3 = int(255 * clamp((tl - 0.9) / 0.3))
        draws.append((ADDRESS[0], F_MED, (W / 2, 1060), (255, 255, 255, a3), 1, None))
        draws.append((ADDRESS[1], F_SM, (W / 2, 1140), (220, 220, 220, a3), 1, None))
        a4 = int(255 * clamp((tl - 1.5) / 0.3))
        draws.append((HANDLE, F_TAG, (W / 2, 1290), (255, 255, 255, a4), 1, (255, 60, 140)))
        draws.append(("Sehen wir uns?", F_SM, (W / 2, 1370), (255, 190, 50, a4), 1, None))

    base, glow = text_layer(draws)
    img = add_glow(img, glow, 1.4)
    if kind == "end":
        # location pin drawn as a shape
        a3 = clamp((tl - 0.9) / 0.3)
        pin = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pin)
        bb = F_MED.getbbox(ADDRESS[0])
        px, py = W / 2 - (bb[2] - bb[0]) / 2 - 50, 1062
        c = (255, 60, 140, int(255 * a3))
        pd.ellipse([px - 20, py - 34, px + 20, py + 6], fill=c)
        pd.polygon([(px - 17, py - 6), (px + 17, py - 6), (px, py + 26)], fill=c)
        pd.ellipse([px - 8, py - 22, px + 8, py - 6], fill=(0, 0, 0, int(255 * a3)))
        img = over(img, pin)
    img = over(img, base)

    # chromatic shift on beat + grain
    sh = int(6 * beat_p)
    if sh:
        img[..., 0] = np.roll(img[..., 0], sh, axis=1)
        img[..., 2] = np.roll(img[..., 2], -sh, axis=1)
    grain = np.random.default_rng(int(t * 1000)).normal(0, 0.025, (H // 2, W // 2)).astype(np.float32)
    img += cv2.resize(grain, (W, H))[..., None]

    # fade in/out
    img *= clamp(t / 0.15) * clamp((DUR - t) / 0.35)
    img = img / (1 + np.maximum(img - 0.85, 0) * 0.8)        # soft highlight roll-off
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


# ----------------------------------------------------------------- audio
SR = 44100


def synth_audio(path):
    n = int(DUR * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(1)
    tt = np.arange(n) / SR

    def put(sig, start):
        i = int(start * SR)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[: j - i]

    # kick
    kl = int(0.35 * SR)
    kt = np.arange(kl) / SR
    kick = np.sin(2 * np.pi * (45 * kt + 120 * (1 - np.exp(-kt * 30)) / 30)) * np.exp(-kt * 9)
    kick += np.sin(2 * np.pi * 2200 * kt) * np.exp(-kt * 300) * 0.3
    # hat / clap
    hl = int(0.08 * SR)
    hat = rng.normal(0, 1, hl) * np.exp(-np.arange(hl) / SR * 60)
    hat = np.diff(hat, prepend=0) * 0.25
    cl = int(0.25 * SR)
    clap = rng.normal(0, 1, cl) * np.exp(-np.arange(cl) / SR * 18) * 0.35
    # chords (Am - F - C - G), stabs on the offbeats
    prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    sl = int(0.22 * SR)
    st = np.arange(sl) / SR

    def stab(notes):
        s = sum(np.sign(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * st)) * 0.5
                + np.sin(2 * np.pi * 440 * 2 ** ((m - 57) / 12) * st) for m in notes)
        return s * np.exp(-st * 11) * 0.09

    def bass(m):
        f = 440 * 2 ** ((m - 69) / 12)
        bl = int(BEAT * 0.45 * SR)
        bt = np.arange(bl) / SR
        return (np.sin(2 * np.pi * f * bt) + 0.3 * np.sin(4 * np.pi * f * bt)) * np.minimum(1, (bl - np.arange(bl)) / 500) * 0.38

    for b in range(32):
        bt0 = b * BEAT
        drop = b >= 6
        chord = prog[(b // 4) % 4]
        if drop or b % 2 == 0:
            put(kick * (1.0 if drop else 0.6), bt0)
        put(hat * (1 if drop else 0.5), bt0 + BEAT / 2)
        if drop and b % 2 == 1:
            put(clap, bt0)
        if drop:
            put(bass(chord[0] - 24), bt0 + BEAT / 2)
            put(stab(chord), bt0 + BEAT / 2)
            if b % 2:
                put(hat * 0.4, bt0 + BEAT / 4)
                put(hat * 0.4, bt0 + 3 * BEAT / 4)
        else:
            put(stab(chord) * 0.6, bt0 + BEAT / 2)
    # riser into the drop + impact
    rs, re = 3.5 * BEAT, 6 * BEAT
    m = (tt >= rs) & (tt < re)
    p = (tt[m] - rs) / (re - rs)
    out[m] += rng.normal(0, 1, m.sum()).astype(np.float32) * p ** 2 * 0.25
    out[m] += np.sin(2 * np.pi * (200 + 1400 * p ** 2) * tt[m]) * p ** 2 * 0.08
    imp = int(1.2 * SR)
    it = np.arange(imp) / SR
    put(np.sin(2 * np.pi * 38 * it) * np.exp(-it * 3) * 0.6 + rng.normal(0, 1, imp) * np.exp(-it * 6) * 0.15, 6 * BEAT)
    # intro low-pass feel: soften first 6 beats
    k = int(6 * BEAT * SR)
    out[:k] = np.convolve(out[:k], np.ones(12) / 12, mode="same")
    # end: fade out
    out[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))
    out = np.tanh(out * 1.4) * 0.85
    st = np.stack([out, np.roll(out, 90)], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def render_chunk(args):
    i0, i1 = args
    return [frame(i / FPS).tobytes() for i in range(i0, i1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", nargs="*", type=float)
    a = ap.parse_args()
    os.makedirs("out", exist_ok=True)
    if a.preview:
        for t in a.preview:
            Image.fromarray(frame(t)).save(f"out/preview_{t:.2f}.png")
            print("out/preview_%.2f.png" % t)
        return
    wav = "out/cafe_europa_audio.wav"
    synth_audio(wav)
    nf = int(round(DUR * FPS))
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
                             "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
                             "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT],
                            stdin=subprocess.PIPE)
    chunks = [(i, min(nf, i + 15)) for i in range(0, nf, 15)]
    with Pool() as pool:
        for k, fr in enumerate(pool.imap(render_chunk, chunks)):
            for f in fr:
                proc.stdin.write(f)
            print(f"\r{min(nf, (k + 1) * 15)}/{nf}", end="", flush=True)
    proc.stdin.close()
    proc.wait()
    print("\n->", OUT)


if __name__ == "__main__":
    main()
