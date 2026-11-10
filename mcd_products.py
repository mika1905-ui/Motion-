"""Procedural illustrations of the McDonald's classics + the arches logo.

    python3 mcd_products.py          # -> assets/mcd/<key>.png (1000x1000 RGBA)
    python3 mcd_products.py --sheet  # also writes out/preview_mcd_sheet.png

Everything is drawn from shapes (no photos): every element is a supersampled
mask that gets a vertical gradient, a "puffy" edge shading from a distance
transform, an optional specular blob and texture, and casts a soft shadow onto
what is already painted below it.
"""
import math, os, sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter

S = 1000          # canvas size
SS = 3            # supersampling for masks
YY, XX = np.mgrid[0:S, 0:S].astype(np.float32)
OUTDIR = "assets/mcd"

RED = (218, 41, 28)
YELLOW = (255, 199, 44)


def c(rgb):
    return np.array(rgb, np.float32) / 255.0


def smoothstep(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1)
    return x * x * (3 - 2 * x)


# --------------------------------------------------------------------------
# masks
# --------------------------------------------------------------------------
class Mask:
    def __init__(self):
        self.im = Image.new("L", (S * SS, S * SS), 0)
        self.d = ImageDraw.Draw(self.im)

    def poly(self, pts, fill=255):
        self.d.polygon([(float(x) * SS, float(y) * SS) for x, y in pts], fill=fill)
        return self

    def ell(self, cx, cy, rx, ry, fill=255):
        self.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=fill)
        return self

    def rect(self, x0, y0, x1, y1, r=0, fill=255):
        self.d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS, fill=fill)
        return self

    def line(self, pts, w, fill=255):
        p = [(float(x) * SS, float(y) * SS) for x, y in pts]
        self.d.line(p, fill=fill, width=max(1, int(w * SS)), joint="curve")
        for x, y in (p[0], p[-1]):
            r = w * SS / 2
            self.d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
        return self

    def get(self):
        return np.asarray(self.im.resize((S, S), Image.BOX), np.float32) / 255.0


def rot_pts(xs, ys, cx, cy, deg):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    dx, dy = xs - cx, ys - cy
    return cx + dx * ca - dy * sa, cy + dx * sa + dy * ca


def wobble(t, amp, seed, k=(2, 3, 5, 7)):
    rng = np.random.default_rng(seed)
    w = np.zeros_like(t)
    for kk in k:
        w += rng.uniform(0.3, 1.0) * np.sin(kk * t + rng.uniform(0, 6.28)) / kk ** 0.5
    return 1 + amp * w


def se_pts(cx, cy, a, b_top, b_bot, p=2.5, n=400, wob=0.0, seed=0, rot=0.0):
    """Superellipse outline; different vertical radii above/below the centre."""
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    co, si = np.cos(t), np.sin(t)
    x = a * np.sign(co) * np.abs(co) ** (2 / p)
    y = np.sign(si) * np.abs(si) ** (2 / p)
    y = np.where(si > 0, y * b_bot, y * b_top)
    if wob:
        r = wobble(t, wob, seed)
        x, y = x * r, y * r
    xs, ys = cx + x, cy + y
    if rot:
        xs, ys = rot_pts(xs, ys, cx, cy, rot)
    return list(zip(xs, ys))


def fbm(seed, octaves=((3, 0.5), (7, 0.3), (16, 0.2))):
    rng = np.random.default_rng(seed)
    out = np.zeros((S, S), np.float32)
    for sigma, w in octaves:
        n = gaussian_filter(rng.standard_normal((S, S)).astype(np.float32), sigma)
        out += w * n / (n.std() + 1e-6)
    return out


# --------------------------------------------------------------------------
# painting
# --------------------------------------------------------------------------
def new_canvas():
    return np.zeros((S, S, 4), np.float32)  # premultiplied rgb + alpha


def over(cv, col, a):
    a3 = a[..., None]
    cv[..., :3] = col * a3 + cv[..., :3] * (1 - a3)
    cv[..., 3] = a + cv[..., 3] * (1 - a)


def cast(cv, m, dy=10, dx=0, blur=9, k=0.38):
    """Soft shadow of mask m (shifted) onto what is already painted."""
    if m.max() <= 0:
        return
    sh = np.roll(np.roll(m, int(dy), 0), int(dx), 1)
    sh = gaussian_filter(sh, blur) * k
    cv[..., :3] *= (1 - sh)[..., None]


