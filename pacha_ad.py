"""15 s vertical spec ad for Pacha Ibiza (1080x1920, 30 fps).

Calm island intro (Es Vedrà, Dalt Vila, the cathedral, Sant Jordi church) over a
Spanish-guitar intro, then the house beat drops at ~5.8 s and the edit cuts on the
beat through the club: the entrance, the bulb sign, the DJ booth, the crowd.
End card on the cherries sign.

    python3 pacha_ad.py                  # -> out/pacha_ibiza_ad.mp4
    python3 pacha_ad.py --preview 1 6 13 # single PNG frames to out/preview_*.png

Photos: Wikimedia Commons, see assets/pacha/sources.json (credits in README).
Music: synthesized in pacha_music.py.
"""
import argparse, math, os, subprocess
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from pacha_music import BEAT, render_music

FPS = 30
DUR = 15.0
W, H = 1080, 1920
FONT = "/usr/share/fonts/opentype/inter/"
OUT = "out/pacha_ibiza_ad.mp4"
DROP = 12  # beat on which the house beat drops

# key, start beat, length (beats), crop centre x/y (0..1), zoom from->to, pan x (frac), grade, mode
SHOTS = [
    ("vedra",     0,  3, 0.47, 0.55, 1.05, 1.18, -0.03, "sunset", "fill"),
    ("cathedral", 3,  3, 0.42, 0.45, 1.20, 1.06,  0.02, "warm",   "fill"),
    ("santjordi", 6,  3, 0.53, 0.50, 1.04, 1.16,  0.00, "warm",   "fill"),
    ("daltvila",  9,  3, 0.47, 0.45, 1.06, 1.22,  0.03, "dusk",   "fill"),
    ("entrance", 12,  2, 0.33, 0.45, 1.18, 1.05,  0.04, "night",  "fill"),
    ("bulbsign", 14,  2, 0.50, 0.50, 1.00, 1.08,  0.00, "club",   "fit"),
    ("alesso",   16,  2, 0.28, 0.45, 1.10, 1.22, -0.03, "club",   "fill"),
    ("co2",      18,  1, 0.34, 0.50, 1.15, 1.25,  0.00, "club",   "fill"),
    ("crowd",    19,  1, 0.52, 0.55, 1.10, 1.20,  0.00, "club",   "fill"),
    ("mainroom", 20,  1, 0.50, 0.45, 1.10, 1.20,  0.00, "club",   "fill"),
    ("party",    21,  2, 0.60, 0.50, 1.08, 1.20, -0.03, "club",   "fill"),
    ("cherries", 23,  9, 0.165, 0.40, 1.02, 1.12, 0.00, "night",  "fill"),
]

# text: start beat, end beat, lines, style
TEXTS = [
    (0.3, 3,  ["IBIZA"], "hero"),
    (0.3, 3,  ["BALEARIC ISLANDS · SPAIN"], "kicker"),
    (3,   6,  ["ANCIENT", "WALLS"], "big"),
    (6,   9,  ["WHITE", "CHURCHES"], "big"),
    (9,   12, ["AND WHEN", "THE SUN SETS…"], "big"),
    (12,  14, ["SINCE 1973"], "big"),
    (14,  16, ["THE ORIGINAL"], "big"),
    (16,  18, ["LEGENDS ON", "THE DECKS"], "big"),
    (18,  19, ["DANCE."], "punch"),
    (19,  20, ["SWEAT."], "punch"),
    (20,  21, ["REPEAT."], "punch"),
    (21,  23, ["ALL NIGHT", "LONG"], "big"),
]


def font(name, size):
    return ImageFont.truetype(FONT + name, size)


def clamp01(x):
    return min(max(x, 0.0), 1.0)


