"""Scrollwerk – die 9 Start-Posts als fertige Karussells (4:5, 1080x1350) + Caption je Post.
Ausgabe: posts-fertig/NN-name/slide-1.jpg … + caption.txt, und Instagram-Posts.pdf zum Durchblättern."""
import json, os, sys, textwrap
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make as M

HERE = M.HERE
OUT = os.path.join(HERE, 'posts-fertig')
P = json.load(open(os.path.join(HERE, '_projects.json')))
W, H = 1080, 1350
LV = M.LIME            # helles Violett (Text-Akzent)
img = lambda f: os.path.join(M.IMG, f.split('/')[-1]) if '/' in f else os.path.join(M.IMG, f)


def base(gc=M.VIOLET, glow=(0.5, 0.45)):
    return M.canvas(W, H, glow, gc=gc, ga=75)


def counter(im, i, n):
    """kleine Slide-Nummer oben rechts + Wisch-Hinweis auf Slide 1"""
    M.text(im, (W - 64, 82), f'{i}/{n}', 26, 'semi', M.MUTED, 'ra')
    if i == 1 and n > 1:
        M.text(im, (W - 64, H - 150), 'Wischen →', 28, 'bold', LV, 'ra')


def wrap(s, n):
    return '\n'.join(textwrap.wrap(s, n))


