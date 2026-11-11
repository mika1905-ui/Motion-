"""15 s Instagram ad (1080x1920, 30 fps) for @goldhaehnchen.de.

Liquid gold drops onto a dark stage, rises into a column and pours itself into a
chicken drumstick. On the beat drop the gold "fries" into a crispy golden-brown
crust, steam rises, the claims hit on the beat and the spot ends on the gold
wordmark and a call to action. Everything (picture and sound) is procedural.

    python3 goldhaehnchen.py                     # -> out/goldhaehnchen_ad.mp4
    python3 goldhaehnchen.py --preview 3 6 12    # single PNG frames

Texts and timing live in the constants below.
"""
import argparse, math, os, subprocess, sys, wave
from multiprocessing import Pool

import cv2
cv2.setNumThreads(1)
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import distance_transform_edt

FPS = 30
DUR = 15.0
W, H = 1080, 1920
BPM = 120
BEAT = 60 / BPM
FONT = "/usr/share/fonts/opentype/inter/"
OUT = "out/goldhaehnchen_ad.mp4"

HOOK = "HUNGER?"
HOOK_SUB = "Dann schau genau hin."
WORDS = [(6.0, "KNUSPRIG."), (6.5, "SAFTIG."), (7.0, "GOLDEN."), (7.5, "GOLD WERT.")]
BRAND = ("GOLD", "HÄHNCHEN")
TAGLINE = "FRISCH  ·  KNUSPRIG  ·  GOLDEN"
CTA = "JETZT PROBIEREN  →"
HANDLE = "@goldhaehnchen.de"
CTA_SUB = "Folgen & vorbeikommen"

T_DROP, T_SPLASH, T_RISE, T_MORPH, T_SETTLE = 1.45, 2.0, 2.3, 3.3, 4.4
T_CRISP = 5.0              # beat drop: gold -> crispy
T_LOGO = 8.0
T_CTA = 11.0

# liquid is simulated in this screen box
BX0, BY0, BW, BH = 90, 380, 900, 1300
CX, CY = 450, 640          # drumstick centre (box coords)
FLOOR = 1010               # puddle line (box coords)


# --------------------------------------------------------------------------
def font(name, size):
    return ImageFont.truetype(FONT + name, size)


def clamp01(x):
    return min(max(x, 0.0), 1.0)


def seg(t, a, b):
    return clamp01((t - a) / (b - a))