def paint(cv, m, ctop, cbot, puff=22, edge=0.35, spec=None, tex=None, shadow=None,
          yrange=None, hgrad=None):
    if m.max() <= 0:
        return
    if shadow:
        cast(cv, m, *shadow)
    if yrange is None:
        ys = np.where(m.max(1) > 0.02)[0]
        y0, y1 = float(ys[0]), float(ys[-1] + 1)
    else:
        y0, y1 = yrange
    g = np.clip((YY - y0) / max(y1 - y0, 1), 0, 1)[..., None]
    col = c(ctop) * (1 - g) + c(cbot) * g
    if hgrad is not None:            # (x0, x1, k): lighter left -> darker right
        x0, x1, kk = hgrad
        h = np.clip((XX - x0) / (x1 - x0), 0, 1)
        col = col * (1 + kk * (0.5 - h))[..., None]
    if edge:
        d = distance_transform_edt(m > 0.5)
        col = col * (1 - edge * (1 - smoothstep(0, puff, d)))[..., None]
    if tex is not None:
        col = col * (1 + tex)[..., None]
    if spec:
        sx, sy, rx, ry, k = spec
        blob = np.exp(-(((XX - sx) / rx) ** 2 + ((YY - sy) / ry) ** 2)) * k
        col = col + blob[..., None] * (1 - col)
    over(cv, np.clip(col, 0, 1), m)


def flat(cv, m, rgb, alpha=1.0):
    over(cv, np.broadcast_to(c(rgb), (S, S, 3)), m * alpha)


# --------------------------------------------------------------------------
# logo
# --------------------------------------------------------------------------
def arches_path(cx, base, w, n=600):
    """Centre-line samples (x, y, radius, s) of the double arch, s in 0..1 along
    the path (left foot -> left arch -> middle V -> right arch -> right foot)."""
    unit = w / 2.3
    H, xc, hw = 1.78, 0.45, 0.55
    pts = []
    for side in (-1, 1):
        us = np.linspace(-1, 0.818, n // 2) if side < 0 else np.linspace(-0.818, 1, n // 2)
        for u in us:
            x = side * xc + u * hw
            y = H * (1 - u * u)
            r = 0.083 + 0.042 * (1 - y / H) ** 1.5
            pts.append((cx + x * unit, base - y * unit, r * unit))
    pts = np.array(pts, np.float32)
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(pts[:, :2], axis=0).T))]
    return pts, seg / seg[-1]


def draw_arches(mask, cx, base, w, fill=255, upto=1.0):
    pts, s = arches_path(cx, base, w)
    k = SS if isinstance(mask, Mask) else 1
    d = mask.d if isinstance(mask, Mask) else mask
    for (x, y, r), si in zip(pts, s):
        if si > upto:
            break
        d.ellipse([(x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k], fill=fill)


def arches_mask(cx, base, w):
    m = Mask()
    draw_arches(m, cx, base, w)
    m.d.rectangle([0, base * SS, S * SS, S * SS], fill=0)   # flat feet
    return m.get()


def paint_arches(cv, cx, base, w, shadow=True):
    m = arches_mask(cx, base, w)
    if shadow:
        cast(cv, m, dy=3, blur=3, k=0.25)
    paint(cv, m, (255, 214, 70), (250, 180, 20), puff=4, edge=0.15)


def render_logo(w, pad=40):
    """Standalone RGBA logo image (w wide) + per-pixel draw-on progress map."""
    unit = w / 2.3
    H = int(2.05 * unit) + 2 * pad
    W = int(w + 2 * pad)
    base = H - pad
    ss = 3
    mk = Image.new("L", (W * ss, H * ss), 0)
    pr = Image.new("L", (W, H), 0)
    pts, s = arches_path(W / 2, base, w)
    dm, dp = ImageDraw.Draw(mk), ImageDraw.Draw(pr)
    for (x, y, r), si in zip(pts, s):
        dm.ellipse([(x - r) * ss, (y - r) * ss, (x + r) * ss, (y + r) * ss], fill=255)
        dp.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=int(1 + 254 * si))
    dm.rectangle([0, base * ss, W * ss, H * ss], fill=0)
    a = np.asarray(mk.resize((W, H), Image.BOX), np.float32) / 255.0
    yy = np.arange(H, dtype=np.float32)[:, None]
    g = np.clip((yy - pad) / (base - pad), 0, 1)
    col = c((255, 216, 72)) * (1 - g[..., None]) + c((252, 184, 22)) * g[..., None]
    col = np.broadcast_to(col, (H, W, 3))
    rgba = np.dstack([col, a])
    prog = np.asarray(pr, np.float32) / 255.0
    return rgba, prog


