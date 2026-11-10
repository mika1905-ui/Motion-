"""TikTok motion clip: a laptop in a dark room shows a car-rental website whose
hero is a glossy red liquid that drips, rises, spikes and finally pours itself
into the red car.

    python3 cutout.py   # once: assets/red_car.jpg -> assets/car_cutout.png
    python3 render.py   # -> out/red_car_motion.mp4 (1080x1920, 30 fps)

Options: --preview T [T ...] writes single PNG frames at those times instead.
"""
import argparse, math, os, subprocess, sys
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import distance_transform_edt

FPS = 30
DUR = 12.0
OW, OH = 1080, 1920            # output frame
SW, SH = 1440, 900             # website (screen) resolution
LQ = 2                         # liquid field computed at 1/LQ of website res
FONT = "/usr/share/fonts/opentype/inter/"
CAPTION = ("UPGRADE YOUR WEBSITE.", "START HERE")
BRAND = "ROSSO & CO."
OUT = "out/red_car_motion.mp4"

# car placement on the website (website px)
CAR_W = 960
CAR_X0, CAR_BOTTOM = 440, 800
POOL_C = (905, 742)            # liquid puddle centre on the "floor"


def font(name, size):
    return ImageFont.truetype(FONT + name, size)


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = min(max(x, 0.0), 1.0)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def seg(t, a, b):
    return min(max((t - a) / (b - a), 0.0), 1.0)


def smoothstep(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1)
    return x * x * (3 - 2 * x)


# --------------------------------------------------------------------------
# static assets
# --------------------------------------------------------------------------
def load_car():
    car = Image.open("assets/car_cutout.png").convert("RGBA")
    h = round(car.height * CAR_W / car.width)
    car = car.resize((CAR_W, h), Image.LANCZOS)
    arr = np.asarray(car).astype(np.float32) / 255.0
    return arr  # H x W x 4, premultiplied later


def build_website_base():
    """Browser chrome + nav + studio backdrop (no hero text, no car)."""
    im = Image.new("RGB", (SW, SH), (238, 237, 235))
    px = np.zeros((SH, SW, 3), np.float32)
    y = np.arange(SH)[:, None].astype(np.float32)
    x = np.arange(SW)[None, :].astype(np.float32)
    # seamless studio sweep: wall (slightly darker, warm) -> floor (brighter)
    wall = np.array([226, 225, 222], np.float32)
    floor = np.array([246, 246, 244], np.float32)
    k = smoothstep(560, 760, y)[..., None]
    px[:] = wall * (1 - k) + floor * k
    # soft spotlight on the set
    spot = np.exp(-(((x - 900) / 650) ** 2 + ((y - 600) / 420) ** 2))[..., None]
    px += 18 * spot
    # darker corners
    px *= (1 - 0.10 * (((x - 800) / 900) ** 2 + ((y - 520) / 700) ** 2))[..., None]
    im = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)

    # browser chrome
    d.rectangle([0, 0, SW, 74], fill=(53, 54, 58))
    d.rectangle([0, 0, SW, 34], fill=(32, 33, 36))
    for i, c in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
        d.ellipse([16 + i * 22, 11, 28 + i * 22, 23], fill=c)
    d.rounded_rectangle([90, 6, 330, 34], 8, fill=(53, 54, 58))
    d.text((112, 12), "Rosso & Co. - Exotic car rental", font=font("Inter-Medium.otf", 13), fill=(220, 220, 222))
    d.text((310, 11), "×", font=font("Inter-Regular.otf", 14), fill=(170, 170, 170))
    d.text((346, 9), "+", font=font("Inter-Regular.otf", 17), fill=(170, 170, 170))
    d.rounded_rectangle([110, 41, 1200, 68], 14, fill=(32, 33, 36))
    d.text((24, 44), "←  →  ⟳", font=font("Inter-Regular.otf", 15), fill=(160, 160, 165))
    d.text((134, 47), "rossoandco.com/the-fleet", font=font("Inter-Regular.otf", 14), fill=(225, 225, 228))
    d.rounded_rectangle([1300, 43, 1424, 66], 11, fill=(138, 180, 248))
    d.text((1318, 47), "Relaunch to update", font=font("Inter-Medium.otf", 11), fill=(32, 33, 36))
    for i in range(4):
        d.ellipse([1212 + i * 21, 49, 1224 + i * 21, 61], fill=(110, 110, 115))

    # nav
    d.text((60, 102), BRAND, font=font("InterDisplay-Bold.otf", 19), fill=(20, 20, 20))
    nf = font("Inter-Medium.otf", 12)
    for i, s in enumerate(["THE FLEET", "HOW IT WORKS", "DELIVERY", "FAQ"]):
        d.text((560 + i * 120, 107), s, font=nf, fill=(70, 70, 70))
    d.rectangle([1270, 96, 1380, 130], outline=(20, 20, 20), width=2)
    d.text((1294, 106), "RESERVE", font=font("Inter-SemiBold.otf", 12), fill=(20, 20, 20))
    d.line([0, 150, SW, 150], fill=(215, 214, 211), width=1)
    return np.asarray(im).astype(np.float32) / 255.0


