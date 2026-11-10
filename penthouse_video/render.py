#!/usr/bin/env python3
"""
Aurum Residences — "The Penthouse" · 13 s vertical motion ad (1080×1920, 30 fps)

Built from three real photographs (see README for credits):
  1. New York skyline at dusk     → slow drone push-in, then a dive into the top of the tower
  2. A real penthouse living room → gimbal slide through the room
  3. Sunset view over Manhattan   → the view from the penthouse + end card

Everything else — camera moves, zoom/whip blur, flash, light leaks, bloom, grade,
grain, typography and the sound design — is generated here.

    python3 render.py                    # -> out/penthouse_motion.mp4
    python3 render.py --preview 1 3.5 6  # single PNG frames for quick checks
"""
import argparse, math, os, subprocess, wave
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OW, OH, FPS, DUR = 1080, 1920, 30, 13.0
OUT = os.path.join(HERE, "out", "penthouse_motion.mp4")

INTER = "/usr/share/fonts/opentype/inter/"
SERIF_IT = "/usr/share/fonts/truetype/crosextra/Caladea-Italic.ttf"
GOLD = (232, 205, 160)
WHITE = (255, 255, 255)

# Shot boundaries (seconds)
T_AB = 3.55     # dive into the tower -> interior
T_BC = 8.35     # whip pan -> the view


# ───────────────────────────── helpers ─────────────────────────────
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def seg(t, a, b):
    return clamp((t - a) / (b - a))


def ease_io(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x, p=3):
    return 1 - (1 - clamp(x)) ** p


def ease_in(x, p=3):
    return clamp(x) ** p


def ease_expo_io(x):
    x = clamp(x)
    if x in (0, 1):
        return x
    return 2 ** (20 * x - 10) / 2 if x < 0.5 else (2 - 2 ** (-20 * x + 10)) / 2


def font(path, size):
    return ImageFont.truetype(path, size)


def shake(t, amp=1.0, seed=0.0):
    """Gentle hand-held / gimbal drift: (dx, dy, rot_deg)."""
    dx = amp * (2.2 * math.sin(1.31 * t + seed) + 1.1 * math.sin(2.93 * t + 1.7 + seed) + 0.5 * math.sin(6.1 * t + seed))
    dy = amp * (1.8 * math.sin(1.07 * t + 0.4 + seed) + 0.9 * math.sin(3.41 * t + 2.1 + seed))
    rot = amp * 0.12 * math.sin(0.83 * t + 0.9 + seed)
    return dx, dy, rot


# ───────────────────────────── imagery ─────────────────────────────
def load(name):
    im = cv2.imread(os.path.join(HERE, "assets", name), cv2.IMREAD_COLOR)
    im = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return im


def grade(img, warm=0.0, sat=1.0, gamma=1.0, lift=0.0, contrast=1.0):
    """Cinematic split-tone grade: teal shadows, warm highlights."""
    x = np.clip(img, 0, 1) ** gamma
    x = (x - 0.5) * contrast + 0.5
    l = (0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2])[..., None]
    x = l + (x - l) * sat
    sh = (1 - l) ** 2
    hi = l ** 2
    x = x + sh * np.array([-0.012, 0.010, 0.030], np.float32) * (1 + warm)
    x = x + hi * np.array([0.055, 0.020, -0.040], np.float32) * (1 + 2 * warm)
    x = x * (1 - lift) + lift
    return np.clip(x, 0, 1).astype(np.float32)


def unsharp(img, amount=0.35, sigma=1.2):
    b = cv2.GaussianBlur(img, (0, 0), sigma)
    return np.clip(img + (img - b) * amount, 0, 1)


class Cam:
    """Virtual camera over a still: centre (cx, cy) in source px, zoom, roll."""

    def __init__(self, img):
        self.img = img
        self.H, self.W = img.shape[:2]
        self.s0 = max(OH / self.H, OW / self.W)   # cover the 9:16 frame

    def render(self, cx, cy, z, rot=0.0, interp=cv2.INTER_CUBIC):
        s = self.s0 * z
        hw, hh = OW / (2 * s), OH / (2 * s)
        cx = min(max(cx, hw), self.W - hw)
        cy = min(max(cy, hh), self.H - hh)
        a = math.radians(rot)
        c, si = math.cos(a) * s, math.sin(a) * s
        M = np.float32([[c, -si, OW / 2 - (c * cx - si * cy)],
                        [si, c, OH / 2 - (si * cx + c * cy)]])
        return cv2.warpAffine(self.img, M, (OW, OH), flags=interp, borderMode=cv2.BORDER_REFLECT)