# --------------------------------------------------------------------------
# burger parts  (all take the top y of the part, its height and width)
# --------------------------------------------------------------------------
CX = 500


def top_bun(cv, y, h, W, sesame=True, pale=False, seed=1):
    cy = y + h * 0.8
    m = Mask().poly(se_pts(CX, cy, W / 2, h * 0.8, h * 0.2, p=2.25, wob=0.006, seed=seed)).get()
    if pale:
        ctop, cbot = (246, 222, 172), (252, 236, 200)
    else:
        ctop, cbot = (198, 108, 36), (238, 166, 78)
    tex = (0.012 if pale else 0.022) * fbm(seed + 50, ((10, 0.6), (30, 0.4)))
    paint(cv, m, ctop, cbot, puff=h * 0.35, edge=0.4, tex=tex,
          spec=(CX - W * 0.18, y + h * 0.28, W * 0.2, h * 0.22, 0.55), shadow=(12, 0, 10, 0.45))
    if sesame:
        rng = np.random.default_rng(seed)
        sm = Mask()
        n = 0
        while n < int(W / 14):
            sx = rng.uniform(CX - W * 0.44, CX + W * 0.44)
            sy = rng.uniform(y + h * 0.12, y + h * 0.66)
            yi, xi = int(sy), int(sx)
            if m[min(yi + 12, S - 1), xi] < 0.99 or m[max(yi - 14, 0), xi] < 0.99:
                continue
            # foreshorten towards the rim of the dome
            fx = 1 - 0.55 * abs(sx - CX) / (W / 2)
            ang = rng.uniform(-40, 40)
            sm.poly(se_pts(sx, sy, 9.5 * fx + 2, 5.2, 5.2, p=2, n=24, rot=ang))
            n += 1
        smm = sm.get()
        cast(cv, smm, dy=3, blur=2, k=0.35)
        paint(cv, smm, (255, 246, 214), (230, 205, 150), puff=3, edge=0.35)
    return m


def bottom_bun(cv, y, h, W, pale=False, seed=2):
    m = Mask().poly(se_pts(CX, y + h * 0.32, W / 2 * 0.97, h * 0.32, h * 0.68, p=2.6, wob=0.004, seed=seed)).get()
    if pale:
        crust = ((248, 214, 160), (226, 184, 124))
    else:
        crust = ((232, 160, 74), (186, 106, 40))
    paint(cv, m, *crust, puff=h * 0.3, edge=0.4, shadow=(12, 0, 10, 0.4),
          spec=(CX - W * 0.2, y + h * 0.55, W * 0.18, h * 0.25, 0.3))
    crumb = m * (YY < y + h * 0.36)
    paint(cv, crumb, (252, 230, 186), (240, 208, 150), puff=6, edge=0.25)
    return m


def club_bun(cv, y, h, W, seed=3):
    m = Mask().poly(se_pts(CX, y + h * 0.5, W / 2 * 0.97, h * 0.5, h * 0.5, p=3.2, seed=seed)).get()
    paint(cv, m, (236, 170, 84), (200, 124, 50), puff=h * 0.35, edge=0.35, shadow=(10, 0, 9, 0.4))
    paint(cv, m * (YY < y + h * 0.28), (252, 230, 186), (244, 214, 160), puff=5, edge=0.2)
    paint(cv, m * (YY > y + h * 0.8), (246, 214, 160), (236, 196, 136), puff=5, edge=0.2)
    return m


def patty(cv, y, h, W, seed=4):
    m = Mask().poly(se_pts(CX, y + h / 2, W / 2 * 1.03, h / 2, h / 2, p=4.5, wob=0.02, seed=seed)).get()
    tex = 0.32 * fbm(seed, ((1.2, 0.5), (3, 0.3), (8, 0.2)))
    paint(cv, m, (128, 74, 44), (66, 36, 22), puff=h * 0.3, edge=0.4, tex=tex,
          spec=(CX - W * 0.2, y + h * 0.3, W * 0.25, h * 0.3, 0.12), shadow=(10, 0, 9, 0.45))
    return m


