"""iPhone 17 Pro – 13 s vertical product spot in a clean, black keynote look.

Real product photos from Wikimedia Commons (CC0 / CC BY 4.0 / CC BY-SA 4.0, see
iphone/products/SOURCES.md), cut out and placed on black – no hands, no store background.

    python3 iphone_spot.py             # -> out/iphone.mp4
    python3 iphone_spot.py --preview 1 4 6 9 12
"""
import sys, os, subprocess
import numpy as np, cv2
from PIL import Image
from studio import text_layer, over, ease, ease_out, F_BOLD, F_LIGHT, F_SEMI
import audio

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, DUR = 1080, 1920, 30, 13.0

def load(name):
    a = np.asarray(Image.open(os.path.join(HERE, 'iphone/products', name)).convert('RGBA')).astype(np.float32) / 255.
    return a

HERO = load('hero_orange.png'); FRONT = load('front.png')
BACKS = {'orange': load('orange_back.png'), 'blue': load('blue_back.png'), 'silver': load('silver_back.png')}
GLOW = {'orange': (1.0, 0.45, 0.15), 'blue': (0.25, 0.35, 0.8), 'silver': (0.7, 0.7, 0.72), 'front': (0.9, 0.45, 0.2)}

def place(canvas, img, cx, cy, h, rot=0.0, alpha=1.0, glow=None, sweep=None):
    ih, iw = img.shape[:2]; s = h / ih
    M = cv2.getRotationMatrix2D((iw / 2, ih / 2), rot, s)
    M[0, 2] += cx - iw / 2; M[1, 2] += cy - ih / 2
    rgb = cv2.warpAffine(img[..., :3], M, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    a = cv2.warpAffine(img[..., 3], M, (W, H), flags=cv2.INTER_LINEAR) * alpha
    if glow is not None:
        g = cv2.GaussianBlur(cv2.resize(a, (W // 8, H // 8)), (0, 0), 9)
        canvas = canvas + cv2.resize(g, (W, H))[..., None] * np.float32(glow) * 0.55
    if sweep is not None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        p = (xx * 0.6 + yy * 0.8) / (W * 0.6 + H * 0.8)
        band = np.exp(-((p - sweep) / 0.05) ** 2)
        rgb = rgb + (band * 0.16)[..., None]
    return over(canvas, np.clip(rgb, 0, 1.4), np.clip(a, 0, 1))

B = 0.6
SHOTS = [  # name, start, end
    ('hero', 0.0, 3.0), ('macro', 3.0, 5.4), ('front', 5.4, 7.8), ('lineup', 7.8, 10.2),
    ('blue', 10.2, 10.8), ('silver', 10.8, 11.4),
]
END = 11.4

def main(preview=None):
    white = (245, 245, 247, 255); grey = (161, 161, 166, 255)
    T = {
        'hero': text_layer(W, H, [('iPhone 17 Pro', F_BOLD, 104, (W / 2, H * 0.10), 'mm', 0, white),
                                  ('Pro. Durch und durch.', F_LIGHT, 42, (W / 2, H * 0.145), 'mm', 1, grey)]),
        'macro': text_layer(W, H, [('Pro-Kamerasystem.', F_BOLD, 88, (W / 2, H * 0.84), 'mm', 0, white),
                                   ('Drei 48-MP-Kameras.', F_LIGHT, 42, (W / 2, H * 0.88), 'mm', 1, grey)]),
        'front': text_layer(W, H, [('Ein Display,', F_BOLD, 92, (W / 2, H * 0.085), 'mm', 0, white),
                                   ('das strahlt.', F_BOLD, 92, (W / 2, H * 0.135), 'mm', 0, (255, 166, 102, 255))]),
        'lineup': text_layer(W, H, [('Drei Farben.', F_BOLD, 96, (W / 2, H * 0.10), 'mm', 0, white),
                                    ('Cosmic Orange  ·  Deep Blue  ·  Silber', F_LIGHT, 38, (W / 2, H * 0.145), 'mm', 1, grey)]),
        'blue': text_layer(W, H, [('Deep Blue', F_SEMI, 52, (W / 2, H * 0.10), 'mm', 2, white)]),
        'silver': text_layer(W, H, [('Silber', F_SEMI, 52, (W / 2, H * 0.10), 'mm', 2, white)]),
    }
    end = text_layer(W, H, [('iPhone 17 Pro', F_BOLD, 128, (W / 2, H * 0.47), 'mm', 0, white),
                            ('Gemacht für Pro.', F_LIGHT, 46, (W / 2, H * 0.525), 'mm', 1, grey)])
    rng = np.random.default_rng(4)
    grain = [cv2.resize(rng.standard_normal((H // 2, W // 2)).astype(np.float32), (W, H)) for _ in range(6)]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def bg(col, k=1.0, cy=0.55):
        g = np.exp(-(((xx - W / 2) / (W * 0.7)) ** 2 + ((yy - H * cy) / (H * 0.32)) ** 2))
        return g[..., None] * np.float32(col) * 0.10 * k

    def shot(name, t, t0, t1):
        k = (t - t0) / (t1 - t0)
        if name == 'hero':
            img = bg(GLOW['orange'], ease(k * 1.5))
            cy = H * (1.30 - 0.70 * ease_out(k * 1.15))
            return place(img, HERO, W / 2, cy, H * 0.74, rot=2.5 * (1 - ease(k)), glow=GLOW['orange'], sweep=-0.2 + 1.3 * ease(k))
        if name == 'macro':
            # big push into the camera plateau
            h = H * (2.5 + 0.35 * ease(k))
            img = np.zeros((H, W, 3), np.float32)
            img = place(img, HERO, W * 0.62, H * 0.40 + h * 0.36, h, rot=-6 + 3 * k)
            shade = np.clip((yy / H - 0.62) / 0.30, 0, 1) ** 1.2 * 0.85
            return img * (1 - shade[..., None])
        if name == 'front':
            img = bg(GLOW['front'], 1.0, 0.6)
            return place(img, FRONT, W / 2, H * (0.63 - 0.02 * ease(k)), H * (0.70 + 0.03 * ease(k)), rot=-3 * (1 - ease(k)), glow=GLOW['front'])
        if name == 'lineup':
            img = bg(GLOW['orange'], 0.7, 0.62)
            for c, x, h, d in (('blue', 0.24, 0.60, 0.10), ('silver', 0.76, 0.60, 0.18), ('orange', 0.50, 0.70, 0.0)):
                e = ease_out((k - d) / 0.55)
                img = place(img, BACKS[c], W * x, H * (1.35 - 0.62 * e) + (0 if c == 'orange' else H * 0.04), H * h,
                            rot={'blue': 6, 'silver': -6, 'orange': 0}[c] * (1 - 0.3 * e), glow=GLOW[c] if c == 'orange' else None)
            return img
        c = name
        img = bg(GLOW[c], 1.0, 0.62)
        return place(img, BACKS[c], W / 2, H * (0.74 - 0.03 * ease(k)), H * 0.72, glow=GLOW[c])

    def frame_at(t, n):
        if t < END:
            name, t0, t1 = next(s for s in SHOTS if s[1] <= t < s[2])
            img = shot(name, t, t0, t1)
            if t0 > 0 and t - t0 < 0.2 and name not in ('blue', 'silver'):
                prev = next(s for s in SHOTS if abs(s[2] - t0) < 1e-6)
                a = ease((t - t0) / 0.2); img = shot(prev[0], t, prev[1], prev[2]) * (1 - a) + img * a
            a = ease((t - t0 - (0.6 if name == 'hero' else 0.15)) / 0.45) * (1 - ease((t - (t1 - 0.12)) / 0.12))
            img = over(img, T[name][..., :3], T[name][..., 3] * a)
            img *= ease(t / 0.4)
            if END - t < 0.2: img *= (END - t) / 0.2
        else:
            te = t - END
            img = bg(GLOW['orange'], ease(te / 0.8) * 0.6, 0.5)
            img = over(img, end[..., :3], end[..., 3] * ease((te - 0.15) / 0.5))
            img *= 1 - ease((t - (DUR - 0.4)) / 0.4)
        img = img + grain[n % 6][..., None] * 0.010
        return np.clip(img, 0, 1)

    out = os.path.join(HERE, 'out')
    if preview:
        for t in preview:
            Image.fromarray((frame_at(t, 0) * 255).astype(np.uint8)).save(os.path.join(out, f'iphone_{t:.2f}.png'))
        return
    spot = dict(dur=DUR, bpm=100, theme='light', key='light', shots=[(s[0], s[1], s[2]) for s in SHOTS], end=dict(start=END))
    wav = os.path.join(out, 'iphone.wav'); audio.make('iphone', spot, wav)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-i', wav, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                          '-shortest', '-movflags', '+faststart', os.path.join(out, 'iphone.mp4')], stdin=subprocess.PIPE)
    for n in range(int(DUR * FPS)):
        p.stdin.write((frame_at(n / FPS, n) * 255 + 0.5).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print('wrote out/iphone.mp4')

if __name__ == '__main__':
    if '--preview' in sys.argv: main([float(x) for x in sys.argv[sys.argv.index('--preview') + 1:]])
    else: main()
