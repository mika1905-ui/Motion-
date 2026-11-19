"""Scrollwerk – Werbespot mit Sprecher (1080x1920, 30 fps, ~29.5 s, 128 BPM).
Jede Zeile des Sprechertexts hat ihren eigenen Abschnitt; die Untertitel laufen Wort für Wort mit.
Aufruf:  python3 vo_spot.py <frames-root> [voice.mp3]
Ohne Stimme: Musik + Untertitel. Mit Stimme: Stimme wird auf die Abschnitte gelegt, die Musik duckt sich darunter."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FR = sys.argv[1]
VOICE = sys.argv[2] if len(sys.argv) > 2 else None
sys.argv = [sys.argv[0], FR]
import tiktok_spot as T                                    # Helfer (Text, Pills, Zoom, Whip, Logo …)

HERE = T.HERE
W, H, FPS = T.W, T.H, T.FPS
B = 60 / 128
G = T.G
OUT = os.path.join(HERE, 'final', 'scrollwerk-werbespot-stimme.mp4' if VOICE else 'scrollwerk-werbespot.mp4')

# ── Sprechertext: (Beats, Zeile) – genau so steht er im ElevenLabs-Skript ──
SCRIPT = [
    (5, 'Dein Betrieb ist gut.'),
    (6, 'Aber online sieht ihn keiner.'),
    (3, 'Das ändern wir. Jetzt.'),
    (7, 'Websites, die verkaufen.'),
    (6, 'Für Handwerk. Gastro. Immobilien.'),
    (6, 'Shops, die man anfassen will.'),
    (6, 'Werbespots, die scheppern.'),
    (7, 'Chatbots, die um drei Uhr nachts antworten.'),
    (7, 'Festpreis. Antwort in 24 Stunden.'),
    (10, 'Scrollwerk. Mach dein Business unübersehbar.'),
]
SEG = []; _b = 0
for n, line in SCRIPT:
    SEG.append((_b * B, (_b + n) * B, line)); _b += n
TOTAL = _b * B
DROP = SEG[3][0]; HOOK_END = SEG[2][0]; END = SEG[9][0]

# Bilder je Abschnitt: (Abschnitt, [(clip, Anteil, Optionen)], Tag, Caption-Zeilen, extra)
SHOTS = [
    (3, [('vestier', 1.0, {})], 'WEBSITES', [('Websites,', None), ('die verkaufen.', G)], {}),
    (4, [('beschte', 1 / 3, {}), ('lamome', 1 / 3, {'skip': 20}), ('lamrail', 1 / 3, {'skip': 10})], None, [('Handwerk. Gastro.', None), ('Immobilien.', G)],
        {'tags': ['HANDWERK', 'GASTRONOMIE', 'GASTRONOMIE']}),
    (5, [('redbull', 0.5, {}), ('redtray', 0.5, {'skip': 6, 'speed': 1.3})], '3D-SHOPS', [('Shops, die man', None), ('anfassen will.', G)], {'spec': 'Spec-Arbeit · nicht offiziell von Red Bull'}),
    (6, [('sp_bmw', .25, {}), ('sp_ferrari', .25, {}), ('sp_porsche', .25, {}), ('sp_iphone', .25, {})], 'WERBESPOTS', [('Werbespots,', None), ('die scheppern.', G)],
        {'spec': 'Spec-Arbeiten · keine offiziellen Spots der Marken'}),
    (7, [('chat', 1.0, {'speed': 0.85, 'inset': True})], 'CHATBOTS', [('Antwortet', None), ('um 3 Uhr nachts.', G)], {}),
    (8, [('pakete', 1.0, {})], 'BRANCHEN-PAKETE', [('Festpreis.', None), ('Antwort in 24 h.', G)], {}),
]
CUTS = []
for si, parts, *_ in SHOTS:
    s0, s1, _l = SEG[si]; t = s0
    for nm, frac, o in parts:
        CUTS.append(t); t += (s1 - s0) * frac
CUTS = sorted(set(CUTS + [END]))


def ease_out(x): return 1 - (1 - x) ** 3


# ── Untertitel: Wort für Wort, unten ──
def subtitle(img, t):
    return                                          # große Captions zeigen den Text bereits
    for s0, s1, line in SEG:
        if s0 <= t < s1:
            words = line.split()
            span = (s1 - s0) * 0.78                     # Stimme spricht grob in den ersten ~80 % des Abschnitts
            k = min(len(words), 1 + int((t - s0) / max(0.01, span) * len(words)))
            shown = ' '.join(words[:k])
            lay = T.cached_text(('sub', line, k), [(shown, None)], size=54, fnt=T.FONT_B, maxw=940)
            T.paste_scaled(img, lay, W / 2, 1540)
            return


def glow_bg(col=T.VIOLET, a=110, cy=None):
    key = ('glow', col, a, cy)
    if key not in T._tc:
        im = Image.new('RGBA', (W, H), (8, 8, 10, 255)); g = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse((W / 2 - 600, (cy or H / 2) - 600, W / 2 + 600, (cy or H / 2) + 600), fill=col + (a,))
        im.alpha_composite(g.filter(ImageFilter.GaussianBlur(170))); T._tc[key] = im
    return T._tc[key].copy()


def render(t):
    # 1–2 HOOK: alte Website, Zeilen knallen rein
    if t < HOOK_END:
        base = T.load(T.frames('old')[-1])
        x = t / HOOK_END
        img = T.zoom(base, 1.0 + 0.12 * x, 0.5, 0.35)
        img = Image.blend(img, Image.new('RGB', img.size, (14, 14, 18)), 0.45 + 0.2 * x).convert('RGBA')
        if t < SEG[1][0]:
            lines, st = [('Dein Betrieb', None), ('ist gut.', G)], 0.0
        else:
            lines, st = [('Aber online', None), ('sieht ihn', None), ('keiner.', (255, 80, 80))], SEG[1][0]
        lay = T.cached_text(('hook', lines[0][0]), lines, size=132)
        p = min(1, (t - st) / 0.2); sh = int(16 * max(0, 1 - (t - st) / 0.14))
        T.paste_scaled(img, lay, W / 2 + np.sin(t * 90) * sh, 760, 0.8 + 0.2 * T.ease_back(p))
        if t >= SEG[1][0] + 1.4:
            e = T.emoji('👀', 150); q = min(1, (t - SEG[1][0] - 1.4) / 0.2)
            T.paste_scaled(img, e, W / 2, 1200, 0.6 + 0.4 * T.ease_back(q), q)
        subtitle(img, t); return img.convert('RGB')

    # 3 ÜBERGANG: „Das ändern wir. Jetzt.“
    if t < DROP:
        x = (t - HOOK_END) / (DROP - HOOK_END)
        img = Image.new('RGBA', (W, H), (8, 8, 10, 255)); g = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        r = 380 + 300 * x
        ImageDraw.Draw(g).ellipse((W / 2 - r, 760 - r, W / 2 + r, 760 + r), fill=T.VIOLET + (int(120 * x),))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(140)))
        lay = T.cached_text('aendern', [('Das ändern wir.', None)], size=116)
        T.paste_scaled(img, lay, W / 2, 700, 0.85 + 0.2 * x)
        if x > 0.55:
            q = min(1, (x - 0.55) / 0.15)
            lj = T.cached_text('jetzt', [('Jetzt.', G)], size=190)
            T.paste_scaled(img, lj, W / 2, 900, 0.6 + 0.4 * T.ease_back(q), q)
        subtitle(img, t); return img.convert('RGB')

    # 4–9 SHOTS
    for si, parts, tag, cap, ex in SHOTS:
        s0, s1, _ = SEG[si]
        if not (s0 <= t < s1): continue
        tt = s0
        for pi, (nm, frac, o) in enumerate(parts):
            p0, p1 = tt, tt + (s1 - s0) * frac; tt = p1
            if t < p1 or pi == len(parts) - 1: break
        lt = t - p0
        frame = T.clip_frame(nm, lt, o.get('speed', 1.0), o.get('skip', 0))
        if o.get('inset'):
            img = glow_bg(cy=1150)
            cw, chh = int(W * 0.72), int(H * 0.72)
            m = Image.new('L', (cw, chh), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, chh - 1), 56, fill=255)
            img.paste(frame.resize((cw, chh), Image.BICUBIC), ((W - cw) // 2, 640), m)
        else:
            img = T.zoom(frame, 1.0 + 0.05 * (lt / max(0.01, p1 - p0)), 0.5, 0.4).convert('RGBA')
        k = max(0.0, 1 - lt / (4 / FPS))
        if k > 0: img = T.whip(img.convert('RGB'), k * (0.7 if len(parts) > 1 else 1.0)).convert('RGBA')
        gr = T._tc.get('vgrad')
        if gr is None:
            a = np.zeros((H, W, 4), np.uint8)
            top = np.clip(1 - np.arange(H) / 760, 0, 1) ** 1.6 * 175; bot = np.clip((np.arange(H) - 1250) / 670, 0, 1) ** 1.4 * 200
            a[..., 3] = np.maximum(top, bot)[:, None].astype(np.uint8); gr = T._tc['vgrad'] = Image.fromarray(a, 'RGBA')
        img.alpha_composite(gr)
        tg = T.pill(ex['tags'][pi] if ex.get('tags') else tag)
        img.alpha_composite(tg, (int(W / 2 - tg.width / 2), 230))
        if ex.get('spec'):
            sp = T.pill(ex['spec'], bg=(30, 30, 34), fg=(220, 220, 225), size=24); img.alpha_composite(sp, (int(W / 2 - sp.width / 2), 312))
        lay = T.cached_text(('vcap', cap[0][0]), cap, size=96, box=True, maxw=880)
        p = min(1, (t - s0) / 0.22)
        T.paste_scaled(img, lay, W / 2, 520, 0.75 + 0.25 * T.ease_back(p), min(1, p * 1.5))
        if si == 3 and lt < 3 / FPS and pi == 0:
            img.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(210 * (1 - lt / (3 / FPS))))))
        subtitle(img, t); return img.convert('RGB')

    # 10 ENDKARTE
    lt = t - END
    img = glow_bg(a=95, cy=420)
    g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(g).ellipse((-200, H - 700, 700, H + 100), fill=T.CORAL + (60,))
    img.alpha_composite(g.filter(ImageFilter.GaussianBlur(160)))
    lg = T.LOGO.resize((820, int(820 * T.LOGO.height / T.LOGO.width)), Image.LANCZOS)
    p = min(1, lt / 0.3)
    T.paste_scaled(img, lg, W / 2, 420, 0.85 + 0.15 * T.ease_back(p), p)
    if lt > 0.9:
        q = min(1, (lt - 0.9) / 0.25)
        l2 = T.cached_text('unueb', [('Mach dein Business', None), ('unübersehbar.', G)], size=92)
        T.paste_scaled(img, l2, W / 2, 680, 0.8 + 0.2 * T.ease_back(q), q)
    rows = [('Websites', 'ab 690 €'), ('Werbespots', 'ab 249 €'), ('Chatbots', 'ab 390 €')]
    for k, (a, b2) in enumerate(rows):
        st = 1.9 + k * B
        if lt < st: continue
        q = min(1, (lt - st) / 0.2); key = ('row', a)
        if key not in T._tc:
            fa, fb = T.font(T.FONT_B, 60), T.font(T.FONT, 60)
            im = Image.new('RGBA', (880, 104), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.rounded_rectangle((0, 0, 879, 103), radius=30, fill=(30, 26, 48, 255), outline=(70, 64, 104, 255), width=2)
            d.text((44, 52), a, font=fa, fill=(240, 240, 242, 255), anchor='lm')
            pm = Image.new('L', im.size, 0); ImageDraw.Draw(pm).text((836, 52), b2, font=fb, fill=255, anchor='rm')
            bx = pm.getbbox(); im.alpha_composite(T.gfill(pm.crop(bx)), (bx[0], bx[1])); T._tc[key] = im
        T.paste_scaled(img, T._tc[key], W / 2 + 60 * (1 - ease_out(q)), 930 + k * 128, 1.0, q)
    st = 1.9 + 3 * B
    if lt >= st:
        q = min(1, (lt - st) / 0.25); pulse = 1 + 0.035 * np.sin((lt - st) * 2 * np.pi / (2 * B))
        T.paste_scaled(img, T.pill('Link in Bio  ↗', size=62), W / 2, 1360, (0.7 + 0.3 * T.ease_back(q)) * pulse, q)
    if lt < 3 / FPS:
        img.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(220 * (1 - lt / (3 / FPS))))))
    return img.convert('RGB')


def music(path):
    subprocess.run([sys.executable, os.path.join(HERE, 'tiktok_music.py'), json.dumps(
        {'dur': TOTAL, 'drop': DROP, 'cuts': [c for c in CUTS if c > DROP], 'end': END, 'out': path})], check=True)


def mix(music_wav, voice, out_wav):
    """Stimme vorne, Musik duckt sich per Sidechain darunter, Stimme mit Kompressor + etwas Präsenz."""
    fc = ('[1:a]aresample=48000,highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,equalizer=f=3500:t=q:w=1:g=3,'
          'loudnorm=I=-14:TP=-1.5:LRA=7,asplit=2[v][sc];[0:a][sc]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[m];'
          '[m][v]amix=inputs=2:duration=first:weights=0.8 1.25:normalize=0,alimiter=limit=0.95[out]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', music_wav, '-i', voice, '-filter_complex', fc, '-map', '[out]', '-ar', '48000', out_wav], check=True)


if __name__ == '__main__':
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wav = os.path.join(FR, 'vo_music.wav')
    if not os.path.exists(wav): music(wav)
    aud = wav
    if VOICE:
        aud = os.path.join(FR, 'vo_mix.wav'); mix(wav, VOICE, aud)
    n = int(round(TOTAL * FPS))
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', aud, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-t', f'{TOTAL:.3f}', OUT], stdin=subprocess.PIPE)
    for f in range(n):
        ff.stdin.write(render(f / FPS).tobytes())
        if f % 90 == 0: print('frame', f, '/', n, flush=True)
    ff.stdin.close(); ff.wait()
    print('done', OUT, f'{TOTAL:.2f}s')