def cta(title='Willst du so etwas\nfür deinen Betrieb?', sub='Kostenloses Erstgespräch – Antwort in 24 h.'):
    im = base(M.VIOLET, (0.5, 0.4))
    m = M.MARK.crop(M.MARK.getbbox()); m = m.resize((220, int(220 * m.height / m.width)), Image.LANCZOS)
    im.alpha_composite(m, ((W - m.width) // 2, 230))
    M.text(im, (W // 2, 520), title, 84, 'black', anchor='ma', spacing=-2)
    M.text(im, (W // 2, 760), sub, 34, 'semi', (205, 205, 212), anchor='ma')
    M.pill(im, 'Link in Bio  ↗', W // 2, 860, size=44, anchor='c')
    M.text(im, (W // 2, 1010), 'Websites · Werbespots · Branding · Chatbots', 28, 'semi', M.MUTED, anchor='ma')
    M.footer(im)
    return im


def shot_slide(title, sub, desktop=None, mobile=None, kicker=None):
    im = base()
    if kicker: M.pill(im, kicker, 64, 70)
    M.text(im, (64, 150), title, 70, 'black', spacing=-2)
    if sub: M.text(im, (64, 150 + 80 * (title.count('\n') + 1) + 10), sub, 32, 'semi', M.MUTED)
    if desktop and mobile:
        M.laptop(im, img(desktop), 110, 470, 760); M.phone(im, img(mobile), 760, 600, 230)
    elif desktop:
        M.laptop(im, img(desktop), 80, 470, 920)
    elif mobile:
        M.phone(im, img(mobile), (W - 330) // 2, 400, 330)
    M.footer(im)
    return im


def text_slide(kicker, title, items, numbered=False):
    im = base(M.VIOLET, (0.2, 0.75))
    M.pill(im, kicker, 64, 70)
    M.text(im, (64, 150), title, 76, 'black', spacing=-2)
    y = 170 + 86 * (title.count('\n') + 1) + 40
    d = ImageDraw.Draw(im)
    for k, (a, b) in enumerate(items):
        if numbered:
            d.text((64, y), f'{k + 1:02d}', font=M.F('black', 62), fill=LV)
            x = 190
        else:
            d.ellipse((70, y + 16, 92, y + 38), fill=LV); x = 120
        d.text((x, y + 4), a, font=M.F('black', 42), fill=M.INK)
        if b:
            d.multiline_text((x, y + 60), wrap(b, 44), font=M.F('semi', 28), fill=M.MUTED, spacing=6)
        y += 150 if b and len(b) > 44 else 128
    M.footer(im)
    return im


def price_slide(area, rows, note=''):
    im = base(M.VIOLET, (0.5, 0.2))
    M.pill(im, 'PREISE', 64, 70)
    M.text(im, (64, 150), area, 78, 'black')
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for k in range(len(rows)):
        y = 330 + k * 120
        od.rounded_rectangle((64, y, W - 64, y + 98), 26, fill=(255, 255, 255, 16), outline=(255, 255, 255, 40), width=2)
    im.alpha_composite(ov); d = ImageDraw.Draw(im)
    for k, (a, b) in enumerate(rows):
        y = 330 + k * 120
        d.text((100, y + 49), a, font=M.F('bold', 40), fill=M.INK, anchor='lm')
        d.text((W - 100, y + 49), b, font=M.F('black', 40), fill=LV, anchor='rm')
    if note: M.text(im, (64, 330 + len(rows) * 120 + 30), note, 28, 'semi', M.MUTED)
    M.footer(im, 'Festpreis nach Erstgespräch')
    return im


def project(n, pid, kicker, title, sub, bullets, spec=None):
    p = P[pid]
    imgs = p['images']
    cover = base(); M.pill(cover, kicker, 64, 70)
    ts = 92
    while M.F('black', ts).getlength(title) > W - 128: ts -= 2
    M.text(cover, (64, 150 + (92 - ts) // 2), title, ts, 'black'); M.text(cover, (64, 260), sub, 36, 'semi', M.MUTED)
    M.laptop(cover, img(imgs[0]), 110, 420, 760); M.phone(cover, img(p['mobile']), 760, 560, 230)
    if spec: M.text(cover, (64, H - 165), spec, 24, 'semi', (120, 120, 128))
    M.footer(cover, 'Website · Scrollwerk')
    slides = [cover]
    for k, im_ in enumerate(imgs[1:3]):
        slides.append(shot_slide(['Durchdacht bis ins Detail.', 'Jeder Bereich mit Ziel.'][k], None, desktop=im_))
    slides.append(shot_slide('Mobil zuerst.', 'Die meisten Besucher kommen vom Handy.', mobile=p['mobile']))
    slides.append(text_slide('WAS DRIN STECKT', 'Das macht\nden Unterschied.', bullets))
    slides.append(cta())
    return slides


def save_post(folder, slides, caption):
    d = os.path.join(OUT, folder); os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    n = len(slides)
    for i, s in enumerate(slides, 1):
        s = s.copy(); counter(s, i, n)
        s.convert('RGB').save(os.path.join(d, f'slide-{i}.jpg'), quality=93)
    open(os.path.join(d, 'caption.txt'), 'w', encoding='utf-8').write(caption.strip() + '\n')
    print('post', folder, n, 'slides')
    return d


TAGS_LOCAL = '#bielefeld #owl #scrollwerk'
POSTS = []

# 01 – Intro
intro = M.canvas(W, H, (0.7, 0.35), gc=M.VIOLET, ga=90)
me = Image.open(os.path.join(M.IMG, 'team', 'mika.png')).convert('RGBA'); me = me.resize((int(760 * me.width / me.height), 760), Image.LANCZOS)
intro.alpha_composite(me, (W - me.width + 40, H - me.height - 150)); M.pill(intro, 'NEU HIER', 64, 70)
M.text(intro, (64, 160), 'Hi, ich bin\nMika.', 120, 'black', spacing=-6)
M.text(intro, (64, 470), 'Ich baue Webseiten,\nWerbespots und Chatbots\nfür Betriebe, die nicht\nim Feed untergehen.', 40, 'semi', (210, 210, 214), spacing=10)
M.text(intro, (64, 800), 'Bielefeld · OWL · remote', 32, 'bold', LV); M.footer(intro)
POSTS.append(('01-hi-ich-bin-mika', [intro,
    text_slide('WAS ICH MACHE', 'Alles aus\neiner Hand.', [('Web', 'Websites, Online-Shops, 3D-Seiten'), ('Video & Motion', 'Werbespots, Erklär- und Produktvideos'), ('Marke & Social', 'Logo, Branding, Social-Media-Betreuung'), ('Tools', 'Chatbots, digitale Speisekarte, Betreuung')]),
    text_slide('WARUM', 'Gute Betriebe\nverdienen mehr.', [('Gesehen werden', 'Auftritte, die im Feed und bei Google auffallen.'), ('Mehr Anfragen', 'Klare Wege zur Anfrage – auch nachts per Chatbot.'), ('Faire Festpreise', 'Bezahlbar auch für kleine Betriebe.')]),
    cta('Lass uns\nkennenlernen.', 'BWL-Student an der FHM Bielefeld · Gründer von Scrollwerk.')],
f"""Hi, ich bin Mika 👋

20, BWL-Student an der FHM Bielefeld – und Gründer von Scrollwerk. Ich baue Websites, Werbespots, Logos und Chatbots für Betriebe, die online endlich so gut aussehen wollen, wie sie wirklich sind.

Keine Agentur mit zwölf Ansprechpartnern. Einer, der zuhört, schnell antwortet und faire Festpreise macht.

👉 Wisch durch und folge, wenn du ein Unternehmen hast oder gründen willst.

#webdesign #selbstständig #gründer #website #werbespot #branding #kleinunternehmen #marketing {TAGS_LOCAL}"""))

# 02 – Preise (alle 4 Bereiche)
POSTS.append(('02-preise', [
    text_slide('PREISE', 'Was kostet\ndas eigentlich?', [('Festpreise', 'Du weißt vorher, was es kostet.'), ('Startpreise', 'Für jede Leistung – auf den nächsten Slides.'), ('Kostenloses Erstgespräch', 'Danach bekommst du ein festes Angebot.')]),
    price_slide('Web', [('Onepager', 'ab 690 €'), ('Website (bis 5 Seiten)', 'ab 1.290 €'), ('3D-Website', 'ab 1.990 €'), ('Online-Shop', 'ab 2.490 €')]),
    price_slide('Video & Motion', [('Social-Spot', 'ab 249 €'), ('Produkt-Spot', 'ab 449 €'), ('Erklärvideo', 'ab 690 €'), ('Produktvideo', 'ab 890 €'), ('Reel-Abo (4 Spots)', '690 € / Mon.')]),
    price_slide('Marke & Social', [('Logo', 'ab 290 €'), ('Branding-Paket', 'ab 690 €'), ('Social-Media-Kit', 'ab 190 €'), ('Social Starter', '390 € / Mon.'), ('Social Pro', '790 € / Mon.')]),
    price_slide('Tools', [('FAQ-Chatbot', 'ab 390 €'), ('KI-Chatbot', 'ab 890 €'), ('Digitale Speisekarte + QR', 'ab 290 €'), ('Betreuung', 'ab 29 € / Mon.')]),
    cta('Was kostet\ndein Projekt?', 'Schreib „PREIS“ in die Kommentare – ich sag’s dir.')],
f"""Was kostet eine Website – oder ein Logo, ein Werbespot, ein Chatbot? 💸

Hier sind alle meine Startpreise, ohne Kleingedrucktes. Wisch durch 👉

Nach einem kostenlosen Erstgespräch bekommst du ein festes Angebot. Kein Stundenzettel, keine Überraschung.

💬 Schreib „PREIS“ in die Kommentare und ich sag dir, was dein Projekt ungefähr kostet.

#websitekosten #webdesign #logodesign #werbespot #chatbot #preise #selbstständig #handwerk #kleinunternehmer {TAGS_LOCAL}"""))

# 03 – Ablauf
POSTS.append(('03-ablauf', [
    text_slide('SO LÄUFT’S', 'Von der Idee\nzum Launch.', [('Erstgespräch', '15–30 Minuten, kostenlos'), ('Festes Angebot', 'schriftlich, ohne Überraschungen'), ('Umsetzung', 'mit Zwischenständen zum Anklicken'), ('Launch', 'und danach bin ich weiter da')], numbered=True),
    text_slide('VERSPRECHEN', 'Darauf kannst\ndu dich verlassen.', [('Antwort in 24 h', 'Auf jede Anfrage.'), ('Ein Ansprechpartner', 'Von der Idee bis zum Launch.'), ('2 Korrekturrunden', 'Bei jedem Projekt inklusive.')]),
    cta()],
f"""So läuft ein Projekt bei mir ab 👇

01 Erstgespräch – 15–30 Minuten, kostenlos
02 Festes Angebot – schriftlich, ohne Überraschungen
03 Umsetzung – mit Zwischenständen zum Anklicken
04 Launch – und danach bin ich weiter für dich da

Speicher dir den Beitrag, wenn du bald eine Website oder ein neues Logo brauchst 📌

#webdesign #website #ablauf #freelancer #unternehmer #digitalisierung #webentwicklung {TAGS_LOCAL}"""))

# 04–09 – Projekte
POSTS.append(('04-aurene', project(4, 'aurene', 'PARFUM-SHOP', 'AURÈNE', 'Maison de Parfum · Online-Shop',
    [('3D-Flakon', 'Der Duft dreht sich in 3D – man will ihn anfassen.'), ('Duftfinder', 'In 30 Sekunden zum passenden Parfum.'), ('Shop & Warenkorb', 'Kaufen ohne Umwege.')]),
f"""Ein Parfum-Shop, der sich nach Luxus anfühlt ✨

Für AURÈNE (Konzept) habe ich einen Online-Shop gebaut: 3D-Flakon, Duftfinder, Warenkorb – und eine Seite, auf der man einfach länger bleiben will.

Wisch durch für mehr Screens 👉

#onlineshop #webdesign #parfum #luxus #ecommerce #shopdesign #3dwebsite {TAGS_LOCAL}"""))
POSTS.append(('05-la-mome-plage', project(5, 'lamome', 'RESTAURANT · CANNES', 'La Môme Plage', 'Strandrestaurant an der Croisette',
    [('Golden Hour', 'Creme, Terrakotta, Gold – die Seite fühlt sich nach Abendsonne an.'), ('Ganze Karte online', 'Alle Gerichte mit Preisen, sortiert nach Kategorie.'), ('Reservierung · FR/EN', 'Tisch oder Transat anfragen, zweisprachig auf Knopfdruck.')]),
f"""Neue Website für ein Strandrestaurant in Cannes 🌅

Für La Môme Plage an der Croisette habe ich die Website komplett neu gestaltet: Golden-Hour-Look, ein Tag zum Durchwischen vom ersten Café bis zum Feuerwerk über der Bucht, die ganze Karte online und Reservierung auf Französisch und Englisch.

Wisch durch für mehr Screens 👉

#restaurantwebsite #webdesign #gastronomie #cannes #cotedazur #frenchriviera #website {TAGS_LOCAL}"""))
chat = P['assistent']
POSTS.append(('06-chatbot', [
    shot_slide('Dein Betrieb\nantwortet um\n3 Uhr nachts.', None, mobile=chat['mobile'], kicker='CHATBOT'),
    shot_slide('Fragen? Sofort beantwortet.', 'Preise, Leistungen, Öffnungszeiten, Termine.', desktop=chat['images'][0]),
    text_slide('WAS ER KANN', 'Dein Assistent,\nder nie schläft.', [('Rund um die Uhr', 'Beantwortet Fragen auch nachts und am Wochenende.'), ('Führt zur Anfrage', 'Aus Besuchern werden Kunden.'), ('Ab 390 €', 'FAQ-Bot ohne laufende Kosten.')]),
    cta('Teste ihn live\nauf meiner Website.', 'Der Chat unten rechts ist genau so ein Bot.')],
f"""Dein Betrieb antwortet um 3 Uhr nachts 🤖🌙

Ein Chatbot auf deiner Website beantwortet Fragen zu Preisen, Leistungen und Terminen – und schickt Interessenten direkt zur Anfrage. Weniger Telefon-Hin-und-her, mehr Kunden.

Ab 390 € – ohne monatliche Pflicht.

👉 Teste ihn live auf meiner Website (Link in Bio).

#chatbot #ki #digitalisierung #kundenservice #website #handwerk #praxis #automatisierung {TAGS_LOCAL}"""))
POSTS.append(('07-red-bull-3d', project(7, 'redbull', '3D-PRODUKTSEITE', 'Red Bull in 3D', 'Dose dreht sich, Tray füllt sich – beim Scrollen',
    [('Echte Dose in 3D', 'Originale Slim-Can-Form, dreht sich beim Scrollen.'), ('9 Sorten', 'Ein Tap – die ganze Seite färbt sich um.'), ('24er Tray', 'Füllt sich Dose für Dose, in jeder Sorte.')],
    spec='Unbeauftragte Spec-Arbeit · keine Verbindung zu Red Bull'),
f"""Was wäre, wenn eine Produktseite so aussieht? 🥫

3D-Dose, die sich beim Scrollen dreht, die Lasche öffnet und Tropfen versprüht. Dazu ein 24er Tray, das sich Dose für Dose füllt – in allen 9 Sorten.

Unbeauftragte Spec-Arbeit, keine Verbindung zu Red Bull. Gemacht, um zu zeigen, was mit 3D-Produktseiten möglich ist.

Soll ich so etwas für dein Produkt bauen? Schreib mir 👇

#3dwebsite #threejs #webdesign #produktdesign #creativecoding #specwork #webdevelopment #motiondesign {TAGS_LOCAL}"""))
POSTS.append(('08-elektrotechnik-beschte', project(8, 'beschte', 'HANDWERK', 'Elektrotechnik Beschte', 'Website + Chatbot für den Meisterbetrieb',
    [('24/7-Notdienst oben', 'Die wichtigste Nummer sofort sichtbar.'), ('9 Leistungen', 'Von Photovoltaik bis Wallbox – klar sortiert.'), ('Chatbot & Karriere', 'Anfragen auch nach Feierabend, Bewerber inklusive.')]),
f"""Website für einen Elektro-Meisterbetrieb ⚡

24/7-Notdienst ganz oben, neun Leistungen von Photovoltaik bis Wallbox, Karriere-Bereich und ein Chatbot, der Anfragen auch nach Feierabend annimmt.

Handwerk braucht keine Spielerei – sondern eine Seite, die schnell lädt, gefunden wird und Anfragen bringt.

#handwerk #elektriker #website #webdesign #handwerker #meisterbetrieb #photovoltaik {TAGS_LOCAL}"""))
POSTS.append(('09-vestier', project(9, 'vestier', 'IMMOBILIEN', 'VÉSTIER', 'Website für Luxus-Immobilien',
    [('Großformatige Bilder', 'Häuser, die man sofort sehen will.'), ('Objektsuche', 'Nach Lage, Größe und Preis filtern.'), ('Diskret & persönlich', 'Anfragen direkt an den Makler.')]),
f"""Adressen, die man nicht sucht. 🏛️

VÉSTIER Private Estates – Website für Luxus-Immobilien: großformatige Bilder, ruhige Typografie, Objektsuche und Exposés, die man gern weiterleitet.

Wenn ein Haus 8 Millionen kostet, darf die Website nicht nach 2009 aussehen.

#immobilien #luxusimmobilien #makler #webdesign #realestate #website #immobilienmakler {TAGS_LOCAL}"""))

if __name__ == '__main__':
    dirs = [save_post(f, s, c) for f, s, c in POSTS]
    # Übersichts-PDF: je Post eine Seite mit allen Slides + Caption
    import html, subprocess
    pages = []
    for (f, s, c), d in zip(POSTS, dirs):
        sl = ''.join(f'<img src="file://{d}/slide-{i}.jpg">' for i in range(1, len(s) + 1))
        pages.append(f'<section><h2>{html.escape(f[:2])} · {html.escape(f[3:].replace("-", " ").title())} <small>{len(s)} Slides</small></h2><div class="g">{sl}</div><pre>{html.escape(c)}</pre></section>')
    doc = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><style>@page{{size:A4;margin:12mm}}body{{font-family:Inter,Arial,sans-serif;color:#141416}}
    h1{{font-size:26pt;margin:0 0 4pt}}h2{{font-size:15pt;margin:0 0 8pt;border-bottom:3px solid #6A3BFF;padding-bottom:4pt}}h2 small{{color:#888;font-weight:400;font-size:10pt}}
    section{{break-before:page}}section:first-of-type{{break-before:auto}}.g{{display:grid;grid-template-columns:repeat(4,1fr);gap:5pt}}.g img{{width:100%;border-radius:5px}}
    pre{{white-space:pre-wrap;font-family:inherit;font-size:9.5pt;background:#f3f1fb;border-left:4px solid #6A3BFF;padding:8pt 10pt;border-radius:5px;margin-top:8pt}}</style></head><body>
    <h1>Scrollwerk – Instagram-Posts</h1><p style="color:#555">Reihenfolge: 01 zuerst posten. Jeder Post ist ein Karussell – alle Slides in einem Beitrag hochladen, Caption darunter kopieren.</p>{''.join(pages)}</body></html>"""
    hp = os.path.join(HERE, '_posts.html'); open(hp, 'w', encoding='utf-8').write(doc)
    js = f"""const {{ chromium }} = require('playwright'); (async () => {{ const b = await chromium.launch(); const p = await b.newPage();
      await p.goto('file://{hp}', {{ waitUntil: 'load' }}); await p.pdf({{ path: '{os.path.join(HERE, 'Instagram-Posts.pdf')}', format: 'A4', printBackground: true }}); await b.close(); }})();"""
    subprocess.run(['node', '-e', js], check=True); os.remove(hp)
    print('pdf ok')