def build_website_text():
    """Hero copy as a premultiplied RGBA layer composited above the liquid."""
    im = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((62, 258), "EXOTIC CAR RENTAL  ·  DELIVERED ANYWHERE IN MIAMI",
           font=font("Inter-SemiBold.otf", 13), fill=(110, 110, 110, 255))
    hf = font("InterDisplay-Black.otf", 58)
    d.text((58, 286), "ARRIVE LIKE", font=hf, fill=(14, 14, 14, 255))
    d.text((58, 352), "YOU MEAN IT", font=hf, fill=(14, 14, 14, 255))
    a = np.asarray(im).astype(np.float32) / 255.0
    a[..., :3] *= a[..., 3:4]
    return a


def draw_button(hover):
    """'VIEW THE FLEET' button, black -> red on hover."""
    bw, bh = 196, 46
    im = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = tuple(int(14 + (200 - 14) * hover) if i == 0 else int(14 + (8 - 14) * hover) for i in range(3))
    d.rectangle([0, 0, bw - 1, bh - 1], fill=c + (255,))
    d.text((26, 15), "VIEW THE FLEET  →", font=font("Inter-Bold.otf", 13), fill=(255, 255, 255, 255))
    a = np.asarray(im).astype(np.float32) / 255.0
    a[..., :3] *= a[..., 3:4]
    return a