def cheese(cv, y, h, W, drips=(), half=None, seed=5):
    x0, x1 = CX - W / 2 * 1.04, CX + W / 2 * 1.04
    if half == "left":
        x1 = CX + 20
    mk = Mask().rect(x0, y, x1, y + h, r=3)
    # droopy corners of a square slice seen from the side
    mk.poly([(x0 - 6, y), (x0 + 70, y + h), (x0 + 6, y + h * 3.2)])
    if half != "left":
        mk.poly([(x1 + 6, y), (x1 - 70, y + h), (x1 - 6, y + h * 3.0)])
    for dx, L, w in drips:
        x = CX + dx
        mk.poly([(x - w / 2, y + h - 2), (x + w / 2, y + h - 2), (x + w * 0.3, y + h + L), (x - w * 0.3, y + h + L)])
        mk.ell(x, y + h + L, w * 0.3, w * 0.34)
    m = mk.get()
    paint(cv, m, (255, 206, 60), (244, 152, 18), puff=7, edge=0.25,
          spec=(CX - W * 0.25, y + h * 0.4, W * 0.2, h * 1.2, 0.25), shadow=(6, 0, 5, 0.35))
    return m


def lettuce(cv, y, h, W, seed=6, shredded=False):
    xs = np.linspace(CX - W / 2 * 1.08, CX + W / 2 * 1.08, 300)
    rng = np.random.default_rng(seed)
    ph = rng.uniform(0, 6, 3)
    top = y + 4 * np.sin(xs * 0.03 + ph[0])
    if shredded:
        bot = y + h * 0.6 + np.repeat(rng.uniform(0, h * 0.9, 30), 10)
        bot += 6 * np.abs(np.sin(xs * 0.4))
        ctop, cbot = (196, 232, 132), (120, 180, 64)
    else:
        bot = y + h + 11 * np.abs(np.sin(xs * 0.045 + ph[1])) + 5 * np.sin(xs * 0.13 + ph[2])
        ctop, cbot = (156, 210, 74), (70, 140, 36)
    pts = list(zip(xs, top)) + list(zip(xs[::-1], bot[::-1]))
    m = Mask().poly(pts).get()
    paint(cv, m, ctop, cbot, puff=8, edge=0.3, shadow=(6, 0, 6, 0.35))
    return m


def sauce(cv, y, h, W, ctop=(246, 214, 168), cbot=(226, 180, 120), seed=7, specks=None):
    xs = np.linspace(CX - W / 2 * 0.99, CX + W / 2 * 0.99, 240)
    ph = np.random.default_rng(seed).uniform(0, 6, 2)
    top = y + 3 * np.sin(xs * 0.05 + ph[0])
    bot = y + h + 9 * np.abs(np.sin(xs * 0.035 + ph[1]))
    m = Mask().poly(list(zip(xs, top)) + list(zip(xs[::-1], bot[::-1]))).get()
    paint(cv, m, ctop, cbot, puff=5, edge=0.2, shadow=(4, 0, 4, 0.25))
    if specks:
        rng = np.random.default_rng(seed + 1)
        sm = Mask()
        for _ in range(int(W / 18)):
            sx = rng.uniform(CX - W * 0.47, CX + W * 0.47)
            sy = rng.uniform(y + 2, y + h)
            sm.ell(sx, sy, 3.5, 2.5)
        flat(cv, sm.get() * m, specks)
    return m


def onions(cv, y, W, seed=8, n=14):
    rng = np.random.default_rng(seed)
    mk = Mask()
    for _ in range(n):
        x = rng.uniform(CX - W * 0.45, CX + W * 0.45)
        mk.poly(se_pts(x, y + rng.uniform(-3, 5), rng.uniform(7, 13), 4, 5, p=2, n=20,
                       wob=0.25, seed=int(rng.integers(1e6)), rot=rng.uniform(-30, 30)))
    m = mk.get()
    paint(cv, m, (252, 250, 236), (222, 216, 190), puff=2, edge=0.25, shadow=(2, 0, 2, 0.25))


def pickles(cv, y, xs, seed=9):
    for i, x in enumerate(xs):
        m = Mask().ell(x, y, 50, 12).get()
        paint(cv, m, (120, 160, 56), (66, 104, 30), puff=5, edge=0.45, shadow=(4, 0, 4, 0.3))
        inner = Mask().ell(x, y - 1, 34, 6).get()
        flat(cv, inner, (172, 196, 98), 0.6)


def stack(parts, total_h=None, center=520):
    """parts: list of (fn, h, overlap, kwargs) top->bottom. Returns placements."""
    ys, y = [], 0.0
    for fn, h, ov, kw in parts:
        y -= ov
        ys.append(y)
        y += h
    off = center - y / 2
    return [(fn, yy + off, h, kw) for (fn, h, ov, kw), yy in zip(parts, ys)]