def ease_out(x):
    x = clamp01(x)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = clamp01(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


# --------------------------------------------------------------------------
# images
# --------------------------------------------------------------------------
GRADES = {
    # (lift rgb, gain rgb, saturation, contrast)
    "sunset": ((0.04, 0.01, 0.03), (1.10, 0.93, 0.80), 1.15, 1.10),
    "warm":   ((0.02, 0.01, 0.00), (1.06, 1.00, 0.90), 1.08, 1.08),
    "dusk":   ((0.05, 0.00, 0.06), (1.05, 0.88, 0.88), 1.05, 1.12),
    "night":  ((0.01, 0.00, 0.02), (1.05, 0.95, 1.00), 1.20, 1.22),
    "club":   ((0.01, 0.00, 0.02), (1.12, 0.92, 1.08), 1.40, 1.30),
}


def grade(img, g):
    lift, gain, sat, con = GRADES[g]
    x = img.astype(np.float32) / 255.0
    lum = x.mean(2, keepdims=True)
    x = lum + (x - lum) * sat
    x = (x - 0.5) * con + 0.5
    x = x * np.array(gain, np.float32) + np.array(lift, np.float32) * (1 - x)
    return np.clip(x, 0, 1)


def load_shot(key, cx, cy, mode, g):
    """Return a float32 RGB plate at 1.3x output size, ready for zoom/pan."""
    src = cv2.cvtColor(cv2.imread(f"assets/pacha/{key}.jpg"), cv2.COLOR_BGR2RGB)
    PW, PH = int(W * 1.3), int(H * 1.3)
    if mode == "fit":
        # blurred fill behind, sharp full-width image in the middle
        bg = cover(src, PW, PH, cx, cy)
        bg = cv2.GaussianBlur(bg, (0, 0), 40) * 0.55
        s = PW * 0.98 / src.shape[1]
        fg = cv2.resize(src, (round(src.shape[1] * s), round(src.shape[0] * s)), interpolation=cv2.INTER_CUBIC)
        y0 = (PH - fg.shape[0]) // 2
        x0 = (PW - fg.shape[1]) // 2
        bg[y0:y0 + fg.shape[0], x0:x0 + fg.shape[1]] = fg
        plate = bg.astype(np.uint8)
    else:
        plate = cover(src, PW, PH, cx, cy)
    plate = cv2.detailEnhance(plate, sigma_s=6, sigma_r=0.12)  # recover a bit of crispness after upscaling
    return grade(plate, g)


def cover(src, PW, PH, cx, cy):
    sh, sw = src.shape[:2]
    s = max(PW / sw, PH / sh)
    r = cv2.resize(src, (math.ceil(sw * s), math.ceil(sh * s)), interpolation=cv2.INTER_LANCZOS4)
    rh, rw = r.shape[:2]
    x0 = int(np.clip(cx * rw - PW / 2, 0, rw - PW))
    y0 = int(np.clip(cy * rh - PH / 2, 0, rh - PH))
    return r[y0:y0 + PH, x0:x0 + PW].astype(np.float32)


def view(plate, zoom, panx, shake=(0.0, 0.0), rot=0.0):
    """W x H view of the plate: zoom (1 = whole plate), pan (fraction of W), shake (px), rotation (deg)."""
    PH, PW = plate.shape[:2]
    s = 1.12 * max(zoom * W / PW, zoom * H / PH)  # 12% safety margin so pans/shake never show edges
    M = cv2.getRotationMatrix2D((PW / 2, PH / 2), rot, s)
    M[0, 2] += W / 2 - PW / 2 + panx * W + shake[0]
    M[1, 2] += H / 2 - PH / 2 + shake[1]
    return cv2.warpAffine(plate, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


# --------------------------------------------------------------------------
# text
# --------------------------------------------------------------------------
STYLES = {
    "hero":   ("InterDisplay-Bold.otf", 230, 0.40, 10),
    "kicker": ("Inter-SemiBold.otf",     38, 0.52, 9),
    "big":    ("InterDisplay-Bold.otf", 128, 0.70, 2),
    "punch":  ("InterDisplay-Bold.otf", 190, 0.50, 2),
}


def text_layer(lines, style):
    fname, size, ypos, track = STYLES[style]
    f = font(fname, size)
    lh = int(size * 1.02)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    total = lh * len(lines)
    y = int(H * ypos - total / 2)
    for ln in lines:
        widths = [d.textlength(c, font=f) for c in ln]
        tw = sum(widths) + track * (len(ln) - 1)
        x = (W - tw) / 2
        for c, cw in zip(ln, widths):
            d.text((x, y), c, font=f, fill=(255, 255, 255, 255))
            x += cw + track
        y += lh
    a = np.asarray(im).astype(np.float32)[..., 3] / 255.0
    shadow = cv2.GaussianBlur(a, (0, 0), size * 0.12) * 0.65
    return a, shadow


def place(layer, dy, scale):
    if scale == 1 and dy == 0:
        return layer
    M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, scale)
    M[1, 2] += dy
    return cv2.warpAffine(layer, M, (W, H), flags=cv2.INTER_LINEAR)


# --------------------------------------------------------------------------
# end card
# --------------------------------------------------------------------------
def end_card_layers():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def centred(txt, f, y, track=0, fill=(255, 255, 255, 255)):
        widths = [d.textlength(c, font=f) for c in txt]
        tw = sum(widths) + track * (len(txt) - 1)
        x = (W - tw) / 2
        for c, cw in zip(txt, widths):
            d.text((x, y), c, font=f, fill=fill)
            x += cw + track

    centred("PACHA", font("InterDisplay-Bold.otf", 250), 1150, 6)
    centred("I B I Z A", font("InterDisplay-Bold.otf", 96), 1430, 4)
    a1 = np.asarray(im).astype(np.float32)[..., 3] / 255.0

    im2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im2)
    centred("THE NIGHT STARTS HERE", font("Inter-SemiBold.otf", 44), 1600, 8)
    centred("SINCE 1973", font("Inter-Medium.otf", 34), 1680, 12, fill=(255, 255, 255, 200))
    a2 = np.asarray(im2).astype(np.float32)[..., 3] / 255.0
    return a1, a2


