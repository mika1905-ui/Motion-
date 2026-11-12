"""Builds Instagram-Setup.pdf (images + all texts) from TEXTE.md via headless Chromium."""
import html, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
md = open(os.path.join(HERE, 'TEXTE.md'), encoding='utf-8').read()


def inline(s):
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    return s


def md2html(text):
    out, lines, i = [], text.split('\n'), 0
    while i < len(lines):
        l = lines[i]
        if l.startswith('```'):
            j = i + 1; buf = []
            while not lines[j].startswith('```'): buf.append(lines[j]); j += 1
            out.append('<pre>' + html.escape('\n'.join(buf)) + '</pre>'); i = j + 1; continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                if not re.match(r'^\|[-| ]+\|$', lines[i]): rows.append([c.strip() for c in lines[i].strip('|').split('|')])
                i += 1
            t = '<table><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr>'
            t += ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:]) + '</table>'
            out.append(t); continue
        if l.startswith('- '):
            buf = []
            while i < len(lines) and lines[i].startswith('- '): buf.append(f'<li>{inline(lines[i][2:])}</li>'); i += 1
            out.append('<ul>' + ''.join(buf) + '</ul>'); continue
        if re.match(r'^\d+\. ', l):
            buf = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i]): buf.append(f'<li>{inline(lines[i].split(". ", 1)[1])}</li>'); i += 1
            out.append('<ol>' + ''.join(buf) + '</ol>'); continue
        m = re.match(r'^(#+) (.*)', l)
        if m:
            n = len(m.group(1)); out.append(f'<h{n}>{inline(m.group(2))}</h{n}>')
        elif l.strip() == '---':
            out.append('<hr>')
        elif l.strip():
            out.append(f'<p>{inline(l)}</p>')
        i += 1
    return '\n'.join(out)


posts = sorted(os.listdir(os.path.join(HERE, 'posts')))
hls = ['projekte', 'spots', 'preise', 'ablauf', 'kunden', 'chatbot', 'ueber-mich']
page = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><title>FLUXE Studio – Instagram-Setup</title><style>
@page {{ size: A4; margin: 16mm 14mm; }}
body {{ font-family: Inter, 'Helvetica Neue', Arial, sans-serif; color: #141416; font-size: 11pt; line-height: 1.5; }}
h1 {{ font-size: 26pt; margin: 0 0 6pt; letter-spacing: -.02em; }} h2 {{ font-size: 17pt; margin: 22pt 0 8pt; border-bottom: 3px solid #d4ff3a; padding-bottom: 4pt; }}
h3 {{ font-size: 13pt; margin: 16pt 0 6pt; }}
pre {{ background: #f3f4ef; border-left: 4px solid #d4ff3a; padding: 10pt 12pt; white-space: pre-wrap; font-family: inherit; font-size: 10.5pt; border-radius: 6px; break-inside: avoid; }}
code {{ background: #f0f0ec; padding: 1px 5px; border-radius: 4px; font-size: 10pt; }}
table {{ border-collapse: collapse; width: 100%; font-size: 10pt; margin: 6pt 0; }} th, td {{ border: 1px solid #ddd; padding: 5pt 7pt; text-align: left; vertical-align: top; }} th {{ background: #f3f4ef; }}
hr {{ border: 0; }}
.cover {{ background: #08080a; color: #fff; border-radius: 14px; padding: 30pt; text-align: center; }}
.cover img {{ width: 52%; }}
.grid {{ display: grid; gap: 8pt; }} .g3 {{ grid-template-columns: repeat(3, 1fr); }} .g4 {{ grid-template-columns: repeat(4, 1fr); }}
.grid figure {{ margin: 0; break-inside: avoid; }} .grid img {{ width: 100%; border-radius: 8px; display: block; }} figcaption {{ font-size: 9pt; color: #666; margin-top: 3pt; }}
.pb {{ break-before: page; }} .note {{ color: #555; font-size: 10pt; }}
</style></head><body>
<div class="cover"><img src="vorschau/profil-vorschau.png" style="width:60%;border-radius:10px"><h1 style="margin-top:16pt">Instagram-Setup</h1><p>FLUXE Studio · Profilbild, Highlights, 9 Start-Posts, Reel-Cover und alle Texte</p></div>
<p class="note">Bilder speichern: Die Bilder in voller Auflösung bekommst du zusätzlich einzeln (PNG/JPG) – die in dieser PDF sind zum Anschauen.</p>

<h2 class="pb">Profilbild &amp; Reel-Cover</h2>
<div class="grid g3"><figure><img src="profilbild.png"><figcaption>profilbild.png – Profilbild</figcaption></figure>
<figure><img src="vorschau/profilbild-rund.png"><figcaption>So sieht es im Kreis aus</figcaption></figure>
<figure><img src="reel-cover.png"><figcaption>reel-cover.png – Titelbild für den Spot</figcaption></figure></div>

<h2>Highlight-Cover</h2>
<div class="grid g4">{''.join(f'<figure><img src="highlights/{h}.png"><figcaption>{h}.png</figcaption></figure>' for h in hls)}</div>

<h2 class="pb">Die 9 Start-Posts (in dieser Reihenfolge posten)</h2>
<div class="grid g3">{''.join(f'<figure><img src="posts/{p}"><figcaption>{p}</figcaption></figure>' for p in posts)}</div>

<div class="pb"></div>
{md2html(md)}
</body></html>"""
open(os.path.join(HERE, '_pdf.html'), 'w', encoding='utf-8').write(page)
js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://{os.path.join(HERE, '_pdf.html')}', {{ waitUntil: 'load' }});
  await p.pdf({{ path: '{os.path.join(HERE, 'Instagram-Setup.pdf')}', format: 'A4', printBackground: true, margin: {{ top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }} }});
  await b.close(); }})();"""
subprocess.run(['node', '-e', js], check=True)
os.remove(os.path.join(HERE, '_pdf.html'))
print('ok')
