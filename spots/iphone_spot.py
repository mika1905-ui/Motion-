"""iPhone 17 Pro – 13 s vertical product spot in a clean, black keynote look.

Real product photos from Wikimedia Commons (CC0, see
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

BACKS = {c: load(f'{c}_back_clean.png') for c in ('orange', 'blue', 'silver')}
GLOW = {'orange': (1.0, 0.45, 0.15), 'blue': (0.25, 0.35, 0.8), 'silver': (0.7, 0.7, 0.72)}
# rim colour of each phone (side band in 3D), sampled from the photo's edge
RIM = {c: BACKS[c][int(BACKS[c].shape[0] * .55):int(BACKS[c].shape[0] * .75), 2:int(BACKS[c].shape[1] * .03), :3].reshape(-1, 3).mean(0) for c in BACKS}

def place3d(canvas, c, cx, cy, h, yaw=0.0, pitch=0.0, alpha=1.0, glow=True, refl=True, sweep=None):
    """Phone back as a thin 3D slab: perspective face + visible aluminium side + floor reflection."""
    img = BACKS[c]; ih, iw = img.shape[:2]
    s = h / ih; pw, ph = iw * s, ih * s; depth = pw * 0.115
    f = H * 2.4
    cy_, sy = np.cos(np.radians(yaw)), np.sin(np.radians(yaw))
    cp, sp = np.cos(np.radians(pitch)), np.sin(np.radians(pitch))
    def proj(X, Y, Z):
        X2 = X * cy_ + Z * sy; Z2 = -X * sy + Z * cy_
        Y2 = Y * cp - Z2 * sp; Z3 = Y * sp + Z2 * cp
        k = f / (f + Z3); return [cx + X2 * k, cy + Y2 * k]
    def quad(z):
        return np.float32([proj(-pw / 2, -ph / 2, z), proj(pw / 2, -ph / 2, z), proj(pw / 2, ph / 2, z), proj(-pw / 2, ph / 2, z)])
    src = np.float32([[0, 0], [iw, 0], [iw, ih], [0, ih]])
    layer = np.zeros((H, W, 3), np.float32); la = np.zeros((H, W), np.float32)
    rim = RIM[c]
    # side: stack of outlines from the far edge to the face, shaded like brushed aluminium
    n = 10
    for i in range(n, 0, -1):
        z = depth * i / n
        M = cv2.getPerspectiveTransform(src, quad(z))
        m = cv2.warpPerspective(img[..., 3], M, (W, H), flags=cv2.INTER_LINEAR)
        t = i / n
        shade = 0.55 + 0.55 * np.exp(-((t - 0.35) / 0.18) ** 2)      # specular band on the rounded side
        col = np.clip(rim * shade * (1.0 if c != 'blue' else 1.15), 0, 1)
        layer = layer * (1 - m[..., None]) + col * m[..., None]; la = np.maximum(la, m)
    M = cv2.getPerspectiveTransform(src, quad(0))
    face = cv2.warpPerspective(img[..., :3], M, (W, H), flags=cv2.INTER_LINEAR)
    fa = cv2.warpPerspective(img[..., 3], M, (W, H), flags=cv2.INTER_LINEAR)
    # light falls off across the turned face
    if sweep is not None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        p = (xx * 0.6 + yy * 0.8) / (W * 0.6 + H * 0.8)
        face = face + (np.exp(-((p - sweep) / 0.05) ** 2) * 0.14)[..., None]
    face = face * (1 - 0.18 * abs(sy))
    layer = layer * (1 - fa[..., None]) + face * fa[..., None]; la = np.maximum(la, fa)
    la *= alpha
    if glow:
        g = cv2.GaussianBlur(cv2.resize(la, (W // 8, H // 8)), (0, 0), 9)
        canvas = canvas + cv2.resize(g, (W, H))[..., None] * np.float32(GLOW[c]) * 0.5
    if refl:
        bottom = int(np.where(la.max(1) > 0.5)[0].max()) if (la > 0.5).any() else H
        if bottom < H - 2:
            r = layer[::-1]; ra = la[::-1]
            shift = 2 * bottom - H + 2
            r = np.roll(r, shift, axis=0); ra = np.roll(ra, shift, axis=0)
            if shift > 0: ra[:shift] = 0
            yy = np.arange(H)[:, None].astype(np.float32)
            fade = np.clip(1 - (yy - bottom) / (H * 0.16), 0, 1) * (yy > bottom)
            ra = ra * fade * 0.22
            canvas = canvas * (1 - ra[..., None]) + cv2.GaussianBlur(r, (0, 0), 2) * ra[..., None]
    return canvas * (1 - la[..., None]) + np.clip(layer, 0, 1.3) * la[..., None]

def place(canvas, img, cx, cy, h, rot=0.0):
    ih, iw = img.shape[:2]; s = h / ih
    M = cv2.getRotationMatrix2D((iw / 2, ih / 2), rot, s); M[0, 2] += cx - iw / 2; M[1, 2] += cy - ih / 2
    rgb = cv2.warpAffine(img[..., :3], M, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    a = cv2.warpAffine(img[..., 3], M, (W, H), flags=cv2.INTER_LINEAR)
    return over(canvas, rgb, a)

B = 0.6
SHOTS = [  # name, start, end
    ('hero', 0.0, 3.0), ('macro', 3.0, 5.4), ('blue', 5.4, 7.8), ('lineup', 7.8, 10.2), ('silver', 10.2, 11.4),
]
END = 11.4

def main(preview=None):
    white = (245, 245, 247, 255); grey = (161, 161, 166, 255)
    T = {
        'hero': text_layer(W, H, [('iPhone 17 Pro', F_BOLD, 104, (W / 2, H * 0.10), 'mm', 0, white),
                                  ('Pro. Durch und durch.', F_LIGHT, 42, (W / 2, H * 0.145), 'mm', 1, grey)]),
        'macro': text_layer(W, H, [('Pro-Kamerasystem.', F_BOLD, 88, (W / 2, H * 0.84), 'mm', 0, white),
                                   ('Drei 48-MP-Kameras.', F_LIGHT, 42, (W / 2, H * 0.88), 'mm', 1, grey)]),
        'blue': text_layer(W, H, [('Aluminium.', F_BOLD, 96, (W / 2, H * 0.085), 'mm', 0, white),
                                  ('Neu geformt.', F_BOLD, 96, (W / 2, H * 0.135), 'mm', 0, (140, 165, 230, 255))]),
        'lineup': text_layer(W, H, [('Drei Farben.', F_BOLD, 96, (W / 2, H * 0.10), 'mm', 0, white),
                                    ('Cosmic Orange  ·  Deep Blue  ·  Silber', F_LIGHT, 38, (W / 2, H * 0.145), 'mm', 1, grey)]),
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
            cy = H * (1.25 - 0.67 * ease_out(k * 1.1))
            return place3d(img, 'orange', W / 2, cy, H * 0.62, yaw=38 - 50 * ease(k), pitch=6 - 4 * k, sweep=-0.2 + 1.3 * ease(k))
        if name == 'macro':
            o = BACKS['orange']; h = H * (2.3 + 0.35 * ease(k))
            img = place(np.zeros((H, W, 3), np.float32), o, W * 0.66, H * 0.42 + h * 0.36, h, rot=-6 + 3 * k)
            shade = np.clip((yy / H - 0.62) / 0.30, 0, 1) ** 1.2 * 0.85
            return img * (1 - shade[..., None])
        if name == 'blue':
            img = bg(GLOW['blue'], 1.0, 0.6)
            return place3d(img, 'blue', W / 2, H * (0.58 - 0.02 * ease(k)), H * 0.60, yaw=-34 + 46 * ease(k), pitch=8 - 6 * ease(k))
        if name == 'lineup':
            img = bg(GLOW['orange'], 0.7, 0.62)
            for c, x, yaw, d in (('blue', 0.20, 32, 0.10), ('silver', 0.80, -32, 0.18), ('orange', 0.50, 0, 0.0)):
                e = ease_out((k - d) / 0.55)
                hh = H * (0.50 if c != 'orange' else 0.56)
                img = place3d(img, c, W * x, H * (1.30 - 0.70 * e) + (H * 0.02 if c != 'orange' else 0), hh,
                              yaw=yaw + (8 if c == 'blue' else -8 if c == 'silver' else 6) * (1 - k), pitch=5, glow=(c == 'orange'))
            return img
        img = bg(GLOW['silver'], 1.0, 0.6)
        return place3d(img, 'silver', W / 2, H * 0.58, H * 0.60, yaw=28 - 56 * ease(k), pitch=6)

    def frame_at(t, n):
        if t < END:
            name, t0, t1 = next(s for s in SHOTS if s[1] <= t < s[2])
            img = shot(name, t, t0, t1)
            if t0 > 0 and t - t0 < 0.2:
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