# --------------------------------------------------------------------------
# frame
# --------------------------------------------------------------------------
_PLATES, _TEXTS, _END, _GRAIN = None, None, None, None


def init():
    global _PLATES, _TEXTS, _END, _GRAIN
    _PLATES = {s[0]: load_shot(s[0], s[3], s[4], s[9], s[8]) for s in SHOTS}
    _TEXTS = [(a, b, text_layer(lines, st), st) for a, b, lines, st in TEXTS]
    _END = end_card_layers()
    rng = np.random.default_rng(7)
    _GRAIN = [rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]


def beat_of(t):
    return t / BEAT


def shot_at(b):
    for s in reversed(SHOTS):
        if b >= s[1]:
            return s
    return SHOTS[0]


def kick_env(b):
    """1 right on each kick after the drop, decaying over the beat."""
    if b < DROP:
        return 0.0
    return math.exp(-(b % 1) * 7)


def render(t):
    b = beat_of(t)
    key, sb, nb, _, _, z0, z1, pan, _, _ = shot_at(b)
    p = (b - sb) / nb
    pulse = kick_env(b)
    end = key == "cherries"

    zoom = z0 + (z1 - z0) * ease_io(p) if nb > 2 else z0 + (z1 - z0) * p
    zoom *= 1 + 0.035 * pulse
    # cut-in punch: each new shot after the drop starts slightly over-zoomed
    if b >= DROP and not end:
        zoom *= 1 + 0.10 * math.exp(-(b - sb) * 9)
    rng = np.random.default_rng(int(t * FPS))
    shake = (0.0, 0.0)
    if b >= DROP and not end:
        shake = tuple(rng.normal(0, 6 * pulse + 1.5, 2))
    rot = 0.6 * math.sin(t * 1.3) if b < DROP else 0.8 * pulse * (1 if int(b) % 2 else -1)
    img = view(_PLATES[key], zoom, pan * p, shake, rot)

    # chromatic split on kicks
    if pulse > 0.05 and not end:
        o = int(round(9 * pulse))
        img[..., 0] = np.roll(img[..., 0], o, 1)
        img[..., 2] = np.roll(img[..., 2], -o, 1)

    # end card: darken + text
    if end:
        e = (b - sb)
        img *= 1 - 0.55 * ease_out(e / 1.5)
        g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
        img *= 1 - 0.6 * np.clip((g - 0.45) / 0.35, 0, 1)
        a1, a2 = _END
        k1 = ease_out((e - 0.25) / 1.2)
        k2 = ease_out((e - 1.4) / 1.2)
        l1 = place(a1, 60 * (1 - k1), 1.25 - 0.25 * k1) * k1
        l2 = place(a2, 40 * (1 - k2), 1.0) * k2
        sh = cv2.GaussianBlur(np.maximum(l1, l2), (0, 0), 18) * 0.6
        img *= (1 - sh)[..., None]
        img = img * (1 - l1[..., None]) + l1[..., None]
        img = img * (1 - l2[..., None]) + l2[..., None]
        # a little sparkle sweep over the logotype
        sweep = np.exp(-((np.arange(W, dtype=np.float32)[None, :] - (-300 + 1700 * clamp01((e - 2.2) / 1.0))) / 70) ** 2)
        img += (l1 * sweep * 0.5)[..., None] * np.array([1.0, 0.85, 0.9], np.float32)

    # captions
    for a, bend, (lay, sh), st in _TEXTS:
        if not (a <= b < bend):
            continue
        q = b - a
        dur = bend - a
        if st == "punch":
            k = 1.0
            sc = 1.18 - 0.18 * ease_out(q * 4)
            dy = 0
        else:
            k = ease_out(q / 0.6)
            sc = 1.0 + 0.04 * (q / dur)
            dy = 50 * (1 - k)
        out = clamp01((bend - b) / 0.35) if bend <= DROP or st != "punch" else 1.0
        k *= out
        L = place(lay, dy, sc) * k
        S = place(sh, dy + 10, sc) * k
        img *= (1 - S)[..., None]
        img = img * (1 - L[..., None]) + L[..., None]

    # white flash on the drop and on every cut afterwards
    if b >= DROP:
        since_cut = b - sb
        fl = math.exp(-(b - DROP) * 5) * 0.9 + math.exp(-since_cut * 10) * 0.25
        img = img + (1 - img) * fl
    # soft dip between intro shots
    else:
        nearest = min(abs(b - s[1]) for s in SHOTS if 0 < s[1] <= DROP)
        img *= 0.75 + 0.25 * clamp01(nearest / 0.25)
    # fade in from black / out at the very end
    img *= clamp01(t / 0.35) * clamp01((DUR - t) / 0.4)

    # vignette, grain
    yy, xx = np.ogrid[:H, :W]
    vig = 1 - 0.35 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
    img *= vig[..., None].astype(np.float32)
    gr = cv2.resize(_GRAIN[int(t * FPS) % 6], (W, H), interpolation=cv2.INTER_LINEAR)
    img += gr[..., None] * 0.022
    return (np.clip(img, 0, 1) * 255).astype(np.uint8)


def worker(rng_):
    a, b = rng_
    frames = []
    for i in range(a, b):
        frames.append(render(i / FPS).tobytes())
    return frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=float, nargs="*")
    args = ap.parse_args()
    os.makedirs("out", exist_ok=True)
    if args.preview:
        init()
        for t in args.preview:
            Image.fromarray(render(t)).save(f"out/preview_{t:05.2f}.png")
        return

    wav = "out/pacha_music.wav"
    render_music(wav, DUR)
    n = int(DUR * FPS)
    chunks = [(i, min(i + 30, n)) for i in range(0, n, 30)]
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav,
         "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", OUT],
        stdin=subprocess.PIPE)
    with Pool(os.cpu_count(), initializer=init) as pool:
        for frames in pool.imap(worker, chunks):
            for fr in frames:
                ff.stdin.write(fr)
    ff.stdin.close()
    ff.wait()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
