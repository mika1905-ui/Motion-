"""Café Europa Bielefeld – 15 s reel cut from real club footage.

    python3 europa_footage_reel.py SRC_A.mp4 SRC_B.mp4        # -> out/cafe_europa_reel_footage.mp4
    python3 europa_footage_reel.py A.mp4 B.mp4 --preview 3 8  # PNG frames

Cuts sit on a 128 BPM grid (32 beats = 15 s) so the song can be laid on in Instagram
(music library) with the first cut on the drop. The export has no audio track on purpose.
Shot list: SHOTS below – (source, in-point s, length in beats, speed).
"""
import argparse, math, os, subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
BPM = 128
BEAT = 60 / BPM
OUT = "out/cafe_europa_reel_footage.mp4"
FONT = "/usr/share/fonts/opentype/inter/"
ADDRESS = ("Jahnplatz 4", "33602 Bielefeld")
HANDLE = "@cafe_europa_bi"

SHOTS = [  # src, in, beats, speed
    ("A", 1.0, 2, 1.0),     # club logo + lasers
    ("B", 20.0, 2, 1.0),    # red lights, full floor
    ("A", 50.5, 2, 1.0),    # wide crowd, hands up
    ("A", 40.4, 2, 1.0),    # DJ view over the crowd        MITTWOCH
    ("A", 13.2, 2, 1.0),    # hands up, teal
    ("A", 14.1, 2, 1.0),    # smiling girl, red             FREITAG
    ("B", 34.0, 2, 1.0),    # girl with bottle
    ("A", 49.0, 2, 1.0),    # lasers over the crowd         SAMSTAG
    ("B", 28.0, 2, 1.0),    # blue light show
    ("A", 42.2, 1, 1.0),    # montage, one beat each
    ("A", 43.2, 1, 1.0),
    ("B", 23.4, 1, 1.0),
    ("A", 46.2, 1, 1.0),
    ("B", 35.4, 1, 1.0),
    ("A", 45.2, 1, 1.0),
    ("A", 50.0, 8, 0.75),   # end card over slowed wide crowd
]
DAYS = {3: ("MITTWOCH", (40, 170, 255)), 5: ("FREITAG", (255, 50, 170)), 7: ("SAMSTAG", (255, 190, 50))}


def font(name, size):
    return ImageFont.truetype(FONT + name, size)


F_HUGE = font("InterDisplay-Black.otf", 190)
F_DAY = font("InterDisplay-Black.otf", 176)
F_BIG = font("InterDisplay-Black.otf", 120)
F_MED = font("InterDisplay-Bold.otf", 64)
F_SM = font("Inter-SemiBold.otf", 46)
F_TAG = font("InterDisplay-ExtraBold.otf", 56)


def clamp(x):
    return min(max(x, 0.0), 1.0)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def back_out(x, s=1.9):
    x = clamp(x) - 1
    return 1 + x * x * ((s + 1) * x + s)


def pulse(t, decay=7.0):
    return math.exp(-decay * (t % BEAT))