def ease(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def ease_back(x, s=1.9):
    x = clamp01(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def sstep(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1)
    return x * x * (3 - 2 * x)


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k * 0.25


# --------------------------------------------------------------------------
# signed distance fields (box coordinates, px)
# --------------------------------------------------------------------------
YY, XX = np.mgrid[0:BH, 0:BW].astype(np.float32)


def sd_circle(cx, cy, r):
    return np.hypot(XX - cx, YY - cy) - r


def sd_capsule(ax, ay, bx, by, r):
    px, py = XX - ax, YY - ay
    vx, vy = bx - ax, by - ay
    hh = np.clip((px * vx + py * vy) / max(vx * vx + vy * vy, 1e-6), 0, 1)
    return np.hypot(px - vx * hh, py - vy * hh) - r


def sd_ellipse(cx, cy, rx, ry):
    # cheap approximation, good enough for a flat puddle
    k0 = np.hypot((XX - cx) / rx, (YY - cy) / ry)
    k1 = np.hypot((XX - cx) / rx ** 2, (YY - cy) / ry ** 2)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)


def sd_round_cone(ax, ay, dx, dy, r1, r2, h):
    px, py = XX - ax, YY - ay
    along = px * dx + py * dy
    across = np.abs(-px * dy + py * dx)
    b = (r1 - r2) / h
    a = math.sqrt(1 - b * b)
    k = -across * b + along * a
    d = across * a + along * b - r1
    d = np.where(k < 0, np.hypot(across, along) - r1, d)
    d = np.where(k > a * h, np.hypot(across, along - h) - r2, d)
    return d


ANG = math.radians(-52)
DX, DY = math.cos(ANG), math.sin(ANG)          # meat -> bone direction (up-right)
PX_, PY_ = -DY, DX


def drumstick_parts():
    ax, ay = CX - DX * 250, CY - DY * 250 + 40
    meat = sd_round_cone(ax, ay, DX, DY, 215, 64, 270)
    bx, by = ax + DX * 270, ay + DY * 270
    cx, cy = bx + DX * 180, by + DY * 180
    bone = sd_capsule(bx, by, cx, cy, 30)
    k1 = sd_circle(cx + DX * 18 + PX_ * 34, cy + DY * 18 + PY_ * 34, 40)
    k2 = sd_circle(cx + DX * 18 - PX_ * 34, cy + DY * 18 - PY_ * 34, 40)
    bone = smin(bone, np.minimum(k1, k2), 30)
    return meat, bone


MEAT, BONE = drumstick_parts()
DRUM = smin(MEAT, BONE, 50)


def noise_tex(shape, seed, sigmas):
    rng = np.random.default_rng(seed)
    out = np.zeros(shape, np.float32)
    for s, w in sigmas:
        n = rng.standard_normal(shape).astype(np.float32)
        n = cv2.GaussianBlur(n, (0, 0), s)
        out += w * n / (n.std() + 1e-6)
    return out


BUMP = noise_tex((BH, BW), 11, [(2.2, 0.5), (5, 1.0), (11, 0.7)])
CRUMB = np.clip(noise_tex((BH, BW), 12, [(3, 1.0), (8, 0.6)]), 0, None)


def liquid_sd(t):
    """Signed distance of the gold at time t (None = nothing visible)."""
    if t < T_DROP:
        return None
    wob = 0.0
    if t < T_SPLASH:
        k = seg(t, T_DROP, T_SPLASH)
        y = -BY0 - 120 + (FLOOR - 20 + BY0 + 120) * k * k
        stretch = 40 + 140 * k
        return sd_capsule(CX, y - stretch, CX, y, 46)
    # puddle grows on impact, shrinks while the column takes the volume
    grow = ease_out(seg(t, T_SPLASH, T_SPLASH + 0.35))
    shrink = ease(seg(t, T_RISE, T_MORPH + 0.6))
    prx = 30 + 300 * grow * (1 - 0.85 * shrink)
    d = sd_ellipse(CX, FLOOR, prx, max(prx * 0.16, 12))
    # crown droplets
    sk = seg(t, T_SPLASH, T_SPLASH + 0.7)
    if 0 < sk < 1:
        for i in range(9):
            a = math.pi * (0.12 + 0.76 * i / 8)
            v = 520 + 140 * math.sin(i * 7.3)
            tt = sk * 0.7
            x = CX + math.cos(a) * v * tt * 0.9 * (1 if i % 2 else -1)
            y = FLOOR - math.sin(a) * v * tt + 1700 * tt * tt
            if y < FLOOR + 10:
                d = smin(d, sd_circle(x, y, 16 * (1 - sk * 0.6)), 30)
    # rising column
    rk = ease(seg(t, T_RISE, T_MORPH))
    if rk > 0:
        top = FLOOR - 30 - 760 * rk
        r = 60 + 50 * rk
        bulge = sd_circle(CX, top + 40, r + 30 * rk)
        col = smin(sd_capsule(CX, FLOOR, CX, top + 40, r), bulge, 60)
        mk = ease(seg(t, T_MORPH, T_SETTLE))
        if mk > 0:
            col = col * (1 - mk) + DRUM * mk
        d = smin(d, col, 90 * (1 - 0.8 * mk))
        wob = 14 * math.sin(math.pi * rk) + 18 * (1 - mk) * mk * 4
    # settle: damped wobble
    st = t - T_SETTLE
    if st > 0:
        wob += 16 * math.exp(-st * 4) * abs(math.sin(st * 14))
        d = d * 0 + d  # keep array
    if wob > 0:
        d = d + wob * np.sin(XX * 0.021 + t * 7) * np.sin(YY * 0.017 - t * 5)
    return d


# --------------------------------------------------------------------------
# shading
# --------------------------------------------------------------------------
GOLD = np.array([1.0, 0.74, 0.22], np.float32)
GOLD_DEEP = np.array([0.42, 0.20, 0.02], np.float32)
CRUST = np.array([0.98, 0.60, 0.16], np.float32)
CRUST_DEEP = np.array([0.36, 0.13, 0.02], np.float32)
BONE_COL = np.array([0.98, 0.84, 0.62], np.float32)


def env_map(rx, ry):
    top = sstep(-0.45, -0.85, ry) * sstep(0.8, 0.4, np.abs(rx)) * 2.0
    left = sstep(-0.5, -0.8, rx) * sstep(0.7, 0.3, np.abs(ry)) * 1.2
    right = sstep(0.55, 0.85, rx) * sstep(0.6, 0.2, np.abs(ry + 0.1)) * 0.9
    floor = sstep(0.3, 0.7, ry) * 0.35
    return 0.08 + top + left + right + floor


def normals(h, blur):
    h = cv2.GaussianBlur(h, (0, 0), blur)
    gy, gx = np.gradient(h)
    inv = 1 / np.sqrt(gx * gx + gy * gy + 1)
    return -gx * inv, -gy * inv, inv


L1 = np.array([-0.45, -0.7, 0.55]); L1 /= np.linalg.norm(L1)
HV = L1 + np.array([0, 0, 1.0]); HV /= np.linalg.norm(HV)


def shade(d, crisp=0.0, glint=-1.0):
    """Premultiplied RGBA (box res) for the gold / crispy body."""
    alpha = sstep(1.2, -1.2, d)
    inside = np.clip(-d, 0, None)
    R = 190.0
    x = np.minimum(inside, R)
    h = cv2.GaussianBlur(np.sqrt(x * (2 * R - x)) * 0.9, (0, 0), 9)
    if crisp > 0:
        rim = sstep(2, 18, inside)
        h = h + crisp * rim * cv2.GaussianBlur(BUMP * 7 + CRUMB * 9, (0, 0), 1.0)
    nx, ny, nz = normals(h, 0.8)
    diff = np.clip(nx * L1[0] + ny * L1[1] + nz * L1[2], 0, 1)
    nh = np.clip(nx * HV[0] + ny * HV[1] + nz * HV[2], 0, 1)
    rx, ry = 2 * nz * nx, 2 * nz * ny
    env = env_map(rx, ry)
    fres = 0.15 + 0.85 * (1 - nz) ** 3

    # liquid metal gold
    gold = (GOLD_DEEP + (GOLD - GOLD_DEEP) * (0.2 + 0.8 * diff)[..., None]) * 0.45
    gold = gold + (env * (0.55 + 0.45 * fres))[..., None] * GOLD * 0.62
    gold = gold + (nh ** 160 * 2.6 + nh ** 24 * 0.25)[..., None] * np.array([1.0, 0.95, 0.8])

    if crisp <= 0:
        col = gold
    else:
        # fried crust: warm, rough, glistening
        cav = np.clip(0.5 + 0.25 * BUMP - 0.15 * CRUMB, 0, 1)
        crust = CRUST_DEEP + (CRUST - CRUST_DEEP) * (0.15 + 0.85 * diff * cav)[..., None]
        crust = crust * (1.0 + 0.25 * sstep(0.2, 1.5, CRUMB))[..., None]
        crust = crust + (nh ** 60 * 1.2 + nh ** 8 * 0.08)[..., None] * np.array([1.0, 0.85, 0.6])
        crust = crust + (env * fres * 0.12)[..., None] * np.array([1.0, 0.8, 0.5])
        bonec = BONE_COL * (0.35 + 0.75 * diff)[..., None] + (nh ** 40 * 0.5)[..., None]
        bm = sstep(-6, 6, MEAT - BONE)[..., None]            # 1 on the bone
        crust = crust * (1 - bm) + bonec * bm
        # transformation front sweeps from bottom-left to top-right
        front = (XX * DX + YY * DY)
        f0 = front.min() - 80 + (front.max() - front.min() + 160) * crisp
        m = sstep(f0 + 40, f0 - 40, front)[..., None]
        edge = np.exp(-((front - f0) / 18) ** 2)[..., None] * (crisp < 1)
        col = gold * (1 - m) + crust * m + edge * np.array([1.6, 1.1, 0.5]) * alpha[..., None]
    if glint >= 0:
        g = (XX + YY * 0.6) / (BW + BH * 0.6)
        band = np.exp(-((g - glint) / 0.025) ** 2)
        col = col + (band * (0.4 + 1.2 * nh ** 4))[..., None] * np.array([1.0, 0.92, 0.7])
    col = np.clip(col, 0, 2)
    return np.concatenate([col * alpha[..., None], alpha[..., None]], -1).astype(np.float32)


# --------------------------------------------------------------------------
# text
# --------------------------------------------------------------------------
def text_mask(txt, fnt, pad=24, track=0):
    tmp = ImageDraw.Draw(Image.new("L", (1, 1)))
    if track:
        widths = [tmp.textlength(c, font=fnt) for c in txt]
        tw = int(sum(widths) + track * (len(txt) - 1))
    else:
        tw = int(tmp.textlength(txt, font=fnt))
    asc, desc = fnt.getmetrics()
    im = Image.new("L", (tw + 2 * pad, asc + desc + 2 * pad), 0)
    d = ImageDraw.Draw(im)
    if track:
        x = pad
        for c, w in zip(txt, widths):
            d.text((x, pad), c, font=fnt, fill=255)
            x += w + track
    else:
        d.text((pad, pad), txt, font=fnt, fill=255)
    a = np.asarray(im).astype(np.float32) / 255
    ys, xs = np.nonzero(a > 0.02)
    return a[max(ys.min() - pad, 0): ys.max() + pad, max(xs.min() - pad, 0): xs.max() + pad]


def gold_text(txt, fnt, bevel=7, track=0):
    a = text_mask(txt, fnt, track=track)
    edt = distance_transform_edt(a > 0.5).astype(np.float32)
    hgt = np.sqrt(np.clip(edt, 0, bevel) * (2 * bevel - np.clip(edt, 0, bevel))) * 2.2
    nx, ny, nz = normals(hgt, 1.0)
    rx, ry = 2 * nz * nx, 2 * nz * ny
    yy = np.linspace(0, 1, a.shape[0])[:, None]
    diff = np.clip(nx * L1[0] + ny * L1[1] + nz * L1[2], 0, 1)
    nh = np.clip(nx * HV[0] + ny * HV[1] + nz * HV[2], 0, 1)
    top, mid, bot = np.array([1.0, 0.95, 0.62]), np.array([1.0, 0.70, 0.16]), np.array([0.62, 0.30, 0.03])
    ramp = np.where(yy[..., None] < 0.5, top + (mid - top) * (yy[..., None] / 0.5),
                    mid + (bot - mid) * ((yy[..., None] - 0.5) / 0.5)) * np.ones_like(a)[..., None]
    # thin bright horizon line like polished metal
    ramp = ramp + np.exp(-((yy - 0.52) / 0.03) ** 2)[..., None] * np.array([0.5, 0.4, 0.2])
    col = ramp * (0.55 + 0.6 * diff)[..., None] + (nh ** 60 * 1.1)[..., None] * np.array([1, 0.95, 0.8])
    col = np.clip(col, 0, 1.6)
    return np.concatenate([col * a[..., None], a[..., None]], -1).astype(np.float32)


def flat_text(txt, fnt, rgb, track=0):
    a = text_mask(txt, fnt, track=track)
    return np.concatenate([np.array(rgb, np.float32) * a[..., None], a[..., None]], -1)


def fit_font(txt, name, size, maxw):
    f = font(name, size)
    while ImageDraw.Draw(Image.new("L", (1, 1))).textlength(txt, font=f) > maxw:
        size -= 4
        f = font(name, size)
    return f


def over(dst, src, x, y, opacity=1.0):
    """Premultiplied 'over' of src (h,w,4) at top-left (x,y), clipped."""
    if opacity <= 0:
        return
    x, y = int(round(x)), int(round(y))
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
    if x1 <= x0 or y1 <= y0:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x] * opacity
    c = dst.shape[2]
    dst[y0:y1, x0:x1] = s[..., :c] + dst[y0:y1, x0:x1] * (1 - s[..., 3:4])