def build_burger(parts, W, k=1.5):
    cv = new_canvas()
    parts = [(fn, h * k, ov * k, kw) for fn, h, ov, kw in parts]
    for fn, y, h, kw in reversed(stack(parts)):
        if fn is onions:
            onions(cv, y, W, **kw)
        elif fn is pickles:
            pickles(cv, y, **kw)
        else:
            fn(cv, y, h, W, **kw)
    return cv


# --------------------------------------------------------------------------
# products
# --------------------------------------------------------------------------
def big_mac():
    W = 720
    return build_burger([
        (top_bun, 175, 0, dict(seed=11)),
        (sauce, 14, 18, dict(seed=12)),
        (lettuce, 30, 8, dict(seed=13)),
        (onions, 0, 6, dict(seed=14)),
        (patty, 58, 0, dict(seed=15)),
        (club_bun, 50, 6, dict()),
        (sauce, 12, 6, dict(seed=16)),
        (lettuce, 28, 8, dict(seed=17)),
        (cheese, 12, 8, dict(drips=((-140, 26, 26), (90, 38, 30)))),
        (patty, 58, 4, dict(seed=18)),
        (bottom_bun, 80, 6, dict()),
    ], W)


def royal_kaese():
    W = 740
    return build_burger([
        (top_bun, 180, 0, dict(seed=21)),
        (onions, 0, 14, dict(seed=22, n=18)),
        (pickles, 0, 0, dict(xs=(330, 660))),
        (cheese, 14, 6, dict(drips=((-210, 40, 32), (60, 56, 34), (230, 30, 28)))),
        (patty, 86, 4, dict(seed=23)),
        (cheese, 14, 10, dict(drips=((-60, 46, 32), (180, 32, 28)))),
        (sauce, 10, 2, dict(ctop=(206, 40, 26), cbot=(160, 20, 14), seed=24)),
        (bottom_bun, 86, 4, dict()),
    ], W)


def cheeseburger():
    W = 600
    return build_burger([
        (top_bun, 140, 0, dict(sesame=False, seed=31)),
        (sauce, 10, 14, dict(ctop=(206, 40, 26), cbot=(160, 20, 14), seed=32)),
        (pickles, 0, -4, dict(xs=(390, 620))),
        (onions, 0, 6, dict(seed=33, n=10)),
        (cheese, 12, 0, dict(drips=((-120, 44, 30), (110, 30, 26)))),
        (patty, 54, 6, dict(seed=34)),
        (bottom_bun, 74, 6, dict()),
    ], W)


def chicken_patty(cv, y, h, W, seed=41):
    m = Mask().poly(se_pts(CX, y + h / 2, W / 2 * 1.1, h / 2, h / 2, p=3.4, wob=0.035, seed=seed)).get()
    tex = 0.11 * fbm(seed, ((1.0, 0.6), (2.5, 0.4)))
    paint(cv, m, (246, 186, 92), (196, 116, 40), puff=h * 0.35, edge=0.4, tex=tex,
          spec=(CX - W * 0.2, y + h * 0.3, W * 0.3, h * 0.35, 0.3), shadow=(10, 0, 9, 0.45))
    return m


def fish_patty(cv, y, h, W, seed=51):
    m = Mask().poly(se_pts(CX, y + h / 2, W / 2 * 0.86, h / 2, h / 2, p=7, wob=0.012, seed=seed)).get()
    tex = 0.1 * fbm(seed, ((1.0, 0.6), (2.5, 0.4)))
    paint(cv, m, (244, 182, 92), (202, 126, 48), puff=h * 0.35, edge=0.4, tex=tex,
          spec=(CX - W * 0.15, y + h * 0.3, W * 0.25, h * 0.3, 0.3), shadow=(10, 0, 9, 0.45))
    return m


def mcchicken():
    W = 760
    return build_burger([
        (top_bun, 150, 0, dict(seed=42)),
        (sauce, 14, 18, dict(ctop=(252, 250, 238), cbot=(226, 222, 200), seed=43)),
        (lettuce, 34, 10, dict(seed=44, shredded=True)),
        (chicken_patty, 78, 6, dict()),
        (bottom_bun, 76, 8, dict()),
    ], W)


def filet_o_fish():
    W = 620
    return build_burger([
        (top_bun, 150, 0, dict(sesame=False, pale=True, seed=52)),
        (sauce, 16, 18, dict(ctop=(252, 250, 238), cbot=(226, 222, 200), seed=53, specks=(120, 160, 70))),
        (cheese, 12, 4, dict(half="left", drips=((-150, 30, 26),))),
        (fish_patty, 78, 12, dict()),
        (bottom_bun, 76, 6, dict(pale=True)),
    ], W)


