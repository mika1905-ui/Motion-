"""Pacha Ibiza – 15 s vertical spec spot (1080x1920, 30 fps).

Slow sunset intro over the island, house drop on beat 12, then the club cut on the beat.
Photos sit as full-width bands over a blurred, graded copy of themselves, so the small
source photos stay sharp. Music: pacha_music.py (124 BPM, drop on beat 12).

    python3 pacha.py                 # -> out/pacha.mp4
    python3 pacha.py --preview 1 7 13
"""
import sys, os, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from studio import text_layer, over, ease, ease_out, F_BLACK, F_LIGHT, F_SEMI, F_BOLD

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, DUR = 1080, 1920, 30, 15.0
B = 60 / 124
DROP = 12 * B

# (photo, start, end, mode, focus-x, title, title-style)
SHOTS = [
    ('vedra', 0, 4 * B, 'full', 0.55, 'IBIZA', 'thin'),
    ('terrace', 4 * B, 8 * B, 'band', 0.5, 'SINCE 1973', 'thin'),
    ('bar', 8 * B, DROP, 'band', 0.5, 'WHERE THE NIGHT BEGINS', 'small'),
    ('confetti', DROP, DROP + 2 * B, 'band', 0.5, 'THE NIGHT', 'bold'),
    ('redclub', DROP + 2 * B, DROP + 4 * B, 'band', 0.5, 'STARTS', 'bold'),
    ('entrance', DROP + 4 * B, DROP + 6 * B, 'band', 0.5, 'HERE.', 'bold'),
    ('dj', DROP + 6 * B, DROP + 8 * B, 'band', 0.5, None, None),
    ('confetti', DROP + 8 * B, DROP + 9 * B, 'band', 0.3, None, None),
    ('redclub', DROP + 9 * B, DROP + 10 * B, 'band', 0.6, None, None),
    ('dj', DROP + 10 * B, DROP + 11 * B, 'band', 0.4, None, None),
    ('entrance', DROP + 11 * B, DROP + 12 * B, 'band', 0.5, None, None),
    ('logo_crowd', DROP + 12 * B, DROP + 14 * B, 'band', 0.5, None, None),
]
END = DROP + 14 * B

def load(name):
    im = Image.open(os.path.join(HERE, 'pacha', name + '.jpg')).convert('RGB')
    return im

def grade(a, warm=True, night=False):
    a = a.astype(np.float32) / 255.
    a = np.clip((a - 0.5) * 1.15 + 0.5, 0, 1)
    if night:
        a = a * np.float32([1.08, 0.94, 1.0])
    elif warm:
        a = a * np.float32([1.06, 0.98, 0.9])
    return a