def over_c(dst, src, cx, cy, scale=1.0, opacity=1.0, angle=0.0):
    if scale <= 0.01 or opacity <= 0:
        return
    if scale != 1.0 or angle:
        h, w = src.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
        nw, nh = int(w * scale * 1.2 + 4), int(h * scale * 1.2 + 4)
        M[0, 2] += nw / 2 - w / 2
        M[1, 2] += nh / 2 - h / 2
        src = cv2.warpAffine(src, M, (nw, nh), flags=cv2.INTER_LINEAR)
    over(dst, src, cx - src.shape[1] / 2, cy - src.shape[0] / 2, opacity)


def add(dst, src, x, y, k=1.0):
    x, y = int(x), int(y)
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
    if x1 > x0 and y1 > y0:
        dst[y0:y1, x0:x1] += src[y0 - y:y1 - y, x0 - x:x1 - x, :3] * k


# --------------------------------------------------------------------------
class Scene:
    def __init__(self):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.hypot((xx - 540) / 900, (yy - 1000) / 1100)
        base = np.array([0.035, 0.022, 0.014]) + np.array([0.20, 0.08, 0.015]) * np.exp(-r * r * 3.2)[..., None]
        self.bg = base.astype(np.float32)
        self.vign = (1 - 0.55 * np.clip(r, 0, 1.3) ** 2).astype(np.float32)[..., None]
        self.warm = np.exp(-((xx - 540) / 420) ** 2 - ((yy - 1050) / 520) ** 2).astype(np.float32)
        # floor glow line
        self.floor = (np.exp(-((yy - (BY0 + FLOOR + 30)) / 70) ** 2) * np.exp(-((xx - 540) / 380) ** 2)).astype(np.float32)
        self.steam_tex = np.clip(noise_tex((900, 700), 21, [(22, 1.0), (45, 0.8)]), 0, None)
        self.grain = [np.random.default_rng(i).standard_normal((H // 2, W // 2)).astype(np.float32) for i in range(6)]
        rng = np.random.default_rng(4)
        self.embers = rng.random((80, 5))

        hf = font("InterDisplay-Black.otf", 300)
        self.hook = gold_text(HOOK, fit_font(HOOK, "InterDisplay-Black.otf", 300, 960), bevel=9)
        self.hook_sub = flat_text(HOOK_SUB, font("Inter-SemiBold.otf", 50), (1, 0.93, 0.8))
        self.words = [(t, flat_text(w, fit_font(w, "InterDisplay-Black.otf", 230, 1000), (1, 0.97, 0.9)),
                       flat_text(w, fit_font(w, "InterDisplay-Black.otf", 230, 1000), (1.0, 0.55, 0.08)))
                      for t, w in WORDS]
        self.brand1 = gold_text(BRAND[0], font("InterDisplay-Black.otf", 210), bevel=9, track=6)
        self.brand2 = gold_text(BRAND[1], fit_font(BRAND[1], "InterDisplay-Black.otf", 170, 960), bevel=8, track=4)
        self.tag = flat_text(TAGLINE, font("Inter-Bold.otf", 36), (1, 0.9, 0.7), track=3)
        self.handle = flat_text(HANDLE, font("Inter-Bold.otf", 52), (1, 1, 1))
        self.cta_sub = flat_text(CTA_SUB, font("Inter-Medium.otf", 36), (0.85, 0.78, 0.68))
        self.pill = self._pill()
        self.ig = self._ig_icon(58)
        self._crisp_final = None
        self._gold_final = None

    def _pill(self):
        pw, ph = 760, 136
        yy = np.linspace(0, 1, ph)[:, None, None]
        grad = (np.array([1.0, 0.86, 0.38]) * (1 - yy) + np.array([0.86, 0.52, 0.08]) * yy) * np.ones((ph, pw, 3))
        m = Image.new("L", (pw, ph), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, pw - 1, ph - 1], ph // 2, fill=255)
        a = np.asarray(m).astype(np.float32)[..., None] / 255
        img = np.concatenate([grad * a, a], -1).astype(np.float32)
        # top sheen
        img[: ph // 2, :, :3] += 0.12 * a[: ph // 2]
        t = flat_text(CTA, font("InterDisplay-Black.otf", 54), (0.16, 0.07, 0.0))
        over(img, t, (pw - t.shape[1]) / 2, (ph - t.shape[0]) / 2 + 2)
        return img

    def _ig_icon(s):
        im = Image.new("L", (s, s), 0)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([2, 2, s - 3, s - 3], s // 4, outline=255, width=5)
        d.ellipse([s * .28, s * .28, s * .72, s * .72], outline=255, width=5)
        d.ellipse([s * .70, s * .17, s * .80, s * .27], fill=255)
        a = np.asarray(im).astype(np.float32)[..., None] / 255
        return np.concatenate([a * np.array([1, 1, 1]), a], -1).astype(np.float32)
    _ig_icon = staticmethod(_ig_icon)

    # ---- drumstick layer (box res) -------------------------------------
    def body(self, t):
        if t < T_CRISP:
            d = liquid_sd(t)
            if d is None:
                return None
            gl = seg(t, 4.45, 4.95) * 1.3 - 0.15 if 4.45 < t < 4.95 else -1
            if t >= T_SETTLE + 0.6 and gl < 0:
                if self._gold_final is None:
                    self._gold_final = shade(liquid_sd(T_SETTLE + 0.6))
                return self._gold_final
            return shade(d, glint=gl)
        ck = ease(seg(t, T_CRISP, T_CRISP + 0.75))
        if ck >= 1:
            if self._crisp_final is None:
                self._crisp_final = shade(DRUM, crisp=1.0)
            return self._crisp_final
        return shade(DRUM, crisp=max(ck, 0.001))

    def pose(self, t):
        """Screen transform of the drumstick layer: centre, scale, angle."""
        k = ease(seg(t, T_LOGO - 0.25, T_LOGO + 0.55))
        scale = 1.0 + 0.04 * ease_out(seg(t, T_CRISP, T_CRISP + 0.4)) * (1 - k) - 0.40 * k
        cy = BY0 + CY + (-470) * k + (12 * math.sin(t * 2.4) if t > T_SETTLE else 0)
        ang = (3 * math.sin(t * 1.7) if t > T_CRISP else 0)
        return 540, cy, scale, ang

    def frame(self, t):
        img = self.bg.copy()
        # warm light breathes up with the beat after the drop
        beat_ph = ((t - T_CRISP) % BEAT) / BEAT if t >= T_CRISP else 1
        pump = math.exp(-beat_ph * 5) if t >= T_CRISP else 0
        warm = 0.10 * ease(seg(t, T_SPLASH, T_MORPH)) + 0.10 * ease(seg(t, T_CRISP - 0.2, T_CRISP)) + 0.06 * pump
        img += self.warm[..., None] * np.array([1.0, 0.45, 0.08]) * warm
        img += self.floor[..., None] * np.array([1.0, 0.6, 0.2]) * 0.25 * ease(seg(t, T_SPLASH, T_SPLASH + 0.3)) * (1 - ease(seg(t, T_LOGO - 0.3, T_LOGO + 0.3)))

        self.draw_embers(img, t)

        # kinetic words behind the drumstick
        for i, (tw, wt, wo) in enumerate(self.words):
            nxt = self.words[i + 1][0] if i + 1 < len(self.words) else T_LOGO - 0.05
            if tw <= t < nxt:
                k = seg(t, tw, tw + 0.12)
                sc = 1.35 - 0.35 * ease_out(k) + 0.03 * (t - tw)
                yy = 1060 if i % 2 == 0 else 1040
                src = wt if i % 2 == 0 else wo
                over_c(img, src, 540 + (i % 2 * 2 - 1) * 6 * (1 - k), yy, sc, 0.92)

        # body + shadow
        b = self.body(t)
        if b is not None:
            cx, cy, sc, ang = self.pose(t)
            if t >= T_SETTLE:
                sh = np.zeros_like(img)
                cv2.ellipse(sh, (540, int(BY0 + FLOOR + 40 - (BY0 + CY - cy) * 0.0)), (int(300 * sc), int(40 * sc)), 0, 0, 360, (1, 1, 1), -1)
                sh = cv2.GaussianBlur(sh, (0, 0), 30)
                k = 1 - ease(seg(t, T_LOGO - 0.3, T_LOGO + 0.2))
                img *= 1 - 0.6 * sh * k
            over_c(img, b, cx, cy, sc, 1.0, ang)
            if t > T_CRISP + 0.3:
                self.draw_steam(img, t, cx, cy, sc)

        self.draw_sparks(img, t)
        self.draw_hook(img, t)
        self.draw_brand(img, t)
        self.draw_cta(img, t)

        # flashes on impacts
        fl = 0.0
        for tf, a in [(0.25, 0.45), (T_SPLASH, 0.35), (T_CRISP, 0.9), (T_LOGO, 0.5)]:
            if t >= tf:
                fl += a * math.exp(-(t - tf) * 14)
        img += fl * np.array([1.0, 0.85, 0.6], np.float32)
        return self.post(img, t, pump)

    # ---- elements -------------------------------------------------------
    def draw_embers(self, img, t):
        lay = np.zeros((H // 2, W // 2, 3), np.float32)
        on = ease(seg(t, 0.0, 0.6))
        for x0, y0, sp, ph, sz in self.embers:
            y = ((y0 * 1.2 - sp * 0.08 * t - (0.05 * t * t if t > T_CRISP else 0)) % 1.2 - 0.1) * H
            x = x0 * W + 40 * math.sin(t * (0.6 + ph) + ph * 9)
            fl = 0.5 + 0.5 * math.sin(t * 6 + ph * 20)
            c = np.array([1.0, 0.55 + 0.3 * ph, 0.12]) * (0.4 + 0.6 * fl) * on
            cv2.circle(lay, (int(x / 2), int(y / 2)), int(1 + sz * 2.5), c.tolist(), -1, cv2.LINE_AA)
        glow = cv2.GaussianBlur(lay, (0, 0), 5) * 2.5 + lay
        img += cv2.resize(glow, (W, H)) * 0.6

    def draw_steam(self, img, t, cx, cy, sc):
        k = ease(seg(t, T_CRISP + 0.3, T_CRISP + 1.2)) * (1 - 0.6 * ease(seg(t, 13.5, 15)))
        th, tw = self.steam_tex.shape
        off = int((t * 120) % (th - 500))
        crop = self.steam_tex[th - 500 - off: th - off, :]
        sw, shh = int(560 * sc), int(700 * sc)
        crop = cv2.resize(crop, (sw, shh))
        yy = np.linspace(0, 1, shh)[:, None]
        xx = np.linspace(-1, 1, sw)[None, :]
        m = sstep(0.0, 0.3, yy) * sstep(1.0, 0.55, yy) * np.exp(-(xx / 0.6) ** 2)
        a = np.clip(cv2.GaussianBlur(crop, (0, 0), 6) * m * 0.09 * k, 0, 0.2)
        x0, y0 = int(cx - sw / 2), int(cy - shh * 0.95)
        lay = np.zeros((shh, sw, 4), np.float32)
        lay[..., :3] = a[..., None] * np.array([1.0, 0.85, 0.65])
        lay[..., 3] = a * 0.5
        over(img, lay, x0, y0)

    def draw_sparks(self, img, t):
        lay = np.zeros((H, W, 3), np.float32)
        any_ = False
        for t0, n, cx, cy, spd, seed in [(T_SPLASH, 26, 540, BY0 + FLOOR, 1500, 1), (T_CRISP, 60, 540, BY0 + CY, 2100, 2),
                                          (T_LOGO, 30, 540, 1150, 1600, 3)]:
            dt = t - t0
            if not 0 <= dt < 1.1:
                continue
            any_ = True
            rng = np.random.default_rng(seed)
            for _ in range(n):
                a = rng.uniform(0, 2 * math.pi) if seed != 1 else rng.uniform(math.pi * 1.05, math.pi * 1.95)
                v = spd * rng.uniform(0.3, 1.0)
                life = rng.uniform(0.4, 1.1)
                if dt > life:
                    continue
                vx, vy = math.cos(a) * v, math.sin(a) * v
                drag = (1 - math.exp(-dt * 3)) / 3
                x, y = cx + vx * drag, cy + vy * drag + 500 * dt * dt
                tail = 0.035
                x2, y2 = x - vx * tail * math.exp(-dt * 3), y - vy * tail * math.exp(-dt * 3)
                f = (1 - dt / life)
                col = (np.array([1.0, 0.72, 0.25]) * 1.6 * f).tolist()
                cv2.line(lay, (int(x2), int(y2)), (int(x), int(y)), col, 3, cv2.LINE_AA)
        if any_:
            img += lay + cv2.GaussianBlur(lay, (0, 0), 8) * 1.5

    def draw_hook(self, img, t):
        if t > 2.0:
            return
        k = seg(t, 0.25, 0.42)
        if t < 0.25:
            return
        sc = 1.7 - 0.7 * ease_out(k)
        out = ease(seg(t, 1.4, 1.95))
        sh = 18 * math.exp(-(t - 0.25) * 8) * math.sin(t * 90)
        y = 860 - 260 * out
        over_c(img, self.hook, 540 + sh, y, sc * (1 - 0.3 * out), (1 - out))
        sk = ease_out(seg(t, 0.75, 1.0))
        over_c(img, self.hook_sub, 540, 1040 - 20 * sk - 200 * out, 1.0, sk * (1 - out))

    def draw_brand(self, img, t):
        if t < T_LOGO - 0.05:
            return
        k1 = seg(t, T_LOGO, T_LOGO + 0.25)
        k2 = seg(t, T_LOGO + 0.15, T_LOGO + 0.45)
        y1, y2 = 1020, 1190
        over_c(img, self.brand1, 540, y1 + 60 * (1 - ease_out(k1)), 0.8 + 0.2 * ease_back(k1), ease(k1 * 2))
        over_c(img, self.brand2, 540, y2 + 60 * (1 - ease_out(k2)), 0.8 + 0.2 * ease_back(k2), ease(k2 * 2))
        # shine sweep across the wordmark every 2 s
        ph = ((t - T_LOGO - 0.5) % 2.0) / 0.6
        if t > T_LOGO + 0.5 and ph < 1:
            band = np.zeros((420, W, 3), np.float32)
            xs = int(-200 + 1500 * ph)
            cv2.line(band, (xs, 0), (xs - 250, 420), (1.0, 0.95, 0.8), 70)
            band = cv2.GaussianBlur(band, (0, 0), 18)
            # restrict to the letters
            m = np.zeros((420, W), np.float32)
            for src, yc in [(self.brand1, y1), (self.brand2, y2)]:
                hh, ww = src.shape[:2]
                yy0 = int(yc - hh / 2) - (y1 - 220)
                xx0 = int(540 - ww / 2)
                m[max(yy0, 0):yy0 + hh, xx0:xx0 + ww] = np.maximum(m[max(yy0, 0):yy0 + hh, xx0:xx0 + ww],
                                                                   src[max(-yy0, 0):, :, 3][:420 - max(yy0, 0)])
            img[y1 - 220:y1 + 200] += band * m[..., None] * 0.8
        kt = ease(seg(t, T_LOGO + 0.6, T_LOGO + 1.0))
        over_c(img, self.tag, 540, 1320 + 20 * (1 - kt), 1.0, kt)

    def draw_cta(self, img, t):
        if t < T_CTA:
            return
        k = seg(t, T_CTA, T_CTA + 0.35)
        bp = ((t - T_CTA) % BEAT) / BEAT
        pulse = 1 + 0.035 * math.exp(-bp * 6) if t > T_CTA + 0.4 else 1
        tap = t - 12.6
        if 0 < tap < 0.25:
            pulse *= 1 - 0.08 * math.sin(math.pi * tap / 0.25)
        y = 1510
        # glow behind the pill
        g = np.zeros((300, 1000, 3), np.float32)
        cv2.ellipse(g, (500, 150), (380, 70), 0, 0, 360, (1.0, 0.6, 0.15), -1)
        g = cv2.GaussianBlur(g, (0, 0), 40)
        add(img, g, 40, y - 150, 0.55 * ease(k) * pulse)
        over_c(img, self.pill, 540, y + 80 * (1 - ease_out(k)), ease_back(k) * pulse, ease(k * 2))
        # tap ripple
        if 0 < tap < 0.7:
            lay = np.zeros((H, W, 3), np.float32)
            r = int(30 + 220 * ease_out(tap / 0.7))
            cv2.circle(lay, (700, y + 10), r, (1, 1, 1), 6, cv2.LINE_AA)
            cv2.circle(lay, (700, y + 10), 34, (1, 1, 1), -1, cv2.LINE_AA)
            img += lay * 0.5 * (1 - tap / 0.7)
        kh = ease(seg(t, T_CTA + 0.3, T_CTA + 0.7))
        hw = self.handle.shape[1] + self.ig.shape[1] + 24
        x0 = 540 - hw / 2
        over(img, self.ig, x0, 1690 - self.ig.shape[0] / 2 + 20 * (1 - kh), kh)
        over(img, self.handle, x0 + self.ig.shape[1] + 24, 1690 - self.handle.shape[0] / 2 + 20 * (1 - kh), kh)
        ks = ease(seg(t, T_CTA + 0.5, T_CTA + 0.9))
        over_c(img, self.cta_sub, 540, 1770, 1.0, ks * 0.9)

    # ---- camera / film --------------------------------------------------
    def post(self, img, t, pump):
        # zoom punches on impacts + beat pump + slow push-in
        z = 1.0 + 0.012 * t / DUR
        for tf, a in [(0.25, 0.08), (T_SPLASH, 0.03), (T_CRISP, 0.10), (T_LOGO, 0.05)] + [(tw, 0.04) for tw, _ in WORDS]:
            if t >= tf:
                z += a * math.exp(-(t - tf) * 9)
        z += 0.012 * pump
        shake = 0.0
        for tf, a in [(0.25, 22), (T_SPLASH, 8), (T_CRISP, 26)]:
            if t >= tf:
                shake += a * math.exp(-(t - tf) * 10)
        sx = shake * math.sin(t * 83) + 2.0 * math.sin(t * 1.3) + 1.2 * math.sin(t * 2.9 + 1)
        sy = shake * math.cos(t * 71) + 2.0 * math.sin(t * 1.1 + 2)
        M = cv2.getRotationMatrix2D((540, 960), 0.15 * math.sin(t * 0.9), z)
        M[0, 2] += sx
        M[1, 2] += sy
        img = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        # chromatic split on hard hits
        ca = 0.0
        for tf, a in [(0.25, 14), (T_CRISP, 16), (T_LOGO, 6)] + [(tw, 6) for tw, _ in WORDS]:
            if t >= tf:
                ca += a * math.exp(-(t - tf) * 12)
        if ca > 0.6:
            s = int(round(ca))
            img[..., 0] = np.roll(img[..., 0], s, axis=1)
            img[..., 2] = np.roll(img[..., 2], -s, axis=1)
        # bloom
        hi = np.clip(img - 0.75, 0, None)
        small = cv2.resize(hi, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        bloom = cv2.GaussianBlur(small, (0, 0), 6) + cv2.GaussianBlur(small, (0, 0), 18)
        img += cv2.resize(bloom, (W, H)) * 0.55
        img *= self.vign
        # fade in / out
        img *= ease(seg(t, 0.0, 0.2)) * (1 - ease(seg(t, DUR - 0.35, DUR)))
        # grain
        g = cv2.resize(self.grain[int(t * FPS) % 6], (W, H), interpolation=cv2.INTER_NEAREST)
        img += g[..., None] * 0.018
        # filmic tone map
        img = np.clip(img, 0, None)
        img = img / (1 + 0.18 * img)
        img = np.clip(img * 1.12, 0, 1) ** (1 / 1.05)
        return (img * 255 + 0.5).astype(np.uint8)


# --------------------------------------------------------------------------
# sound: 120 bpm trap-ish beat with sound design hits
# --------------------------------------------------------------------------
def make_audio(path, sr=48000):
    n = int(DUR * sr)
    t = np.arange(n) / sr
    rng = np.random.default_rng(7)
    out = np.zeros(n)

    def env(a, att, dec):
        e = np.zeros(n)
        m = t >= a
        tt = t[m] - a
        e[m] = np.minimum(tt / att, 1) * np.exp(-tt / dec)
        return e

    def noise(cut=None, hp=None):
        x = rng.standard_normal(n)
        if cut:
            k = max(int(sr / cut), 1)
            x = np.convolve(x, np.ones(k) / k, "same")
        if hp:
            k = max(int(sr / hp), 1)
            x = x - np.convolve(x, np.ones(k) / k, "same")
        return x

    def kick(a, g=1.0):
        return g * np.sin(2 * np.pi * (48 * (t - a) + 160 / 25 * (1 - np.exp(-(t - a).clip(0) * 25)))) * env(a, 0.002, 0.22)

    def b808(a, f, d=0.45, g=0.5):
        ph = 2 * np.pi * f * (t - a) + 3 * (1 - np.exp(-(t - a).clip(0) * 30))
        return g * np.tanh(2.2 * np.sin(ph)) * env(a, 0.004, d)

    hats = noise(hp=6000)
    snare_n = noise(cut=7000)
    # intro: whoosh into the hook, dark drone
    out += 0.25 * noise(cut=1500) * np.clip(t / 0.25, 0, 1) * (t < 0.25) ** 1
    out += 0.07 * sum(np.sin(2 * np.pi * f * t) for f in (41.2, 61.7, 82.4)) * np.minimum(t / 0.5, 1) * (t < T_CRISP)
    # HOOK impact
    out += 1.1 * kick(0.25) + 0.35 * noise(cut=2500) * env(0.25, 0.002, 0.25)
    out += 0.15 * np.sin(2 * np.pi * 220 * t) * env(0.25, 0.01, 0.8) * np.sin(2 * np.pi * 3 * t)
    # sparse pre-drop pulse (half time)
    for a in np.arange(1.0, T_CRISP - 0.6, 1.0):
        out += 0.45 * kick(a, 0.7)
    # drop falls, plip, splash
    k = np.clip((t - T_DROP) / (T_SPLASH - T_DROP), 0, 1)
    out += 0.12 * noise(cut=4000) * k ** 2 * (t < T_SPLASH)
    out += 0.6 * np.sin(2 * np.pi * (500 + 1100 * np.exp(-(t - T_SPLASH).clip(0) * 28)) * t) * env(T_SPLASH, 0.002, 0.07)
    out += 0.35 * noise(cut=3500) * env(T_SPLASH, 0.004, 0.3)
    # gloops while the gold rises and shapes
    for a, f in [(2.4, 130), (2.85, 95), (3.3, 160), (3.75, 120), (4.2, 180)]:
        out += 0.3 * np.sin(2 * np.pi * (f + 70 * np.sin(14 * (t - a))) * t) * env(a, 0.02, 0.28)
    # glint shimmer
    for f in (2093, 2637, 3136, 4186):
        out += 0.05 * np.sin(2 * np.pi * f * t) * env(4.5, 0.01, 0.7)
    # riser into the drop
    k = np.clip((t - 3.6) / (T_CRISP - 3.6), 0, 1)
    out += (0.35 * noise(cut=8000) * k ** 3 + 0.18 * np.sin(2 * np.pi * (150 + 900 * k ** 2) * t) * k) * (t < T_CRISP)
    for a in np.arange(4.0, T_CRISP, 0.125):        # snare roll build
        out += 0.25 * ((a - 4.0) / 1.0) * snare_n * env(a, 0.001, 0.05)
    # DROP: impact + sizzle / frying crackle
    out += 1.2 * kick(T_CRISP, 1.2) + 0.5 * noise(cut=3000) * env(T_CRISP, 0.002, 0.5)
    crackle = rng.standard_normal(n) * (rng.random(n) > 0.9985)
    crackle = np.convolve(crackle, np.hanning(40), "same")
    out += 0.5 * crackle * env(T_CRISP, 0.01, 1.4) + 0.08 * noise(hp=3000) * env(T_CRISP, 0.05, 1.5)
    # beat after the drop
    bass = [41.2, 41.2, 49.0, 36.7]
    end_beat = DUR - 0.5
    for i, a in enumerate(np.arange(T_CRISP, end_beat, BEAT)):
        out += 0.85 * kick(a) if i % 2 == 0 else 0
        if i % 2 == 1:
            out += 0.45 * snare_n * env(a, 0.001, 0.12) + 0.3 * np.sin(2 * np.pi * 190 * t) * env(a, 0.001, 0.07)
        if i % 4 == 0:
            out += b808(a, bass[(i // 4) % 4], d=0.9, g=0.32)
    for a in np.arange(T_CRISP, end_beat, BEAT / 2):
        out += 0.12 * hats * env(a, 0.0005, 0.03)
    for a in np.arange(T_CRISP + 3 * BEAT / 4, end_beat, BEAT * 2):   # hat triplets
        for j in range(3):
            out += 0.08 * hats * env(a + j * BEAT / 6, 0.0005, 0.02)
    # crunch on each claim word
    for tw, _ in WORDS:
        out += 0.4 * noise(cut=5000) * env(tw, 0.001, 0.09) * (1 + np.sign(np.sin(2 * np.pi * 70 * t))) / 2
    # logo: big hit + shimmer
    out += 0.9 * kick(T_LOGO, 1.0) + 0.3 * noise(cut=2500) * env(T_LOGO, 0.002, 0.4)
    for f in (1046.5, 1568, 2093, 3136):
        out += 0.06 * np.sin(2 * np.pi * f * t) * env(T_LOGO, 0.005, 1.6)
    # CTA whoosh + tap click
    k = np.clip((t - (T_CTA - 0.4)) / 0.4, 0, 1)
    out += 0.2 * noise(cut=3000) * k ** 2 * (t < T_CTA)
    out += 0.5 * np.sin(2 * np.pi * 2600 * t) * env(12.6, 0.0005, 0.02)
    out += 0.25 * np.sin(2 * np.pi * 880 * t) * env(12.62, 0.002, 0.15)
    # master: soft clip, fade
    out *= np.minimum(1, (DUR - t) / 0.4)
    out = np.tanh(out * 1.1)
    out /= np.max(np.abs(out)) / 0.9
    # small stereo width for the hats/air
    side = 0.15 * hats * 0.05
    st = np.stack([out + side, out - side], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())


# --------------------------------------------------------------------------
_scene = None


def _init():
    global _scene
    cv2.setNumThreads(1)
    _scene = Scene()


def _render(i):
    return _scene.frame(i / FPS).tobytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=float, nargs="*")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    os.makedirs("out", exist_ok=True)
    if args.preview:
        _init()
        for t in args.preview:
            p = f"out/gh_preview_{t:05.2f}.png"
            Image.fromarray(_scene.frame(t)).save(p)
            print(p)
        return
    wav = args.out.replace(".mp4", ".wav")
    make_audio(wav)
    n = int(DUR * FPS)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "17",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           args.out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(os.cpu_count(), initializer=_init) as pool:
        for i, buf in enumerate(pool.imap(_render, range(n), chunksize=4)):
            ff.stdin.write(buf)
            if i % 30 == 0:
                print(f"frame {i}/{n}", file=sys.stderr, flush=True)
    ff.stdin.close()
    ff.wait()
    os.remove(wav)
    print(args.out)


if __name__ == "__main__":
    main()