# ---------------------------------------------------------------- footage
class Src:
    def __init__(self, path):
        self.cap = cv2.VideoCapture(path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.pos = -1
        self.last = None

    def at(self, t):
        idx = int(round(t * self.fps))
        if idx == self.pos and self.last is not None:
            return self.last
        if idx != self.pos + 1:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, fr = self.cap.read()
        if ok:
            self.last = fr
        self.pos = idx
        return self.last


def fit(fr, zoom):
    h, w = fr.shape[:2]
    sc = max(W / w, H / h) * zoom
    fr = cv2.resize(fr, (int(w * sc) + 2, int(h * sc) + 2), interpolation=cv2.INTER_LANCZOS4)
    y0, x0 = (fr.shape[0] - H) // 2, (fr.shape[1] - W) // 2
    fr = fr[y0:y0 + H, x0:x0 + W]
    blur = cv2.GaussianBlur(fr, (0, 0), 2.0)                 # unsharp after upscaling
    fr = cv2.addWeighted(fr, 1.45, blur, -0.45, 0)
    return cv2.cvtColor(fr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255


def grade(img):
    # punchy club look: contrast S-curve, a bit more saturation, lifted blacks kept dark
    g = img.mean(axis=2, keepdims=True)
    img = g + (img - g) * 1.18
    img = np.clip(img, 0, 1)
    return img * img * (3 - 2 * img) * 0.35 + img * 0.65


# ---------------------------------------------------------------- text
def text_layer(draws):
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for txt, f, (cx, cy), fill, sc, gcol in draws:
        if sc <= 0.01 or fill[3] <= 0:
            continue
        bb = f.getbbox(txt)
        tile = Image.new("RGBA", (bb[2] - bb[0] + 40, bb[3] - bb[1] + 40), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((20 - bb[0], 20 - bb[1]), txt, font=f, fill=fill)
        if sc != 1:
            tile = tile.resize((max(1, int(tile.width * sc)), max(1, int(tile.height * sc))), Image.LANCZOS)
        pos = (int(cx - tile.width / 2), int(cy - tile.height / 2))
        base.paste(tile, pos, tile)
        sh = Image.new("RGBA", tile.size, (0, 0, 0, 0))
        sh.putalpha(tile.getchannel("A").point(lambda v: int(v * 0.85)))
        shadow.paste(sh, (pos[0], pos[1] + 6), sh)
        if gcol:
            g = Image.new("RGBA", tile.size, gcol + (0,))
            g.putalpha(tile.getchannel("A"))
            glow.paste(g, pos, g)
    return base, glow.filter(ImageFilter.GaussianBlur(24)), shadow.filter(ImageFilter.GaussianBlur(14))


def over(img, rgba):
    a = np.asarray(rgba).astype(np.float32) / 255
    return img * (1 - a[..., 3:]) + a[..., :3] * a[..., 3:]


def add_glow(img, rgba, k=1.3):
    a = np.asarray(rgba).astype(np.float32) / 255
    return img + a[..., :3] * a[..., 3:] * k


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
VIGN = np.clip(1 - 0.5 * (((XX - W / 2) / (W * 0.8)) ** 2 + ((YY - H / 2) / (H * 0.75)) ** 2), 0.3, 1)[..., None]


def plate(cy, ry=320, k=0.55):
    p = np.exp(-(((XX - W / 2) / 650) ** 2 + ((YY - cy) / ry) ** 2))
    return (1 - k * p)[..., None]


def overlay(i, tl, sd, t):
    """Text for shot i at local time tl. Returns (draws, darken-map or None)."""
    bp = pulse(t)
    d, dark = [], None
    if i == 1 or i == 2:                       # beats 2-6: intro claim
        tt = tl if i == 1 else tl + 2 * BEAT
        a = int(255 * clamp(tt / 0.15))
        d.append(("HIER WIRD", F_BIG, (W / 2, 800), (255, 255, 255, a), back_out(tt / 0.35) * 0.9 + 0.1, None))
        d.append(("GEFEIERT", F_BIG, (W / 2, 940), (255, 255, 255, int(255 * clamp((tt - 0.2) / 0.15))),
                  back_out((tt - 0.2) / 0.35) * 0.9 + 0.1, (255, 60, 140)))
        d.append(("CAFÉ EUROPA · BIELEFELD", F_TAG, (W / 2, 1090), (255, 190, 50, int(255 * clamp((tt - 0.7) / 0.2))),
                  0.9, (255, 190, 50)))
        dark = plate(940)
    elif i in (3, 4, 5, 6, 7, 8):              # day blocks, 4 beats each
        k0 = 3 + ((i - 3) // 2) * 2
        day, col = DAYS[k0]
        tt = tl + (i - k0) * 2 * BEAT
        block = 4 * BEAT
        out_k = clamp((tt - block + 0.15) / 0.15)
        sc = (0.55 + 0.45 * back_out(tt / 0.35) + 0.04 * bp) * (1 + 0.5 * out_k)
        a = int(255 * (1 - out_k))
        d.append(("JEDEN", F_MED, (W / 2, 790), (255, 255, 255, a), 1, None))
        d.append((day, F_DAY, (W / 2, 940), (255, 255, 255, a), sc, col))
        # MI FR SA chips
        for j, (kk, (dn, dc)) in enumerate(sorted(DAYS.items())):
            on = kk <= k0
            d.append((dn[:2], F_TAG, (W / 2 + (j - 1) * 170, 300),
                      (*(dc if on else (150, 150, 150)), 255 if on else 140), 1 + (0.15 * bp if kk == k0 else 0),
                      dc if kk == k0 else None))
        dark = plate(900) * plate(300, 120, 0.4)
    elif 9 <= i <= 14:                          # montage
        tt = tl + (i - 9) * BEAT
        d.append(("FREE YOUR MIND", F_BIG, (W / 2, 940), (255, 255, 255, 255), 0.82 + 0.05 * bp, (255, 60, 140)))
        dark = plate(940, 200, 0.45)
    elif i == 15:                               # end card
        k = ease_out(tl / 0.5)
        y = 560 - 40 * (1 - k)
        for txt, yy in (("CAFÉ", y - 100), ("EUROPA", y + 100)):
            d.append((txt, F_HUGE, (W / 2, yy), (255, 255, 255, int(255 * k)), 0.8, (255, 190, 50)))
        a2 = int(255 * clamp((tl - 0.4) / 0.3))
        d.append(("MI · FR · SA", F_BIG, (W / 2, 900), (255, 190, 50, a2), 1 + 0.03 * bp, (255, 190, 50)))
        a3 = int(255 * clamp((tl - 0.9) / 0.3))
        d.append((ADDRESS[0], F_MED, (W / 2 + 25, 1060), (255, 255, 255, a3), 1, None))
        d.append((ADDRESS[1], F_SM, (W / 2, 1140), (225, 225, 225, a3), 1, None))
        a4 = int(255 * clamp((tl - 1.5) / 0.3))
        d.append((HANDLE, F_TAG, (W / 2, 1290), (255, 255, 255, a4), 1, (255, 60, 140)))
        d.append(("Sehen wir uns?", F_SM, (W / 2, 1375), (255, 190, 50, a4), 1, None))
        dark = np.full((H, W, 1), 1 - 0.55 * clamp(tl / 0.6), np.float32) * plate(950, 600, 0.35)
    return d, dark


def pin(img, a):
    if a <= 0:
        return img
    p = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(p)
    bb = F_MED.getbbox(ADDRESS[0])
    px, py = W / 2 + 25 - (bb[2] - bb[0]) / 2 - 50, 1062
    c = (255, 60, 140, int(255 * a))
    pd.ellipse([px - 20, py - 34, px + 20, py + 6], fill=c)
    pd.polygon([(px - 17, py - 6), (px + 17, py - 6), (px, py + 26)], fill=c)
    pd.ellipse([px - 8, py - 22, px + 8, py - 6], fill=(0, 0, 0, int(255 * a)))
    return over(img, p)


# ---------------------------------------------------------------- render
def timeline():
    t0, tl = 0.0, []
    for i, (s, tin, beats, sp) in enumerate(SHOTS):
        tl.append((t0, t0 + beats * BEAT, i))
        t0 += beats * BEAT
    return tl, t0


def frame(srcs, t, tl_list, dur):
    for s0, s1, i in tl_list:
        if s0 <= t < s1 or i == len(SHOTS) - 1:
            break
    src, tin, beats, sp = SHOTS[i]
    tl, sd = t - s0, s1 - s0
    fr = srcs[src].at(tin + tl * sp)
    punch = 1.0 + 0.09 * (1 - ease_out(tl / 0.3)) if i > 0 else 1.0   # zoom punch on each cut
    drift = 1.04 + 0.03 * tl / sd                                       # slow push-in
    img = grade(fit(fr, punch * drift + 0.012 * pulse(t)))
    if i > 0 and tl < 2 / FPS:                                          # flash frame on cut
        img = img + 0.35 * (1 - tl * FPS / 2)
    img *= VIGN
    draws, dark = overlay(i, tl, sd, t)
    if dark is not None:
        img *= dark
    base, glow, shadow = text_layer(draws)
    img = over(img, shadow)
    img = add_glow(img, glow)
    if i == len(SHOTS) - 1:
        img = pin(img, clamp((tl - 0.9) / 0.3))
    img = over(img, base)
    img *= clamp((dur - t) / 0.3)
    img = img / (1 + np.maximum(img - 0.9, 0))
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src_a")
    ap.add_argument("src_b")
    ap.add_argument("--preview", nargs="*", type=float)
    a = ap.parse_args()
    os.makedirs("out", exist_ok=True)
    srcs = {"A": Src(a.src_a), "B": Src(a.src_b)}
    tl_list, dur = timeline()
    if a.preview:
        for t in a.preview:
            Image.fromarray(frame(srcs, t, tl_list, dur)).save(f"out/preview_{t:.2f}.png")
        return
    nf = int(round(dur * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                          "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    for k in range(nf):
        p.stdin.write(frame(srcs, k / FPS, tl_list, dur).tobytes())
        if k % 30 == 0:
            print(f"\r{k}/{nf}", end="", flush=True)
    p.stdin.close()
    p.wait()
    print(f"\n-> {OUT} ({dur:.2f} s)")


if __name__ == "__main__":
    main()
