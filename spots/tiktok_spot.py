"""FLUXE Studio – TikTok/Reels ad (1080x1920, 30 fps, ~22.5 s), cut on a 128 BPM grid.
Input: frame sequences recorded frame-exactly from the live sites (see README), brand assets.
Output: spots/final/fluxe-tiktok.mp4"""
import glob, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FR = sys.argv[1]                                  # frames root
OUT = os.path.join(os.path.dirname(__file__), 'final', 'fluxe-tiktok.mp4')
HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.join(HERE, '..', 'portfolio', 'brand')
W, H, FPS = 1080, 1920, 30
BEAT = 60 / 128
LIME = (212, 255, 58)
BLACK = Image.new('RGB', (W, H), (8, 8, 10))

FONT = os.path.join(HERE, 'fonts', 'Inter-Black.ttf')
FONT_B = os.path.join(HERE, 'fonts', 'Inter-Bold.ttf')
FONT_S = os.path.join(HERE, 'fonts', 'Inter-SemiBold.ttf')
EMOJI = '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'
_fc = {}
def font(path, size):
    k = (path, size)
    if k not in _fc: _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]

def frames(name):
    return sorted(glob.glob(f'{FR}/{name}/*.jpg'))

_ic = {}
def load(p):
    if p not in _ic:
        if len(_ic) > 120: _ic.clear()
        _ic[p] = Image.open(p).convert('RGB')
    return _ic[p]

# ── timeline (beats) ───────────────────────────────────────────────────────────
B = BEAT
HOOK_END = 4 * B            # 1.875
DROP = 6 * B                # 2.8125
shots = []                  # (start, end, kind, data)
t = DROP
def shot(nbeats, kind, **d):
    global t
    shots.append((t, t + nbeats * B, kind, d)); t += nbeats * B
shot(5, 'clip', name='vestier', tag='IMMOBILIEN', cap=[('Luxus-Makler', None), ('Website', LIME)], speed=1.0)
shot(5, 'clip', name='beschte', tag='HANDWERK', cap=[('Elektro-Meister', None), ('mit Chatbot', LIME)], speed=1.0)
shot(4, 'clip', name='redbull', tag='3D-PRODUKTSEITE', cap=[('Echte Dose.', None), ('In 3D.', LIME)], spec=True, speed=1.0)
shot(3, 'clip', name='redflav', tag='3D-PRODUKTSEITE', cap=[('1 Tap –', None), ('neue Sorte.', LIME)], spec=True, speed=1.0, skip=4)
shot(6, 'clip', name='redtray', tag='3D-PRODUKTSEITE', cap=[('24 Dosen.', None), ('1 Scroll.', LIME)], spec=True, speed=1.15, skip=4)
for nm, label in [('katerkit', 'ONLINE-SHOP'), ('aurene', 'PARFUM-SHOP'), ('schwarzstich', 'TATTOO-STUDIO'), ('lumyx', 'SAAS · PRAXIS'), ('kryo', '3D-SHOP'), ('pablo', 'REBRAND')]:
    shot(1, 'clip', name=nm, tag=label, cap=[('Shops. Marken.', None), ('Studios.', LIME)], speed=1.0, montage=True)
shot(6, 'clip', name='chat', tag='CHATBOT', cap=[('Antwortet', None), ('um 3 Uhr nachts.', LIME)], speed=0.72, skip=0, inset=True)
END = t
TOTAL = END + 7 * B
CUTS = [s[0] for s in shots] + [END]

# ── helpers ────────────────────────────────────────────────────────────────────
def ease_out(x): return 1 - (1 - x) ** 3
def ease_back(x, s=1.7): x -= 1; return x * x * ((s + 1) * x + s) + 1