def nuggets():
    cv = new_canvas()
    # open lid behind
    lid = Mask().poly([(280, 520), (720, 520), (690, 250), (310, 250)]).get()
    paint(cv, lid, (196, 30, 22), (150, 18, 12), puff=10, edge=0.25)
    paint_arches(cv, 500, 470, 150)
    inner = Mask().poly([(262, 520), (738, 520), (722, 560), (278, 560)]).get()
    flat(cv, inner, (110, 14, 10))
    rng = np.random.default_rng(61)
    spots = [(360, 500), (500, 480), (640, 500), (420, 545), (580, 545), (500, 560)]
    for i, (x, y) in enumerate(spots):
        m = Mask().poly(se_pts(x, y, rng.uniform(78, 92), rng.uniform(58, 66), rng.uniform(58, 66),
                               p=2.2, wob=0.09, seed=70 + i, rot=rng.uniform(-25, 25))).get()
        tex = 0.1 * fbm(80 + i, ((1.0, 0.6), (2.5, 0.4)))
        paint(cv, m, (248, 192, 100), (204, 124, 44), puff=28, edge=0.45, tex=tex,
              spec=(x - 30, y - 25, 50, 30, 0.35), shadow=(10, 0, 9, 0.45))
    front = Mask().rect(250, 560, 750, 860, r=26).get()
    paint(cv, front, (232, 46, 32), (176, 22, 14), puff=18, edge=0.3, shadow=(10, 0, 10, 0.5),
          spec=(330, 640, 60, 220, 0.28))
    rim = Mask().rect(250, 560, 750, 584, r=10).get()
    flat(cv, rim, (255, 120, 100), 0.35)
    paint_arches(cv, 500, 790, 240)
    # loose nugget in front
    m = Mask().poly(se_pts(700, 840, 84, 60, 60, p=2.2, wob=0.09, seed=91, rot=-18)).get()
    tex = 0.1 * fbm(92, ((1.0, 0.6), (2.5, 0.4)))
    paint(cv, m, (248, 192, 100), (204, 124, 44), puff=28, edge=0.45, tex=tex,
          spec=(670, 815, 50, 30, 0.35), shadow=(14, -6, 10, 0.5))
    return cv


def fries():
    cv = new_canvas()
    back = Mask().poly([(296, 450)] + [(500 + 210 * math.cos(a), 455 - 60 * math.sin(a))
                                     for a in np.linspace(math.pi, 0, 40)] + [(704, 450), (690, 600), (310, 600)]).get()
    paint(cv, back, (170, 22, 14), (120, 12, 8), puff=10, edge=0.2)
    rng = np.random.default_rng(71)
    for row in range(2):
        n = 11 if row == 0 else 9
        for i in range(n):
            x = 320 + (i + 0.5 + rng.uniform(-0.3, 0.3)) * (360 / n)
            ang = (x - 500) * 0.07 + rng.uniform(-5, 5)
            top = rng.uniform(150, 230) + row * 60
            w = rng.uniform(34, 40)
            xs = np.array([x - w / 2, x + w / 2, x + w / 2, x - w / 2])
            ys = np.array([top, top + 3, 640, 640])
            px, py = rot_pts(xs, ys, x, 640, ang)
            m = Mask().poly(list(zip(px, py))).get()
            light = 1.0 - 0.1 * row
            paint(cv, m, tuple(int(v * light) for v in (236, 160, 52)),
                  tuple(int(v * light) for v in (255, 214, 92)), puff=12, edge=0.35,
                  shadow=(0, 6, 6, 0.3), yrange=(top, top + 160))
    xs = np.linspace(0, 1, 60)
    topedge = [(296 + 408 * u, 462 + 70 * math.sin(math.pi * u)) for u in xs]
    front = Mask().poly(topedge + [(660, 870), (340, 870)]).get()
    rb = Mask().rect(330, 800, 670, 880, r=34).get()
    front = np.maximum(front, rb * (YY > 820))
    paint(cv, front, (236, 48, 34), (182, 22, 14), puff=16, edge=0.3, shadow=(8, 0, 10, 0.5),
          spec=(360, 600, 45, 220, 0.3))
    paint_arches(cv, 500, 790, 200)
    return cv