def build_room():
    """Dark room + laptop body + backlit keyboard (everything except the screen)."""
    rng = np.random.default_rng(3)
    y = np.arange(OH)[:, None].astype(np.float32)
    x = np.arange(OW)[None, :].astype(np.float32)
    # fabric folds: low-frequency noise
    n = rng.standard_normal((24, 14)).astype(np.float32)
    n = cv2.resize(n, (OW, OH), interpolation=cv2.INTER_CUBIC)
    n = cv2.GaussianBlur(n, (0, 0), 40)
    glow = np.exp(-(((x - 540) / 700) ** 2 + ((y - 760) / 760) ** 2))
    base = 0.018 + 0.05 * glow * (1 + 0.6 * n)
    room = np.stack([base * 1.05, base * 0.97, base * 0.92], -1)

    img = Image.fromarray((np.clip(room, 0, 1) * 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    # lid (outer bezel)
    d.polygon([(92, 404), (988, 404), (1014, 996), (66, 996)], fill=(12, 12, 13))
    d.line([(92, 404), (988, 404)], fill=(40, 40, 42), width=2)
    # deck
    d.polygon([(62, 1000), (1018, 1000), (1080, 1600), (0, 1600)], fill=(22, 22, 24))
    d.line([(62, 1000), (1018, 1000)], fill=(52, 52, 54), width=3)
    room = np.asarray(img).astype(np.float32) / 255.0

    # keyboard drawn flat then warped into the deck
    KW, KH = 1000, 420
    kb = Image.new("RGBA", (KW, KH), (0, 0, 0, 0))
    kd = ImageDraw.Draw(kb)
    rows = [
        ["esc"] + [f"F{i}" for i in range(1, 13)] + ["⏻"],
        ["~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
        ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
        ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"],
        ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"],
        ["fn", "ctrl", "opt", "cmd", " ", "cmd", "opt", "◀", "▲▼", "▶"],
    ]
    widths = {"delete": 1.5, "tab": 1.5, "\\": 1.0, "caps": 1.8, "return": 1.8, "shift": 2.35,
              "cmd": 1.25, " ": 5.0, "▲▼": 1.0}
    kf = font("Inter-Medium.otf", 15)
    y0 = 10
    for r, row in enumerate(rows):
        h = 44 if r else 30
        units = [widths.get(k, 1.0) for k in row]
        unit = (KW - 20 - 6 * (len(row) - 1)) / sum(units)
        xx = 10
        for k, u in zip(row, units):
            w = unit * u
            kd.rounded_rectangle([xx, y0, xx + w, y0 + h], 6, fill=(6, 6, 7, 255), outline=(30, 30, 32, 255))
            if k.strip():
                kd.text((xx + 8, y0 + 6), k, font=kf, fill=(225, 228, 235, 230))
            xx += w + 6
        y0 += h + 7
    # trackpad
    kd.rounded_rectangle([300, y0 + 16, 700, KH - 1], 10, outline=(34, 34, 36, 255), fill=(19, 19, 20, 255))
    kb = np.asarray(kb).astype(np.float32) / 255.0
    src = np.float32([[0, 0], [KW, 0], [KW, KH], [0, KH]])
    dst = np.float32([[118, 1030], [962, 1030], [1010, 1330], [70, 1330]])
    M = cv2.getPerspectiveTransform(src, dst)
    kbw = cv2.warpPerspective(kb, M, (OW, OH), flags=cv2.INTER_AREA)
    # legends fade with distance from the screen (spill light)
    spill = np.exp(-((y - 1000) / 420) ** 2)[..., None]
    room = room * (1 - kbw[..., 3:4]) + kbw[..., :3] * kbw[..., 3:4] * (0.45 + 0.55 * spill)
    return room


SCREEN_QUAD = np.float32([[114, 426], [966, 426], [990, 974], [90, 974]])


# --------------------------------------------------------------------------
# liquid
# --------------------------------------------------------------------------
GH, GW = SH // LQ, SW // LQ
GY, GX = np.mgrid[0:GH, 0:GW].astype(np.float32) * LQ


def blob(cx, cy, rx, ry, a=1.0):
    return a * np.exp(-(((GX - cx) / rx) ** 2 + ((GY - cy) / ry) ** 2))


def spike(bx, by, tx, ty, r0):
    """Tapered cone field from base (bx,by) to tip (tx,ty)."""
    vx, vy = tx - bx, ty - by
    L2 = vx * vx + vy * vy + 1e-6
    x0, x1 = min(bx, tx) - r0 * 2, max(bx, tx) + r0 * 2
    y0, y1 = min(by, ty) - r0 * 2, max(by, ty) + r0 * 2
    out = np.zeros((GH, GW), np.float32)
    i0, i1 = max(int(y0 / LQ), 0), min(int(y1 / LQ) + 1, GH)
    j0, j1 = max(int(x0 / LQ), 0), min(int(x1 / LQ) + 1, GW)
    if i0 >= i1 or j0 >= j1:
        return out
    px = GX[i0:i1, j0:j1] - bx
    py = GY[i0:i1, j0:j1] - by
    s = np.clip((px * vx + py * vy) / L2, 0, 1)
    dx, dy = px - s * vx, py - s * vy
    r = r0 * (1 - s) ** 1.3 + 0.6
    out[i0:i1, j0:j1] = np.exp(-(dx * dx + dy * dy) / (r * r)) * 1.3
    return out


def build_car_field(car):
    """Signed-distance-based field of the car silhouette on the liquid grid."""
    ch, cw = car.shape[:2]
    mask = np.zeros((SH, SW), np.float32)
    y0 = CAR_BOTTOM - ch
    mask[y0:y0 + ch, CAR_X0:CAR_X0 + cw] = car[..., 3]
    m = cv2.resize(mask, (GW, GH), interpolation=cv2.INTER_AREA) > 0.5
    sd = (distance_transform_edt(m) - distance_transform_edt(~m)) * LQ
    return sd.astype(np.float32), (CAR_X0, y0, cw, ch)


def noise2(t, seed, n=3):
    rng = np.random.default_rng(seed)
    f = rng.uniform(0.6, 2.2, n)
    p = rng.uniform(0, 6.28, n)
    return sum(math.sin(t * fi + pi) for fi, pi in zip(f, p)) / n


def liquid_field(t, car_sd):
    """Return (F, extra_mask) where the surface is F > 0.5."""
    cx, cy = POOL_C
    F = np.zeros((GH, GW), np.float32)

    # --- A: drop falls (0.35-1.0) and splashes into a puddle
    if t < 1.0:
        k = seg(t, 0.35, 1.0)
        if k > 0:
            yy = 160 + (cy - 30 - 160) * k * k
            stretch = 1 + 0.9 * k * k
            F += blob(cx, yy, 22 / stretch ** 0.4, 22 * stretch, 1.2)
        return F

    # --- puddle (always present after impact until the car is formed)
    imp = seg(t, 1.0, 1.7)
    wob = math.sin((t - 1.0) * 11) * math.exp(-(t - 1.0) * 2.5)
    rx = 70 + 175 * ease_out(imp) + 18 * wob
    collapse = seg(t, 3.3, 3.9)
    rx += 50 * math.sin(math.pi * collapse)
    ry = rx * 0.17
    # irregular rim: several overlapping flat blobs
    for i in range(7):
        ang = i / 7 * 2 * math.pi + 0.4
        off = 0.42 + 0.12 * noise2(t * 0.8, 10 + i)
        F += blob(cx + math.cos(ang) * rx * off, cy + math.sin(ang) * ry * off,
                  rx * 0.62, ry * 0.75, 0.45)
    F += blob(cx, cy, rx, ry, 0.75)
    # splash crown right at impact
    if 1.0 <= t < 1.45:
        k = seg(t, 1.0, 1.45)
        for i in range(9):
            ang = i / 9 * math.pi + 0.15
            dist = 40 + 150 * ease_out(k)
            h = 70 * math.sin(math.pi * k) * (0.6 + 0.4 * math.sin(i * 2.3))
            F += blob(cx + math.cos(ang) * dist * (1 if i % 2 else -1),
                      cy - h - 8, 11 * (1 - k) + 3, 13 * (1 - k) + 3, 1.0)

    # --- B: column rises out of the puddle and reaches up (1.6 - 3.9)
    rise = ease_io(seg(t, 1.6, 2.7)) * (1 - ease_io(collapse))
    if rise > 0.001:
        height = 320 * rise
        n = 14
        for i in range(n):
            s = i / (n - 1)
            sway = 26 * math.sin(t * 3.0 + s * 2.6) * s
            r = (48 - 22 * s + 6 * math.sin(t * 6 + s * 9)) * (0.6 + 0.4 * rise)
            F += blob(cx - 40 + sway, cy - 12 - height * s, r, r * 1.05, 0.85)
        # reaching "fingers" at the top
        open_ = ease(seg(t, 2.4, 3.0)) * (1 - ease(seg(t, 3.2, 3.6)))
        tx, ty = cx - 40 + 26 * math.sin(t * 3.0 + 2.6), cy - 12 - height
        F += blob(tx, ty, 40, 34, 1.0)
        for i in range(4):
            ang = -math.pi / 2 + (i - 1.5) * 0.42
            ln = 75 * open_ * (0.8 + 0.25 * math.sin(i * 1.9 + t * 4))
            F += spike(tx, ty, tx + math.cos(ang) * ln, ty + math.sin(ang) * ln - 10, 14)
        F += spike(tx - 20, ty + 20, tx - 20 - 60 * open_, ty + 10 - 20 * open_, 13)

    # --- C: dome forms (3.8 - 4.5)
    dome = ease_out(seg(t, 3.8, 4.5)) * (1 - ease_io(seg(t, 6.4, 7.6)))
    if dome > 0.001:
        breathe = 1 + 0.04 * math.sin(t * 5)
        F += blob(cx, cy - 26 * dome, 175 * breathe, 62 * dome * breathe + 1, 1.15 * dome)

    # --- D: spikes erupt from the dome (4.5 - 6.6)
    spk = ease_out(seg(t, 4.5, 5.0)) * (1 - ease_io(seg(t, 6.0, 6.6)))
    if spk > 0.001:
        rng = np.random.default_rng(7)
        pulse = 1 + 0.18 * math.sin(max(t - 4.5, 0) * 9) * math.exp(-max(t - 5.0, 0) * 1.5)
        for i in range(34):
            u = rng.uniform(-1, 1)
            v = rng.uniform(0, 1)
            delay = rng.uniform(0, 0.35)
            g = ease_out(seg(t, 4.5 + delay, 5.0 + delay)) * (1 - ease_io(seg(t, 6.0, 6.6)))
            bx = cx + u * 150
            by = cy - 30 - (1 - u * u) ** 0.5 * 52 * v
            lean = u * 0.9
            ln = (60 + 110 * (1 - abs(u)) * rng.uniform(0.6, 1.0)) * g * pulse
            ang = -math.pi / 2 + lean + rng.uniform(-0.15, 0.15)
            F += spike(bx, by, bx + math.cos(ang) * ln, by + math.sin(ang) * ln, 12 + 6 * (1 - abs(u)))

    # --- E: liquid pours itself into the car silhouette (6.3 - 8.0)
    m = ease_io(seg(t, 6.3, 8.0))
    if m > 0:
        wobble = (1 - m) * 10 * np.sin(GX / 37 + t * 7) * np.sin(GY / 29 - t * 5)
        Fc = 0.5 + 0.5 * np.tanh((car_sd + wobble) / 14)
        F = (1 - m) * F + m * (Fc * 1.25)
        # fade the leftover puddle under the car once formed
    return F


def drain_mask(t, carbox):
    """Liquid layer visibility while it drains off the car (8.0 - 9.6)."""
    k = ease_io(seg(t, 8.0, 9.9))
    if k <= 0:
        return None
    x0, y0, cw, ch = carbox
    top = y0 - 30
    front = top + (ch + 90) * k
    xs = GX[0]
    # drips: narrow streaks where liquid lingers above the front
    rng = np.random.default_rng(11)
    lag = np.zeros_like(xs)
    for _ in range(12):
        dx = rng.uniform(x0 + 40, x0 + cw - 40)
        w = rng.uniform(4, 8)
        ln = rng.uniform(40, 120) * math.sin(math.pi * min(k * 1.4, 1))
        lag += ln * np.exp(-((xs - dx) / w) ** 2)
    edge = front - lag + 8 * np.sin(xs / 41 + t * 3)
    return smoothstep(edge[None, :] - 6, edge[None, :] + 6, GY)


def shade_liquid(F, keep=None):
    """Glossy red liquid: returns premultiplied RGBA at website resolution."""
    alpha = smoothstep(0.47, 0.53, F)
    if keep is not None:
        alpha = alpha * keep
        F = 0.5 + (F - 0.5) * keep
    h = np.sqrt(np.clip(F - 0.5, 0, None)) * 60
    h = cv2.GaussianBlur(h, (0, 0), 1.2)
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx, -gy, np.ones_like(h)
    inv = 1 / np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx * inv, ny * inv, nz * inv
    L = np.array([-0.35, -0.75, 0.56]); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    nh = np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1)
    spec = nh ** 90 * 1.6 + nh ** 12 * 0.12
    # reflected vector -> studio softbox overhead + bright horizon
    rz = 2 * nz * nz - 1
    ry = 2 * nz * ny
    softbox = smoothstep(-0.75, -0.55, ry) * (1 - smoothstep(-0.25, -0.05, ry)) * (rz < 0.92)
    fres = (1 - nz) ** 2.2
    base = np.array([0.62, 0.015, 0.03])
    deep = np.array([0.16, 0.0, 0.01])
    col = deep + (base - deep) * (0.25 + 0.75 * diff)[..., None]
    col = col * (1 - 0.35 * fres)[..., None] + (np.array([0.9, 0.45, 0.45]) * fres[..., None]) * 0.22
    col += (softbox * 0.38)[..., None] + spec[..., None]
    col = np.clip(col, 0, 1.4)
    rgba = np.concatenate([col * alpha[..., None], alpha[..., None]], -1).astype(np.float32)
    return cv2.resize(rgba, (SW, SH), interpolation=cv2.INTER_LINEAR)


# --------------------------------------------------------------------------
# frame composition
# --------------------------------------------------------------------------
class Scene:
    def __init__(self):
        self.base = build_website_base()
        self.text = build_website_text()
        self.car = load_car()
        self.car_sd, self.carbox = build_car_field(self.car)
        self.room = build_room()
        ch = self.car.shape[0]
        self.car_y0 = CAR_BOTTOM - ch
        # premultiplied car + floor reflection
        c = self.car.copy(); c[..., :3] *= c[..., 3:4]
        self.car_pm = c
        refl = c[::-1].copy()
        fade = np.exp(-np.arange(ch) / 70.0)[:, None, None] * 0.16
        self.refl_pm = refl * fade
        # soft contact shadow under the car
        sh = np.zeros((SH, SW), np.float32)
        x0, y0, cw, chh = self.carbox
        cv2.ellipse(sh, (x0 + cw // 2, CAR_BOTTOM - 22), (cw // 2 - 30, 26), 0, 0, 360, 1.0, -1)
        self.car_shadow = cv2.GaussianBlur(sh, (0, 0), 22)
        sf = 3
        self.grain_rng_seed = 99

    def website(self, t):
        img = self.base.copy()
        x0, y0, cw, ch = self.carbox

        # car under the liquid (appears as the liquid drains)
        car_on = seg(t, 7.9, 8.3)
        if car_on > 0:
            sh = self.car_shadow * 0.45 * car_on
            img *= (1 - sh[..., None])
            r = self.refl_pm
            rh = min(r.shape[0], SH - CAR_BOTTOM)
            reg = img[CAR_BOTTOM:CAR_BOTTOM + rh, x0:x0 + cw]
            reg[:] = reg * (1 - r[:rh, :, 3:4] * car_on) + r[:rh, :, :3] * car_on
            reg = img[y0:y0 + ch, x0:x0 + cw]
            reg[:] = reg * (1 - self.car_pm[..., 3:4] * car_on) + self.car_pm[..., :3] * car_on

        # liquid
        if 0.35 <= t < 10.0:
            F = liquid_field(t, self.car_sd)
            keep = drain_mask(t, self.carbox)
            if keep is not None:
                liq = shade_liquid(F, keep)
            else:
                liq = shade_liquid(F)
            a = liq[..., 3]
            # contact shadow of the liquid on the floor
            shadow = cv2.GaussianBlur(a, (0, 0), 14)
            shadow = np.roll(shadow, 10, axis=0) * 0.30
            img *= (1 - shadow[..., None])
            img = img * (1 - a[..., None]) + liq[..., :3]

        # hero copy + button
        intro = ease_out(seg(t, 0.0, 0.6))
        txt = self.text
        img = img * (1 - txt[..., 3:4] * intro) + txt[..., :3] * intro
        hover = ease(seg(t, 10.5, 10.8))
        press = 1 - 0.04 * math.sin(math.pi * seg(t, 11.0, 11.25))
        b = draw_button(hover)
        bh, bw = b.shape[:2]
        if press != 1:
            b = cv2.resize(b, (int(bw * press), int(bh * press)))
        bx, by = 60 + (bw - b.shape[1]) // 2, 440 + (bh - b.shape[0]) // 2
        reg = img[by:by + b.shape[0], bx:bx + b.shape[1]]
        reg[:] = reg * (1 - b[..., 3:4] * intro) + b[..., :3] * intro

        # mouse cursor glides to the button at the end
        cm = ease_io(seg(t, 9.8, 10.6))
        if t > 9.6:
            cx = 1100 + (150 - 1100) * cm + 6 * math.sin(t * 2)
            cy = 560 + (462 - 560) * cm
            draw_cursor(img, cx, cy)
        return img

    def frame(self, t):
        site = self.website(t)
        site8 = np.clip(site, 0, 1)
        # screen panel: slight blue-white cast + a little brightness falloff
        M = cv2.getPerspectiveTransform(np.float32([[0, 0], [SW, 0], [SW, SH], [0, SH]]), SCREEN_QUAD)
        scr = cv2.warpPerspective(site8, M, (OW, OH), flags=cv2.INTER_AREA)
        smask = cv2.warpPerspective(np.ones((SH, SW), np.float32), M, (OW, OH), flags=cv2.INTER_AREA)
        scr *= np.array([0.96, 0.97, 1.0], np.float32)
        frame = self.room * (1 - smask[..., None]) + scr
        # screen light bloom / spill onto room and keyboard
        lum = cv2.resize(scr, (OW // 8, OH // 8), interpolation=cv2.INTER_AREA)
        bloom = cv2.GaussianBlur(lum, (0, 0), 9)
        bloom = cv2.resize(bloom, (OW, OH), interpolation=cv2.INTER_LINEAR)
        frame += bloom * 0.22 * (1 - smask[..., None] * 0.7)
        # subtle glare across the glass
        yy = np.arange(OH, dtype=np.float32)[:, None]
        xx = np.arange(OW, dtype=np.float32)[None, :]
        glare = np.exp(-(((xx - yy * 0.55) - 80) / 160) ** 2) * 0.035 * smask
        frame += glare[..., None]

        # handheld camera: slow push-in + shake
        z = 1.06 + 0.05 * ease_io(t / DUR)
        dx = 7 * noise2(t * 1.3, 1) + 3 * noise2(t * 4, 2)
        dy = 7 * noise2(t * 1.1, 3) + 3 * noise2(t * 4.2, 4)
        rot = 0.45 * noise2(t * 0.9, 5)
        A = cv2.getRotationMatrix2D((OW / 2, OH * 0.4), rot, z)
        A[0, 2] += dx; A[1, 2] += dy - 20
        frame = cv2.warpAffine(frame, A, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        # vignette, grade, grain
        vig = 1 - 0.55 * np.clip((((xx - OW / 2) / (OW * 0.75)) ** 2 + ((yy - OH * 0.42) / (OH * 0.6)) ** 2), 0, 1)
        frame *= vig[..., None]
        frame = frame / (1 + frame * 0.08)   # soft highlight roll-off
        rng = np.random.default_rng(int(t * FPS) + 1000)
        g = rng.standard_normal((OH // 2, OW // 2)).astype(np.float32)
        g = cv2.resize(g, (OW, OH), interpolation=cv2.INTER_LINEAR)
        frame += g[..., None] * 0.009
        out = (np.clip(frame, 0, 1) * 255).astype(np.uint8)
        return draw_caption(out, t)


def draw_cursor(img, x, y):
    pts = np.array([[0, 0], [0, 26], [7, 20], [12, 31], [16, 29], [11, 19], [20, 19]], np.int32)
    pts = (pts * 1.0 + [x, y]).astype(np.int32)
    cv2.fillPoly(img, [pts], (0, 0, 0), lineType=cv2.LINE_AA)
    inner = ((pts - pts.mean(0)) * 0.72 + pts.mean(0)).astype(np.int32)
    cv2.fillPoly(img, [inner], (1, 1, 1), lineType=cv2.LINE_AA)


_cap = {}


def draw_caption(out, t):
    if "img" not in _cap:
        im = Image.new("RGBA", (OW, 220), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        f = font("InterDisplay-SemiBold.otf", 54)
        for i, line in enumerate(CAPTION):
            w = d.textlength(line, font=f)
            d.text(((OW - w) / 2, 30 + i * 66), line, font=f, fill=(255, 255, 255, 255))
        sh = im.split()[3].filter(ImageFilter.GaussianBlur(6))
        shadow = Image.new("RGBA", im.size, (0, 0, 0, 0)); shadow.putalpha(sh.point(lambda v: v * 0.8))
        comp = Image.alpha_composite(shadow, im)
        _cap["img"] = np.asarray(comp).astype(np.float32) / 255.0
    c = _cap["img"]
    k = ease_out(seg(t, 0.2, 0.7))
    y0 = 1250 + int(20 * (1 - k))
    reg = out[y0:y0 + c.shape[0]].astype(np.float32) / 255.0
    a = c[..., 3:4] * k
    reg = reg * (1 - a) + c[..., :3] * a
    out[y0:y0 + c.shape[0]] = (reg * 255).astype(np.uint8)
    return out


# --------------------------------------------------------------------------
# sound design (synthesised)
# --------------------------------------------------------------------------
def make_audio(path, sr=48000):
    n = int(DUR * sr)
    t = np.arange(n) / sr
    rng = np.random.default_rng(5)
    out = np.zeros(n)

    def env(a, att, dec):
        e = np.zeros(n)
        m = t >= a
        tt = t[m] - a
        e[m] = np.minimum(tt / att, 1) * np.exp(-tt / dec)
        return e

    def lp_noise(cut):
        x = rng.standard_normal(n)
        k = max(int(sr / cut), 1)
        return np.convolve(x, np.ones(k) / k, "same")

    # dark ambient pad
    pad = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(55, 0), (82.4, 1), (110.5, 2), (164.8, 0.5)])
    out += 0.05 * pad * np.minimum(t / 1.5, 1) * np.minimum((DUR - t) / 1.0, 1)
    # drop "plip" + splash
    out += 0.5 * np.sin(2 * np.pi * (600 + 900 * np.exp(-(t - 1.0) * 30)) * t) * env(1.0, 0.002, 0.06)
    out += 0.25 * lp_noise(3000) * env(1.0, 0.005, 0.25)
    # viscous rise / gloop sounds
    for a, f in [(1.7, 140), (2.3, 110), (2.9, 170), (3.6, 90)]:
        out += 0.3 * np.sin(2 * np.pi * (f + 60 * np.sin(12 * (t - a))) * t) * env(a, 0.03, 0.35)
    out += 0.2 * lp_noise(400) * env(3.5, 0.05, 0.4)
    # spikes: sharp metallic crackle
    sp = rng.standard_normal(n) * (np.abs(np.sin(2 * np.pi * 37 * t)) > 0.97)
    out += 0.5 * np.convolve(sp, np.ones(20) / 20, "same") * env(4.5, 0.01, 0.6) * 4
    out += 0.35 * np.sin(2 * np.pi * 70 * t) * env(4.5, 0.005, 0.5)
    # riser while the liquid becomes the car
    k = np.clip((t - 6.2) / 1.8, 0, 1)
    riser = lp_noise(6000) * k ** 2 * (t < 8.0) * 0.45
    riser += 0.15 * np.sin(2 * np.pi * (200 + 600 * k ** 2) * t) * k * (t < 8.0)
    out += riser
    # reveal impact
    out += 0.9 * np.sin(2 * np.pi * (45 + 80 * np.exp(-(t - 8.0) * 8)) * t) * env(8.0, 0.004, 0.9)
    out += 0.3 * lp_noise(2000) * env(8.0, 0.002, 0.3)
    # engine-ish rumble tail
    out += 0.12 * np.sin(2 * np.pi * 48 * t + 3 * np.sin(2 * np.pi * 6 * t)) * env(8.2, 0.3, 2.0)
    # UI click at the end
    out += 0.4 * np.sin(2 * np.pi * 2400 * t) * env(11.0, 0.0005, 0.015)
    out /= np.max(np.abs(out)) / 0.8
    st = np.stack([out, out], 1)
    import wave
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
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
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
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
