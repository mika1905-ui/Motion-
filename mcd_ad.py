"""15 s vertical TikTok spot: all the McDonald's classics, one beat each.

    python3 mcd_products.py      # once: draws the products -> assets/mcd/*.png
    python3 mcd_ad.py            # -> out/mcdonalds_ad.mp4 (1080x1920, 30 fps, with sound)
    python3 mcd_ad.py --preview 0.4 1.3 2.5 12.9   # single PNG frames instead

Timeline (120 BPM, one beat = 0.5 s):
  0.0-2.0   red, the golden arches draw themselves, "EINMAL / ALLES, / BITTE."
  2.0-12.0  ten products, one second each, whip-wipes on every cut
  12.0-15.0 everything at once + logo + "ich liebe es" + app CTA
"""
import argparse, math, os, subprocess
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import distance_transform_edt, gaussian_filter
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

from mcd_products import render_logo

FPS = 30
DUR = 15.0
W, H = 1080, 1920
FONT = "/usr/share/fonts/opentype/inter/"
OUT = "out/mcdonalds_ad.mp4"
WAV = "out/mcdonalds_ad.wav"

RED = (218, 41, 28)
RED_RAY = (238, 64, 44)
RED_DARK = (130, 14, 8)
YEL = (255, 199, 44)
YEL_RAY = (255, 218, 96)
YEL_DARK = (196, 120, 0)
WHITE = (255, 255, 255)

T_PRODUCTS, T_OUTRO = 2.0, 12.0
SCENES = [
    ("big_mac",      ["BIG MAC"],                 "DIE LEGENDE"),
    ("royal_kaese",  ["HAMBURGER", "ROYAL KÄSE"], "DOPPELT KÄSE"),
    ("cheeseburger", ["CHEESEBURGER"],            "SIMPEL. PERFEKT."),
    ("mcchicken",    ["McCHICKEN"],               "KNUSPRIG. ZART."),
    ("filet_o_fish", ["FILET-O-FISH"],            "DER FISCH-FAVORIT"),
    ("nuggets",      ["CHICKEN", "McNUGGETS"],    "9ER ODER 20ER?"),
    ("fries",        ["POMMES FRITES"],           "GOLDEN. SALZIG."),
    ("mcflurry",     ["McFLURRY"],                "KALT. CREMIG."),
    ("apfeltasche",  ["APFELTASCHE"],             "HEISS. SÜSS."),
    ("softdrink",    ["SOFTDRINKS"],              "EISKALT."),
]


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def clamp(x, a=0.0, b=1.0):
    return min(max(x, a), b)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_in(x):
    return clamp(x) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def spring(x, k=7.0, w=17.0):
    if x <= 0:
        return 0.0
    return 1 - math.exp(-k * x) * math.cos(w * x)


def font(size, name="InterDisplay-Black.otf"):
    return ImageFont.truetype(FONT + name, size)


def paste(frame, img, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    """alpha-composite img centred at (cx, cy), clipped to the frame."""
    if scale <= 0.01 or alpha <= 0.01:
        return
    if abs(scale - 1) > 1e-3:
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.BILINEAR)
    if abs(rot) > 0.05:
        img = img.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1:
        img = img.copy()
        img.putalpha(img.getchannel("A").point(lambda v: int(v * alpha)))
    x0, y0 = round(cx - img.width / 2), round(cy - img.height / 2)
    sx0, sy0 = max(0, -x0), max(0, -y0)
    dx0, dy0 = max(0, x0), max(0, y0)
    w = min(img.width - sx0, frame.width - dx0)
    h = min(img.height - sy0, frame.height - dy0)
    if w <= 0 or h <= 0:
        return
    frame.alpha_composite(img, (dx0, dy0), (sx0, sy0, sx0 + w, sy0 + h))