class Plate:
    def __init__(self, name, mode, fx):
        im = load(name)
        self.mode = mode
        night = name not in ('vedra',)
        if mode == 'full':
            # vertical crop at oversize for camera moves
            ch = im.height; cw = int(ch * W / H)
            x0 = int((im.width - cw) * fx)
            crop = im.crop((x0, 0, x0 + cw, ch)).resize((int(W * 1.12), int(H * 1.12)), Image.LANCZOS)
            self.bg = grade(np.asarray(crop), night=False)
            self.fg = None
        else:
            # band: photo across full width, upscaled with a light unsharp mask
            bw = int(W * 1.10); bh = int(im.height * bw / im.width)
            band = im.resize((bw, bh), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
            self.fg = grade(np.asarray(band), night=night)
            # blurred backdrop
            ch = im.height; cw = int(ch * W / H)
            x0 = int((im.width - cw) * fx)
            bg = im.crop((x0, 0, x0 + cw, ch)).resize((int(W * 1.12), int(H * 1.12)), Image.BILINEAR).filter(ImageFilter.GaussianBlur(38))
            self.bg = grade(np.asarray(bg), night=night) * 0.42

    def frame(self, k, punch=0.0):
        z = 1.0 + 0.06 * ease(k) + punch
        def place(img, scale, cy):
            h, w = img.shape[:2]
            s = scale
            M = np.float32([[s, 0, W / 2 - w / 2 * s], [0, s, cy - h / 2 * s]])
            return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        out = place(self.bg, (1 / 1.12) * z * 1.02, H / 2)
        if self.fg is not None:
            h, w = self.fg.shape[:2]
            s = (W / w) * 1.10 * (1 + 0.04 * ease(k) + punch * 0.6)
            M = np.float32([[s, 0, W / 2 - w / 2 * s - 20 * (k - .5)], [0, s, H * 0.52 - h / 2 * s]])
            fg = cv2.warpAffine(self.fg, M, (W, H), flags=cv2.INTER_LINEAR)
            m = cv2.warpAffine(np.ones((h, w), np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
            # soft top/bottom edges + drop shadow
            m = cv2.GaussianBlur(m, (0, 0), 2)
            sh = cv2.GaussianBlur(m, (0, 0), 40)
            out = out * (1 - 0.55 * sh)[..., None]
            out = over(out, fg, m)
        return out

def logo_rgba():
    im = np.asarray(load('logo')).astype(np.float32) / 255.
    a = np.clip((1 - im.min(axis=2)) * 1.8, 0, 1)
    rgb = np.clip((im - (1 - a[..., None])) / np.maximum(a[..., None], 1e-3), 0, 1)
    ys, xs = np.where(a > 0.05)
    rgb = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    s = (W * 0.78) / rgb.shape[1]
    size = (int(rgb.shape[1] * s), int(rgb.shape[0] * s))
    rgb = cv2.resize(rgb, size, interpolation=cv2.INTER_CUBIC); a = cv2.resize(a, size, interpolation=cv2.INTER_CUBIC)
    return np.clip(rgb, 0, 1), np.clip(a, 0, 1)

def main(preview=None):
    plates = {}
    for name, t0, t1, mode, fx, *_ in SHOTS:
        key = (name, mode, fx)
        if key not in plates: plates[key] = Plate(name, mode, fx)
    W_ = (245, 245, 240, 255)
    titles = {}
    for name, t0, t1, mode, fx, title, style in SHOTS:
        if not title: continue
        if style == 'thin':
            items = [(title, F_LIGHT, 120 if len(title) < 7 else 92, (W / 2, H * 0.17), 'mm', 26, W_)]
        elif style == 'small':
            items = [(title, F_SEMI, 40, (W / 2, H * 0.17), 'mm', 12, W_)]
        else:
            items = [(title, F_BLACK, 190 if len(title) < 7 else 150, (W / 2, H * 0.84), 'mm', 0, W_)]
        titles[(title)] = text_layer(W, H, items)
    lrgb, la = logo_rgba()
    end_txt = text_layer(W, H, [('THE NIGHT STARTS HERE', F_SEMI, 40, (W / 2, H * 0.66), 'mm', 10, W_),
                                ('IBIZA  ·  SINCE 1973', F_LIGHT, 34, (W / 2, H * 0.70), 'mm', 8, (200, 190, 190, 255))])
    rng = np.random.default_rng(5)
    grain = [cv2.resize(rng.standard_normal((H // 2, W // 2)).astype(np.float32), (W, H)) for _ in range(8)]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = (1 - 0.45 * np.clip(np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) - 0.4, 0, 1))[..., None]

    def frame_at(t, i):
        flash = 0.0
        if t < END:
            for name, t0, t1, mode, fx, title, style in SHOTS:
                if t0 <= t < t1: break
            k = (t - t0) / (t1 - t0)
            post_drop = t >= DROP
            punch = 0.0
            if post_drop:
                bt = (t - DROP) % B
                punch = 0.03 * np.exp(-bt * 9)
            img = plates[(name, mode, fx)].frame(k, punch)
            if not post_drop:
                # dissolve between intro shots
                if t0 > 0 and t - t0 < 0.35:
                    for pn, p0, p1, pm, pf, *_ in SHOTS:
                        if abs(p1 - t0) < 1e-6:
                            prev = plates[(pn, pm, pf)].frame(1.0)
                            a = ease((t - t0) / 0.35); img = prev * (1 - a) + img * a
                img *= ease(t / 0.8)
            if title:
                if style == 'bold':
                    a = 1.0 if t - t0 > 0.03 else 0.0
                    s = 1 + 0.08 * np.exp(-(t - t0) * 10)
                    tl = titles[title]
                    if s > 1.001:
                        M = cv2.getRotationMatrix2D((W / 2, H * 0.84), 0, s)
                        tl = cv2.warpAffine(tl, M, (W, H))
                else:
                    a = ease((t - t0 - 0.25) / 0.6) * (1 - ease((t - t1 + 0.25) / 0.25))
                    tl = titles[title]
                img = over(img, tl[..., :3], tl[..., 3] * a)
            if post_drop:
                bt = (t - DROP) % B
                flash = 0.22 * np.exp(-bt * 14) + (0.9 * np.exp(-(t - DROP) * 6) if t - DROP < 0.6 else 0)
                # moving red light leak
                cx = W * (0.5 + 0.45 * np.sin(t * 1.7)); cy = H * (0.3 + 0.2 * np.cos(t * 1.3))
                leak = np.exp(-(((xx - cx) / (W * 0.5)) ** 2 + ((yy - cy) / (H * 0.25)) ** 2))
                img = img + leak[..., None] * np.float32([0.22, 0.02, 0.06])
            else:
                # riser glow into the drop
                g = ease((t - (DROP - 1.2)) / 1.2)
                img = img * (1 - 0.25 * g) + g * 0.08 * np.float32([1, .3, .4])
        else:
            te = t - END
            img = np.zeros((H, W, 3), np.float32)
            glow = np.exp(-(((xx - W / 2) / (W * 0.6)) ** 2 + ((yy - H * 0.42) / (H * 0.22)) ** 2))
            img += glow[..., None] * np.float32([0.30, 0.03, 0.06]) * ease(te / 0.5)
            s = 1.08 - 0.08 * ease_out(te / 0.9)
            h, w = la.shape
            M = np.float32([[s, 0, W / 2 - w / 2 * s], [0, s, H * 0.42 - h / 2 * s]])
            rgb = cv2.warpAffine(lrgb, M, (W, H)); a = cv2.warpAffine(la, M, (W, H)) * ease(te / 0.25)
            img = over(img, rgb, a)
            img = over(img, end_txt[..., :3], end_txt[..., 3] * ease((te - 0.6) / 0.5))
            if te < 0.4: flash = 0.8 * np.exp(-te * 10)
            img *= 1 - ease((t - (DUR - 0.5)) / 0.5)
        # post: bloom, vignette, grain
        small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        bloom = cv2.resize(cv2.GaussianBlur(np.clip(small - 0.65, 0, 1), (0, 0), 7), (W, H))
        img = img + bloom * 1.1 + flash
        img = img / (1 + 0.15 * img) * 1.15 * vig
        img = img + grain[i % 8][..., None] * 0.035
        return np.clip(img, 0, 1)

    out_dir = os.path.join(HERE, 'out')
    if preview:
        for t in preview:
            Image.fromarray((frame_at(t, 0) * 255).astype(np.uint8)).save(os.path.join(out_dir, f'pacha_{t:.2f}.png'))
        return
    sys.path.insert(0, HERE)
    import pacha_music
    wav = os.path.join(out_dir, 'pacha.wav')
    pacha_music.render_music(wav)
    n = int(DUR * FPS)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-i', wav, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                          '-shortest', '-movflags', '+faststart', os.path.join(out_dir, 'pacha.mp4')], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write((frame_at(i / FPS, i) * 255 + 0.5).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print('wrote out/pacha.mp4')

if __name__ == '__main__':
    if '--preview' in sys.argv:
        main([float(x) for x in sys.argv[sys.argv.index('--preview') + 1:]])
    else:
        main()
