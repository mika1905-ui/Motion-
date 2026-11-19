"""Scrollwerk – Stories für alle Highlights (1080x1920). Ergebnis: stories/<highlight>/story-N.jpg bzw. .mp4 (Spots).
Daten kommen aus portfolio/data.js, damit Insta und Website gleich bleiben."""
import os, json, subprocess, shutil, re
from PIL import Image, ImageDraw
import make as M
from make_karriere import head, wrap, bullets, W, H, SAFE_TOP

LV = M.LIME
OUT = os.path.join(M.HERE, 'stories')
VID = os.path.join(M.ROOT, 'portfolio', 'video')


def data():
    js = ("global.window={};require(process.argv[1]);const w=window;console.log(JSON.stringify({P:w.PROJECTS,PR:w.PRICES,B:w.BUNDLES,T:w.TESTIMONIALS,TEAM:w.TEAM}))")
    return json.loads(subprocess.check_output(['node', '-e', js, os.path.join(M.ROOT, 'portfolio', 'data.js')]))


def eur(n): return f'{n:,}'.replace(',', '.') + ' €'


def sticker(im, y, label, sub):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((64, y, W - 64, y + 150), 34, outline=(120, 112, 160), width=3)
    d.text((W // 2, y + 52), label, font=M.F('semi', 30), fill=M.MUTED, anchor='mm')
    d.text((W // 2, y + 100), sub, font=M.F('bold', 34), fill=M.INK, anchor='mm')


def save(im, folder, n):
    p = os.path.join(OUT, folder); os.makedirs(p, exist_ok=True)
    im.convert('RGB').save(os.path.join(p, f'story-{n}.jpg'), quality=93)


def title(im, txt, y, maxsize=104):
    fs = maxsize
    while max(M.F('black', fs).getlength(w) for w in txt.split()) > W - 128: fs -= 4
    f = M.F('black', fs); d = ImageDraw.Draw(im)
    for l in wrap(txt, f, W - 128):
        d.text((64, y), l, font=f, fill=M.INK); y += int(fs * 1.06)
    return y


# ── Projekte ──
def projekte(D):
    pick = [('vestier', 'IMMOBILIEN'), ('beschte', 'HANDWERK'), ('lamome', 'GASTRONOMIE'), ('aurene', 'ONLINE-SHOP'), ('redbull', '3D-PRODUKTSEITE')]
    P = {p['id']: p for p in D['P']}
    n = len(pick)
    for i, (pid, kick) in enumerate(pick, 1):
        p = P[pid]
        im = M.canvas(W, H, (0.5, 0.55), ga=85)
        head(im, i, n)
        M.pill(im, kick, 64, 400)
        y = title(im, p['title'], 490, 100)
        M.text(im, (64, y + 6), p['sub'], 34, 'semi', LV)
        img = lambda s: os.path.join(M.ROOT, 'portfolio', s)
        M.laptop(im, img(p['images'][0]), 120, y + 130, 700)
        M.phone(im, img(p['mobile']), 720, y + 260, 250)
        if pid == 'redbull':
            M.text(im, (64, 1390), 'Unbeauftragte Spec-Arbeit · keine Verbindung zu Red Bull', 24, 'semi', (130, 130, 140))
        sticker(im, 1440, 'Link-Sticker hierhin ↓', 'Live ansehen')
        save(im, 'projekte', i)


# ── Spots (Videos 9:16) ──
def spots(D):
    P = {p['id']: p for p in D['P']}
    d = os.path.join(OUT, 'spots'); os.makedirs(d, exist_ok=True)
    order = ['scrollwerk', 'bmw', 'iphone', 'ferrari', 'porsche', 'claude', 'gpt']
    for i, pid in enumerate(order, 1):
        p = P[pid]; src = os.path.join(M.ROOT, 'portfolio', p['video']); dst = os.path.join(d, f'story-{i}-{pid}.mp4')
        if not p.get('wide'):
            shutil.copy(src, dst); continue
        # Querformat: unscharfer Hintergrund + Video mittig + Titel
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        M.pill(ov, 'WERBESPOT', 64, 400)
        title(ov, p['title'], 490, 96)
        M.text(ov, (64, 1330), p['sub'], 40, 'semi', M.INK)
        M.logo_small(ov, 64, 1460, 240)
        ovp = os.path.join(d, '_ov.png'); ov.save(ovp)
        fc = ('[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.25[bg];'
              '[0:v]scale=1080:-2[fg];[bg][fg]overlay=0:(H-h)/2[v1];[v1][1:v]overlay=0:0,format=yuv420p[v]')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-i', ovp, '-filter_complex', fc, '-map', '[v]', '-map', '0:a?',
                        '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', dst], check=True)
        os.remove(ovp)


# ── Preise ──
def preise(D):
    PR = D['PR']
    rows = [(PR['spots']['items'][0]['name'], PR['spots']['items'][0]['price'], ''), (PR['web']['items'][0]['name'], PR['web']['items'][0]['price'], ''),
            (PR['web']['items'][1]['name'], PR['web']['items'][1]['price'], ''), (PR['web']['items'][3]['name'], PR['web']['items'][3]['price'], ''),
            (PR['marke']['items'][0]['name'], PR['marke']['items'][0]['price'], ''), (PR['chatbots']['items'][0]['name'], PR['chatbots']['items'][0]['price'], ''),
            (PR['chatbots']['items'][2]['name'], PR['chatbots']['items'][2]['price'], ''), (PR['social']['items'][0]['name'], PR['social']['items'][0]['price'], ' / Mon.')]
    im = M.canvas(W, H, (0.5, 0.25), ga=80); head(im, 1, 2)
    M.pill(im, 'PREISE', 64, 400)
    M.text(im, (64, 490), 'Faire Preise.\nOhne Kleingedrucktes.', 76, 'black', spacing=-2)
    d = ImageDraw.Draw(im)
    for k, (a, p, u) in enumerate(rows):
        y = 720 + k * 96
        d.rounded_rectangle((64, y, W - 64, y + 80), 22, fill=(30, 25, 52), outline=(68, 60, 102), width=2)
        d.text((100, y + 40), a, font=M.F('bold', 36), fill=M.INK, anchor='lm')
        d.text((W - 100, y + 40), 'ab ' + eur(p) + u, font=M.F('black', 36), fill=LV, anchor='rm')
    M.text(im, (64, 720 + len(rows) * 96 + 10), 'Festes Angebot nach dem kostenlosen Erstgespräch.', 28, 'semi', M.MUTED)
    save(im, 'preise', 1)

    im = M.canvas(W, H, (0.8, 0.6), gc=(255, 61, 139), ga=60); head(im, 2, 2)
    M.pill(im, 'NEU', 64, 400)
    M.text(im, (64, 490), 'Pakete für\ndeine Branche.', 96, 'black', spacing=-4)
    d = ImageDraw.Draw(im)
    for k, b in enumerate(D['B']):
        y = 760 + k * 104
        col = tuple(int(b['color'][i:i + 2], 16) for i in (1, 3, 5))
        d.rounded_rectangle((64, y, W - 64, y + 88), 24, fill=(30, 25, 52), outline=(68, 60, 102), width=2)
        d.ellipse((90, y + 22, 134, y + 66), fill=col)
        d.text((158, y + 44), b['name'], font=M.F('bold', 36), fill=M.INK, anchor='lm')
        d.text((W - 100, y + 44), 'ab ' + eur(b['base']), font=M.F('black', 36), fill=LV, anchor='rm')
    sticker(im, 1430, 'Link-Sticker hierhin ↓', 'Paket konfigurieren')
    save(im, 'preise', 2)


# ── Ablauf ──
def ablauf(D):
    im = M.canvas(W, H, (0.2, 0.75), gc=(255, 107, 44), ga=55); head(im, 1, 1)
    M.pill(im, 'SO LÄUFT’S', 64, 400)
    M.text(im, (64, 490), 'Von der Idee\nzum Launch.', 100, 'black', spacing=-4)
    steps = [('01', 'Erstgespräch', '15–30 Minuten, kostenlos'), ('02', 'Festes Angebot', 'schriftlich, ohne Überraschungen'),
             ('03', 'Umsetzung', 'mit Zwischenständen zum Anklicken'), ('04', 'Launch', 'und danach bin ich weiter da')]
    d = ImageDraw.Draw(im)
    for k, (nr, a, b) in enumerate(steps):
        y = 780 + k * 150
        d.text((64, y), nr, font=M.F('black', 76), fill=LV)
        d.text((220, y + 2), a, font=M.F('black', 46), fill=M.INK)
        d.text((220, y + 64), b, font=M.F('semi', 30), fill=M.MUTED)
    sticker(im, 1430, 'Link-Sticker hierhin ↓', 'Erstgespräch buchen')
    save(im, 'ablauf', 1)


# ── Kunden ──
def kunden(D):
    T = D['T']; n = len(T)
    glows = [(0.8, 0.25), (0.2, 0.3), (0.75, 0.7), (0.25, 0.65), (0.5, 0.3)]
    for i, t in enumerate(T, 1):
        im = M.canvas(W, H, glows[(i - 1) % 5], ga=85); head(im, i, n)
        M.pill(im, 'KUNDENSTIMME', 64, 400)
        d = ImageDraw.Draw(im)
        import math
        for k in range(5):
            cx, cy, r = 96 + k * 76, 530, 32
            d.polygon([(cx + (r if j % 2 == 0 else r * .42) * math.cos(-math.pi / 2 + j * math.pi / 5), cy + (r if j % 2 == 0 else r * .42) * math.sin(-math.pi / 2 + j * math.pi / 5)) for j in range(10)], fill=LV)
        d.text((54, 560), '„', font=M.F('black', 220), fill=(106, 59, 255))
        f = M.F('bold', 52); y = 820
        for l in wrap(t['quote'], f, W - 128):
            d.text((64, y), l, font=f, fill=M.INK); y += 70
        d.text((64, y + 50), t['name'], font=M.F('black', 40), fill=M.INK)
        d.text((64, y + 102), t['company'], font=M.F('semi', 32), fill=M.MUTED)
        save(im, 'kunden', i)


# ── Chatbot ──
def chatbot(D):
    im = M.canvas(W, H, (0.5, 0.6), gc=(255, 61, 139), ga=60); head(im, 1, 2)
    M.pill(im, 'CHATBOT', 64, 400)
    M.text(im, (64, 490), 'Dein Betrieb\nantwortet um\n3 Uhr nachts.', 92, 'black', spacing=-4)
    M.phone(im, os.path.join(M.IMG, 'chatbot-v2-mobile.webp'), 600, 860, 330)
    M.text(im, (64, 900), 'Beantwortet Fragen\nzu Preisen, Leistungen\nund Terminen – und\nführt zur Anfrage.', 36, 'semi', (210, 210, 214), spacing=10)
    M.text(im, (64, 1200), 'ab 390 €', 76, 'black', LV)
    save(im, 'chatbot', 1)
    im = M.canvas(W, H, (0.3, 0.4), ga=80); head(im, 2, 2)
    M.pill(im, 'PROBIER’S AUS', 64, 400)
    M.text(im, (64, 490), 'Frag meinen\nAssistenten.', 100, 'black', spacing=-4)
    d = ImageDraw.Draw(im)
    qs = ['Was kostet eine Website?', 'Wie lange dauert ein Spot?', 'Habt ihr ein Gastro-Paket?', 'Kann ich einen Termin buchen?']
    y = 800
    for k, q in enumerate(qs):
        f = M.F('semi', 36); w = f.getlength(q) + 64
        x = 64 if k % 2 == 0 else W - 64 - w
        d.rounded_rectangle((x, y, x + w, y + 84), 42, fill=(106, 59, 255) if k % 2 else (30, 25, 52), outline=(68, 60, 102), width=2)
        d.text((x + 32, y + 42), q, font=f, fill=M.INK, anchor='lm'); y += 120
    sticker(im, 1430, 'Link-Sticker hierhin ↓', 'Chatbot live testen')
    save(im, 'chatbot', 2)


# ── Über mich ──
def ueber(D):
    im = M.canvas(W, H, (0.6, 0.55), ga=90); head(im, 1, 2)
    me = Image.open(os.path.join(M.IMG, 'team', 'mika.png')).convert('RGBA')
    me = me.resize((int(780 * me.width / me.height), 780), Image.LANCZOS)
    im.alpha_composite(me, (W - me.width + 40, 1380 - me.height))
    M.pill(im, 'ÜBER MICH', 64, 400)
    M.text(im, (64, 490), 'Hi, ich bin\nMika.', 120, 'black', spacing=-6)
    M.text(im, (64, 1420), '20 · BWL-Student an der FHM Bielefeld\nWebsites · Werbespots · Chatbots', 34, 'semi', LV, spacing=12)
    save(im, 'ueber-mich', 1)
    im = M.canvas(W, H, (0.3, 0.7), gc=(255, 107, 44), ga=50); head(im, 2, 2)
    M.pill(im, 'WARUM', 64, 400)
    M.text(im, (64, 490), 'Gute Betriebe\nverdienen einen\nguten Auftritt.', 88, 'black', spacing=-4)
    bullets(im, ['Ein Ansprechpartner – von der Idee bis zum Launch', 'Antwort auf jede Anfrage in 24 Stunden', 'Festes Angebot vor dem Start, keine Überraschungen',
                 'Aus Bielefeld – vor Ort in OWL und remote'], 64, 860, W - 128, 40, 30)
    sticker(im, 1430, 'Link-Sticker hierhin ↓', 'Kostenloses Erstgespräch')
    save(im, 'ueber-mich', 2)


if __name__ == '__main__':
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    D = data()
    for fn in (projekte, preise, ablauf, kunden, chatbot, ueber, spots):
        fn(D); print('ok', fn.__name__)
    kar = os.path.join(M.HERE, 'stories-karriere')
    if os.path.isdir(kar): shutil.copytree(kar, os.path.join(OUT, 'karriere'))