def mcflurry():
    cv = new_canvas()
    # spoon (behind the swirl top)
    xs = np.array([548, 576, 538, 512]); ys = np.array([110, 114, 440, 436])
    m = Mask().poly(list(zip(xs, ys))).get()
    paint(cv, m, (246, 246, 250), (196, 198, 206), puff=8, edge=0.35, spec=(552, 160, 14, 60, 0.6))
    cup = Mask().poly([(285, 430), (715, 430), (665, 860), (335, 860)]).rect(335, 820, 665, 880, r=30).get()
    paint(cv, cup, (252, 252, 252), (214, 216, 222), puff=40, edge=0.3, shadow=(10, 0, 10, 0.5),
          spec=(360, 620, 50, 220, 0.4))
    # cup design: red & yellow swooshes
    for k, (col, off) in enumerate(((RED, 0), (YELLOW, 50))):
        xs = np.linspace(260, 740, 120)
        t1 = 640 + off + 50 * np.sin((xs - 260) / 480 * math.pi * 1.4)
        mk = Mask().poly(list(zip(xs, t1)) + list(zip(xs[::-1], t1[::-1] + 38))).get() * cup
        paint(cv, mk, col, tuple(int(v * 0.8) for v in col), puff=4, edge=0.15)
    paint_arches(cv, 500, 600, 120, shadow=False)
    rim = Mask().ell(500, 432, 222, 22).get()
    paint(cv, rim, (240, 240, 244), (200, 202, 210), puff=4, edge=0.3)
    swirl = Mask().poly(se_pts(500, 430, 210, 170, 22, p=2.1, wob=0.03, seed=81)).get()
    paint(cv, swirl, (255, 253, 246), (236, 226, 208), puff=40, edge=0.35, shadow=(8, 0, 8, 0.35),
          spec=(430, 340, 80, 50, 0.5))
    lines = Mask()
    for k, (yy, a) in enumerate(((330, 170), (380, 200), (420, 205))):
        th = np.linspace(-0.9, 0.9, 40)
        pts = [(500 + a * math.sin(t) * 0.95, yy + 20 * math.cos(t) - 30 * k * 0) for t in th]
        lines.line(pts, 5)
    flat(cv, gaussian_filter(lines.get(), 1.2) * swirl, (214, 196, 170), 0.6)
    rng = np.random.default_rng(82)
    bits = Mask()
    for _ in range(46):
        bx, by = rng.uniform(320, 680), rng.uniform(290, 440)
        if swirl[int(by), int(bx)] < 0.99:
            continue
        bits.poly(se_pts(bx, by, rng.uniform(6, 13), rng.uniform(4, 8), rng.uniform(4, 8), p=6, n=24,
                         rot=rng.uniform(0, 90), wob=0.1, seed=int(rng.integers(1e6))))
    paint(cv, bits.get(), (92, 52, 34), (52, 28, 18), puff=3, edge=0.3, shadow=(2, 0, 2, 0.3))
    # caramel drizzle
    dz = Mask().line([(380, 330), (440, 300), (520, 320), (600, 295), (640, 330)], 9).get() * swirl
    paint(cv, dz, (222, 140, 50), (180, 96, 28), puff=3, edge=0.25)
    return cv


def apfeltasche():
    cv = new_canvas()
    ang = -9
    pts = np.array([(x, y) for x, y in [(210, 360), (790, 360), (790, 680), (210, 680)]], np.float32)
    m = Mask()
    m.rect(210, 360, 790, 680, r=80)
    pie = np.asarray(m.im.rotate(-ang, center=(500 * SS, 520 * SS), resample=Image.BICUBIC)
                     .resize((S, S), Image.BOX), np.float32) / 255.0
    tex = 0.04 * fbm(101, ((3, 0.5), (12, 0.5)))
    paint(cv, pie, (250, 200, 98), (214, 134, 46), puff=60, edge=0.45, tex=tex,
          spec=(380, 430, 140, 60, 0.45), shadow=(16, 0, 14, 0.5))
    # bubbles of fried pastry
    rng = np.random.default_rng(102)
    bm = Mask()
    for _ in range(70):
        bx, by = rng.uniform(250, 750), rng.uniform(400, 650)
        if pie[int(by), int(bx)] < 0.99:
            continue
        bm.ell(bx, by, rng.uniform(4, 9), rng.uniform(3, 6))
    paint(cv, bm.get(), (255, 226, 150), (236, 176, 90), puff=3, edge=0.3, shadow=(2, 1, 2, 0.25))
    # slits with apple filling
    for k in range(3):
        cx, cy = 390 + k * 110, 505 - k * 17
        sl = Mask().line([(cx - 44, cy + 28), (cx + 44, cy - 28)], 30).get()
        sl = gaussian_filter(sl, 0.6)
        paint(cv, sl, (150, 66, 24), (110, 40, 14), puff=4, edge=0.4)
        fl = Mask().line([(cx - 34, cy + 22), (cx + 34, cy - 22)], 15).get()
        paint(cv, fl, (226, 132, 58), (170, 70, 26), puff=2, edge=0.2, spec=(cx - 8, cy - 4, 10, 6, 0.5))
    return cv


