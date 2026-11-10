"""Claude motion clip (16:9, 1920x1080, 30 fps).

Sequence
  0.0  spark + "Claude" types on inside two rotating red neon rings
  1.7  light streaks rip the letters away and swirl
  2.3  the chat box rises out of a red glow, streaks drop the question in word by word
  3.4  "Good evening, <name>", controls and chips fade in
  4.4  camera dives onto the model picker, Sonnet 4.6 -> Opus 4.7
  6.3  everything blurs out, a streak shoots off the send button
  7.3  the answer reveals line by line (blurred orange -> crisp white)
  8.5  "Claude" -> "Claude Code" -> "Claude Build" -> "Claude Learn"

    python3 claude_render.py                    # -> out/claude_motion.mp4
    python3 claude_render.py --preview 1.2 5.0  # single PNG frames
"""
import argparse, math, os, subprocess, sys, wave
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FPS = 30
DUR = 12.4
W, H = 1920, 1080
SS = 2                       # UI supersampling
OUT = "out/claude_motion.mp4"

NAME = "Mika"                # "Guten Abend, <NAME>"
GREETING = "Guten Abend,"
QUESTION = "Was macht Claude Opus 5.5 so stark?"
CHIPS = ["Code", "Erstellen", "Lernen", "Schreiben", "Alltag"]
MODELS = [("Opus 5.5", "Für anspruchsvolle Arbeit"),
          ("Sonnet 5.5", "Effizient für den Alltag"),
          ("Haiku 5.5", "Am schnellsten für kurze Antworten")]
FROM_MODEL, TO_MODEL = 1, 0  # picker switches Sonnet 5.5 -> Opus 5.5
SUFFIXES = [("denkt.", 9.0), ("baut.", 9.7), ("liefert.", 10.4), ("Opus 5.5", 11.1)]
HITS = [0.3, 1.0, 1.72, 3.3, 5.55, 6.3, 7.32, 8.5, 9.0, 9.7, 10.4, 11.1]  # impact moments
ANSWER = [
    "Claude Opus 5.5 denkt nicht nur schneller, es denkt tiefer. Komplexe Aufgaben werden in "
    "klare Schritte zerlegt, Annahmen werden geprüft, und am Ende steht eine Lösung, die "
    "wirklich funktioniert.",
    "Ob Code, Analyse oder Text: Opus 5.5 behält den Überblick über riesige Kontexte, versteht "
    "die Struktur hinter deinem Problem und liefert Ergebnisse, die präzise, nachvollziehbar "
    "und sofort einsetzbar sind.",
    "Als Agent arbeitet Claude selbstständig über viele Schritte hinweg: Es plant, nutzt Tools, "
    "testet seine eigene Arbeit und korrigiert sich, bis das Ziel erreicht ist.",
    "Dabei bleibt es hilfreich, ehrlich und sicher. Genau das macht den Unterschied zwischen "
    "einem Werkzeug und einem echten Partner.",
    "Weniger erklären. Mehr erreichen. Das ist Claude Opus 5.5.",
]

SERIF = "assets/fonts/SourceSerif4.ttf"
INTER = "/usr/share/fonts/opentype/inter/"

CORAL = (217, 119, 87)       # spark / accent
PEACH = (255, 196, 150)      # big title colour
HOT = (255, 70, 20)          # hot orange
PINK = (255, 30, 120)        # magenta accent
BTN = (198, 97, 77)
OPUS = (255, 140, 90)


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def clamp(x, a=0.0, b=1.0):
    return min(max(x, a), b)


def seg(t, a, b):
    return clamp((t - a) / (b - a))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def lerp(a, b, k):
    return a + (b - a) * k


def mix(c1, c2, k):
    return tuple(int(round(lerp(a, b, k))) for a, b in zip(c1, c2))


def sstep(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1)
    return x * x * (3 - 2 * x)


@lru_cache(maxsize=512)
def serif(size, wght=400):
    f = ImageFont.truetype(SERIF, max(int(round(size)), 4))
    f.set_variation_by_axes([wght, 60 if size > 40 else 20])
    return f


@lru_cache(maxsize=512)
def sans(size, weight="Regular"):
    return ImageFont.truetype(f"{INTER}Inter-{weight}.otf", max(int(round(size)), 4))


def text_rgba(text, font, fill=(255, 255, 255), pad=0):
    """Text as a float RGBA array (premultiplied) + the pixel offset of the pen origin
    (left, ascender-top) inside it."""
    l, t, r, b = font.getbbox(text)
    im = Image.new("RGBA", (r - l + 2 * pad + 2, b - t + 2 * pad + 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - l + 1, pad - t + 1), text, font=font, fill=fill + (255,))
    a = np.asarray(im).astype(np.float32) / 255.0
    a[..., :3] *= a[..., 3:4]
    return a, (pad - l + 1, pad - t + 1)


def blend(canvas, layer, x, y, alpha=1.0, add=False):
    """Composite premultiplied float RGBA `layer` onto float RGB `canvas` with its
    top-left at (x, y)."""
    if alpha <= 0.002:
        return
    x, y = int(round(x)), int(round(y))
    h, w = layer.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, canvas.shape[1]), min(y + h, canvas.shape[0])
    if x1 <= x0 or y1 <= y0:
        return
    L = layer[y0 - y:y1 - y, x0 - x:x1 - x]
    C = canvas[y0:y1, x0:x1]
    if add:
        C += L[..., :3] * alpha
    else:
        C *= 1 - L[..., 3:4] * alpha
        C += L[..., :3] * alpha


def blur_rgba(a, s):
    if s < 0.3:
        return a
    p = int(s * 3) + 2
    a = np.pad(a, ((p, p), (p, p), (0, 0)))
    return cv2.GaussianBlur(a, (0, 0), s), p