def text_layer(lines, size=118, fnt=FONT, gap=0.08, shadow=True, maxw=960, box=False):
    """lines: [(text, colour|None)] → RGBA image, white by default, heavy soft shadow for legibility."""
    imgs = []
    for txt, col in lines:
        s = size
        while True:
            f = font(fnt, s)
            bb = f.getbbox(txt)
            if bb[2] - bb[0] <= maxw or s < 50: break
            s -= 4
        w, h = bb[2] - bb[0], f.getbbox('Hg')[3]
        if box:   # TikTok-style caption: solid rounded box, dark text → readable on any background
            px, py = int(s * 0.28), int(s * 0.16)
            cap_h = bb[3] - bb[1]
            im = Image.new('RGBA', (w + 2 * px, cap_h + 2 * py + int(s * 0.12)), (0, 0, 0, 0)); dd = ImageDraw.Draw(im)
            dd.rounded_rectangle((0, 0, im.width - 1, im.height - 1), int(s * 0.22), fill=(col or (255, 255, 255)) + (255,))
            dd.text((px - bb[0], py - bb[1] + int(s * 0.06)), txt, font=f, fill=(8, 8, 10, 255))
        else:
            im = Image.new('RGBA', (w + 40, h + 30), (0, 0, 0, 0))
            ImageDraw.Draw(im).text((20 - bb[0], 10), txt, font=f, fill=(col or (255, 255, 255)) + (255,))
        imgs.append(im)
    tw = max(i.width for i in imgs); th = sum(int(i.height * (1 - gap)) if not box else i.height for i in imgs) + 20
    lay = Image.new('RGBA', (tw + 80, th + 80), (0, 0, 0, 0))
    y = 40
    for im in imgs:
        lay.alpha_composite(im, ((lay.width - im.width) // 2, y)); y += int(im.height * (1 - gap)) if not box else im.height - int(size * 0.02)
    if shadow:
        a = lay.split()[3].filter(ImageFilter.GaussianBlur(18))
        sh = Image.new('RGBA', lay.size, (0, 0, 0, 0)); sh.putalpha(a.point(lambda v: min(255, int(v * 1.6))))
        sh2 = Image.new('RGBA', lay.size, (0, 0, 0, 0)); sh2.putalpha(lay.split()[3].filter(ImageFilter.GaussianBlur(4)))
        base = Image.new('RGBA', lay.size, (0, 0, 0, 0)); base.alpha_composite(sh); base.alpha_composite(sh2); base.alpha_composite(lay)
        lay = base
    return lay

_tc = {}
def cached_text(key, *a, **k):
    if key not in _tc: _tc[key] = text_layer(*a, **k)
    return _tc[key]

def paste_scaled(canvas, lay, cx, cy, scale=1.0, alpha=1.0):
    if scale <= 0.01 or alpha <= 0.01: return
    l = lay if abs(scale - 1) < 1e-3 else lay.resize((max(1, int(lay.width * scale)), max(1, int(lay.height * scale))), Image.BICUBIC)
    if alpha < 1:
        l = l.copy(); l.putalpha(l.split()[3].point(lambda v: int(v * alpha)))
    canvas.alpha_composite(l, (int(cx - l.width / 2), int(cy - l.height / 2)))

def pill(txt, bg=LIME, fg=(8, 8, 10), size=34):
    key = ('pill', txt, bg, size)
    if key in _tc: return _tc[key]
    f = font(FONT, size); bb = f.getbbox(txt)
    w, h = bb[2] - bb[0] + 44, int(size * 1.7)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=bg + (255,))
    d.text((22 - bb[0], (h - (bb[3] - bb[1])) / 2 - bb[1]), txt, font=f, fill=fg + (255,))
    _tc[key] = im
    return im

def emoji(ch, size=120):
    key = ('emo', ch, size)
    if key in _tc: return _tc[key]
    f = ImageFont.truetype(EMOJI, 109)
    im = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((0, 0), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox()).resize((size, size), Image.LANCZOS)
    _tc[key] = im
    return im

def zoom(img, s, ox=0.5, oy=0.5):
    if s <= 1.0005: return img
    w, h = img.size; cw, ch = w / s, h / s
    x0, y0 = (w - cw) * ox, (h - ch) * oy
    return img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((w, h), Image.BICUBIC)

def whip(img, k):
    """horizontal whip-pan blur + slide, k in 0..1 (1 = strongest)."""
    if k <= 0.01: return img
    a = np.asarray(img).astype(np.float32)
    shift = int(260 * k)
    acc = np.zeros_like(a); n = 7
    for i in range(n):
        acc += np.roll(a, int(shift * i / (n - 1)) - shift // 2 + int(220 * k), axis=1)
    return Image.fromarray((acc / n).clip(0, 255).astype(np.uint8))

def clip_frame(name, local_t, speed=1.0, skip=0):
    fs = frames(name)
    i = skip + int(local_t * FPS * speed)
    return load(fs[min(len(fs) - 1, max(0, i))])

LOGO = Image.open(os.path.join(BRAND, 'fluxe-logo-hell.png')).convert('RGBA')
MARK = Image.open(os.path.join(BRAND, 'fluxe-mark-1024.png')).convert('RGBA')

# ── render one frame ───────────────────────────────────────────────────────────
def render(t):
    # HOOK ─ old website, caption slams in word by word
    if t < HOOK_END:
        base = load(frames('old')[-1])
        x = t / HOOK_END
        img = zoom(base, 1.0 + 0.10 * x, 0.5, 0.35)
        # desaturate/darken a bit so the caption pops
        img = Image.blend(img, Image.new('RGB', img.size, (20, 20, 24)), 0.35).convert('RGBA')
        sh = 0
        steps = [(0.0, ('Deine Website', None)), (2 * B, ('sieht aus wie', None)), (3 * B, ('2009?', (255, 80, 80)))]
        lines = [l for (st, l) in steps if t >= st]
        lay = cached_text(('hook', len(lines)), lines, size=128)
        last = max(st for st, _ in steps if t >= st)
        p = min(1, (t - last) / 0.18)
        sc = 0.8 + 0.2 * ease_back(p)
        if t - last < 0.12: sh = int(14 * (1 - (t - last) / 0.12))
        paste_scaled(img, lay, W / 2 + (np.sin(t * 90) * sh), 700, sc)
        if t > 3 * B:
            e = emoji('💀', 150); q = min(1, (t - 3 * B) / 0.2)
            paste_scaled(img, e, W / 2, 1040, 0.6 + 0.4 * ease_back(q), q)
        return img.convert('RGB')

    # TRANSITION ─ tape-stop to black, "Lass mich das fixen." + riser
    if t < DROP:
        x = (t - HOOK_END) / (DROP - HOOK_END)
        img = Image.new('RGBA', (W, H), (8, 8, 10, 255))
        # glow
        g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
        r = 380 + 260 * x
        d.ellipse((W / 2 - r, H / 2 - 120 - r, W / 2 + r, H / 2 - 120 + r), fill=LIME + (int(70 * x),))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(140)))
        lay = cached_text('fix', [('Lass mich das', None), ('kurz fixen.', LIME)], size=124)
        paste_scaled(img, lay, W / 2, H / 2 - 120, 0.85 + 0.25 * x)
        m = MARK.resize((150, 150), Image.LANCZOS)
        paste_scaled(img, m, W / 2, H / 2 + 230, 0.6 + 0.4 * ease_out(min(1, x * 1.6)), min(1, x * 2))
        return img.convert('RGB')

    # SHOTS
    for i, (s0, s1, kind, d) in enumerate(shots):
        if s0 <= t < s1:
            lt = t - s0
            frame = clip_frame(d['name'], lt, d.get('speed', 1.0), d.get('skip', 0))
            if d.get('inset'):
                # screen as a floating card below the caption (caption would cover the chat text otherwise)
                bgc = _tc.get('insetbg')
                if bgc is None:
                    bgc = Image.new('RGBA', (W, H), (8, 8, 10, 255)); gg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                    ImageDraw.Draw(gg).ellipse((W / 2 - 600, 1150 - 600, W / 2 + 600, 1150 + 600), fill=(232, 160, 200, 60))
                    bgc.alpha_composite(gg.filter(ImageFilter.GaussianBlur(170)))
                    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cw, chh = int(W * 0.74), int(H * 0.74)
                    ImageDraw.Draw(sh).rounded_rectangle(((W - cw) / 2, 690 + 30, (W + cw) / 2, 690 + chh + 30), 60, fill=(0, 0, 0, 200))
                    bgc.alpha_composite(sh.filter(ImageFilter.GaussianBlur(40)))
                    _tc['insetbg'] = bgc
                    m = Image.new('L', (cw, chh), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, chh - 1), 56, fill=255); _tc['insetmask'] = m
                sc = 1.0 + 0.03 * (lt / (s1 - s0))
                cw, chh = int(W * 0.74 * sc), int(H * 0.74 * sc)
                card = frame.resize((cw, chh), Image.BICUBIC)
                img = bgc.copy()
                img.paste(card, ((W - cw) // 2, 690 - (chh - int(H * 0.74)) // 2), _tc['insetmask'].resize((cw, chh)))
                img = img.convert('RGB')
            else:
                img = zoom(frame, 1.0 + 0.05 * (lt / (s1 - s0)), 0.5, 0.4)
            # whip-in for the first 4 frames of every shot
            k = max(0.0, 1 - lt / (4 / FPS))
            if k > 0: img = whip(img, k * (0.6 if d.get('montage') else 1.0))
            img = img.convert('RGBA')
            # top gradient for legibility of captions
            grad = _tc.get('grad')
            if grad is None:
                gr = np.zeros((H, W, 4), np.uint8)
                a = np.clip(1 - np.arange(H) / 760, 0, 1) ** 1.6 * 175
                gr[..., 3] = a[:, None].astype(np.uint8)
                grad = _tc['grad'] = Image.fromarray(gr, 'RGBA')
            img.alpha_composite(grad)
            # tag pill
            tg = pill(d['tag'])
            tp = min(1, lt / 0.2)
            img.alpha_composite(tg, (int(W / 2 - tg.width / 2), int(230 - 30 * (1 - ease_out(tp)))))
            if d.get('spec'):
                sp = pill('Spec-Arbeit · nicht offiziell von Red Bull', bg=(30, 30, 34), fg=(220, 220, 225), size=24)
                img.alpha_composite(sp, (int(W / 2 - sp.width / 2), 310))
            # caption: for the montage only the first montage shot animates in
            first_m = d.get('montage') and (i == 0 or not shots[i - 1][3].get('montage'))
            in_montage = d.get('montage') and not first_m
            mstart = s0
            if in_montage:
                j = i
                while shots[j - 1][3].get('montage'): j -= 1
                mstart = shots[j][0]
            ct = t - mstart
            lay = cached_text(('cap', tuple(c[0] for c in d['cap'])), d['cap'], size=96, box=True, maxw=880)
            p = min(1, ct / 0.22)
            paste_scaled(img, lay, W / 2, 470, 0.75 + 0.25 * ease_back(p), min(1, p * 1.5))
            # white flash on the drop
            if i == 0 and lt < 3 / FPS:
                fl = Image.new('RGBA', (W, H), (255, 255, 255, int(200 * (1 - lt / (3 / FPS)))))
                img.alpha_composite(fl)
            return img.convert('RGB')

    # END CARD
    lt = t - END
    img = Image.new('RGBA', (W, H), (8, 8, 10, 255))
    g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(g)
    dd.ellipse((W / 2 - 520, 380 - 420, W / 2 + 520, 380 + 420), fill=LIME + (60,))
    dd.ellipse((-200, H - 700, 700, H + 100), fill=(74, 168, 255, 40))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(160)))
    lg = LOGO.resize((860, int(860 * LOGO.height / LOGO.width)), Image.LANCZOS)
    p = min(1, lt / 0.35)
    paste_scaled(img, lg, W / 2, 470, 0.85 + 0.15 * ease_back(p), p)
    rows = [('Websites', 'ab 690 €'), ('Werbespots', 'ab 249 €'), ('Chatbots', 'ab 390 €')]
    for k, (a, b2) in enumerate(rows):
        st = 0.5 + k * B
        if lt < st: continue
        q = min(1, (lt - st) / 0.2)
        key = ('row', a)
        if key not in _tc:
            fa, fb = font(FONT_B, 64), font(FONT, 64)
            im = Image.new('RGBA', (900, 110), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.rounded_rectangle((0, 0, 899, 109), radius=30, fill=(255, 255, 255, 18), outline=(255, 255, 255, 40), width=2)
            d.text((44, 55), a, font=fa, fill=(240, 240, 242, 255), anchor='lm')
            d.text((856, 55), b2, font=fb, fill=LIME + (255,), anchor='rm')
            _tc[key] = im
        paste_scaled(img, _tc[key], W / 2 + 60 * (1 - ease_out(q)), 800 + k * 140, 1.0, q)
    st = 0.5 + 3 * B
    if lt >= st:
        q = min(1, (lt - st) / 0.25)
        pulse = 1 + 0.035 * np.sin((lt - st) * 2 * np.pi / (2 * B))
        cta = pill('Link in Bio  ↗', size=62)
        paste_scaled(img, cta, W / 2, 1290, (0.7 + 0.3 * ease_back(q)) * pulse, q)
        sub = cached_text('sub', [('Bielefeld · OWL · remote', (160, 160, 168))], size=40, fnt=FONT_S, shadow=False)
        paste_scaled(img, sub, W / 2, 1410, 1, q)
    if lt < 3 / FPS:
        img.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(220 * (1 - lt / (3 / FPS))))))
    return img.convert('RGB')


if __name__ == '__main__':
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wav = os.path.join(FR, 'tiktok.wav')
    subprocess.run([sys.executable, os.path.join(HERE, 'tiktok_music.py'), json.dumps(
        {'dur': TOTAL, 'drop': DROP, 'cuts': CUTS[1:], 'end': END, 'out': wav})], check=True)
    n = int(round(TOTAL * FPS))
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', OUT], stdin=subprocess.PIPE)
    for f in range(n):
        ff.stdin.write(render(f / FPS).tobytes())
        if f % 60 == 0: print('frame', f, '/', n, flush=True)
    ff.stdin.close(); ff.wait()
    print('done', OUT, f'{TOTAL:.2f}s')
