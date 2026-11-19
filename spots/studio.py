"""Cinematic studio car spots.

Each car is a cut-out photo placed in a virtual studio (infinity cove, floor
reflection, contact shadow, light sweep), filmed with a slow camera push and
finished with a film grade, bloom, vignette and grain.

    python3 studio.py bmw            # -> out/bmw.mp4
    python3 studio.py ferrari --preview 1.0 5.0
"""
import sys, subprocess, math, json, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
F_BOLD = os.path.join(HERE, 'fonts/Inter-Bold.ttf')
F_BLACK = os.path.join(HERE, 'fonts/Inter-Black.ttf')
F_LIGHT = os.path.join(HERE, 'fonts/Inter-Light.otf')
F_SEMI = os.path.join(HERE, 'fonts/Inter-SemiBold.ttf')

def ease(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def ease_out(x): x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3

# ───────────────────────── spot definitions ─────────────────────────
SPOTS = {
  'bmw': dict(
    size=(1080, 1920), dur=15.0, bpm=100, letterbox=False, theme='dark',
    tint=(0.55, 0.68, 1.0), glow=(0.30, 0.45, 0.85), key='blue',
    shots=[  # car, start, end, title, sub
      ('e30', 0.0, 3.6, 'M3', '1986   ·   200 PS   ·   2.3 L R4'),
      ('m2', 3.6, 5.4, 'M2', '2023   ·   460 PS   ·   3.0 L R6'),
      ('csl', 5.4, 7.2, 'M4 CSL', '2022   ·   550 PS   ·   307 km/h'),
      ('m8', 7.2, 9.0, 'M8', '2019   ·   625 PS   ·   4.4 L V8'),
      ('m5', 9.0, 10.8, 'M5', '2024   ·   727 PS   ·   V8 Hybrid'),
      ('xm', 10.8, 12.6, 'XM', '2023   ·   748 PS   ·   V8 Hybrid'),
    ],
    kicker='BMW M', end=dict(start=12.6, logo='logos/mlogo.png', line1='ONE LETTER.', line2='FOUR DECADES OF DRIVE.'),
  ),
  'ferrari': dict(
    size=(1920, 1080), dur=13.0, bpm=112, letterbox=True, theme='dark',
    tint=(1.0, 0.62, 0.52), glow=(0.85, 0.16, 0.08), key='red',
    shots=[
      ('f40', 0.0, 2.68, 'F40', '1987   ·   478 CV   ·   V8 Biturbo'),
      ('f50', 2.68, 4.29, 'F50', '1995   ·   520 CV   ·   V12'),
      ('enzo', 4.29, 5.89, 'Enzo', '2002   ·   660 CV   ·   V12'),
      ('laferrari', 5.89, 7.50, 'LaFerrari', '2013   ·   963 CV   ·   V12 Hybrid'),
      ('sp3', 7.50, 9.11, 'Daytona SP3', '2021   ·   840 CV   ·   V12'),
      ('f80', 9.11, 10.72, 'F80', '2024   ·   1200 CV   ·   V6 Hybrid'),
    ],
    kicker='THE HYPERCAR DYNASTY', end=dict(start=10.72, logo='logos/ferrari_crest.jpg', line1='SIX LEGENDS.', line2='ONE OBSESSION.'),
  ),
  'porsche': dict(
    size=(1920, 1080), dur=13.0, bpm=104, letterbox=True, theme='light',
    tint=(1.0, 0.98, 0.95), glow=(1.0, 1.0, 1.0), key='light',
    shots=[
      ('911', 0.0, 2.88, '911', 'Turbo S   ·   650 PS'),
      ('cayman', 2.88, 4.61, '718 Cayman', 'GTS 4.0   ·   400 PS'),
      ('taycan', 4.61, 6.34, 'Taycan', 'Elektrisch   ·   bis 1034 PS'),
      ('panamera', 6.34, 8.07, 'Panamera', 'GTS   ·   500 PS'),
      ('macan', 8.07, 9.80, 'Macan', 'Elektrisch   ·   bis 639 PS'),
      ('cayenne', 9.80, 11.0, 'Cayenne', 'Coupé   ·   bis 739 PS'),
    ],
    kicker='SECHS CHARAKTERE', end=dict(start=11.0, logo=None, word='PORSCHE', line1='Sechs Charaktere.', line2='Ein Herzschlag.'),
  ),
}

# ───────────────────────── helpers ─────────────────────────
def load_rgba(path):
    im = np.asarray(Image.open(os.path.join(HERE, path)).convert('RGBA')).astype(np.float32) / 255.
    return im

def text_layer(W, H, items):
    """items: list of (text, font, size, (x,y), anchor, tracking, color)"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for text, font, size, (x, y), anchor, track, col in items:
        f = ImageFont.truetype(font, size)
        if track:
            widths = [d.textlength(c, font=f) for c in text]
            total = sum(widths) + track * (len(text) - 1)
            cx = x - total / 2 if anchor[0] == 'm' else (x - total if anchor[0] == 'r' else x)
            for c, w in zip(text, widths):
                d.text((cx, y), c, font=f, fill=col, anchor='l' + anchor[1]); cx += w + track
        else:
            d.text((x, y), text, font=f, fill=col, anchor=anchor)
    return np.asarray(im).astype(np.float32) / 255.

def over(dst, src, a):
    a = a[..., None] if a.ndim == 2 else a
    return dst * (1 - a) + src * a

# ───────────────────────── studio set ─────────────────────────
class Stage:
    """Pre-renders one shot's background + car on an oversized canvas."""
    def __init__(self, spot, car, W, H, rng):
        self.W, self.H = W, H
        light = spot['theme'] == 'light'
        pad = 1.14
        CW, CH = int(W * pad), int(H * pad)
        self.CW, self.CH = CW, CH
        rgba = load_rgba(f'cars/{car}.webp')
        ch, cw = rgba.shape[:2]
        portrait = H > W
        target_w = (0.84 if portrait else 0.56) * W * pad
        if portrait and cw / ch < 1.6: target_w *= 0.9
        s = target_w / cw
        if not portrait and ch * s > 0.46 * H * pad: s = 0.46 * H * pad / ch
        rgba = cv2.resize(rgba, (int(cw * s), int(ch * s)), interpolation=cv2.INTER_AREA)
        ch, cw = rgba.shape[:2]
        floor_y = int(CH * (0.70 if portrait else 0.76))
        x0 = (CW - cw) // 2 + (0 if portrait else int(0.06 * W)); y0 = floor_y - ch
        floor_y = int(y0 + ch * 0.58)   # cove line sits behind the car
        self.car_box = (x0, y0, cw, ch)

        yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
        tint = np.array(spot['tint'], np.float32); glow = np.array(spot['glow'], np.float32)
        if light:
            wall = 0.86 - 0.10 * (1 - yy / floor_y)
            floor = 0.80 + 0.10 * np.clip((yy - floor_y) / (CH - floor_y), 0, 1)
            base = np.where(yy < floor_y, wall, floor)
            cove = np.exp(-((yy - floor_y) / (0.10 * CH)) ** 2) * 0.05
            bg = (base + cove)[..., None] * tint
            pool = np.exp(-(((xx - CW / 2) / (0.55 * CW)) ** 2 + ((yy - floor_y) / (0.16 * CH)) ** 2))
            bg += pool[..., None] * 0.06
        else:
            wall = 0.035 + 0.05 * (yy / floor_y)
            floor = 0.03 * (1 - np.clip((yy - floor_y) / (CH - floor_y), 0, 1)) + 0.012
            base = np.where(yy < floor_y, wall, floor)
            bg = base[..., None] * tint
            halo = np.exp(-(((xx - CW / 2) / (0.42 * CW)) ** 2 + ((yy - (floor_y - 0.35 * ch)) / (0.30 * CH)) ** 2))
            bg += halo[..., None] * glow * 0.22
            pool = np.exp(-(((xx - CW / 2) / (0.50 * CW)) ** 2 + ((yy - floor_y) / (0.07 * CH)) ** 2))
            bg += pool[..., None] * (0.10 * tint)
            # top softbox strip
            strip = np.exp(-((yy - 0.02 * CH) / (0.08 * CH)) ** 2) * np.exp(-((xx - CW / 2) / (0.35 * CW)) ** 4)
            bg += strip[..., None] * 0.08 * tint
        # soft haze to break banding
        noise = cv2.GaussianBlur(rng.standard_normal((CH // 8, CW // 8)).astype(np.float32), (0, 0), 3)
        bg += cv2.resize(noise, (CW, CH))[..., None] * (0.010 if not light else 0.006)

        # per-column ground line (lowest opaque pixel of the car)
        car_rgb, car_a = rgba[..., :3], rgba[..., 3]
        solid = car_a > 0.5
        has = solid.any(axis=0)
        bottom = np.where(has, ch - 1 - np.argmax(solid[::-1], axis=0), -1).astype(np.float32)
        cols = np.where(has)[0]
        # smooth ground line: fill gaps, then take a lower envelope so it touches the tyres
        bottom = np.interp(np.arange(cw), cols, bottom[cols]).astype(np.float32)
        env = cv2.dilate(bottom[None], np.ones((1, max(3, cw // 6)), np.float32))[0]
        ground = cv2.GaussianBlur(env[None], (0, 0), cw / 60)[0]
        # contact shadow following the ground line
        sh = np.zeros((CH, CW), np.float32); sh2 = np.zeros((CH, CW), np.float32)
        xs = np.arange(cw)
        for x in xs[::2]:
            gy = int(y0 + ground[x])
            if has[max(0, x - 40):x + 40].any():
                cv2.line(sh, (x0 + x, gy - int(ch * .10)), (x0 + x, gy + int(ch * .02)), 1.0, 3)
                if solid[:, x].any():
                    cv2.line(sh2, (x0 + x, gy - int(ch * .02)), (x0 + x, gy + 2), 1.0, 3)
        sh = cv2.GaussianBlur(sh, (0, 0), ch * 0.05)
        sh2 = cv2.GaussianBlur(sh2, (0, 0), ch * 0.010)
        dark = np.clip(sh * (0.85 if not light else 0.5) + sh2 * (0.75 if not light else 0.6), 0, 0.94)
        bg *= (1 - dark)[..., None]

        # floor reflection, mirrored around the ground line per column
        gyy, gxx = np.mgrid[0:ch, 0:cw].astype(np.float32)
        gl = ground[None, :]
        map_y = 2 * gl - (gyy + gl)          # target row gl+gyy  <- source row gl-gyy
        refl = cv2.remap(car_rgb, gxx, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        ra = cv2.remap(car_a, gxx, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        fade = np.clip(1 - gyy / (0.42 * ch), 0, 1) ** 1.7
        ra = ra * fade * (0.30 if not light else 0.15)
        refl = cv2.GaussianBlur(refl, (0, 0), 3); ra = cv2.GaussianBlur(ra, (0, 0), 3)
        canvas_r = np.zeros((CH + ch, CW, 3), np.float32); canvas_a = np.zeros((CH + ch, CW), np.float32)
        # place each column starting at its ground line
        for x in range(cw):
            gy = int(y0 + ground[x])
            canvas_r[gy:gy + ch, x0 + x] = refl[:, x]; canvas_a[gy:gy + ch, x0 + x] = ra[:, x]
        bg = over(bg, canvas_r[:CH], canvas_a[:CH])
        self.bg = np.clip(bg, 0, 1)

        # car: subtle grade (contrast + slight tint toward set)
        car = car_rgb.copy()
        lum = car.mean(axis=2, keepdims=True)
        car = np.clip((car - 0.5) * 1.08 + 0.5, 0, 1)
        car = car * (0.92 + 0.08 * tint) if not light else car
        # edge light: darken the cut-out rim slightly so it sits in the set
        er = cv2.erode(car_a, np.ones((5, 5), np.float32))
        rim = np.clip(car_a - er, 0, 1)
        car *= (1 - 0.35 * rim)[..., None]
        self.car = np.zeros((CH, CW, 3), np.float32); self.car_a = np.zeros((CH, CW), np.float32)
        self.car[y0:y0 + ch, x0:x0 + cw] = car; self.car_a[y0:y0 + ch, x0:x0 + cw] = car_a
        self.car_lum = np.zeros((CH, CW), np.float32); self.car_lum[y0:y0 + ch, x0:x0 + cw] = lum[..., 0]
        self.light = light

    def frame(self, k, sweep, reveal=1.0, drift=1.0):
        """k: 0..1 progress through shot."""
        W, H, CW, CH = self.W, self.H, self.CW, self.CH
        def M(scale, dx):
            # map canvas -> output: centre crop with zoom
            s = scale * W / CW * 1.0
            tx = W / 2 - (CW / 2 + dx) * s
            ty = H / 2 - (CH / 2) * s
            return np.float32([[s, 0, tx], [0, s, ty]])
        z = 1.0 + 0.055 * ease(k)
        bgM = M(z * 1.02, -18 * drift * (k - .5))
        carM = M(z * 1.025, -40 * drift * (k - .5))
        bg = cv2.warpAffine(self.bg, bgM, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        car = cv2.warpAffine(self.car, carM, (W, H), flags=cv2.INTER_LINEAR)
        ca = cv2.warpAffine(self.car_a, carM, (W, H), flags=cv2.INTER_LINEAR)
        cl = cv2.warpAffine(self.car_lum, carM, (W, H), flags=cv2.INTER_LINEAR)
        # light sweep across the body
        if sweep is not None:
            yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
            p = (xx * 0.92 + yy * 0.40) / (W * 0.92 + H * 0.40)
            band = np.exp(-((p - sweep) / 0.045) ** 2) + 0.35 * np.exp(-((p - sweep + 0.08) / 0.02) ** 2)
            spec = band * ca * (0.25 + 0.9 * cl ** 1.5)
            car = car + spec[..., None] * (0.55 if not self.light else 0.35)
        if reveal < 1.0:
            lit = reveal
            car = car * (0.06 + 0.94 * lit)
            bg = bg * (0.25 + 0.75 * lit)
        return over(bg, car, ca)

# ───────────────────────── post ─────────────────────────
class Post:
    def __init__(self, W, H, spot, seed=7):
        self.W, self.H = W, H
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        self.vig = (1 - 0.32 * np.clip(r - 0.35, 0, 1) ** 1.4)[..., None] if spot['theme'] == 'dark' else (1 - 0.12 * np.clip(r - 0.5, 0, 1))[..., None]
        self.rng = np.random.default_rng(seed)
        g = self.rng.standard_normal((8, H // 2, W // 2)).astype(np.float32)
        self.grain = [cv2.resize(cv2.GaussianBlur(x, (0, 0), 0.6), (W, H)) for x in g]
        self.light = spot['theme'] == 'light'
        self.lb = int(H * 0.115) if spot['letterbox'] else 0

    def __call__(self, img, i, flash=0.0):
        # bloom
        small = cv2.resize(img, (self.W // 4, self.H // 4), interpolation=cv2.INTER_AREA)
        hi = np.clip(small - (0.72 if not self.light else 0.92), 0, 1)
        bloom = cv2.resize(cv2.GaussianBlur(hi, (0, 0), 6), (self.W, self.H))
        img = img + bloom * 0.9
        # filmic curve + split tone
        img = np.clip(img, 0, 4)
        img = img / (1 + 0.12 * img) * 1.12
        if not self.light:
            img = img * self.vig
            sh = np.clip(1 - img.mean(axis=2, keepdims=True) * 2.2, 0, 1)
            img = img + sh * np.float32([-0.004, 0.004, 0.012])
        else:
            img = img * self.vig
        img = img + flash
        img = img + self.grain[i % len(self.grain)][..., None] * (0.022 if not self.light else 0.014)
        if self.lb:
            img[:self.lb] = 0; img[-self.lb:] = 0
        return np.clip(img, 0, 1)

# ───────────────────────── render ─────────────────────────
def render(name, preview=None):
    spot = SPOTS[name]; W, H = spot['size']; dur = spot['dur']
    rng = np.random.default_rng(3)
    beat = 60 / spot['bpm']
    stages = {c: Stage(spot, c, W, H, rng) for c, *_ in spot['shots']}
    post = Post(W, H, spot)
    portrait = H > W
    light = spot['theme'] == 'light'
    ink = (20, 20, 22, 255) if light else (245, 245, 242, 255)
    sub_ink = (60, 60, 64, 255) if light else (200, 200, 205, 255)
    lb = post.lb

    # text layers
    texts = {}
    for c, t0, t1, title, sub in spot['shots']:
        if portrait:
            items = [(spot['kicker'], F_SEMI, 30, (W / 2, H * 0.165), 'mm', 9, sub_ink),
                     (title, F_BLACK, 170 if len(title) < 5 else 120, (W / 2, H * 0.245), 'mm', 0, ink),
                     (sub, F_LIGHT, 34, (W / 2, H * 0.315), 'mm', 2, sub_ink)]
        else:
            x = W * 0.075; y = lb + H * 0.11
            items = [(spot['kicker'], F_SEMI, 20, (x, y), 'ls', 7, sub_ink),
                     (title, F_BLACK, 96, (x - 4, y + 100), 'ls', 0, ink),
                     (sub, F_LIGHT, 26, (x, y + 146), 'ls', 2, sub_ink)]
        texts[c] = text_layer(W, H, items)

    end = spot['end']
    end_bg = np.zeros((H, W, 3), np.float32) + (np.float32([0.93, 0.93, 0.92]) if light else 0.0)
    logo = None
    if end.get('logo'):
        lg = load_rgba(end['logo'])
        if lg.shape[2] == 4 and end['logo'].endswith('.jpg'): lg[..., 3] = 1
        target = (W * 0.42 if portrait else H * 0.22)
        if end['logo'].endswith('.jpg'):  # crest card: rounded corners
            s = (H * 0.30) / lg.shape[0]
        else:
            s = target / lg.shape[1]
        lg = cv2.resize(lg, (int(lg.shape[1] * s), int(lg.shape[0] * s)), interpolation=cv2.INTER_AREA)
        if end['logo'].endswith('.jpg'):
            m = Image.new('L', (lg.shape[1], lg.shape[0]), 0)
            ImageDraw.Draw(m).rounded_rectangle((0, 0, lg.shape[1] - 1, lg.shape[0] - 1), int(lg.shape[1] * 0.08), fill=255)
            lg[..., 3] = np.asarray(m, np.float32) / 255.
        logo = lg
    ly = H * (0.42 if portrait else 0.40)
    if portrait:
        end_items = [(end['line1'], F_BLACK, 92, (W / 2, H * 0.60), 'mm', 0, ink),
                     (end['line2'], F_LIGHT, 40, (W / 2, H * 0.655), 'mm', 3, sub_ink)]
    else:
        end_items = [(end['line1'], F_BLACK, 64, (W / 2, H * 0.66), 'mm', 0, ink),
                     (end['line2'], F_LIGHT, 32, (W / 2, H * 0.73), 'mm', 3, sub_ink)]
    if end.get('word'):
        end_items.insert(0, (end['word'], F_BOLD, 110, (W / 2, H * 0.43), 'mm', 34, ink))
        end_items[1] = (end['line1'], F_LIGHT, 40, (W / 2, H * 0.60), 'mm', 2, sub_ink)
        end_items[2] = (end['line2'], F_BOLD, 40, (W / 2, H * 0.665), 'mm', 2, ink)
    end_txt1 = text_layer(W, H, end_items[:-1])
    end_txt2 = text_layer(W, H, end_items[-1:])

    cuts = [t0 for _, t0, *_ in spot['shots']][1:] + [end['start']]

    def frame_at(t, i):
        img = None; flash = 0.0
        if t < end['start']:
            for c, t0, t1, title, sub in spot['shots']:
                if t0 <= t < t1: break
            k = (t - t0) / (t1 - t0)
            first = t0 == 0
            reveal = ease((t - 0.2) / 1.6) if first else 1.0
            sweep_t = (t - t0 - (0.5 if first else 0.0)) / ((t1 - t0) * (0.9 if first else 1.1))
            sweep = -0.15 + 1.4 * ease_out(sweep_t) if sweep_t > 0 else -1
            img = stages[c].frame(k, sweep, reveal)
            # title
            ta0 = t0 + (1.1 if first else 0.12)
            a = ease((t - ta0) / 0.35) * (1 - ease((t - (t1 - 0.12)) / 0.12))
            if a > 0:
                dy = int((1 - ease_out((t - ta0) / 0.5)) * 18)
                tl = texts[c]
                if dy: tl = np.roll(tl, dy, axis=0)
                img = over(img, tl[..., :3], tl[..., 3] * a)
            # cut flash
            for ct in cuts:
                if 0 <= t - ct < 0.2: flash = (0.18 if not light else 0.08) * (1 - (t - ct) / 0.2) ** 2
            # last frames before end card dip
            if end['start'] - t < 0.15: img = img * ((end['start'] - t) / 0.15) + (end_bg * (1 - (end['start'] - t) / 0.15) if light else 0)
        else:
            te = t - end['start']
            img = end_bg.copy()
            if not light:
                yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
                g = np.exp(-(((xx - W / 2) / (0.45 * W)) ** 2 + ((yy - ly) / (0.30 * H)) ** 2))
                img += g[..., None] * np.float32(spot['glow']) * 0.12 * ease(te / 0.8)
            if logo is not None:
                a = ease(te / 0.5)
                s = 1.06 - 0.06 * ease_out(te / 1.2)
                lg = cv2.resize(logo, (int(logo.shape[1] * s), int(logo.shape[0] * s)))
                h, w = lg.shape[:2]; x0 = int(W / 2 - w / 2); y0 = int(ly - h / 2)
                img[y0:y0 + h, x0:x0 + w] = over(img[y0:y0 + h, x0:x0 + w], lg[..., :3], lg[..., 3] * a)
                # glint
                gx = (te - 0.5) / 0.7
                if 0 < gx < 1:
                    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
                    band = np.exp(-(((xx + yy * 0.5) / (w + h * 0.5)) - gx) ** 2 / 0.004)
                    img[y0:y0 + h, x0:x0 + w] += (band * lg[..., 3] * 0.45)[..., None]
            a1 = ease((te - 0.45) / 0.4); a2 = ease((te - 0.9) / 0.4)
            img = over(img, end_txt1[..., :3], end_txt1[..., 3] * a1)
            img = over(img, end_txt2[..., :3], end_txt2[..., 3] * a2)
            if te < 0.2: flash = 0.0
            fade = 1 - ease((t - (dur - 0.35)) / 0.35)
            img = img * fade + (end_bg * (1 - fade) if light else 0)
        return post(img, i, flash)

    out_dir = os.path.join(HERE, 'out')
    if preview:
        for t in preview:
            f = frame_at(t, int(t * FPS))
            Image.fromarray((f * 255).astype(np.uint8)).save(os.path.join(out_dir, f'{name}_{t:.2f}.png'))
        return
    import audio
    wav = os.path.join(out_dir, f'{name}.wav')
    audio.make(name, spot, wav)
    n = int(round(dur * FPS))
    out = os.path.join(out_dir, f'{name}.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-i', wav, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                          '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        f = frame_at(i / FPS, i)
        p.stdin.write((f * 255 + 0.5).astype(np.uint8).tobytes())
        if i % 60 == 0: print(name, i, '/', n, flush=True)
    p.stdin.close(); p.wait()
    print('wrote', out)

if __name__ == '__main__':
    name = sys.argv[1]
    if '--preview' in sys.argv:
        render(name, [float(x) for x in sys.argv[sys.argv.index('--preview') + 1:]])
    else:
        render(name)