def draw_text(canvas, text, font, x, y, color=(255, 255, 255), alpha=1.0, blur=0.0,
              glow=0.0, glow_col=CORAL, glow_r=18, anchor="ls"):
    """Draw text with optional blur and additive glow. anchor: 'ls' left-baseline,
    'ms' middle-baseline, 'lm' left-middle, 'mm'."""
    asc, desc = font.getmetrics()
    tw = font.getlength(text)
    if anchor[0] == "m":
        x -= tw / 2
    if anchor[1] == "s":
        y -= asc
    elif anchor[1] == "m":
        y -= asc * 0.62
    lay, (ox, oy) = text_rgba(text, font, (255, 255, 255))
    lay = lay.copy()
    lay[..., :3] *= np.array(color, np.float32) / 255.0
    px, py = x - ox, y - oy
    if blur > 0.3:
        lay, p = blur_rgba(lay, blur)
        px, py = px - p, py - p
    if glow > 0:
        g, p = blur_rgba(lay, glow_r)
        g[..., :3] = g[..., 3:4] * (np.array(glow_col, np.float32) / 255.0)
        blend(canvas, g, px - p, py - p, glow * alpha, add=True)
    blend(canvas, lay, px, py, alpha)
    return tw


def spark_shape(r, rot=0.0, n=11, seed=3):
    """Claude-style spark: tapered rays of uneven length. Returns list of polygons."""
    rng = np.random.default_rng(seed)
    polys = []
    for i in range(n):
        a = rot + 2 * math.pi * i / n + rng.uniform(-0.12, 0.12)
        L = r * rng.uniform(0.78, 1.0)
        ca, sa = math.cos(a), math.sin(a)
        nx, ny = -sa, ca
        prof = [(0.05, 0.035), (0.35, 0.085), (0.8, 0.105), (0.95, 0.08), (1.0, 0.0)]
        left = [(ca * L * d + nx * r * w, sa * L * d + ny * r * w) for d, w in prof]
        right = [(ca * L * d - nx * r * w, sa * L * d - ny * r * w) for d, w in prof[::-1]]
        polys.append(left + right)
    return polys


def draw_spark(canvas, cx, cy, r, alpha=1.0, rot=0.0, color=CORAL, glow=0.5, blur=0.0):
    if alpha <= 0 or r < 1:
        return
    s = 4
    size = int(2 * r * 1.15) + 4
    im = Image.new("L", (size * s, size * s), 0)
    d = ImageDraw.Draw(im)
    c = size * s / 2
    for poly in spark_shape(r * s, rot):
        d.polygon([(c + px, c + py) for px, py in poly], fill=255)
    m = np.asarray(im.resize((size, size), Image.LANCZOS)).astype(np.float32) / 255.0
    lay = np.zeros((size, size, 4), np.float32)
    lay[..., 3] = m
    lay[..., :3] = m[..., None] * np.array(color, np.float32) / 255.0
    x, y = cx - size / 2, cy - size / 2
    if blur > 0.3:
        lay, p = blur_rgba(lay, blur)
        x, y = x - p, y - p
    if glow > 0:
        g, p = blur_rgba(lay, r * 0.35)
        blend(canvas, g, x - p, y - p, glow * alpha, add=True)
    blend(canvas, lay, x, y, alpha)


# --------------------------------------------------------------------------
# light streaks
# --------------------------------------------------------------------------
PR = 240  # path samples per second


class Streak:
    def __init__(self, t0, p0, heading, speed, dur, k0, k1, w, seed, trail=0.2,
                 end=None, intensity=1.0):
        rng = np.random.default_rng(seed)
        n = int(dur * PR) + 1
        om, ph = rng.uniform(2, 5), rng.uniform(0, 6.28)
        pts = np.zeros((n, 2))
        x, y, a = 0.0, 0.0, heading
        for i in range(n):
            pts[i] = x, y
            s = i / PR
            a += (k0 + k1 * math.sin(om * s + ph)) / PR
            v = speed * (0.8 + 0.4 * math.sin(1.7 * s + ph))
            x += math.cos(a) * v / PR
            y += math.sin(a) * v / PR
        if end is not None:
            pts += np.array(end) - pts[-1]
        else:
            pts += np.array(p0)
        self.t0, self.dur, self.pts, self.trail, self.w, self.I = t0, dur, pts, trail, w, intensity

    def head(self, t):
        i = int(clamp((t - self.t0) / self.dur) * (len(self.pts) - 1))
        return self.pts[i]

    def draw(self, heat, t, scale):
        if t < self.t0 or t > self.t0 + self.dur + self.trail:
            return
        hi = int(min((t - self.t0) * PR, len(self.pts) - 1))
        lo = int(max((t - self.t0 - self.trail) * PR, 0))
        if hi - lo < 2:
            return
        idx = np.linspace(lo, hi, min(hi - lo + 1, 48)).astype(int)
        P = self.pts[idx] * scale
        n = len(P)
        for k in range(n - 1):
            a = (k + 1) / n
            v = int(255 * self.I * a ** 1.4)
            th = max(int(round(self.w * scale * (0.25 + 0.75 * a ** 0.7))), 1)
            p1 = (int(P[k][0] * 8), int(P[k][1] * 8))
            p2 = (int(P[k + 1][0] * 8), int(P[k + 1][1] * 8))
            cv2.line(heat, p1, p2, v, th, cv2.LINE_AA, shift=3)


def streak_light(heat):
    """single-channel heat (uint8, half res) -> additive float RGB (half res)."""
    h = heat.astype(np.float32) / 255.0
    core = cv2.GaussianBlur(h, (0, 0), 0.8)
    mid = cv2.GaussianBlur(h, (0, 0), 3.0)
    wide = cv2.GaussianBlur(h, (0, 0), 12.0)
    out = (core[..., None] * np.array([1.0, 0.95, 0.75]) * 1.6
           + mid[..., None] * np.array([1.0, 0.62, 0.12]) * 2.2
           + wide[..., None] * np.array([1.0, 0.2, 0.02]) * 3.0)
    return out.astype(np.float32)


# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------
INTRO_C = (960, 520)


