"""Scrollwerk – Instagram-Highlight „Karriere“: Cover + 5 Story-Slides (1080x1920).
Stellen kommen aus portfolio/data.js (window.JOBS), damit Insta und Website gleich bleiben."""
import os, re, json, subprocess
from PIL import Image, ImageDraw
import make as M

W, H = 1080, 1920
OUT = os.path.join(M.HERE, 'stories-karriere')
LV = M.LIME
SAFE_TOP, SAFE_BOT = 250, 1920 - 330      # Insta-Bedienelemente oben/unten frei lassen


def jobs():
    js = "global.window={};require(process.argv[1]);console.log(JSON.stringify(window.JOBS))"
    out = subprocess.check_output(['node', '-e', js, os.path.join(M.ROOT, 'portfolio', 'data.js')])
    return json.loads(out)


def briefcase(d, cx, cy, s, col):
    w = int(s * 0.09)
    d.rounded_rectangle((cx - s * 0.62, cy - s * 0.32, cx + s * 0.62, cy + s * 0.5), s * 0.12, outline=col, width=w)
    d.rounded_rectangle((cx - s * 0.22, cy - s * 0.56, cx + s * 0.22, cy - s * 0.32), s * 0.08, outline=col, width=w)
    d.line((cx - s * 0.62, cy + s * 0.04, cx + s * 0.62, cy + s * 0.04), fill=col, width=w)
    d.rounded_rectangle((cx - s * 0.1, cy - s * 0.03, cx + s * 0.1, cy + s * 0.13), s * 0.03, fill=col)


def cover():
    im = M.canvas(W, H, (0.5, 0.5), ga=60)
    d = ImageDraw.Draw(im, 'RGBA')
    d.ellipse((540 - 300, 960 - 300, 540 + 300, 960 + 300), fill=(24, 18, 44, 255), outline=LV + (255,), width=6)
    briefcase(d, 540, 975, 230, LV + (255,))
    M.save(im, 'highlights/karriere.png')
    return im


def wrap(txt, font, maxw):
    lines, cur = [], ''
    for w in txt.split():
        t = (cur + ' ' + w).strip()
        if font.getlength(t) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines


def bullets(im, items, x, y, maxw, size=38, gap=26):
    d = ImageDraw.Draw(im); f = M.F('semi', size)
    for it in items:
        d.ellipse((x, y + size * 0.32, x + 18, y + size * 0.32 + 18), fill=LV + (255,))
        ls = wrap(it, f, maxw - 44)
        for k, l in enumerate(ls):
            d.text((x + 44, y + k * int(size * 1.3)), l, font=f, fill=M.INK)
        y += len(ls) * int(size * 1.3) + gap
    return y


def head(im, n, total):
    d = ImageDraw.Draw(im, 'RGBA')
    M.logo_small(im, 64, SAFE_TOP - 10, 220)
    d.text((W - 64, SAFE_TOP + 8), f'{n}/{total}', font=M.F('semi', 28), fill=M.MUTED, anchor='ra')


def slide_intro(J, total):
    im = M.canvas(W, H, (0.75, 0.3), ga=95)
    head(im, 1, total)
    M.pill(im, 'KARRIERE', 64, 420)
    M.text(im, (64, 520), 'Scrollwerk\nsucht\nVerstärkung.', 116, 'black', spacing=-4)
    y = 1000
    d = ImageDraw.Draw(im, 'RGBA')
    for k, j in enumerate(J):
        t = re.sub(r'\s*\(m/w/d\)', '', j['title'])
        d.rounded_rectangle((64, y, W - 64, y + 132), 30, fill=(30, 25, 52), outline=(68, 60, 102), width=2)
        d.text((104, y + 26), t, font=M.F('bold', 40), fill=M.INK)
        d.text((104, y + 80), j['type'], font=M.F('semi', 28), fill=LV)
        d.text((W - 104, y + 66), f'0{k + 1}', font=M.F('black', 44), fill=(92, 84, 128), anchor='rm')
        y += 154
    M.text(im, (64, y + 20), 'Freiberuflich · flexibel · neben dem Studium →', 32, 'semi', M.MUTED)
    return im


def slide_job(j, n, total, glow):
    im = M.canvas(W, H, glow, ga=90)
    head(im, n, total)
    M.pill(im, 'WIR SUCHEN', 64, 400)
    title = re.sub(r'\s*\(m/w/d\)', '', j['title'])
    fs = 92
    while max(M.F('black', fs).getlength(w) for w in title.split()) > W - 128: fs -= 4
    f = M.F('black', fs); lines = wrap(title, f, W - 128)
    d = ImageDraw.Draw(im, 'RGBA')
    y = 490
    for l in lines: d.text((64, y), l, font=f, fill=M.INK); y += int(fs * 1.09)
    d.text((64, y + 6), '(m/w/d) · ' + j['type'], font=M.F('semi', 32), fill=LV); y += 70
    d.text((64, y), j['hours'], font=M.F('semi', 30), fill=M.MUTED); y += 80
    d.text((64, y), 'DEINE AUFGABEN', font=M.F('bold', 26), fill=M.MUTED); y += 50
    y = bullets(im, j['tasks'][:3], 64, y, W - 128, 36, 18) + 24
    d.text((64, y), 'DAS BEKOMMST DU', font=M.F('bold', 26), fill=M.MUTED); y += 50
    bullets(im, j['perks'][:2], 64, y, W - 128, 36, 18)
    return im


def slide_apply(total):
    im = M.canvas(W, H, (0.5, 0.75), ga=100)
    head(im, total, total)
    M.pill(im, 'SO GEHT’S', 64, 420)
    M.text(im, (64, 520), 'Bewerben\nin 2 Minuten.', 104, 'black', spacing=-4)
    d = ImageDraw.Draw(im, 'RGBA')
    steps = [('Du schreibst', 'Kurz und ehrlich, Arbeitsproben als Link.'), ('Ich melde mich', 'Innerhalb einer Woche – auch wenn es nicht passt.'),
             ('Kennenlernen', 'Kaffee in Bielefeld oder Video-Call.'), ('Erstes Projekt', 'Klein starten – und bezahlt.')]
    y = 830
    for k, (t, s) in enumerate(steps):
        d.ellipse((64, y, 140, y + 76), fill=(24, 18, 44, 255), outline=LV + (255,), width=4)
        d.text((102, y + 38), str(k + 1), font=M.F('black', 36), fill=LV, anchor='mm')
        d.text((168, y + 2), t, font=M.F('bold', 40), fill=M.INK)
        d.text((168, y + 52), s, font=M.F('reg', 30), fill=(200, 200, 208))
        y += 132
    # Platz für den Link-Sticker
    y += 30
    d.rounded_rectangle((64, y, W - 64, y + 150), 34, outline=(120, 112, 160), width=3)
    d.text((W // 2, y + 52), 'Link-Sticker hierhin ↓', font=M.F('semi', 30), fill=M.MUTED, anchor='mm')
    d.text((W // 2, y + 100), 'Seite „Karriere“ auf der Website', font=M.F('bold', 34), fill=M.INK, anchor='mm')
    return im


if __name__ == '__main__':
    J = jobs()
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    cover()
    total = len(J) + 2
    slides = [slide_intro(J, total)]
    glows = [(0.85, 0.2), (0.15, 0.25), (0.8, 0.7)]
    for k, j in enumerate(J): slides.append(slide_job(j, k + 2, total, glows[k % 3]))
    slides.append(slide_apply(total))
    for i, s in enumerate(slides, 1):
        s.convert('RGB').save(os.path.join(OUT, f'story-{i}.jpg'), quality=93); print('story', i)