@lru_cache(None)
def text_img(text, size, fill, shadow=None, fname="InterDisplay-Black.otf", sh=None):
    f = font(size, fname)
    l, t, r, b = f.getbbox(text)
    pad = 20 + (abs(sh) if sh else 0)
    im = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shadow:
        off = sh or max(4, size // 18)
        d.text((pad - l + off * 0.6, pad - t + off), text, font=f, fill=shadow)
    d.text((pad - l, pad - t), text, font=f, fill=fill)
    return im


@lru_cache(None)
def pill_img(text, size, bg, fg, padx=46, pady=26):
    f = font(size)
    l, t, r, b = f.getbbox(text)
    w, h = r - l + 2 * padx, b - t + 2 * pady
    ss = 3
    im = Image.new("RGBA", ((w + 24) * ss, (h + 30) * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([12 * ss, 20 * ss, (12 + w) * ss, (20 + h) * ss], radius=h * ss // 2, fill=(0, 0, 0, 70))
    d.rounded_rectangle([12 * ss, 12 * ss, (12 + w) * ss, (12 + h) * ss], radius=h * ss // 2, fill=bg)
    im = im.resize((w + 24, h + 30), Image.LANCZOS)
    ImageDraw.Draw(im).text((12 + padx - l, 12 + pady - t), text, font=f, fill=fg)
    return im


@lru_cache(None)
def sparkle_img(size=150):
    ss = 3
    n = size * ss
    im = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(im)
    c, r, k = n / 2, n / 2, n * 0.09
    d.polygon([(c, 0), (c + k, c - k), (n, c), (c + k, c + k), (c, n), (c - k, c + k), (0, c), (c - k, c - k)], fill=255)
    a = im.resize((size, size), Image.LANCZOS)
    glow = a.filter(ImageFilter.GaussianBlur(size * 0.08))
    a = Image.fromarray(np.maximum(np.asarray(a), (np.asarray(glow) * 0.8).astype(np.uint8)))
    out = Image.new("RGBA", (size, size), WHITE + (0,))
    out.putalpha(a)
    return out


# --------------------------------------------------------------------------
# static assets
# --------------------------------------------------------------------------
STICKERS = {}
LOGO = None


def make_sticker(path, border=14, pad=70):
    im = Image.open(path).convert("RGBA")
    bb = im.getchannel("A").getbbox()
    im = im.crop((bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad))
    a = np.asarray(im.getchannel("A"), np.float32) / 255.0
    dist = distance_transform_edt(a < 0.5)
    ring = np.clip((border + 1.5 - dist) / 2.0, 0, 1)
    ring = np.maximum(ring, a)
    shadow = np.roll(gaussian_filter(ring, 14), 24, 0) * 0.32
    rgb = np.asarray(im.convert("RGB"), np.float32) / 255.0
    # shadow (black) -> white outline -> product
    out_a = shadow * (1 - ring) + ring
    col = (1.0 * ring[..., None] * (1 - a[..., None]) + rgb * a[..., None])  # premult over white
    col = col  # shadow is black: contributes nothing to premultiplied colour
    out_rgb = np.where(out_a[..., None] > 1e-4, col / np.maximum(out_a[..., None], 1e-4), 0)
    arr = np.dstack([np.clip(out_rgb, 0, 1), np.clip(out_a, 0, 1)])
    return Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGBA")


def init_assets():
    global LOGO
    for key, *_ in SCENES:
        STICKERS[key] = make_sticker(f"assets/mcd/{key}.png")
    rgba, prog = render_logo(560)
    a = rgba[..., 3]
    glow = gaussian_filter(a, 28)
    LOGO = dict(rgba=rgba, prog=prog, glow=glow)


def logo_image(progress=1.0, glow=0.0):
    rgba, prog = LOGO["rgba"], LOGO["prog"]
    a = rgba[..., 3].copy()
    if progress < 1:
        a *= np.clip((progress - prog) * 40 + 1, 0, 1) * (prog > 0)
    rgb = rgba[..., :3]
    if glow > 0:
        g = LOGO["glow"] * glow * 0.9
        out_a = a + g * (1 - a)
        rgb = (rgb * a[..., None] + np.array([1.0, 0.85, 0.3]) * (g * (1 - a))[..., None]) / np.maximum(out_a, 1e-4)[..., None]
        a = out_a
    arr = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    return Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGBA")


@lru_cache(None)
def logo_small(w, glow=0.0):
    im = logo_image(1.0, glow)
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


# --------------------------------------------------------------------------
# backgrounds
# --------------------------------------------------------------------------
_Y, _X = np.mgrid[0:H, 0:W].astype(np.float32)
BCX, BCY = 540, 780
THETA = np.arctan2(_Y - BCY, _X - BCX)
RN = np.hypot(_X - BCX, _Y - BCY) / 1100.0


def background(main, ray, rot):
    v = np.sin(14 * THETA + rot)
    m = (np.clip(v * 5, -1, 1) * 0.5 + 0.5) * np.clip(RN * 3, 0, 1) * 0.75
    main, ray = np.array(main, np.float32), np.array(ray, np.float32)
    col = main + (ray - main) * m[..., None]
    col *= (1.12 - 0.32 * np.minimum(RN, 1.3))[..., None]
    return col


@lru_cache(None)
def marquee_strip(text, size=210):
    f = font(size)
    unit = f"{text}  •  "
    l, t, r, b = f.getbbox(unit)
    period = f.getlength(unit)
    n = int(math.ceil((1700 + period) / period)) + 1
    im = Image.new("L", (int(period * n) + 10, b - t + 20), 0)
    ImageDraw.Draw(im).text((0, 10 - t), unit * n, font=f, fill=255)
    return np.asarray(im), int(period)


def marquee(col, text, t, tint, alpha):
    strip, period = marquee_strip(text)
    cw, ch = 1700, 2700
    can = np.zeros((ch, cw), np.uint8)
    sh = strip.shape[0]
    gap = 300
    for r in range(ch // gap + 1):
        y = r * gap
        if y + sh > ch:
            break
        d = 1 if r % 2 else -1
        off = int((t * 260 * d + r * 377) % period)
        can[y:y + sh] = np.maximum(can[y:y + sh], strip[:, off:off + cw])
    im = Image.fromarray(can).rotate(-11, resample=Image.BILINEAR)
    x0, y0 = (cw - W) // 2, (ch - H) // 2
    m = np.asarray(im.crop((x0, y0, x0 + W, y0 + H)), np.float32) / 255.0 * alpha
    col += (np.array(tint, np.float32) - col) * m[..., None]
    return col


def to_frame(col):
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def sparkles(frame, cx, cy, u, spots, start=0.1, life=0.45):
    for i, (dx, dy, s) in enumerate(spots):
        p = (u - start - i * 0.04) / life
        if 0 < p < 1:
            k = math.sin(math.pi * p)
            paste(frame, sparkle_img(), cx + dx, cy + dy, scale=s * k, rot=p * 90)


def speed_lines(frame, u, seed, color=(255, 255, 255)):
    p = u / 0.25
    if not (0 <= p < 1):
        return
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    rng = np.random.default_rng(seed)
    for _ in range(26):
        a = rng.uniform(0, 2 * math.pi)
        r0 = rng.uniform(420, 600) + p * 500
        ln = rng.uniform(150, 400) * (1 - p)
        x0, y0 = BCX + math.cos(a) * r0, BCY + math.sin(a) * r0
        x1, y1 = BCX + math.cos(a) * (r0 + ln), BCY + math.sin(a) * (r0 + ln)
        d.line([(x0, y0), (x1, y1)], fill=color + (int(200 * (1 - p)),), width=int(rng.uniform(5, 12)))
    frame.alpha_composite(ov)


SPARK_SPOTS = [(-360, -300, 0.9), (330, -260, 0.6), (380, 180, 0.8), (-330, 240, 0.55), (60, -400, 0.5)]


# --------------------------------------------------------------------------
# scenes
# --------------------------------------------------------------------------
def render_intro(t):
    col = background(RED, RED_RAY, t * 0.6)
    frame = to_frame(col)
    p = ease_io((t - 0.03) / 0.47)
    punch = 0.0
    if t > 0.5:
        punch = 0.16 * math.exp(-(t - 0.5) * 7) * math.cos((t - 0.5) * 24)
    lift = ease_io((t - 0.6) / 0.25) * 170
    logo = logo_image(p, glow=clamp((t - 0.5) * 4) * 0.8)
    paste(frame, logo, 540, 860 - lift, scale=(1.0 + punch) * (1 - 0.18 * ease_io((t - 0.6) / 0.25)))
    if 0.5 < t < 0.9:  # shock ring
        q = (t - 0.5) / 0.4
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        r = 150 + 900 * ease_out(q)
        ImageDraw.Draw(ov).ellipse([540 - r, 830 - r, 540 + r, 830 + r], outline=(255, 230, 140, int(220 * (1 - q))),
                                   width=int(30 * (1 - q)) + 2)
        frame.alpha_composite(ov)
    words = [("EINMAL", 0.75, 1080, WHITE, 150), ("ALLES,", 1.0, 1240, YEL, 190), ("BITTE.", 1.25, 1400, WHITE, 150)]
    for i, (wd, t0, y, fill, size) in enumerate(words):
        s = spring(t - t0, k=8, w=20)
        if s > 0:
            im = text_img(wd, size, fill, RED_DARK)
            paste(frame, im, 540, y, scale=s, rot=(1 - s) * (12 if i % 2 else -12))
    sparkles(frame, 540, 760, t, SPARK_SPOTS, start=0.5, life=0.5)
    return frame


def render_product(i, u):
    key, name, tag = SCENES[i]
    red = i % 2 == 0
    main, ray = (RED, RED_RAY) if red else (YEL, YEL_RAY)
    t_abs = T_PRODUCTS + i + u
    col = background(main, ray, t_abs * (0.9 if red else -0.9))
    tint = (196, 26, 16) if red else (255, 214, 80)
    col = marquee(col, " ".join(name), t_abs, tint, 0.85 if red else 0.6)
    frame = to_frame(col)

    # top: small logo + counter
    paste(frame, logo_small(150), 540, 230)
    cnt = text_img(f"{i + 1:02d} / 10", 34, WHITE if red else RED, None, "InterDisplay-Bold.otf")
    paste(frame, cnt, 540, 320, alpha=0.85)

    speed_lines(frame, u, seed=i, color=WHITE if red else (255, 255, 255))

    # product
    s = spring(u, k=7.5, w=18)
    scale = (0.3 + 0.7 * s) * (1 + 0.05 * u) * 0.98
    rot = -18 * (1 - s) + 2.5 * math.sin(u * 4 + i)
    x = 540 + 380 * (1 - ease_out(u / 0.22))
    y = 800 + 12 * math.sin(u * 7)
    if u > 0.86:  # whip out to the left
        q = (u - 0.86) / 0.3
        x -= 1500 * q * q
        rot += 25 * q
    paste(frame, STICKERS[key], x, y, scale=scale, rot=rot)
    sparkles(frame, 540, 780, u, SPARK_SPOTS)

    # tag pill + name
    pill = pill_img(tag, 42, WHITE if red else RED, RED if red else WHITE)
    ps = spring(u - 0.08, k=8, w=20)
    paste(frame, pill, 540, 1215, scale=ps, rot=(1 - ps) * 8)
    fill, shadow = (YEL, RED_DARK) if red else (RED, YEL_DARK)
    size = 150 if len(name) == 1 else 118
    for j, line in enumerate(name):
        im = text_img(line, size, fill, shadow)
        mw = 960
        sc = min(1.0, mw / (im.width - 40))
        n = spring(u - 0.04 - j * 0.05, k=8, w=19)
        yy = 1340 + j * 125 + (1 - n) * 90 if len(name) > 1 else 1360 + (1 - n) * 90
        paste(frame, im, 540, yy, scale=sc * (0.6 + 0.4 * n), alpha=clamp(n * 1.6))
    return frame


OUTRO_GRID = [  # key, x, y, scale, back-to-front
    ("royal_kaese", 290, 600, 0.40), ("big_mac", 540, 570, 0.42), ("mcchicken", 790, 600, 0.40),
    ("fries", 170, 830, 0.36), ("nuggets", 410, 845, 0.33), ("mcflurry", 660, 835, 0.34), ("softdrink", 905, 825, 0.36),
    ("cheeseburger", 290, 1065, 0.40), ("filet_o_fish", 540, 1080, 0.40), ("apfeltasche", 790, 1070, 0.36),
]


def render_outro(t):
    v = t - T_OUTRO
    col = background(RED, RED_RAY, t * 0.5)
    col = marquee(col, "ICH LIEBE ES", t, (198, 28, 18), 0.8)
    frame = to_frame(col)
    order = [1, 0, 2, 3, 4, 5, 6, 7, 8, 9]
    for n, idx in enumerate(order):
        key, x, y, sc = OUTRO_GRID[idx]
        s = spring(v - 0.04 - n * 0.045, k=7, w=17)
        if s <= 0:
            continue
        bob = 8 * math.sin(v * 5 + idx)
        paste(frame, STICKERS[key], x, y + (1 - s) * 260 + bob, scale=sc * s, rot=(1 - s) * (15 if idx % 2 else -15))
    ls = spring(v - 0.0, k=6, w=16)
    paste(frame, logo_small(300, 0.7), 540, 290, scale=ls)
    ts = spring(v - 0.55, k=8, w=20)
    paste(frame, text_img("ich liebe es", 132, WHITE, RED_DARK, "InterDisplay-BlackItalic.otf"), 540, 1290,
          scale=ts, rot=(1 - ts) * -10)
    cs = spring(v - 0.95, k=8, w=20)
    if cs > 0:
        pulse = 1 + 0.035 * math.sin(max(0, v - 1.4) * 9) if v > 1.4 else 1
        paste(frame, pill_img("JETZT IN DER APP BESTELLEN", 46, YEL, RED, padx=54, pady=34), 540, 1440,
              scale=cs * pulse)
    sparkles(frame, 540, 820, v, [(-420, -560, 0.8), (420, -480, 0.7), (-460, 380, 0.6), (450, 330, 0.9),
                                  (0, -680, 0.5)], start=0.3, life=0.6)
    sparkles(frame, 540, 820, v, [(-380, 520, 0.6), (390, 560, 0.7), (-200, -650, 0.6)], start=1.3, life=0.6)
    return frame


def scene_at(t):
    if t < T_PRODUCTS:
        return render_intro(t)
    if t < T_OUTRO:
        i = int(t - T_PRODUCTS)
        return render_product(i, t - T_PRODUCTS - i)
    return render_outro(t)


def scene_old(t, tc):
    """The scene that was on screen before the cut at tc, continued past it."""
    if tc == T_PRODUCTS:
        return render_intro(t)
    i = int(round(tc - T_PRODUCTS)) - 1
    return render_product(i, t - T_PRODUCTS - i)


CUTS = [T_PRODUCTS + k for k in range(11)]  # 2.0 .. 12.0
WIPE = 0.16
TAN = math.tan(math.radians(16))


def render_frame(t):
    frame = np.asarray(scene_at(t).convert("RGB")).astype(np.float32)
    blur = 0
    for tc in CUTS:
        if tc <= t < tc + WIPE:
            p = ease_io((t - tc) / WIPE)
            old = np.asarray(scene_old(t, tc).convert("RGB")).astype(np.float32)
            x0 = W + 340 - p * (W + 680)
            edge = x0 + (_Y - H / 2) * TAN
            m = np.clip((_X - edge) / 3 + 0.5, 0, 1)[..., None]     # 1 -> new scene
            band = np.clip(1 - np.abs(_X - edge - 14) / 14, 0, 1)[..., None]
            frame = old * (1 - m) + frame * m
            frame = frame * (1 - band) + 255 * band
            blur = int(70 * math.sin(math.pi * clamp((t - tc) / WIPE)))
    # camera: beat pulse, impacts, intro push
    scale, sx, sy = 1.0, 0.0, 0.0
    if t >= T_PRODUCTS:
        tb = T_PRODUCTS + math.floor((t - T_PRODUCTS) / 0.5) * 0.5
        scale += 0.022 * math.exp(-(t - tb) / 0.09)
    for ti, amp in ((0.5, 16), (T_OUTRO, 22)):
        if ti <= t < ti + 0.4:
            k = amp * math.exp(-(t - ti) * 9)
            sx, sy = k * math.sin(t * 91), k * math.cos(t * 73)
    if 1.6 < t < T_PRODUCTS + WIPE:
        scale += 0.5 * ease_in((t - 1.6) / 0.56)
    if abs(scale - 1) > 1e-3 or sx or sy:
        M = np.float32([[scale, 0, (1 - scale) * W / 2 + sx], [0, scale, (1 - scale) * H / 2 + sy]])
        frame = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if blur > 2:
        frame = cv2.blur(frame, (blur, 1))
    if T_OUTRO <= t < T_OUTRO + 0.25:  # impact flash
        a = 0.55 * (1 - (t - T_OUTRO) / 0.25)
        frame = frame * (1 - a) + 255 * a
    return np.clip(frame, 0, 255).astype(np.uint8)


def _worker_init():
    init_assets()


def _render(n):
    return render_frame(n / FPS).tobytes()


# --------------------------------------------------------------------------
# sound: 120 BPM house-y jingle bed, synthesized
# --------------------------------------------------------------------------
SR = 44100


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def _t(d):
    return np.arange(int(d * SR)) / SR


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def lp(x, f, order=2):
    b, a = butter(order, f / (SR / 2))
    return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), "high")
    return lfilter(b, a, x)


RNG = np.random.default_rng(7)


def kick(gain=1.0):
    t = _t(0.4)
    f = 48 + 120 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    s += RNG.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return np.tanh(s * 1.6) * gain


def clap(gain=0.5):
    t = _t(0.3)
    env = np.exp(-t * 22)
    for d in (0.0, 0.011, 0.022):
        env = np.maximum(env, (t >= d) * np.exp(-(t - d) * 160))
    return bp(RNG.standard_normal(len(t)), 900, 3200) * env * gain * 2.2


def hat(gain=0.18, decay=70):
    t = _t(0.15)
    return hp(RNG.standard_normal(len(t)), 7000) * np.exp(-t * decay) * gain


def saw(f, d, maxh=7000):
    t = _t(d)
    k = max(1, int(maxh / f))
    s = np.zeros(len(t))
    ph = RNG.uniform(0, 6.28)
    for h in range(1, k + 1):
        s += np.sin(2 * np.pi * f * h * t + ph * h) / h
    return s * 0.55


def bass(n, d=0.22, gain=0.5):
    t = _t(d)
    s = lp(saw(midi(n), d, 2500), 520) + 0.6 * np.sin(2 * np.pi * midi(n) * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 6) * np.minimum(1, (d - t) / 0.02)
    return s * env * gain


def stab(notes, d=0.2, gain=0.22, cutoff=3200, decay=6):
    t = _t(d)
    s = np.zeros(len(t))
    for n in notes:
        for det in (-0.12, 0, 0.12):
            s += saw(midi(n + det), d, 6000)
    s = lp(s / (len(notes) * 3), cutoff)
    env = np.minimum(1, t / 0.005) * np.exp(-t * decay) * np.minimum(1, (d - t) / 0.03)
    return s * env * gain * 3


def pluck(n, gain=0.14):
    t = _t(0.3)
    s = lp(saw(midi(n), 0.3, 5000), 2600) + 0.4 * np.sin(2 * np.pi * midi(n) * t)
    return s * np.exp(-t * 14) * gain


def bell(n, gain=0.18):
    t = _t(0.6)
    f = midi(n)
    s = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return s * np.exp(-t * 5) * gain


def whoosh(d=0.32, gain=0.35):
    t = _t(d)
    n = RNG.standard_normal(len(t))
    env = np.sin(np.pi * t / d) ** 2
    lo = bp(n, 300, 1500) * (1 - t / d)
    hi = bp(n, 1500, 6000) * (t / d)
    return (lo + hi) * env * gain * 2


def pop(gain=0.35):
    t = _t(0.1)
    f = 260 + 900 * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * gain


def riser(d=1.0, gain=0.3):
    t = _t(d)
    n = hp(RNG.standard_normal(len(t)), 2000) * (t / d) ** 2
    f = 200 + 1000 * (t / d) ** 2
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * (t / d) ** 2
    return (n * 0.6 + s) * gain


def impact(gain=1.0, crash=1.5):
    t = _t(1.8)
    boom = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t * 10)) / SR) * np.exp(-t * 2.2)
    cr = hp(RNG.standard_normal(len(t)), 3500) * np.exp(-t * (1 / crash) * 2.4) * 0.35
    return (np.tanh(boom * 1.4) + cr) * gain


def make_audio(path):
    N = int(DUR * SR)
    drums, music, fx = np.zeros(N), np.zeros(N), np.zeros(N)

    def add(buf, s, t):
        i = int(t * SR)
        if i >= N:
            return
        n = min(len(s), N - i)
        buf[i:i + n] += s[:n]

    CH = {"C": [60, 64, 67], "G": [59, 62, 67], "Am": [57, 60, 64], "F": [57, 60, 65]}
    ROOT = {"C": 36, "G": 31, "Am": 33, "F": 29}
    prog = ["C", "G", "Am", "F", "C", "G"]  # 2 s each from 2.0 to 14.0

    # intro
    for k, n in enumerate([72, 76, 79, 84, 88]):
        add(music, bell(n), 0.04 + k * 0.09)
    add(fx, riser(0.5, 0.25), 0.0)
    add(drums, kick(0.9), 0.5)
    add(fx, impact(0.5, 0.8), 0.5)
    for k, tt in enumerate((0.75, 1.0, 1.25)):
        add(drums, clap(0.45), tt)
        add(music, stab([60 + 12, 64 + 12, 67 + 12] if k == 1 else CH["C"], 0.22, 0.25), tt)
        add(fx, pop(0.25), tt)
    add(fx, riser(1.0, 0.35), 1.0)
    for k in range(8):
        add(drums, clap(0.12 + k * 0.03), 1.5 + k * 0.0625)

    # drop 2..14
    for b in range(24):
        tb = 2.0 + b * 0.5
        if tb != T_OUTRO:
            add(drums, kick(1.0), tb)
        if b % 2 == 1:
            add(drums, clap(0.5), tb)
        add(drums, hat(0.2, 40), tb + 0.25)
        add(drums, hat(0.07), tb + 0.125)
        add(drums, hat(0.07), tb + 0.375)
        ch = prog[min(int(b / 4), 5)]
        add(music, bass(ROOT[ch], 0.22, 0.55), tb + 0.25)
        add(music, stab(CH[ch], 0.18, 0.2), tb + 0.25)
        notes = CH[ch] + [CH[ch][0] + 12]
        pat = [0, 2, 1, 3]
        for e in range(2):
            add(music, pluck(notes[pat[(b * 2 + e) % 4]] + 12, 0.11), tb + e * 0.25)
    for k in range(10):
        tc = 2.0 + k
        if k:
            add(fx, whoosh(0.3, 0.32), tc - 0.13)
        add(fx, pop(0.3), tc + 0.03)
    add(fx, whoosh(0.34, 0.4), 2.0 - 0.15)
    add(fx, whoosh(0.34, 0.4), T_OUTRO - 0.15)
    add(fx, riser(1.0, 0.25), 11.0)
    add(drums, kick(1.0), T_OUTRO)
    add(fx, impact(0.9, 1.6), T_OUTRO)
    # outro sting
    for k, n in enumerate([72, 76, 79, 84]):
        add(music, bell(n, 0.16), 12.55 + k * 0.08)
    add(drums, kick(1.0), 14.0)
    add(drums, clap(0.4), 14.0)
    add(music, stab([48, 60, 64, 67, 72], 1.0, 0.45, 4000, 2.2), 14.0)
    add(music, bass(36, 1.0, 0.6), 14.0)
    add(fx, impact(0.4, 1.0), 14.0)

    # sidechain pump on the music bus
    t = np.arange(N) / SR
    sc = np.ones(N)
    for b in range(25):
        tb = 2.0 + b * 0.5
        m = t >= tb
        sc[m] = np.minimum(sc[m], 1 - 0.55 * np.exp(-(t[m] - tb) / 0.11))
    music *= sc
    ir_t = _t(1.4)
    ir = RNG.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.32)
    ir = lp(ir, 5000) / np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(music + 0.4 * drums * 0, ir)[:N] * 0.22
    dl = int(0.011 * SR)
    L = drums + music + fx + wet
    R = drums + np.r_[np.zeros(dl), music[:-dl]] + fx + np.r_[wet[dl // 2:], np.zeros(dl // 2)]
    mix = np.stack([L, R], 1)
    mix = np.tanh(mix / np.abs(mix).max() * 1.4) / np.tanh(1.4)
    mix *= 0.9
    fade = int(0.04 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    wavfile.write(path, SR, (mix * 32767).astype(np.int16))


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=float, nargs="*")
    args = ap.parse_args()
    os.makedirs("out", exist_ok=True)
    if args.preview:
        init_assets()
        for t in args.preview:
            Image.fromarray(render_frame(t)).save(f"out/preview_mcd_{t:05.2f}.png")
            print("wrote", f"out/preview_mcd_{t:05.2f}.png")
        return
    make_audio(WAV)
    n = int(DUR * FPS)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-i", WAV, "-c:v", "libx264", "-preset", "slow", "-crf", "16",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "192k", "-shortest",
        "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    with Pool(initializer=_worker_init) as pool:
        for k, buf in enumerate(pool.imap(_render, range(n), chunksize=2)):
            ff.stdin.write(buf)
            if k % 30 == 0:
                print(f"frame {k}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