def softdrink():
    cv = new_canvas()
    straw = Mask().poly([(540, 90), (572, 94), (540, 340), (510, 336)]).get()
    stripes = (np.sin((YY + XX * 0.6) * 0.09) > 0.2).astype(np.float32)
    paint(cv, straw, (252, 252, 252), (224, 224, 228), puff=8, edge=0.35)
    flat(cv, straw * stripes, RED, 0.9)
    cup = Mask().poly([(290, 330), (710, 330), (650, 880), (350, 880)]).rect(350, 840, 650, 890, r=28).get()
    paint(cv, cup, (252, 252, 252), (216, 218, 224), puff=40, edge=0.3, shadow=(10, 0, 10, 0.5),
          spec=(370, 560, 50, 260, 0.45))
    xs = np.linspace(260, 740, 120)
    w1 = 560 + 40 * np.sin((xs - 260) / 480 * math.pi * 1.2 + 0.4)
    band = Mask().poly(list(zip(xs, w1)) + [(740, 900), (260, 900)]).get() * cup
    paint(cv, band, (232, 44, 30), (172, 20, 12), puff=30, edge=0.3, spec=(380, 700, 45, 180, 0.3))
    stripe = Mask().poly(list(zip(xs, w1 - 6)) + list(zip(xs[::-1], w1[::-1] + 16))).get() * cup
    flat(cv, stripe, YELLOW)
    paint_arches(cv, 500, 790, 170)
    lid = Mask().rect(278, 304, 722, 348, r=18).get()
    paint(cv, lid, (250, 250, 252), (206, 208, 216), puff=8, edge=0.35, shadow=(6, 0, 6, 0.4))
    dome = Mask().poly(se_pts(500, 310, 190, 46, 4, p=2.6)).get()
    paint(cv, dome, (246, 246, 250), (220, 222, 230), puff=14, edge=0.2, spec=(440, 286, 60, 14, 0.6))
    # condensation
    rng = np.random.default_rng(111)
    dm = Mask()
    for _ in range(28):
        dx, dy = rng.uniform(320, 680), rng.uniform(380, 840)
        if cup[int(dy), int(dx)] < 0.99:
            continue
        r = rng.uniform(4, 9)
        dm.ell(dx, dy, r * 0.8, r)
    d = dm.get()
    cast(cv, d, dy=3, blur=1.5, k=0.3)
    flat(cv, d, (255, 255, 255), 0.55)
    return cv


PRODUCTS = [
    ("big_mac", big_mac),
    ("royal_kaese", royal_kaese),
    ("cheeseburger", cheeseburger),
    ("mcchicken", mcchicken),
    ("filet_o_fish", filet_o_fish),
    ("nuggets", nuggets),
    ("fries", fries),
    ("mcflurry", mcflurry),
    ("apfeltasche", apfeltasche),
    ("softdrink", softdrink),
]


def to_image(cv):
    a = cv[..., 3:4]
    rgb = np.where(a > 1e-4, cv[..., :3] / np.maximum(a, 1e-4), 0)
    return Image.fromarray((np.clip(np.dstack([rgb, a]), 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")


def build(key, fn):
    path = f"{OUTDIR}/{key}.png"
    to_image(fn()).save(path)
    return path


if __name__ == "__main__":
    os.makedirs(OUTDIR, exist_ok=True)
    from multiprocessing import Pool
    with Pool() as p:
        paths = p.starmap(build, PRODUCTS)
    print("\n".join(paths))
    if "--sheet" in sys.argv:
        sheet = Image.new("RGB", (2500, 1000), (255, 199, 44))
        for i, pth in enumerate(paths):
            im = Image.open(pth).resize((500, 500), Image.LANCZOS)
            sheet.paste(im, ((i % 5) * 500, (i // 5) * 500), im)
        sheet.save("out/preview_mcd_sheet.png")
