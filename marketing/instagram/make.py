"""FLUXE Studio – Instagram starter kit: profile picture, highlight covers, 9 launch posts (4:5), reel cover, profile preview."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
IMG = os.path.join(ROOT, 'portfolio', 'img')
BRAND = os.path.join(ROOT, 'portfolio', 'brand')
FONTS = os.path.join(ROOT, 'spots', 'fonts')
OUT = HERE
LIME = (212, 255, 58); BG = (8, 8, 10); INK = (244, 244, 240); MUTED = (150, 150, 158)

def F(w, s): return ImageFont.truetype(os.path.join(FONTS, {'black': 'Inter-Black.ttf', 'bold': 'Inter-Bold.ttf', 'semi': 'Inter-SemiBold.ttf', 'reg': 'Inter-Regular.ttf'}[w]), s)
MARK = Image.open(os.path.join(BRAND, 'fluxe-mark-1024.png')).convert('RGBA')
LOGO = Image.open(os.path.join(BRAND, 'fluxe-logo-hell.png')).convert('RGBA')

def canvas(w, h, glow=(0.5, 0.3), gc=LIME, ga=70):
    im = Image.new('RGBA', (w, h), BG + (255,))
    g = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(g)
    cx, cy = w * glow[0], h * glow[1]; r = w * 0.55
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=gc + (ga,))
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(w * 0.16)))
    return im

def fit(img, w, h):
    s = max(w / img.width, h / img.height)
    img = img.resize((int(img.width * s + 0.5), int(img.height * s + 0.5)), Image.LANCZOS)
    x, y = (img.width - w) // 2, 0
    return img.crop((x, y, x + w, y + h))

def round_mask(w, h, r):
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m

def shadow(im, xy, size, r, blur=40, a=150):
    s = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle((xy[0], xy[1] + 24, xy[0] + size[0], xy[1] + size[1] + 24), r, fill=(0, 0, 0, a))
    im.alpha_composite(s.filter(ImageFilter.GaussianBlur(blur)))

def laptop(im, shot, x, y, w):
    h = int(w * 900 / 1440)
    bez = 18
    shadow(im, (x - bez, y - bez), (w + 2 * bez, h + 2 * bez), 28)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x - bez, y - bez, x + w + bez, y + h + bez), 26, fill=(28, 28, 32, 255), outline=(70, 70, 78, 255), width=2)
    sc = fit(Image.open(shot).convert('RGB'), w, h)
    im.paste(sc, (x, y), round_mask(w, h, 8))
    d.rounded_rectangle((x - bez - 60, y + h + bez - 2, x + w + bez + 60, y + h + bez + 22), 12, fill=(48, 48, 54, 255))

def phone(im, shot, x, y, w):
    h = int(w * 2.16)
    bez = 12
    shadow(im, (x - bez, y - bez), (w + 2 * bez, h + 2 * bez), 54, blur=36, a=180)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x - bez, y - bez, x + w + bez, y + h + bez), 54, fill=(20, 20, 24, 255), outline=(90, 90, 98, 255), width=3)
    sc = fit(Image.open(shot).convert('RGB'), w, h)
    im.paste(sc, (x, y), round_mask(w, h, 44))
    d.rounded_rectangle((x + w / 2 - 50, y + 12, x + w / 2 + 50, y + 40), 14, fill=(0, 0, 0, 255))

def pill(im, txt, x, y, bg=LIME, fg=BG, size=30, anchor='l'):
    f = F('black', size); bb = f.getbbox(txt); w = bb[2] - bb[0] + 44; h = int(size * 1.75)
    if anchor == 'c': x -= w // 2
    d = ImageDraw.Draw(im); d.rounded_rectangle((x, y, x + w, y + h), h // 2, fill=bg + (255,))
    d.text((x + 22 - bb[0], y + (h - (bb[3] - bb[1])) / 2 - bb[1]), txt, font=f, fill=fg)
    return w

def text(im, xy, s, size, w='black', fill=INK, anchor='la', spacing=0):
    ImageDraw.Draw(im).multiline_text(xy, s, font=F(w, size), fill=fill, anchor=anchor, spacing=spacing)

def logo_small(im, x, y, w=250):
    lg = LOGO.resize((w, int(w * LOGO.height / LOGO.width)), Image.LANCZOS); im.alpha_composite(lg, (x, y))

def footer(im, page=None):
    W, H = im.size
    logo_small(im, 64, H - 118, 230)
    if page: text(im, (W - 64, H - 92), page, 28, 'semi', MUTED, 'ra')

def save(im, name):
    p = os.path.join(OUT, name); os.makedirs(os.path.dirname(p), exist_ok=True)
    im.convert('RGB').save(p, quality=95); print('saved', name)

# ── profile picture (circle-safe: only the mark, large, centred) ─────────────────
def profile():
    S = 1080
    im = canvas(S, S, (0.5, 0.5), ga=85)
    m = MARK.crop(MARK.getbbox())
    tw = 600; m = m.resize((tw, int(tw * m.height / m.width)), Image.LANCZOS)
    im.alpha_composite(m, ((S - m.width) // 2 + 10, (S - m.height) // 2))
    save(im, 'profilbild.png')
    # preview inside a circle
    c = im.resize((320, 320), Image.LANCZOS); mask = Image.new('L', (320, 320), 0); ImageDraw.Draw(mask).ellipse((0, 0, 319, 319), fill=255)
    pv = Image.new('RGBA', (360, 360), (255, 255, 255, 255)); pv.paste(c, (20, 20), mask); save(pv, 'vorschau/profilbild-rund.png')
    return im

# ── highlight covers (1080x1920, icon in the centre circle) ──────────────────────
def icon(kind, d, cx, cy, s, col):
    w = int(s * 0.09)
    if kind == 'grid':
        g = s * 0.36; gap = s * 0.08; c = (g * 2 + gap) / 2
        for i in range(2):
            for j in range(2):
                x0 = cx - c + i * (g + gap); y0 = cy - c + j * (g + gap)
                d.rounded_rectangle((x0, y0, x0 + g, y0 + g), s * 0.08, outline=col, width=w)
    elif kind == 'euro':
        d.text((cx, cy), '€', font=F('black', int(s * 1.1)), fill=col, anchor='mm')
    elif kind == 'steps':
        for k in range(3):
            y = cy - s * 0.42 + k * s * 0.42
            d.ellipse((cx - s * 0.5 - s * 0.1, y - s * 0.1, cx - s * 0.5 + s * 0.1, y + s * 0.1), fill=col)
            d.rounded_rectangle((cx - s * 0.28, y - w / 2, cx + s * 0.55, y + w / 2), w / 2, fill=col)
    elif kind == 'star':
        import math
        pts = []
        for k in range(10):
            r = s * (0.62 if k % 2 == 0 else 0.26); a = -math.pi / 2 + k * math.pi / 5
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        d.polygon(pts, outline=col, width=w)
    elif kind == 'chat':
        d.rounded_rectangle((cx - s * 0.6, cy - s * 0.45, cx + s * 0.6, cy + s * 0.3), s * 0.25, outline=col, width=w)
        d.polygon([(cx - s * 0.25, cy + s * 0.28), (cx - s * 0.42, cy + s * 0.6), (cx + s * 0.02, cy + s * 0.28)], fill=col)
        for k in (-1, 0, 1): d.ellipse((cx + k * s * 0.28 - s * 0.07, cy - s * 0.13, cx + k * s * 0.28 + s * 0.07, cy + s * 0.01), fill=col)
    elif kind == 'person':
        d.ellipse((cx - s * 0.24, cy - s * 0.6, cx + s * 0.24, cy - s * 0.12), outline=col, width=w)
        d.arc((cx - s * 0.55, cy - s * 0.02, cx + s * 0.55, cy + s * 1.0), 180, 360, fill=col, width=w)
    elif kind == 'play':
        d.rounded_rectangle((cx - s * 0.62, cy - s * 0.45, cx + s * 0.62, cy + s * 0.45), s * 0.15, outline=col, width=w)
        d.polygon([(cx - s * 0.15, cy - s * 0.22), (cx - s * 0.15, cy + s * 0.22), (cx + s * 0.25, cy)], fill=col)

HIGHLIGHTS = [('projekte', 'grid', 'Projekte'), ('spots', 'play', 'Spots'), ('preise', 'euro', 'Preise'), ('ablauf', 'steps', 'Ablauf'),
              ('kunden', 'star', 'Kunden'), ('chatbot', 'chat', 'Chatbot'), ('ueber-mich', 'person', 'Über mich')]
def highlights():
    covers = []
    for slug, kind, label in HIGHLIGHTS:
        im = canvas(1080, 1920, (0.5, 0.5), ga=60)
        d = ImageDraw.Draw(im)
        d.ellipse((540 - 300, 960 - 300, 540 + 300, 960 + 300), fill=(18, 20, 14, 255), outline=LIME + (255,), width=6)
        icon(kind, d, 540, 960 if kind != 'person' else 990, 230, LIME + (255,))
        save(im, f'highlights/{slug}.png')
        covers.append((im, label))
    return covers

# ── posts (1080x1350) ────────────────────────────────────────────────────────────
W, H = 1080, 1350
def post_project(n, slug, kicker, title, sub, color, spec=None):
    im = canvas(W, H, (0.5, 0.55), gc=color, ga=60)
    pill(im, kicker, 64, 70, bg=color if sum(color) > 300 else LIME)
    ts = 92
    while F('black', ts).getlength(title) > W - 128: ts -= 2
    text(im, (64, 150 + (92 - ts) // 2), title, ts, 'black')
    text(im, (64, 260), sub, 36, 'semi', MUTED)
    laptop(im, os.path.join(IMG, f'{slug}-1.webp'), 110, 420, 760)
    phone(im, os.path.join(IMG, f'{slug}-mobile.webp'), 760, 560, 230)
    if spec: text(im, (64, H - 165), spec, 24, 'semi', (120, 120, 128))
    footer(im, 'Website · FLUXE Studio')
    save(im, f'posts/{n:02d}-{slug}.jpg'); return im

def post_intro():
    im = canvas(W, H, (0.7, 0.35), ga=80)
    me = Image.open(os.path.join(IMG, 'team', 'mika.png')).convert('RGBA')
    me = me.resize((int(760 * me.width / me.height), 760), Image.LANCZOS)
    im.alpha_composite(me, (W - me.width + 40, H - me.height - 150))
    pill(im, 'NEU HIER', 64, 70)
    text(im, (64, 160), 'Hi, ich bin\nMika.', 120, 'black', spacing=-6)
    text(im, (64, 470), 'Ich baue Webseiten,\nWerbespots und Chatbots\nfür Betriebe, die nicht\nim Feed untergehen.', 40, 'semi', (210, 210, 214), spacing=10)
    text(im, (64, 800), 'Bielefeld · OWL · remote', 32, 'bold', LIME)
    footer(im)
    save(im, 'posts/01-intro.jpg'); return im

def post_chatbot():
    im = canvas(W, H, (0.5, 0.65), gc=(232, 160, 200), ga=55)
    pill(im, 'CHATBOT', 64, 70, bg=(232, 160, 200))
    text(im, (64, 150), 'Dein Betrieb\nantwortet um\n3 Uhr nachts.', 92, 'black', spacing=-4)
    shot = os.path.join(IMG, 'chatbot-v2-1.webp')
    if not os.path.exists(shot): shot = os.path.join(IMG, 'chatbot-ring.webp')
    phone(im, os.path.join(IMG, 'chatbot-ring.webp') if os.path.exists(os.path.join(IMG, 'chatbot-ring.webp')) else shot, 600, 540, 300)
    text(im, (64, 600), 'Beantwortet Fragen\nzu Preisen, Leistungen\nund Terminen – und\nführt direkt zur Anfrage.', 36, 'semi', (210, 210, 214), spacing=10)
    text(im, (64, 900), 'ab 390 €', 70, 'black', LIME)
    footer(im, 'Chatbots · FLUXE Studio')
    save(im, 'posts/06-chatbot.jpg'); return im

def post_prices():
    im = canvas(W, H, (0.5, 0.2), ga=60)
    pill(im, 'PREISE', 64, 70)
    text(im, (64, 150), 'Faire Preise.\nKein Kleingedrucktes.', 78, 'black', spacing=-2)
    rows = [('Social-Spot', 'ab 249 €'), ('Onepager', 'ab 690 €'), ('Website', 'ab 1.290 €'), ('3D-Website', 'ab 1.990 €'), ('Online-Shop', 'ab 2.490 €'), ('Chatbot', 'ab 390 €'), ('Betreuung', 'ab 29 € / Monat')]
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for k in range(len(rows)):
        y = 400 + k * 108
        od.rounded_rectangle((64, y, W - 64, y + 88), 24, fill=(255, 255, 255, 16), outline=(255, 255, 255, 40), width=2)
    im.alpha_composite(ov)
    d = ImageDraw.Draw(im)
    for k, (a, b) in enumerate(rows):
        y = 400 + k * 108
        d.text((100, y + 44), a, font=F('bold', 40), fill=INK, anchor='lm')
        d.text((W - 100, y + 44), b, font=F('black', 40), fill=LIME, anchor='rm')
    text(im, (64, 1170), 'Festes Angebot nach dem kostenlosen Erstgespräch.', 28, 'semi', MUTED)
    footer(im, 'Link in Bio')
    save(im, 'posts/02-preise.jpg'); return im

def post_process():
    im = canvas(W, H, (0.2, 0.8), gc=(74, 168, 255), ga=55)
    pill(im, 'SO LÄUFT’S', 64, 70, bg=(74, 168, 255), fg=BG)
    text(im, (64, 150), 'Von der Idee\nzum Launch.', 92, 'black', spacing=-4)
    steps = [('01', 'Erstgespräch', '15–30 Min., kostenlos'), ('02', 'Festes Angebot', 'schriftlich, ohne Überraschungen'),
             ('03', 'Umsetzung', 'Zwischenstände zum Klicken'), ('04', 'Launch', 'und danach bin ich weiter da')]
    d = ImageDraw.Draw(im)
    for k, (nr, a, b) in enumerate(steps):
        y = 450 + k * 180
        d.text((64, y), nr, font=F('black', 84), fill=(74, 168, 255))
        d.text((230, y + 4), a, font=F('black', 48), fill=INK)
        d.text((230, y + 70), b, font=F('semi', 32), fill=MUTED)
    footer(im, 'Antwort in 24 h')
    save(im, 'posts/03-ablauf.jpg'); return im

def reel_cover():
    im = canvas(1080, 1920, (0.5, 0.4), ga=80)
    text(im, (540, 640), 'Deine Website\nsieht aus\nwie 2009?', 120, 'black', anchor='ma', spacing=-6)
    text(im, (540, 1120), 'So sieht 2026 aus →', 52, 'bold', LIME, anchor='ma')
    lg = LOGO.resize((520, int(520 * LOGO.height / LOGO.width)), Image.LANCZOS); im.alpha_composite(lg, ((1080 - lg.width) // 2, 1420))
    save(im, 'reel-cover.png'); return im

def preview(profile_img, posts, covers):
    """Generic profile preview (own neutral layout, no platform branding) – shows how grid, bio and highlights work together."""
    pw = 1080; im = Image.new('RGB', (pw, 2140), (0, 0, 0)); d = ImageDraw.Draw(im)
    av = profile_img.resize((220, 220), Image.LANCZOS).convert('RGB'); m = Image.new('L', (220, 220), 0); ImageDraw.Draw(m).ellipse((0, 0, 219, 219), fill=255)
    im.paste(av, (48, 60), m)
    for k, (num, lab) in enumerate([('9', 'Beiträge'), ('–', 'Follower'), ('–', 'Gefolgt')]):
        x = 420 + k * 220
        d.text((x, 130), num, font=F('black', 46), fill='white', anchor='mm'); d.text((x, 185), lab, font=F('semi', 28), fill=(200, 200, 200), anchor='mm')
    y = 310
    d.text((48, y), 'FLUXE Studio | Webdesign & Werbespots', font=F('bold', 32), fill='white'); y += 46
    d.text((48, y), 'Webdesigner', font=F('reg', 28), fill=(150, 150, 150)); y += 44
    emo = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf', 109)
    for line in BIO.split('\n'):
        e, rest = line.split(' ', 1)
        g = Image.new('RGBA', (140, 140), (0, 0, 0, 0)); ImageDraw.Draw(g).text((0, 0), e, font=emo, embedded_color=True)
        g = g.crop(g.getbbox()).resize((30, 30), Image.LANCZOS)
        im.paste(g, (48, y + 4), g)
        d.text((90, y), rest, font=F('reg', 30), fill='white'); y += 42
    d.text((48, y + 4), LINK_LABEL, font=F('semi', 30), fill=(140, 180, 255)); y += 70
    for k, (c, lab) in enumerate(covers[:5]):
        x = 48 + k * 200; th = c.crop((240, 660, 840, 1260)).resize((150, 150), Image.LANCZOS).convert('RGB')
        mm = Image.new('L', (150, 150), 0); ImageDraw.Draw(mm).ellipse((0, 0, 149, 149), fill=255)
        d.ellipse((x - 6, y - 6, x + 156, y + 156), outline=(80, 80, 80), width=3)
        im.paste(th, (x, y), mm); d.text((x + 75, y + 186), lab, font=F('semi', 24), fill='white', anchor='mm')
    y += 240
    tile = (pw - 6) // 3
    order = posts[::-1]                       # newest first, like on the profile
    for k, p in enumerate(order[:9]):
        t = p.convert('RGB').resize((tile, int(tile * 1350 / 1080)), Image.LANCZOS)
        im.paste(t, ((k % 3) * (tile + 3), y + (k // 3) * (t.height + 3)))
    im = im.crop((0, 0, pw, min(im.height, y + 3 * (int(tile * 1350 / 1080) + 3))))
    save(im.convert('RGBA'), 'vorschau/profil-vorschau.png')

BIO = '🎬 Werbespots · 💻 Websites · 🤖 Chatbots\n📍 Bielefeld, OWL & remote\n💸 Websites ab 690 € · Antwort in 24 h\n👇 Kostenloses Erstgespräch'
LINK_LABEL = 'mika1905-ui.github.io/Motion-/portfolio'

if __name__ == '__main__':
    pf = profile()
    covers = highlights()
    # posted in this order (01 first) → newest (09) sits top-left on the profile
    posts = [post_intro(),
             post_prices(),
             post_process(),
             post_project(4, 'aurene', 'PARFUM-SHOP', 'AURÈNE', 'Maison de Parfum · Online-Shop', (200, 164, 106)),
             post_project(5, 'katerkit', 'ONLINE-SHOP', 'Kater Kit', 'Shop mit Warenkorb & Konfigurator', (215, 255, 61)),
             post_chatbot(),
             post_project(7, 'redbull', '3D-PRODUKTSEITE', 'Red Bull in 3D', 'Dose dreht sich, Tray füllt sich – beim Scrollen', (61, 107, 255),
                          spec='Unbeauftragte Spec-Arbeit · keine Verbindung zu Red Bull'),
             post_project(8, 'beschte', 'HANDWERK', 'Elektrotechnik Beschte', 'Website + Chatbot für den Meisterbetrieb', (255, 201, 60)),
             post_project(9, 'vestier', 'IMMOBILIEN', 'VÉSTIER', 'Website für Luxus-Immobilien', (184, 155, 106))]
    reel_cover()
    preview(pf, posts, covers)