def zoom_blur(frame, fx, fy, strength, n=12):
    """Radial (zoom) blur around (fx, fy) in output px."""
    if strength < 0.004:
        return frame
    acc = np.zeros_like(frame)
    for k in range(n):
        sc = 1 + strength * k / (n - 1)
        M = np.float32([[sc, 0, fx - sc * fx], [0, sc, fy - sc * fy]])
        acc += cv2.warpAffine(frame, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n


def motion_blur_x(frame, px, n=14):
    if abs(px) < 1.5:
        return frame
    acc = np.zeros_like(frame)
    for k in range(n):
        d = px * (k / (n - 1) - 0.5)
        M = np.float32([[1, 0, d], [0, 1, 0]])
        acc += cv2.warpAffine(frame, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / n


# ───────────────────────────── typography ─────────────────────────────
class Type:
    def __init__(self):
        self.f = {
            "eyebrow": font(INTER + "Inter-Medium.otf", 26),
            "brand": font(INTER + "Inter-Light.otf", 34),
            "huge": font(INTER + "InterDisplay-ExtraLight.otf", 132),
            "serif": font(SERIF_IT, 128),
            "spec": font(INTER + "Inter-Light.otf", 34),
            "price": font(INTER + "InterDisplay-ExtraLight.otf", 200),
            "btn": font(INTER + "Inter-SemiBold.otf", 30),
            "small": font(INTER + "Inter-Regular.otf", 24),
        }

    @staticmethod
    def spaced(d, xy, text, fnt, fill, spacing):
        x, y = xy
        for ch in text:
            d.text((x, y), ch, font=fnt, fill=fill)
            x += d.textlength(ch, font=fnt) + spacing
        return x

    @staticmethod
    def spaced_w(d, text, fnt, spacing):
        return sum(d.textlength(c, font=fnt) + spacing for c in text) - spacing


def reveal(t, a, b, dur_in=0.8, dur_out=0.45):
    """(alpha, rise) for an element visible between a and b."""
    if t < a or t > b + dur_out:
        return 0.0, 0.0
    i = ease_out(seg(t, a, a + dur_in), 4)
    o = 1 - ease_in(seg(t, b, b + dur_out), 2)
    return i * o, 1 - i


def draw_text_layer(t, T):
    """Returns RGBA overlay for time t (or None)."""
    layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    drew = False
    L = 84  # left margin (TikTok-safe; keeps clear of the right-hand action rail)

    def col(c, a):
        return c + (int(255 * clamp(a)),)

    # Brand mark (always on, except during the flash)
    a, r = reveal(t, 0.25, 12.4, 1.0, 0.6)
    a *= 1 - 0.9 * math.exp(-((t - T_AB) / 0.25) ** 2)
    if a > 0.01:
        drew = True
        y = 168
        cx, cy = L + 14, y + 20
        d.polygon([(cx, cy - 14), (cx + 14, cy), (cx, cy + 14), (cx - 14, cy)], outline=col(GOLD, a), width=2)
        d.polygon([(cx, cy - 6), (cx + 6, cy), (cx, cy + 6), (cx - 6, cy)], fill=col(GOLD, a))
        T.spaced(d, (L + 46, y + 2), "AURUM", T.f["brand"], col(WHITE, a), 14)
        T.spaced(d, (L + 46, y + 48), "RESIDENCES", T.f["small"], col(WHITE, a * 0.55), 9)

    # ── Shot A: "Above everything."
    a1, r1 = reveal(t, 0.55, 2.85)
    a2, r2 = reveal(t, 0.85, 2.95)
    if a1 > 0.01 or a2 > 0.01:
        drew = True
        y0 = 1180
        d.line([(L, y0 - 40), (L + 46, y0 - 40)], fill=col(GOLD, a1), width=2)
        T.spaced(d, (L + 62, y0 - 54), "NEW YORK  ·  THE PENTHOUSE", T.f["eyebrow"], col(GOLD, a1), 6)
        d.text((L - 6, y0 + 40 * r1), "Above", font=T.f["huge"], fill=col(WHITE, a1))
        d.text((L, y0 + 150 + 40 * r2), "everything.", font=T.f["serif"], fill=col(GOLD, a2))

    # ── Shot B: interior copy
    a1, r1 = reveal(t, 4.35, 7.75)
    a2, r2 = reveal(t, 4.6, 7.8)
    a3, r3 = reveal(t, 4.9, 7.85)
    if a1 > 0.01:
        drew = True
        y0 = 1190
        d.line([(L, y0 - 40), (L + 46, y0 - 40)], fill=col(GOLD, a1), width=2)
        T.spaced(d, (L + 62, y0 - 54), "TOP FLOOR  ·  620 m²", T.f["eyebrow"], col(GOLD, a1), 6)
        d.text((L - 6, y0 + 40 * r1), "Live above", font=T.f["huge"], fill=col(WHITE, a1))
        d.text((L, y0 + 150 + 40 * r2), "the skyline.", font=T.f["serif"], fill=col(GOLD, a2))
        x = L
        for i, s in enumerate(["5 Bedrooms", "6 Baths", "360° Terrace"]):
            if i:
                d.ellipse([x + 14, y0 + 352 + 30 * r3, x + 20, y0 + 358 + 30 * r3], fill=col(GOLD, a3))
                x += 36
            d.text((x, y0 + 335 + 30 * r3), s, font=T.f["spec"], fill=col(WHITE, a3 * 0.85))
            x += d.textlength(s, font=T.f["spec"])

    # ── Shot C: end card
    a1, r1 = reveal(t, 9.55, 13.5, 0.9)
    a2, r2 = reveal(t, 9.8, 13.5, 1.1)
    a3, r3 = reveal(t, 10.45, 13.5, 0.8)
    if a1 > 0.01:
        drew = True
        y0 = 1110
        d.line([(L, y0 - 40), (L + 46, y0 - 40)], fill=col(GOLD, a1), width=2)
        T.spaced(d, (L + 62, y0 - 54), "THE PENTHOUSE  ·  AVAILABLE", T.f["eyebrow"], col(GOLD, a1), 6)
        # price counts up
        v = 12.5 * ease_out(seg(t, 9.8, 11.0), 4)
        d.text((L - 10, y0 + 6 + 40 * r2), f"${v:.1f}M", font=T.f["price"], fill=col(WHITE, a2))
        d.text((L, y0 + 250 + 30 * r2), "Where the city ends", font=T.f["spec"], fill=col(WHITE, a2 * 0.8))
        d.text((L, y0 + 296 + 30 * r2), "and the sky begins.", font=T.f["spec"], fill=col(WHITE, a2 * 0.8))

        # Book-viewing button with a tap at 11.7 s
        if a3 > 0.01:
            bx, by, bw, bh = L, int(y0 + 410 + 30 * r3), 560, 104
            press = math.exp(-((t - 11.75) / 0.09) ** 2)
            sc = 1 - 0.04 * press
            cxm, cym = bx + bw / 2, by + bh / 2
            x0, y1 = cxm - bw * sc / 2, cym - bh * sc / 2
            x1, y2 = cxm + bw * sc / 2, cym + bh * sc / 2
            glow = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            gd.rounded_rectangle([x0 - 6, y1 - 6, x1 + 6, y2 + 6], radius=60, fill=(232, 190, 120, int(70 * a3)))
            layer.alpha_composite(Image.fromarray(cv2.GaussianBlur(np.array(glow), (0, 0), 18)))
            d = ImageDraw.Draw(layer)
            fill = (240, 214, 168) if press < 0.5 else (255, 232, 190)
            d.rounded_rectangle([x0, y1, x1, y2], radius=int(bh * sc / 2), fill=fill + (int(255 * a3),))
            txt = "BOOK A PRIVATE VIEWING"
            tw = T.spaced_w(d, txt, T.f["btn"], 3)
            T.spaced(d, (cxm - tw / 2, cym - 19), txt, T.f["btn"], (28, 22, 14, int(255 * a3)), 3)
            # tap ripple
            k = seg(t, 11.72, 12.4)
            if 0 < k < 1:
                rr = 20 + 140 * ease_out(k, 3)
                tx, ty = cxm + 215, cym + 22
                d.ellipse([tx - rr, ty - rr, tx + rr, ty + rr], outline=(255, 255, 255, int(200 * (1 - k))), width=3)
                d.ellipse([tx - 16, ty - 16, tx + 16, ty + 16], fill=(255, 255, 255, int(170 * (1 - k))))
    return layer if drew else None


# ───────────────────────────── scene ─────────────────────────────
class Scene:
    def __init__(self):
        sky = load("1_skyline.jpg")      # 1920×1080
        pent = load("2_penthouse.jpg")   # 1920×1278
        view = load("3_view.jpg")        # 2880×1920
        # unify the three photographs into one look
        sky = grade(sky, warm=0.3, sat=1.08, contrast=1.06)
        pent = grade(pent, warm=0.25, sat=0.95, gamma=0.97, contrast=1.08)
        view = grade(view, warm=0.6, sat=1.12, contrast=1.08)
        self.A, self.B, self.C = Cam(unsharp(sky, 0.5, 1.4)), Cam(unsharp(pent, 0.35)), Cam(view)
        self.T = Type()

        yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
        r = np.sqrt(((xx - OW / 2) / (OW * 0.62)) ** 2 + ((yy - OH * 0.47) / (OH * 0.62)) ** 2)
        self.vig = np.clip(1 - 0.55 * r ** 2.4, 0, 1)[..., None].astype(np.float32)
        self.yy, self.xx = yy, xx
        g = np.random.default_rng(3)
        self.grain = [cv2.resize(g.standard_normal((OH // 2, OW // 2)).astype(np.float32), (OW, OH))[..., None]
                      for _ in range(8)]
        # bottom gradient for legibility
        self.grad = np.clip((yy - OH * 0.36) / (OH * 0.5), 0, 1)[..., None] ** 1.2

    # ── shots
    def shot_a(self, t):
        cam = self.A
        W, H = cam.W, cam.H
        tx, ty = 0.515 * W, 0.40 * H          # top floors of the tower, just under the crown
        k1 = ease_io(seg(t, 0.0, 2.7))         # slow drone push
        k2 = ease_expo_io(seg(t, 2.25, T_AB + 0.05))  # the dive
        z = 1.0 + 0.32 * k1 + 3.6 * ease_in(seg(t, 2.25, T_AB + 0.05), 3)
        cx = (0.5 * W) * (1 - k1) + (tx - 18) * k1
        cy = (0.52 * H) * (1 - k1) + (0.47 * H) * k1
        cy = cy * (1 - k2) + ty * k2
        dx, dy, rot = shake(t, 0.7)
        fr = cam.render(cx + dx, cy + dy, z, rot + 1.5 * k2)
        # zoom blur ramps up with the dive
        zb = 0.28 * ease_in(seg(t, 2.6, T_AB), 2.2)
        fr = zoom_blur(fr, OW / 2, OH / 2, zb)
        # exposure lift into the flash
        fr = fr * (1 + 1.6 * ease_in(seg(t, 3.0, T_AB), 3))
        return fr

    def shot_b(self, t):
        cam = self.B
        W, H = cam.W, cam.H
        u = seg(t, T_AB, T_BC)
        k = ease_io(u)
        # land from the dive: overshoot zoom settling into a gimbal slide
        land = ease_out(seg(t, T_AB, T_AB + 0.9), 4)
        z = 1.08 + 0.55 * (1 - land) + 0.08 * k
        cx = W * (0.30 + 0.34 * k)
        cy = H * (0.53 - 0.02 * k)
        # whip-out at the end
        w = ease_in(seg(t, T_BC - 0.3, T_BC), 2.5)
        cx += w * W * 0.22
        dx, dy, rot = shake(t, 1.0, 2.0)
        fr = cam.render(cx + dx, cy + dy, z, rot - 1.2 * (1 - land))
        fr = zoom_blur(fr, OW / 2, OH / 2, 0.22 * (1 - ease_out(seg(t, T_AB, T_AB + 0.55), 2)))
        fr = motion_blur_x(fr, -260 * w)
        fr = fr * (1 + 1.3 * (1 - ease_out(seg(t, T_AB, T_AB + 0.5), 2)))
        return fr

    def shot_c(self, t):
        cam = self.C
        W, H = cam.W, cam.H
        k = ease_io(seg(t, T_BC, DUR))
        w = 1 - ease_out(seg(t, T_BC, T_BC + 0.55), 3)   # whip-in decays
        z = 1.06 + 0.10 * k
        cx = W * (0.64 - 0.06 * k) - w * W * 0.16
        cy = H * (0.47 - 0.015 * k)
        dx, dy, rot = shake(t, 0.6, 4.0)
        fr = cam.render(cx + dx, cy + dy, z, rot)
        fr = motion_blur_x(fr, -320 * w)
        # end-card legibility
        dim = ease_io(seg(t, 9.3, 10.4))
        fr = fr * (1 - 0.68 * dim * self.grad)
        return fr

    # ── compositing
    def frame(self, t):
        if t < T_AB:
            fr = self.shot_a(t)
        elif t < T_BC:
            fr = self.shot_b(t)
        else:
            fr = self.shot_c(t)

        # warm flash at the dive
        fl = math.exp(-((t - T_AB) / 0.13) ** 2)
        if fl > 0.002:
            fr = fr * (1 - fl) + np.array([1.0, 0.93, 0.82], np.float32) * fl

        # light leak sweeping across at transitions
        for tc, dur, strength in ((T_AB, 0.9, 0.55), (T_BC, 0.7, 0.45)):
            k = seg(t, tc - dur / 2, tc + dur / 2)
            if 0 < k < 1:
                lx = OW * (-0.3 + 1.6 * k)
                ly = OH * (0.35 + 0.1 * k)
                d2 = ((self.xx - lx) / (OW * 0.55)) ** 2 + ((self.yy - ly) / (OH * 0.5)) ** 2
                leak = np.exp(-d2)[..., None] * math.sin(math.pi * k) * strength
                fr = fr + leak * np.array([1.0, 0.55, 0.22], np.float32)

        # bloom
        small = cv2.resize(fr, (OW // 4, OH // 4), interpolation=cv2.INTER_AREA)
        hl = np.clip(small - 0.72, 0, None)
        hl = cv2.GaussianBlur(hl, (0, 0), 9)
        fr = fr + cv2.resize(hl, (OW, OH)) * 0.55

        # lens vignette + global fades
        fr = fr * self.vig
        fade = ease_out(seg(t, 0, 0.6), 2) * (1 - ease_in(seg(t, DUR - 0.35, DUR), 2))
        fr = fr * fade

        # subtle chromatic fringe during the fast moves
        ca = 3 * math.exp(-((t - T_AB) / 0.35) ** 2) + 3 * math.exp(-((t - T_BC) / 0.25) ** 2)
        if ca > 0.3:
            M = np.float32([[1, 0, ca], [0, 1, 0]])
            fr[..., 0] = cv2.warpAffine(np.ascontiguousarray(fr[..., 0]), M, (OW, OH), borderMode=cv2.BORDER_REFLECT)
            M = np.float32([[1, 0, -ca], [0, 1, 0]])
            fr[..., 2] = cv2.warpAffine(np.ascontiguousarray(fr[..., 2]), M, (OW, OH), borderMode=cv2.BORDER_REFLECT)

        fr = np.clip(fr, 0, 1)

        # typography
        layer = draw_text_layer(t, self.T)
        if layer is not None:
            la = np.asarray(layer).astype(np.float32) / 255.0
            a = la[..., 3:4]
            # soft drop shadow
            sh = cv2.GaussianBlur(a, (0, 0), 10)[..., None] * 0.45
            fr = fr * (1 - sh)
            fr = fr * (1 - a) + la[..., :3] * a

        # film grain
        g = self.grain[int(t * FPS) % len(self.grain)]
        l = fr.mean(axis=2, keepdims=True)
        fr = fr + g * 0.028 * (0.35 + 0.65 * (1 - l))
        return (np.clip(fr, 0, 1) * 255 + 0.5).astype(np.uint8)


# ───────────────────────────── sound design ─────────────────────────────
def make_audio(path, sr=48000):
    n = int(DUR * sr)
    t = np.arange(n) / sr
    rng = np.random.default_rng(11)
    L = np.zeros(n)
    R = np.zeros(n)

    def env(a, att, dec):
        e = np.zeros(n)
        m = t >= a
        tt = t[m] - a
        e[m] = np.minimum(tt / att, 1) * np.exp(-tt / dec)
        return e

    def noise(cut_hi, cut_lo=None):
        x = rng.standard_normal(n)
        k = max(int(sr / cut_hi), 1)
        y = np.convolve(x, np.ones(k) / k, "same")
        if cut_lo:
            k2 = max(int(sr / cut_lo), 1)
            y = y - np.convolve(y, np.ones(k2) / k2, "same")
        return y

    # warm evolving pad (Dmaj9 -> Bm11 -> Gmaj7#11), slightly detuned for width
    chords = [(0.0, [73.42, 146.83, 220.0, 277.18, 329.63]),
              (T_AB, [61.74, 123.47, 185.0, 220.0, 293.66]),
              (T_BC, [49.0, 98.0, 146.83, 246.94, 277.18, 369.99])]
    pad_l, pad_r = np.zeros(n), np.zeros(n)
    for i, (a, fs) in enumerate(chords):
        b = chords[i + 1][0] if i + 1 < len(chords) else DUR + 1
        w = np.clip((t - a + 0.15) / 0.3, 0, 1) * np.clip((b + 0.15 - t) / 0.3, 0, 1)
        for f in fs:
            pad_l += w * np.sin(2 * np.pi * f * 0.998 * t + f)
            pad_r += w * np.sin(2 * np.pi * f * 1.002 * t + 2 * f)
    trem = 0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    fade = np.minimum(t / 1.2, 1) * np.minimum((DUR - t) / 0.6, 1)
    L += 0.055 * pad_l * trem * fade
    R += 0.055 * pad_r * trem * fade

    # opening sub swell + wind
    wind = noise(900, 120) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t))
    L += 0.10 * wind * np.clip(1 - t / T_AB, 0, 1)
    R += 0.10 * np.roll(wind, 900) * np.clip(1 - t / T_AB, 0, 1)
    L += 0.35 * np.sin(2 * np.pi * 41 * t) * env(0.0, 0.8, 1.2)
    R += 0.35 * np.sin(2 * np.pi * 41 * t) * env(0.0, 0.8, 1.2)

    # riser into the dive
    k = np.clip((t - 2.2) / (T_AB - 2.2), 0, 1) * (t < T_AB)
    riser = noise(7000, 300) * k ** 2.5 * 0.55 + 0.12 * np.sin(2 * np.pi * (180 + 900 * k ** 2) * t) * k ** 2
    L += riser
    R += riser
    # impact + air whoosh at the flash
    boom = 0.9 * np.sin(2 * np.pi * (38 + 90 * np.exp(-(t - T_AB) * 9)) * t) * env(T_AB, 0.004, 0.8)
    air = noise(4000, 200) * env(T_AB, 0.01, 0.5) * 0.45
    L += boom + air
    R += boom + air
    # glassy shimmer as we land inside
    for i, f in enumerate((1760.0, 2217.5, 2637.0, 3520.0)):
        s = 0.035 * np.sin(2 * np.pi * f * t) * env(T_AB + 0.1 + 0.08 * i, 0.01, 1.4)
        L += s * (1.2 if i % 2 else 0.8)
        R += s * (0.8 if i % 2 else 1.2)

    # whip whoosh (panned L -> R)
    k = np.clip((t - (T_BC - 0.35)) / 0.7, 0, 1)
    wh = noise(5000, 400) * np.sin(np.pi * k) ** 2 * 0.6
    L += wh * (1 - k)
    R += wh * k
    L += 0.4 * np.sin(2 * np.pi * (55 + 60 * np.exp(-(t - T_BC) * 10)) * t) * env(T_BC, 0.005, 0.4)
    R += 0.4 * np.sin(2 * np.pi * (55 + 60 * np.exp(-(t - T_BC) * 10)) * t) * env(T_BC, 0.005, 0.4)

    # price reveal: soft piano-like bell + sub
    for f, d0 in ((587.33, 0.0), (880.0, 0.06), (1174.66, 0.12)):
        b = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env(9.8 + d0, 0.004, 1.3) * 0.09
        L += b
        R += b
    L += 0.45 * np.sin(2 * np.pi * 36 * t) * env(9.8, 0.01, 1.4)
    R += 0.45 * np.sin(2 * np.pi * 36 * t) * env(9.8, 0.01, 1.4)

    # UI tap
    tap = 0.35 * np.sin(2 * np.pi * 2600 * t) * env(11.72, 0.0005, 0.02) + 0.25 * np.sin(2 * np.pi * 180 * t) * env(11.72, 0.001, 0.05)
    L += tap
    R += tap

    st = np.stack([L, R], 1)
    st /= np.max(np.abs(st)) / 0.85
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


# ───────────────────────────── main ─────────────────────────────
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
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    if args.preview:
        _init()
        for t in args.preview:
            p = os.path.join(os.path.dirname(args.out), f"preview_{t:05.2f}.png")
            Image.fromarray(_scene.frame(t)).save(p)
            print(p)
        return

    wav = args.out.replace(".mp4", ".wav")
    make_audio(wav)
    n = int(DUR * FPS)
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
           "-r", str(FPS), "-i", "-", "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "17",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           args.out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(os.cpu_count(), initializer=_init) as pool:
        for i, buf in enumerate(pool.imap(_render, range(n), chunksize=2)):
            ff.stdin.write(buf)
            if i % 30 == 0:
                print(f"frame {i}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    os.remove(wav)
    print(args.out)


if __name__ == "__main__":
    main()