class Scene:
    def __init__(self):
        self.rng = np.random.default_rng(11)
        # low-res grids for background fields
        self.lw, self.lh = 384, 216
        yy, xx = np.mgrid[0:self.lh, 0:self.lw].astype(np.float32)
        self.gx = xx * (W / self.lw)
        self.gy = yy * (H / self.lh)
        hw, hh = W // 2, H // 2
        yy, xx = np.mgrid[0:hh, 0:hw].astype(np.float32)
        self.hx, self.hy = xx, yy
        self.grain = [self.rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]
        self.build_layout()
        self.build_streaks()

    # ---------------- layout -------------------------------------------------
    def build_layout(self):
        # intro logo
        f = serif(132, 520)
        self.logo_font = f
        self.logo_tw = f.getlength("Claude")
        sp_r, gap = 64, 34
        total = 2 * sp_r + gap + self.logo_tw
        self.logo_sx = INTRO_C[0] - total / 2 + sp_r
        self.logo_tx = self.logo_sx + sp_r + gap
        self.logo_base = INTRO_C[1] + 44
        self.logo_r = sp_r
        xs, acc = [], 0.0
        for i, ch in enumerate("Claude"):
            xs.append(self.logo_tx + f.getlength("Claude"[:i]))
        self.logo_xs = xs

        # question word positions (UI space, box at final position)
        qf = sans(31)
        self.q_words = []
        x = 283
        for wd in QUESTION.split(" "):
            self.q_words.append((wd, x))
            x += qf.getlength(wd + " ")

        # answer paragraphs, wrapped
        af = serif(25, 400)
        self.ans_font = af
        lines = []
        for pi, para in enumerate(ANSWER):
            cur = ""
            for wd in para.split(" "):
                nxt = (cur + " " + wd).strip()
                if af.getlength(nxt) > 845:
                    lines.append(cur)
                    cur = wd
                else:
                    cur = nxt
            lines.append(cur)
            if pi < len(ANSWER) - 1:
                lines.append("")
        self.ans_lines = lines
        self.ans_lh = 29
        self.ans_x = 538
        self.ans_y = 540 - len(lines) * self.ans_lh / 2 - 20

    def build_streaks(self):
        S = []
        # letters ripped away: one streak spawns at every letter
        self.rip = [1.72, 1.86, 1.98, 2.1, 2.22, 2.36]
        for i, tc in enumerate(self.rip):
            x = self.logo_xs[i] + 30
            y = self.logo_base - 40
            hd = self.rng.uniform(-2.6, -0.3) if i % 2 == 0 else self.rng.uniform(0.3, 2.4)
            S.append(Streak(tc, (x, y), hd, self.rng.uniform(900, 1300), self.rng.uniform(0.9, 1.4),
                            self.rng.choice([-1, 1]) * self.rng.uniform(3, 6), 5, 7, 100 + i))
        # extra swirl
        for i in range(5):
            p = (self.rng.uniform(300, 1600), self.rng.uniform(150, 800))
            S.append(Streak(1.9 + 0.12 * i, p, self.rng.uniform(0, 6.28), self.rng.uniform(900, 1200),
                            1.1, self.rng.choice([-1, 1]) * self.rng.uniform(4, 7), 6, 6, 200 + i,
                            intensity=0.85))
        # intro burst: sparks explode out of the spark logo
        for i in range(22):
            a = 2 * math.pi * i / 22 + self.rng.uniform(-0.1, 0.1)
            S.append(Streak(0.3, (self.logo_sx, INTRO_C[1]), a, self.rng.uniform(1400, 2300),
                            self.rng.uniform(0.35, 0.6), self.rng.uniform(-1.5, 1.5), 1, 4, 500 + i,
                            trail=0.12, intensity=0.9))
        # title impacts: horizontal spark sprays
        for j, tb in enumerate((8.5, 11.1)):
            for i in range(18):
                a = (0 if i % 2 else math.pi) + self.rng.uniform(-0.5, 0.5)
                S.append(Streak(tb, (960 + self.rng.uniform(-200, 200), 540 + self.rng.uniform(-40, 40)),
                                a, self.rng.uniform(1600, 2600), self.rng.uniform(0.3, 0.55),
                                self.rng.uniform(-2, 2), 1, 4, 600 + 40 * j + i, trail=0.1,
                                intensity=0.8))
        # words delivered into the chat box (they end at the word positions)
        order = self.rng.permutation(len(self.q_words))
        self.q_arrive = [2.78 + 0.075 * int(np.where(order == i)[0][0]) for i in range(len(self.q_words))]
        for i, ((wd, x), ta) in enumerate(zip(self.q_words, self.q_arrive)):
            ux, uy = self.ui_to_screen_intro(x + 20, 506, ta)
            S.append(Streak(ta - 0.55, None, self.rng.uniform(0, 6.28), 1100, 0.55,
                            self.rng.choice([-1, 1]) * self.rng.uniform(3, 6), 4, 6, 300 + i,
                            end=(ux, uy), trail=0.16))
        # send: streak off the send button, swirl in the dark, become the answer
        S.append(Streak(6.32, (1567, 634), -1.2, 1300, 0.55, -4.5, 3, 7, 400, trail=0.22))
        S.append(Streak(6.6, (1500, 300), 2.6, 1200, 0.6, -5.5, 3, 7, 401, trail=0.22))
        S.append(Streak(6.85, None, 0.3, 1400, 0.45, 2.0, 3, 8, 402, trail=0.25,
                        end=(960, self.ans_y + 40)))
        self.streaks = S

    # UI camera ---------------------------------------------------------------
    def camera(self, t):
        """(zoom, cx, cy): ui point (cx, cy) is shown at the screen centre."""
        z, cx, cy = 1.0, 960.0, 540.0
        k = ease_io(seg(t, 3.9, 4.4))
        z, cx, cy = lerp(z, 1.06, k), lerp(cx, 985, k), lerp(cy, 550, k)
        k = ease_io(seg(t, 4.35, 4.75))
        z, cx, cy = lerp(z, 1.87, k), lerp(cx, 1387, k), lerp(cy, 464, k)
        z += 0.04 * seg(t, 4.75, 5.8)
        k = ease_io(seg(t, 5.85, 6.3))
        z, cx, cy = lerp(z, 1.12, k), lerp(cx, 1010, k), lerp(cy, 545, k)
        return z, cx, cy

    def box_dy(self, t):
        """vertical offset of the chat UI while it rises in."""
        if t >= 4.0:
            return 0.0
        k1 = ease_out(seg(t, 2.25, 2.95))
        k2 = ease_io(seg(t, 3.25, 3.75))
        return lerp(lerp(560, 170, k1), 0, k2)

    def ui_to_screen_intro(self, x, y, t):
        z, cx, cy = self.camera(t)
        return (x - cx) * z + 960, (y + self.box_dy(t) - cy) * z + 540

    # ---------------- background --------------------------------------------
    def red_field(self, t):
        """red glow rising from the bottom (float RGB full res)."""
        lvl1 = lerp(1.25, 0.0, ease_out(seg(t, 2.2, 3.0)))  # chat section
        lvl1 = lvl1 + 0.25 * ease(seg(t, 6.25, 6.6))         # sinks away on send
        k2 = ease_out(seg(t, 7.2, 8.0))                       # answer + titles
        k3 = ease_io(seg(t, 8.45, 9.2))
        X, Y = self.gx, self.gy
        out = np.zeros((self.lh, self.lw, 3), np.float32)
        if t < 6.8:
            B = (0.74 * H + lvl1 * H
                 - 0.06 * H * np.sin(X / W * 3.0 + 0.6 * t + 0.6)
                 - 0.035 * H * np.sin(X / W * 7.0 - 1.1 * t))
            I = sstep(B - 90, B + 230, Y)
            I *= 0.8 + 0.2 * np.sin(X / 260 + Y / 190 + t * 1.3)
            hue = (0.5 + 0.5 * np.sin(X / W * 2.4 + 0.5 * t))[..., None]
            out += I[..., None] * (hue * np.array([1.0, 0.22, 0.02], np.float32)
                                   + (1 - hue) * np.array([0.9, 0.02, 0.3], np.float32))
        if t > 7.0:
            base = lerp(0.62, 0.48, k3) * H + (1 - k2) * 0.6 * H
            B = (base + 0.10 * H * np.exp(-((X - 0.47 * W) / (0.2 * W)) ** 2)
                 - 0.05 * H * (X / W) - 0.03 * H * np.sin(X / W * 5 + t * 0.9))
            I = sstep(B - 120, B + 260, Y)
            dark = 1 - 0.55 * np.exp(-((X - 0.47 * W) / (0.22 * W)) ** 2
                                     - ((Y - B - 0.08 * H) / (0.13 * H)) ** 2)
            I *= dark * (0.82 + 0.18 * np.sin(X / 300 - Y / 230 + t * 1.1))
            hue = (0.5 + 0.5 * np.sin(X / W * 3.0 - 0.7 * t + 1))[..., None]
            out += I[..., None] * (hue * np.array([1.0, 0.24, 0.02], np.float32)
                                   + (1 - hue) * np.array([0.92, 0.02, 0.33], np.float32))
        out = cv2.GaussianBlur(out, (0, 0), 3)
        return cv2.resize(out, (W, H), interpolation=cv2.INTER_LINEAR)

    SHOCKS = [  # (t0, centre, speed, gain)
        (0.3, "logo", 1900, 1.2), (0.36, "logo", 1250, 0.8), (1.0, "logo", 1600, 0.9),
        (3.3, (935, 572), 1500, 0.6), (5.55, (1460, 640), 1100, 0.35), (6.3, (1567, 634), 1800, 0.9),
        (7.32, (960, 300), 2000, 0.9), (8.5, (960, 540), 2200, 1.3), (11.1, (960, 540), 2000, 1.1),
    ]

    def shockwaves(self, t):
        """expanding shockwave rings (hot orange core, magenta rim) + hot centre glow."""
        out = None
        for t0, cen, sp, gain in self.SHOCKS:
            dt = t - t0
            if dt < 0 or dt > 0.75:
                continue
            if cen == "logo":
                cen = (self.logo_sx, INTRO_C[1])
            if out is None:
                out = np.zeros((H // 2, W // 2, 3), np.float32)
            X, Y = self.hx * 2 - cen[0], self.hy * 2 - cen[1]
            R = np.sqrt(X * X + Y * Y)
            Rr = sp * dt ** 0.7
            fade = (1 - dt / 0.75) ** 2 * gain
            wdt = 6 + 40 * dt
            d = R - Rr
            ring = np.exp(-(d / wdt) ** 2)
            rim = np.exp(-((d + wdt * 1.6) / (wdt * 1.8)) ** 2)
            core = np.exp(-(R / (90 + 500 * dt)) ** 2) * math.exp(-dt * 14)
            out += fade * (ring[..., None] * np.array([1.0, 0.55, 0.25], np.float32) * 1.4
                           + rim[..., None] * np.array([0.9, 0.05, 0.4], np.float32) * 0.6
                           + core[..., None] * np.array([1.0, 0.7, 0.45], np.float32) * 1.5)
        rf = ease(seg(t, 0.28, 0.45)) * (1 - ease(seg(t, 1.7, 2.4)))
        if rf > 0:
            if out is None:
                out = np.zeros((H // 2, W // 2, 3), np.float32)
            X, Y = self.hx * 2 - self.logo_sx - 200, self.hy * 2 - INTRO_C[1]
            R_ = np.sqrt(X * X + Y * Y)
            A = np.arctan2(Y, X)
            rays = (0.5 + 0.5 * np.cos(9 * A + 0.9 * t)) ** 5 + 0.6 * (0.5 + 0.5 * np.cos(14 * A - 1.3 * t + 1)) ** 7
            fall = np.exp(-R_ / 650) * (1 - np.exp(-(R_ / 160) ** 2))
            hue = 0.5 + 0.5 * np.cos(A + 0.6 * t)
            col = (hue[..., None] * np.array([1.0, 0.28, 0.03], np.float32)
                   + (1 - hue)[..., None] * np.array([0.95, 0.03, 0.42], np.float32))
            out += (rays * fall * rf * 0.75)[..., None] * col
        if out is None:
            return None
        return cv2.resize(out, (W, H), interpolation=cv2.INTER_LINEAR)

    def rings(self, t):
        return self.shockwaves(t)

    # ---------------- intro logo ----------------------------------------------
    def draw_logo(self, c, t):
        if t > 2.6:
            return
        z = 1 + 0.1 * ease_io(seg(t, 0.4, 1.9))
        dx = -30 * ease_io(seg(t, 0.9, 1.7))

        def P(x, y):
            return (x - INTRO_C[0]) * z + INTRO_C[0] + dx, (y - INTRO_C[1]) * z + INTRO_C[1]

        # spark
        ka = ease_out(seg(t, 0.28, 0.5))
        kr = 1 - ease(seg(t, self.rip[0] - 0.02, self.rip[0] + 0.1))
        sx, sy = P(self.logo_sx, INTRO_C[1] + 2)
        draw_spark(c, sx, sy, self.logo_r * z * lerp(0.5, 1, ka), alpha=ka * kr,
                   rot=0.8 * (1 - ka) + 0.05 * t, glow=0.7)
        f = serif(132 * z, 520)
        for i, ch in enumerate("Claude"):
            ta = 0.46 + 0.085 * i
            a = ease(seg(t, ta, ta + 0.14))
            if a <= 0:
                continue
            tc = self.rip[i]
            r = seg(t, tc, tc + 0.22)
            if r >= 1:
                continue
            x, y = P(self.logo_xs[i], self.logo_base)
            col = mix((244, 238, 228), (255, 220, 120), ease(r * 3))
            blur = 6 * (1 - ease(seg(t, ta, ta + 0.16))) + 10 * r
            # ripped letters get dragged towards their streak
            if r > 0:
                hx, hy = self.streaks[i].head(t)
                x, y = lerp(x, hx, ease(r) * 0.7), lerp(y, hy, ease(r) * 0.7)
            draw_text(c, ch, f, x, y, col, alpha=a * (1 - r), blur=blur, glow=0.35 + 1.2 * r,
                      glow_col=(255, 120, 60), glow_r=14)

    # ---------------- chat UI --------------------------------------------------
    def draw_ui(self, c, t):
        if t < 2.2 or t > 6.75:
            return
        z, cx, cy = self.camera(t)
        dy = self.box_dy(t)
        out = 1 - ease(seg(t, 6.3, 6.7))
        uib = 14 * ease(seg(t, 6.25, 6.65))  # blur-out on send

        def P(x, y):
            return (x - cx) * z + 960, (y + dy - cy) * z + 540

        # everything vector-drawn into a supersampled RGBA layer
        L = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))

        def Q(x, y):
            sx, sy = P(x, y)
            return sx * SS, sy * SS

        def layer_rr(box, r, fill, outline=None, width=2, alpha=1.0):
            if alpha <= 0.003:
                return
            x0, y0 = Q(box[0], box[1])
            x1, y1 = Q(box[2], box[3])
            pad = 4
            bx0, by0 = int(x0) - pad, int(y0) - pad
            tw_, th_ = int(x1 - x0) + 2 * pad + 2, int(y1 - y0) + 2 * pad + 2
            if bx0 >= L.width or by0 >= L.height or bx0 + tw_ <= 0 or by0 + th_ <= 0:
                return
            tmp = Image.new("RGBA", (tw_, th_), (0, 0, 0, 0))
            ImageDraw.Draw(tmp).rounded_rectangle(
                (x0 - bx0, y0 - by0, x1 - bx0, y1 - by0), radius=r * z * SS,
                fill=fill[:3] + (int(fill[3] * alpha),),
                outline=None if outline is None else outline[:3] + (int(outline[3] * alpha),),
                width=max(int(width * z * SS), 1))
            L.alpha_composite(tmp, (max(bx0, 0), max(by0, 0)),
                              (max(-bx0, 0), max(-by0, 0)))

        def layer_text(x, y, s, font_fn, size, fill, alpha=1.0, anchor="ls"):
            if alpha <= 0.003:
                return
            f = font_fn(size * z * SS)
            sx, sy = Q(x, y)
            tmp = Image.new("RGBA", L.size, (0, 0, 0, 0))
            ImageDraw.Draw(tmp).text((sx, sy), s, font=f, fill=fill[:3] + (int(255 * alpha),),
                                     anchor=anchor)
            L.alpha_composite(tmp)

        d = ImageDraw.Draw(L)

        # chat box
        box = (232, 446, 1637, 698)
        a_box = ease(seg(t, 2.2, 2.45))
        layer_rr(box, 40, (32, 32, 31, 240), (74, 74, 72, 255), 2, a_box)

        # controls
        a_ctl = ease(seg(t, 3.45, 3.8))
        if a_ctl > 0:
            g = int(170 * a_ctl)
            px, py = Q(306, 632)
            s = 13 * z * SS
            d.line((px - s, py, px + s, py), fill=(185, 185, 180, g), width=max(int(2 * z * SS), 1))
            d.line((px, py - s, px, py + s), fill=(185, 185, 180, g), width=max(int(2 * z * SS), 1))
            # send button
            layer_rr((1534, 602, 1600, 666), 12, BTN + (255,), None, alpha=a_ctl)
            bx, by = Q(1567, 634)
            s = 13 * z * SS
            lw = max(int(2.6 * z * SS), 1)
            d.line((bx, by + s, bx, by - s), fill=(255, 240, 235, int(255 * a_ctl)), width=lw)
            d.line((bx - s * 0.62, by - s * 0.35, bx, by - s - lw * 0.3), fill=(255, 240, 235, int(255 * a_ctl)), width=lw)
            d.line((bx + s * 0.62, by - s * 0.35, bx, by - s - lw * 0.3), fill=(255, 240, 235, int(255 * a_ctl)), width=lw)

            # model selector: Sonnet 4.6 rolls out, Opus 4.7 rolls in
            open_ = t > 4.42
            k = ease_io(seg(t, 5.55, 5.85))
            right = 1500
            chev_x = right - 8
            for label, col, off in ((MODELS[FROM_MODEL][0], (205, 205, 200), -k), (MODELS[TO_MODEL][0], OPUS, 1 - k)):
                if abs(off) >= 1:
                    continue
                aa = a_ctl * (1 - abs(off)) ** 1.5
                fx = sans(26 * z * SS).getlength(label) / (z * SS)
                layer_text(chev_x - 22 - fx, 641 + off * 34, label, sans, 26, col, aa)
            ccol = OPUS if k > 0.5 else (205, 205, 200)
            cxp, cyp = Q(chev_x, 632)
            s = 6 * z * SS
            lw = max(int(1.8 * z * SS), 1)
            if open_:
                d.line((cxp - s, cyp + s * 0.5, cxp, cyp - s * 0.5, cxp + s, cyp + s * 0.5),
                       fill=ccol + (int(255 * a_ctl),), width=lw)
            else:
                d.line((cxp - s, cyp - s * 0.4, cxp, cyp + s * 0.6, cxp + s, cyp - s * 0.4),
                       fill=ccol + (int(255 * a_ctl),), width=lw)

        # chips
        chips = CHIPS
        cf = 29
        widths = [sans(cf).getlength(s) + 76 for s in chips]
        gap = 17
        x = 935 - (sum(widths) + gap * (len(chips) - 1)) / 2
        for i, (s, wdt) in enumerate(zip(chips, widths)):
            a = ease(seg(t, 3.55 + 0.06 * i, 3.8 + 0.06 * i))
            if a > 0:
                layer_rr((x, 746, x + wdt, 810), 12, (24, 24, 23, 200), (82, 82, 80, 255), 2, a)
                self.chip_icon(d, Q, z, i, x + 30, 778, a)
                layer_text(x + 54, 789, s, sans, cf, (205, 205, 200), a)
            x += wdt + gap

        # dropdown
        a_dd = ease_out(seg(t, 4.42, 4.58))
        if a_dd > 0:
            items = MODELS
            top = 592 - 16 - 67 * len(items)
            k = ease_io(seg(t, 5.5, 5.62))
            lift = 12 * (1 - a_dd)
            layer_rr((1150, top + lift, 1508, 592 + lift), 14, (38, 38, 36, 250), (62, 62, 60, 255), 2, a_dd)
            sel_y = lerp(top + 8 + 67 * FROM_MODEL, top + 8 + 67 * TO_MODEL, k) + lift
            layer_rr((1158, sel_y + 2, 1500, sel_y + 64), 10, (54, 54, 52, 255), None, alpha=a_dd)
            a_desc = ease(seg(t, 4.5, 4.75))
            for i, (ti, de) in enumerate(items):
                y0 = top + 8 + 67 * i + lift
                tc = OPUS if (i == TO_MODEL and k > 0.5) else (232, 232, 228)
                layer_text(1172, y0 + 30, ti, sans, 22, tc, a_dd)
                layer_text(1172, y0 + 54, de, sans, 15, (150, 150, 146), a_dd * a_desc)
            # check mark
            for row, a in ((TO_MODEL, k), (FROM_MODEL, 1 - k)):
                if a <= 0.01:
                    continue
                y0 = top + 8 + 67 * row + lift + 30
                p = [Q(1468, y0), Q(1476, y0 + 8), Q(1490, y0 - 10)]
                d.line(p, fill=(230, 230, 226, int(255 * a * a_dd)), width=max(int(2.4 * z * SS), 1))

        L = L.resize((W, H), Image.BILINEAR) if SS != 1 else L
        ui = np.asarray(L).astype(np.float32) / 255.0
        ui[..., :3] *= ui[..., 3:4]
        if uib > 0.3:
            ui = cv2.GaussianBlur(ui, (0, 0), uib)
        blend(c, ui, 0, 0, out)

        # question words (delivered by streaks: arrive glowing orange then cool down)
        qf = sans(31 * z)
        for (wd, x), ta in zip(self.q_words, self.q_arrive):
            a = ease(seg(t, ta - 0.03, ta + 0.08))
            if a <= 0:
                continue
            cool = ease(seg(t, ta + 0.05, ta + 0.5))
            col = mix((255, 150, 60), (236, 236, 231), cool)
            jy = 14 * (1 - ease_out(seg(t, ta - 0.03, ta + 0.2))) * (1 if len(wd) % 2 else -1)
            sx, sy = P(x, 525 + jy)
            draw_text(c, wd, qf, sx, sy, col, alpha=a * out, blur=uib + 3 * (1 - a),
                      glow=1.6 * (1 - cool), glow_col=PINK if len(wd) % 2 else HOT, glow_r=10)

        # greeting
        if t > 3.4:
            hf = serif(76 * z, 400)
            sx, sy = P(525, 323)
            a = ease(seg(t, 3.42, 3.62))
            draw_spark(c, sx, sy, 30 * z, alpha=a * out, rot=0.4, glow=0.25, blur=uib + 6 * (1 - a))
            words = GREETING.split(" ") + [NAME]
            x = 596
            for i, wd in enumerate(words):
                ta = 3.45 + 0.13 * i
                a = ease(seg(t, ta, ta + 0.22))
                sx, sy = P(x, 323)
                draw_text(c, wd, hf, sx, sy + 8 * (1 - a), (242, 240, 234), alpha=a * out,
                          blur=uib + 9 * (1 - a), anchor="lm", glow=0.12, glow_col=(255, 255, 255),
                          glow_r=10)
                x += serif(76, 400).getlength(wd + " ")
            # the dropdown sits above the greeting
            if t > 4.42:
                self.redraw_dropdown_top = True

    def chip_icon(self, d, Q, z, i, x, y, a):
        col = (190, 190, 186, int(255 * a))
        lw = max(int(1.8 * z * SS), 1)

        def L(*pts):
            d.line([Q(x + px, y + py) for px, py in pts], fill=col, width=lw, joint="curve")

        if i == 0:      # </>
            L((-6, -7), (-12, 0), (-6, 7)); L((6, -7), (12, 0), (6, 7)); L((2, -9), (-2, 9))
        elif i == 1:    # create: tilted square brush
            L((-10, 4), (-2, -8), (8, -2), (0, 10), (-10, 4)); L((4, 6), (10, 10))
        elif i == 2:    # learn: mortarboard
            L((-13, -3), (0, -9), (13, -3), (0, 3), (-13, -3)); L((-7, 0), (-7, 7), (7, 7), (7, 0))
        elif i == 3:    # write: pencil
            L((-10, 10), (-9, 4), (5, -10), (10, -5), (-4, 9), (-10, 10))
        else:           # life stuff: cup
            L((-11, -4), (-9, 9), (6, 9), (8, -4), (-11, -4)); L((8, -1), (12, 0), (11, 5), (7, 6))
            L((-5, -11), (-4, -7)); L((0, -11), (1, -7))

    # ---------------- answer + titles ----------------------------------------
    def draw_answer(self, c, t):
        if t < 7.2 or t > 8.62:
            return
        out = 1 - ease(seg(t, 8.45, 8.6))
        f = self.ans_font
        n = len(self.ans_lines)
        for i, line in enumerate(self.ans_lines):
            if not line:
                continue
            ta = 7.28 + 0.042 * i
            k = seg(t, ta, ta + 0.42)
            if k <= 0:
                continue
            a = ease(seg(t, ta, ta + 0.1))
            sharp = ease(k)
            col = mix((255, 150, 60), (238, 236, 230), sharp)
            y = self.ans_y + self.ans_lh * i
            draw_text(c, line, f, self.ans_x, y, col, alpha=a * out, blur=10 * (1 - sharp) + 4 * (1 - out),
                      glow=1.4 * (1 - sharp), glow_col=(255, 90, 20), glow_r=12, anchor="ls")

    def draw_titles(self, c, t):
        if t < 8.5:
            return
        # big "Claude" punches in then settles left of the suffix
        k0 = ease_out(seg(t, 8.5, 8.62))
        k = ease_io(seg(t, 8.62, 9.15))
        size = lerp(200, 132, k)
        f = serif(size, 430)
        # current suffix widths for centring
        sf = serif(132, 560)
        widths = []
        for s, ts in SUFFIXES:
            widths.append(sf.getlength(s))
        # interpolate the centring width as suffixes swap
        wsuf = 0.0
        for j, (s, ts) in enumerate(SUFFIXES):
            kk = ease_io(seg(t, ts - 0.05, ts + 0.3))
            prev = widths[j - 1] if j > 0 else 0.0
            if t >= ts - 0.05:
                wsuf = lerp(prev, widths[j], kk)
        gap = serif(132, 430).getlength(" ") * k
        tw = f.getlength("Claude")
        total = tw + (gap + wsuf) * k
        x0 = 960 - total / 2
        y = lerp(470, 556, k)
        glow_col = HOT
        draw_text(c, "Claude", f, x0, y, PEACH, alpha=k0, blur=8 * (1 - k0), glow=0.9, glow_col=glow_col,
                  glow_r=16 + 8 * (1 - k))
        sx = x0 + tw + gap
        for j, (s, ts) in enumerate(SUFFIXES):
            te = SUFFIXES[j + 1][1] if j + 1 < len(SUFFIXES) else 99
            kin = seg(t, ts, ts + 0.38)
            kout = seg(t, te - 0.12, te + 0.18)
            if kin <= 0 or kout >= 1:
                continue
            a = ease(kin) * (1 - ease(kout))
            warm = ease(seg(t, ts + 0.12, ts + 0.45))
            col = mix((150, 140, 135), (255, 206, 150), warm)
            dy = 30 * (1 - ease_out(kin)) - 34 * ease_in(kout)
            gc = PINK if j % 2 == 0 else HOT
            # RGB-split ghosts while the word slams in / out
            split = 22 * (1 - ease_out(kin)) + 26 * kout
            if split > 1:
                for off, tint in ((-split, (255, 40, 90)), (split, (60, 200, 255))):
                    draw_text(c, s, sf, sx + off, 556 + dy, tint, alpha=0.45 * a, blur=2, )
            draw_text(c, s, sf, sx, 556 + dy, col, alpha=a, blur=10 * (1 - ease(kin)) + 9 * kout,
                      glow=1.3 * warm * (1 - kout), glow_col=gc, glow_r=18)

    # ---------------- frame ----------------------------------------------------
    def frame(self, t):
        c = np.zeros((H, W, 3), np.float32)
        c += self.red_field(t)
        rg = self.rings(t)
        if rg is not None:
            c += rg
        self.draw_ui(c, t)
        self.draw_logo(c, t)
        self.draw_answer(c, t)
        self.draw_titles(c, t)

        # streaks
        heat = np.zeros((H // 2, W // 2), np.uint8)
        for s in self.streaks:
            s.draw(heat, t, 0.5)
        if heat.any():
            c += cv2.resize(streak_light(heat), (W, H), interpolation=cv2.INTER_LINEAR)
        # flash where the send streak turns into the text
        fl = math.exp(-((t - 7.32) / 0.07) ** 2)
        if fl > 0.01:
            g = np.exp(-((self.hx * 2 - 960) / 420) ** 2 - ((self.hy * 2 - self.ans_y - 40) / 26) ** 2)
            c += cv2.resize(g, (W, H))[..., None] * np.array([1.0, 0.45, 0.1], np.float32) * fl * 1.3

        # impact post FX: zoom punch, shake, flash, RGB split
        punch = shake = flash = ca = 0.0
        for i, th in enumerate(HITS):
            dt = t - th
            if dt < -0.02 or dt > 0.6:
                continue
            e = math.exp(-max(dt, 0) * 9)
            big = 1.0 if th in (0.3, 6.3, 8.5, 11.1) else 0.55
            punch += 0.05 * big * e * (1 if dt >= 0 else 0)
            shake += 16 * big * e
            flash += 0.35 * big * math.exp(-max(dt, 0) * 22) * (dt >= 0)
            ca += 9 * big * e
        if punch > 0.001 or shake > 0.3:
            ang = 37.0 * t
            sx, sy = shake * math.sin(ang * 3.1), shake * math.cos(ang * 2.3)
            M = cv2.getRotationMatrix2D((W / 2, H / 2), 0.4 * shake / 16 * math.sin(ang), 1 + punch)
            M[0, 2] += sx
            M[1, 2] += sy
            c = cv2.warpAffine(c, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        if ca > 0.4:
            for ch, sgn in ((0, 1), (2, -1)):
                s_ = 1 + sgn * ca / W * 2
                M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s_)
                c[..., ch] = cv2.warpAffine(c[..., ch], M, (W, H), flags=cv2.INTER_LINEAR,
                                            borderMode=cv2.BORDER_REFLECT)
        if flash > 0.01:
            c += flash * np.array([1.0, 0.85, 0.75], np.float32)

        # bloom
        small = cv2.resize(c, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        br = np.maximum(small - 0.55, 0)
        bl = cv2.GaussianBlur(br, (0, 0), 10) * 0.6 + cv2.GaussianBlur(small, (0, 0), 30) * 0.12
        c += cv2.resize(bl, (W, H), interpolation=cv2.INTER_LINEAR)

        # vignette, global fade, tonemap, grain
        fade = ease(seg(t, 0.0, 0.25)) * (1 - ease(seg(t, DUR - 0.45, DUR - 0.05)))
        c *= fade
        c = 1 - np.exp(-c * 1.15)  # soft shoulder
        c = c / (1 - math.exp(-1.15))
        g = self.grain[int(t * FPS) % len(self.grain)]
        g = cv2.resize(g, (W, H), interpolation=cv2.INTER_NEAREST)
        c += g[..., None] * 0.012
        return (np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)


def ease_in(x):
    x = clamp(x)
    return x ** 3


# --------------------------------------------------------------------------
# sound design
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

    def bp_noise(lo, hi):
        x = rng.standard_normal(n)
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(n, 1 / sr)
        X[(f < lo) | (f > hi)] = 0
        return np.fft.irfft(X, n) / np.sqrt((hi - lo) / (sr / 2))

    def whoosh(a, d, amp=0.5, lo=300, hi=4000):
        k = np.clip((t - a) / d, 0, 1)
        return amp * bp_noise(lo, hi) * np.sin(np.pi * k) ** 2 * ((t >= a) & (t <= a + d))

    # dark drone
    drone = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(49, 0), (73.4, 1), (98, 2), (146.8, 0.4)])
    out += 0.05 * drone * np.minimum(t / 0.8, 1) * np.minimum((DUR - t) / 0.6, 1)
    # intro: soft rising tone + spark ping
    out += 0.25 * np.sin(2 * np.pi * 1760 * t) * env(0.3, 0.003, 0.5)
    out += 0.15 * np.sin(2 * np.pi * 2637 * t) * env(0.3, 0.003, 0.3)
    for i in range(6):  # letters
        out += 0.08 * np.sin(2 * np.pi * (900 + 80 * i) * t) * env(0.46 + 0.085 * i, 0.002, 0.05)
    # streaks rip the letters
    for a in (1.7, 1.95, 2.2):
        out += whoosh(a, 0.5, 0.35, 600, 6000)
    out += whoosh(2.2, 0.9, 0.25, 80, 600)  # chat box rising
    # words dropping in
    for a in (2.78, 2.86, 2.95, 3.05, 3.12, 3.24):
        out += 0.18 * np.sin(2 * np.pi * (1300 + 300 * rng.random()) * t) * env(a, 0.001, 0.03)
        out += 0.12 * bp_noise(2000, 8000) * env(a, 0.001, 0.02)
    # greeting shimmer
    for i, f in enumerate((1318.5, 1567.98, 1975.5)):
        out += 0.06 * np.sin(2 * np.pi * f * t) * env(3.45 + 0.13 * i, 0.01, 0.6)
    # camera dive + dropdown click + selection click
    out += whoosh(4.3, 0.5, 0.25, 200, 3000)
    out += 0.3 * np.sin(2 * np.pi * 2600 * t) * env(4.42, 0.0005, 0.015)
    out += 0.35 * np.sin(2 * np.pi * 2200 * t) * env(5.5, 0.0005, 0.02)
    out += whoosh(5.85, 0.45, 0.18, 200, 3000)
    # send
    out += whoosh(6.25, 1.1, 0.5, 400, 7000)
    out += 0.4 * np.sin(2 * np.pi * (60 + 200 * np.exp(-(t - 6.3) * 9)) * t) * env(6.3, 0.004, 0.35)
    # riser into the answer
    k = np.clip((t - 6.7) / 0.62, 0, 1)
    out += 0.3 * bp_noise(800, 9000) * k ** 2 * (t < 7.32)
    out += 0.4 * bp_noise(500, 9000) * env(7.32, 0.002, 0.25)
    out += 0.5 * np.sin(2 * np.pi * (50 + 120 * np.exp(-(t - 7.32) * 10)) * t) * env(7.32, 0.003, 0.6)
    # title hits
    out += 0.9 * np.sin(2 * np.pi * (42 + 100 * np.exp(-(t - 8.5) * 9)) * t) * env(8.5, 0.003, 1.0)
    out += 0.3 * bp_noise(200, 3000) * env(8.5, 0.002, 0.25)
    for a in (s[1] for s in SUFFIXES):
        out += whoosh(a - 0.15, 0.4, 0.22, 400, 5000)
        out += 0.45 * np.sin(2 * np.pi * (55 + 80 * np.exp(-(t - a) * 12)) * t) * env(a, 0.003, 0.5)
        out += 0.07 * np.sin(2 * np.pi * 1046.5 * t) * env(a + 0.1, 0.01, 0.6)
    out /= np.max(np.abs(out)) / 0.85
    st = np.stack([out, out], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


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
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)

    if args.preview:
        _init()
        for t in args.preview:
            p = f"out/preview_{t:05.2f}.png"
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
        for i, buf in enumerate(pool.imap(_render, range(n), chunksize=2)):
            ff.stdin.write(buf)
            if i % 30 == 0:
                print(f"frame {i}/{n}", file=sys.stderr, flush=True)
    ff.stdin.close()
    ff.wait()
    os.remove(wav)
    print(args.out)


if __name__ == "__main__":
    main()
