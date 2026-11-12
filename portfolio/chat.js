/* FLUXE-Assistent: Chatbot unten rechts.
   Läuft komplett im Browser (kein Server, keine Kosten, keine Daten nach außen) und kennt alle Inhalte aus
   config.js und data.js: Leistungen, Preise, Katalog, Projekte, Branchen, FAQ, Stellen, Kontakt.
   Neue Antworten: unten in INTENTS ergänzen (keys = Stichwörter, answer = Antwort). */
(() => {
const C = window.CONFIG || {}, P = window.PROJECTS || [], B = window.BRANCHEN || [], PR = window.PRICES || {}, CAT = window.CATALOG || [], FAQ = window.FAQ || [], JOBS = window.JOBS || [];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = n => n == null ? 'auf Anfrage' : 'ab ' + n.toLocaleString('de-DE') + ' €';
const first = (C.owner || 'Mika').split(' ')[0];
const norm = s => ' ' + String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9€:+ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const has = (t, k) => t.includes(' ' + k) ;                       // word-prefix match on normalised text
const L = (label, href) => ({ label, href });

/* ───────── entities ───────── */
const BSYN = {
  automotive: ['auto', 'autohaus', 'kfz', 'fahrzeug', 'werkstatt', 'automotive', 'car'],
  tech: ['tech', 'elektronik', 'handy', 'smartphone', 'iphone', 'gadget', 'software', 'app'],
  food: ['food', 'getraenk', 'drink', 'lebensmittel', 'energy', 'cola', 'kaffee', 'baeckerei'],
  lifestyle: ['lifestyle', 'konsum', 'produkt', 'snus', 'pouch', 'kosmetikprodukt', 'marke'],
  gesundheit: ['gesundheit', 'praxis', 'arzt', 'zahnarzt', 'physio', 'medizin', 'pflege', 'therapie'],
  immobilien: ['immobilie', 'makler', 'wohnung', 'haus ', 'bau', 'architekt'],
  gastro: ['gastro', 'restaurant', 'bar ', 'club', 'nightlife', 'cafe', 'imbiss', 'hotel', 'event', 'party', 'disco'],
  mode: ['mode', 'fashion', 'beauty', 'friseur', 'kosmetik', 'nagel', 'barber', 'kleidung', 'schmuck'],
  sport: ['sport', 'fitness', 'gym', 'studio fitness', 'verein', 'yoga', 'trainer'],
  handwerk: ['handwerk', 'elektriker', 'dachdecker', 'maler', 'tischler', 'schreiner', 'installateur', 'sanitaer', 'gartenbau', 'lokal'],
};
const findBranche = t => B.find(b => (BSYN[b.id] || []).some(k => has(t, k)) || has(t, norm(b.name).trim().split(' ')[0]));
const findProject = t => P.find(p => has(t, norm(p.title).trim()) || (p.id.length > 2 && has(t, p.id + ' ')));
const PRODUCTS = [];
Object.entries(PR).forEach(([k, g]) => g.items.forEach(it => PRODUCTS.push({ ...it, group: g.label, key: k })));
const PSYN = { 'Social Spot': ['social spot', 'tiktok spot', 'einzelner spot', 'ein spot', 'kurzer spot'], 'Produkt-Spot': ['produkt spot', 'produktspot', 'produktvideo', 'studio spot'],
  'Reel-Abo': ['reel abo', 'abo', 'monatlich', 'regelmaessig', 'jeden monat'], 'Kampagne': ['kampagne', '5 spots', 'fuenf spots'],
  'Onepager': ['landingpage', 'landing page', 'eine seite', 'onepager', 'one pager', 'einseitig'], 'Website': ['firmenwebsite', 'firmen website', 'unternehmenswebsite', 'klassische website', 'normale website', 'normale webseite', 'mehrere seiten', 'firmenseite'], '3D-Website': ['3d website', '3d webseite', '3d seite', '3d', 'markenseite'],
  'FAQ-Chatbot': ['faq chatbot', 'faq bot', 'einfacher chatbot', 'chatbot ohne ki'], 'KI-Chatbot': ['ki chatbot', 'ki bot', 'ai chatbot', 'chatgpt', 'gpt', 'intelligenter chatbot'], 'Chatbot-Betreuung': ['chatbot betreuung', 'chatbot pflege'],
  'Online-Shop': ['shop', 'onlineshop', 'online shop', 'e commerce', 'ecommerce'], 'Relaunch': ['relaunch', 'ueberarbeiten', 'neu machen', 'modernisieren', 'alte website'],
  'Starter': ['starter'], 'Business': ['business paket', 'businesspaket', 'komplettpaket', 'kompletter auftritt'], 'Launch': ['launch paket', 'launchpaket', 'produktlaunch'],
  'Basic': ['basic', 'hosting'], 'Plus': ['betreuung plus', 'plus paket'], 'Content': ['content paket', 'content abo'] };
const findProduct = t => PRODUCTS.find(p => (PSYN[p.name] || []).some(k => has(t, k)));
const CATS = CAT.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));
const CSYN = { 'Untertitel / Captions': ['untertitel', 'caption'], 'Zusätzliches Format': ['format', '1:1', '4:5', '16:9', 'quer'], 'Thumbnail-Set': ['thumbnail', 'vorschaubild', 'cover'],
  'Lizenzierte Musik': ['musik', 'song', 'lied'], 'Terminbuchung einbinden': ['terminbuchung einbinden', 'buchungstool', 'online termine fuer'], 'WhatsApp-Button': ['whatsapp button'], 'Chatbot für deine Website': ['chatbot dazu', 'chatbot zusaetzlich', 'chatbot extra'], 'Google-Unternehmensprofil': ['google', 'maps', 'unternehmensprofil', 'bewertungen google'],
  'SEO-Grundpaket': ['seo', 'gefunden werden', 'suchmaschine', 'ranking'], 'Barrierefreiheits-Check': ['barriere', 'bfsg', 'barrierefrei'], 'Mehrsprachigkeit': ['englisch', 'mehrsprach', 'sprache'],
  'Rechtstexte einbinden': ['rechtstexte einbinden'], 'Express in 48 Stunden': ['express', 'eilig', 'schnell fertig', '48'], 'Zusätzliche Korrekturrunde': ['korrekturrunde', 'weitere korrektur'], 'Texte & Copywriting': ['copywriting', 'texte schreiben', 'werbetext', 'slogan'] };
const findCat = t => CATS.find(c => (CSYN[c.name] || []).some(k => has(t, k)));

/* ───────── answer helpers ───────── */
const pp = name => { const x = PRODUCTS.find(p => p.name === name); return x ? (x.price == null ? 'auf Anfrage' : euro(x.price) + (x.unit ? ' ' + x.unit : '')) : ''; };
const cp = name => { const x = CATS.find(c => c.name === name); return x ? x.price : ''; };
const groupList = k => PR[k] ? `<ul>${PR[k].items.map(i => `<li>${esc(i.name)}: <b>${i.price == null ? 'auf Anfrage' : euro(i.price) + (i.unit ? ' ' + esc(i.unit) : '')}</b></li>`).join('')}</ul>` : '';
const contactActions = () => [L('Projekt anfragen', 'kontakt.html#anfrage'), L('Termin buchen', 'kontakt.html#termin')];
const contactLine = () => {
  const bits = [];
  if (C.email) bits.push(`E-Mail: <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`);
  if (C.phone) bits.push(`Telefon: <a href="tel:${esc(C.phone.replace(/\s/g, ''))}">${esc(C.phone)}</a>`);
  if (C.whatsapp) bits.push(`WhatsApp: <a href="https://wa.me/${esc(C.whatsapp)}" target="_blank" rel="noopener">Nachricht schreiben</a>`);
  if (C.instagram) bits.push(`<a href="${esc(C.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
  return bits.length ? bits.join('<br>') : 'Am schnellsten über das Anfrageformular – E-Mail, Telefon und WhatsApp werden gerade eingerichtet.';
};
const productAnswer = p => ({
  text: `<b>${esc(p.name)}</b> (${esc(p.group)}): <b>${p.price == null ? 'Preis auf Anfrage' : euro(p.price) + (p.unit ? ' ' + esc(p.unit) : '')}</b>.<br>${esc(p.text)}<ul>${p.list.map(l => `<li>${esc(l)}</li>`).join('')}</ul>Das ist ein Startpreis – das feste Angebot bekommst du nach einem kurzen Gespräch.`,
  actions: [L('Alle Preise', 'preise.html#' + p.key), L('Das anfragen', 'kontakt.html?leistung=' + encodeURIComponent(p.name) + '#anfrage')],
  chips: ['Was ist im Katalog?', 'Preisrechner', 'Wie läuft die Bezahlung?'],
});
const brancheAnswer = b => {
  const list = P.filter(p => p.branche === b.id);
  if (!list.length) return { text: `Für <b>${esc(b.name)}</b> gibt es noch kein Projekt im Portfolio – die Kategorie ist als <i>„Demnächst verfügbar“</i> markiert. Genau das ist deine Chance: Die ersten Kunden einer Branche bekommen besonders viel Aufmerksamkeit und Startkonditionen.`, actions: [L(`${b.name} ansehen`, 'arbeiten.html#' + b.id), L('Als Erste:r anfragen', 'kontakt.html?branche=' + encodeURIComponent(b.name) + '#anfrage')] };
  return { text: `In <b>${esc(b.name)}</b> gibt es ${list.length} Arbeit${list.length > 1 ? 'en' : ''}:<ul>${list.map(p => `<li><b>${esc(p.title)}</b> – ${esc(p.sub)} (${p.kind === 'spot' ? 'Werbespot' : 'Website'})</li>`).join('')}</ul>`, actions: [L(`${b.name} ansehen`, 'arbeiten.html#' + b.id), L('So etwas anfragen', 'kontakt.html?branche=' + encodeURIComponent(b.name) + '#anfrage')] };
};
const projectAnswer = p => ({
  text: `<b>${esc(p.title)}</b> – ${esc(p.sub)}<br>${esc(p.text)}<br><small>${esc(p.note || 'Unbeauftragte Spec-Arbeit zur Demonstration – keine Verbindung zur Marke.')}</small>`,
  actions: [L('Projekt ansehen', 'arbeiten.html#' + p.branche + '|' + p.id), ...(p.live ? [L('Live-Seite öffnen', p.live)] : []), L('So etwas anfragen', 'kontakt.html?projekt=' + encodeURIComponent(p.title) + '#anfrage')],
});
const guide = (title, steps, actions) => ({ text: `<b>${title}</b><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`, actions });

/* ───────── pages for navigation ───────── */
const PAGES = [
  { keys: ['start', 'startseite', 'home', 'showreel', 'anfang'], label: 'Startseite', href: 'index.html' },
  { keys: ['arbeiten', 'portfolio', 'projekte', 'referenz', 'beispiel'], label: 'Arbeiten', href: 'arbeiten.html' },
  { keys: ['leistung', 'service', 'angebot'], label: 'Leistungen', href: 'leistungen.html' },
  { keys: ['preis', 'kosten', 'katalog', 'rechner'], label: 'Preise', href: 'preise.html' },
  { keys: ['gratis', 'check'], label: 'Gratis-Check', href: 'check.html' },
  { keys: ['ueber', 'team', 'mika', 'person'], label: 'Über mich', href: 'ueber-mich.html' },
  { keys: ['karriere', 'job', 'stelle', 'bewerb'], label: 'Karriere', href: 'karriere.html' },
  { keys: ['faq', 'fragen'], label: 'FAQ', href: 'faq.html' },
  { keys: ['kontakt', 'anfrage', 'formular'], label: 'Kontakt', href: 'kontakt.html' },
  { keys: ['termin', 'kalender'], label: 'Termin buchen', href: 'kontakt.html#termin' },
  { keys: ['impressum'], label: 'Impressum', href: 'impressum.html' },
  { keys: ['datenschutz', 'dsgvo'], label: 'Datenschutz', href: 'datenschutz.html' },
  { keys: ['agb', 'geschaeftsbedingung'], label: 'AGB', href: 'agb.html' },
  { keys: ['bildnachweis', 'quelle', 'lizenz'], label: 'Bildnachweise', href: 'bildnachweise.html' },
];

/* ───────── intents ───────── */
const INTENTS = [
  { id: 'nav', keys: [['zeig', 2], ['wo finde', 6], ['wo ist', 5], ['gehe zu', 6], ['geh zu', 6], ['oeffne', 6], ['bring mich', 6], ['navigier', 6], ['wo kann ich', 3], ['link', 2], ['seite', 1]],
    answer: t => { const pg = PAGES.find(p => p.keys.some(k => has(t, k))); if (!pg) return null;
      return { text: `Klar – hier geht's zu <b>${pg.label}</b>.`, actions: [L(pg.label + ' öffnen', pg.href)], go: pg.href }; } },
  { id: 'greet', keys: [['hallo', 3], ['hi ', 3], ['hey', 3], ['moin', 3], ['servus', 3], ['guten tag', 3], ['guten morgen', 3], ['guten abend', 3], ['huhu', 3], ['na ', 1]],
    answer: () => ({ text: `Hi! 👋 Schön, dass du da bist. Ich beantworte Fragen zu Leistungen, Preisen, Projekten und dem Ablauf – und bringe dich direkt an die richtige Stelle. Was interessiert dich?`, chips: ['Was kostet ein Werbespot?', 'Was kostet eine Website?', 'Arbeiten ansehen', 'Termin buchen'] }) },
  { id: 'thanks', keys: [['danke', 3], ['dankeschoen', 3], ['vielen dank', 3], ['merci', 3], ['super', 1], ['top', 1], ['perfekt', 1], ['cool', 1]],
    answer: () => ({ text: `Gern! 🙌 Wenn noch etwas offen ist, frag einfach. Und wenn du loslegen willst: ${first} meldet sich innerhalb von ${esc(C.responseTime || '24 Stunden')}.`, actions: contactActions() }) },
  { id: 'bye', keys: [['tschuess', 3], ['ciao', 3], ['bye', 3], ['bis dann', 3], ['bis spaeter', 3]],
    answer: () => ({ text: 'Bis bald! Du findest mich hier unten rechts, falls noch etwas ist. ✌️' }) },
  { id: 'bot', keys: [['wer bist du', 6], ['bist du ein bot', 8], ['bist du ein mensch', 8], ['bist du echt', 6], ['bist du ki', 8], ['roboter', 3], ['mit wem', 4]],
    answer: () => ({ text: `Ich bin der digitale Assistent von ${esc(C.brand)} – ein automatischer Chatbot, kein Mensch. Ich kenne alle Inhalte dieser Website. Übrigens: So einen Chatbot baut ${esc(first)} auch für deine Website. Für alles Persönliche antwortet ${esc(first)} selbst, innerhalb von ${esc(C.responseTime || '24 Stunden')}.`, actions: contactActions() }) },
  { id: 'about', keys: [['wer ist', 3], ['mika', 3], ['ueber dich', 3], ['gruender', 3], ['inhaber', 3], ['student', 2], ['fhm', 3], ['studium', 2], ['wie alt', 3], ['erfahrung', 2], ['wer steckt', 3], ['wer macht', 2]],
    answer: () => ({ text: `Hinter ${esc(C.brand)} steckt <b>${esc(C.owner)}</b> aus Bielefeld – BWL-Student an der FHM Bielefeld. Er verbindet Motion Design, 3D und Code mit betriebswirtschaftlichem Blick: Spots und Seiten, die nicht nur gut aussehen, sondern verkaufen. Jedes Projekt betreut er persönlich.`, actions: [L('Über mich', 'ueber-mich.html'), L('Kennenlernen', 'kontakt.html#termin')] }) },
  { id: 'team', keys: [['team', 3], ['mitarbeiter', 3], ['allein', 2], ['wie viele leute', 3], ['agentur', 2]],
    answer: () => ({ text: `Aktuell arbeitet ${esc(first)} allein – du hast also immer denselben Ansprechpartner. Für größere Projekte kommen Spezialisten aus dem Netzwerk dazu (Foto, Sprecher, Musik). Das Team wächst – offene Stellen stehen unter Karriere.`, actions: [L('Team ansehen', 'ueber-mich.html#team'), L('Karriere', 'karriere.html')] }) },
  { id: 'location', keys: [['wo sitzt', 4], ['wo bist', 3], ['standort', 3], ['adresse', 3], ['bielefeld', 2], ['owl', 2], ['vor ort', 3], ['treffen', 2], ['buero', 2], ['woher', 3], ['remote', 2], ['deutschlandweit', 3], ['ausserhalb', 2]],
    answer: () => ({ text: `${esc(C.brand)} sitzt in <b>${esc(C.city)}</b>. Treffen vor Ort in Bielefeld und OWL sind möglich – Spots und Webseiten liefert ${esc(first)} aber auch deutschlandweit und komplett remote.`, actions: [L('Termin vereinbaren', 'kontakt.html#termin')] }) },
  { id: 'services', keys: [['leistung', 3], ['was machst du', 4], ['was bietest', 4], ['was kannst du', 3], ['was macht ihr', 4], ['angebot', 1], ['service', 2], ['womit', 2], ['helfen', 1]],
    answer: () => ({ text: `${esc(C.brand)} macht:<ul><li><b>Werbespots</b> für TikTok, Reels, Shorts &amp; Ads (${pp('Social Spot')})</li><li><b>Webseiten</b> – klassisch oder mit 3D (${pp('Onepager')})</li><li><b>Chatbots</b> für deine Website (${pp('FAQ-Chatbot')})</li><li><b>Online-Shops</b> mit Karte, PayPal & Apple Pay (${pp('Online-Shop')})</li><li><b>Betreuung</b>: Hosting, Updates, Content (${pp('Basic')})</li></ul>Alles aus einer Hand – zu Preisen, die auch für kleine Betriebe passen.`, actions: [L('Leistungen ansehen', 'leistungen.html'), L('Preise', 'preise.html')], chips: ['Was kostet eine Website?', 'Was kann ein Chatbot?', 'Wie läuft ein Projekt ab?'] }) },
  { id: 'spots', keys: [['werbespot', 3], ['spot', 2], ['video', 2], ['reel', 2], ['tiktok', 2], ['shorts', 2], ['werbung', 2], ['ads', 2], ['clip', 2], ['animation', 2], ['motion', 2], ['werbefilm', 3]],
    answer: () => ({ text: `<b>Werbespots</b> sind kurze, scharfe Clips (10–20 s) für TikTok, Reels, Shorts und Ads – im Studio-Look aus deinen Produktfotos, mit Kamerafahrt, Licht und eigenem Sound.${groupList('spots')}Fertig meist in 3–5 Werktagen, zwei Korrekturrunden inklusive.`, actions: [L('Spots ansehen', 'arbeiten.html#spots'), L('Spot anfragen', 'kontakt.html?leistung=Werbespot#anfrage')], chips: ['Brauche ich professionelle Fotos?', 'Welche Formate?', 'Reel-Abo erklärt'] }) },
  { id: 'web', keys: [['website', 3], ['webseite', 3], ['homepage', 3], ['internetseite', 3], ['landingpage', 3], ['onepager', 3], ['3d', 2], ['webdesign', 3], ['online praesenz', 3]],
    answer: () => ({ text: `<b>Webseiten</b> baut ${esc(first)} individuell statt mit Baukasten – klassisch für Betriebe oder mit 3D-Effekt für Marken, immer schnell und mobil optimiert.${groupList('web')}Inklusive Kontaktformular, SEO-Basics und Hosting-Setup. Dauer: Onepager ca. 1 Woche, Website 1–2 Wochen, 3D-Website 2–4 Wochen.`, actions: [L('Webseiten ansehen', 'arbeiten.html#web'), L('Website anfragen', 'kontakt.html?leistung=Website#anfrage')], chips: ['Muss es 3D sein?', 'Kann ich Inhalte selbst ändern?', 'Chatbot dazu?'] }) },
  { id: 'chatbot', keys: [['chatbot fuer', 6], ['chatbot', 4], ['chat bot', 4], ['bot fuer meine', 6], ['bot auf meiner', 6], ['kundenservice', 3], ['assistent', 3], ['live chat', 3], ['was kann ein chatbot', 7], ['chatbot bauen', 7], ['chatbots', 5]],
    answer: () => ({ text: `<b>Chatbots</b> für deine Website – so einer wie ich! 😉 Er beantwortet Fragen zu Leistungen, Preisen, Öffnungszeiten oder Terminen rund um die Uhr und führt Besucher zur Anfrage.${groupList('chatbots')}Der FAQ-Chatbot läuft ohne laufende Kosten und datenschutzfreundlich im Browser. Der KI-Chatbot formuliert frei – dafür fallen kleine KI-Kosten je nach Nutzung an.`, actions: [L('Mehr zu Chatbots', 'leistungen.html#chatbots'), L('Chatbot anfragen', 'kontakt.html?leistung=Chatbot#anfrage')], chips: ['Unterschied FAQ- und KI-Chatbot?', 'Ist das datenschutzkonform?', 'Was kostet eine Website?'] }) },
  { id: 'need3d', keys: [['muss es 3d', 7], ['braucht man 3d', 7], ['ohne 3d', 6], ['nicht 3d', 6], ['normale website', 5], ['einfache website', 5], ['klassische', 4]],
    answer: () => ({ text: `Nein, es muss kein 3D sein. Die meisten Betriebe brauchen eine <b>klassische, schnelle Website</b>, die gefunden wird und Anfragen bringt – Onepager ${pp('Onepager')}, Website mit bis zu 5 Seiten ${pp('Website')}. 3D (${pp('3D-Website')}) ist das Extra für Marken, die besonders auffallen wollen.`, actions: [L('Webseiten-Preise', 'preise.html#web')] }) },
  { id: 'shop', keys: [['shop', 3], ['verkaufen', 2], ['zahlung', 2], ['stripe', 3], ['shopify', 3], ['paypal', 3], ['apple pay', 3], ['klarna', 3], ['warenkorb', 3], ['checkout', 3]],
    answer: () => ({ text: `<b>Online-Shops</b> ${pp('Online-Shop')} – mit sicherer Zahlung per Karte, PayPal, Apple Pay oder Klarna über <b>Stripe</b> oder <b>Shopify</b>. Kartendaten liegen beim Zahlungsanbieter, nicht bei dir. Rechtstexte (AGB, Widerruf) kommen von einem spezialisierten Anbieter und werden sauber eingebunden. Dauer: 3–5 Wochen.`, actions: [L('Mehr zu Shops', 'leistungen.html#shop'), L('Shop anfragen', 'kontakt.html?leistung=Online-Shop#anfrage')] }) },
  { id: 'betreuung', keys: [['betreuung', 3], ['wartung', 3], ['hosting', 3], ['update', 2], ['domain', 3], ['backup', 3], ['pflege', 2], ['nach dem launch', 3]],
    answer: () => ({ text: `<b>Betreuung</b> – damit deine Seite schnell, sicher und aktuell bleibt:<ul>${PR.betreuung.items.map(i => `<li>${esc(i.name)}: <b>${euro(i.price)} ${esc(i.unit)}</b> – ${esc(i.text)}</li>`).join('')}</ul>Monatlich kündbar.`, actions: [L('Betreuungspakete', 'preise.html#betreuung')] }) },
  { id: 'abo', keys: [['reel abo', 4], ['abo', 2], ['monatlich content', 3], ['regelmaessig', 2]],
    answer: () => productAnswer(PRODUCTS.find(p => p.name === 'Reel-Abo')) },
  { id: 'packages', keys: [['paket', 3], ['pakete', 4], ['bundle', 3], ['kombi', 3], ['website und spot', 4], ['beides', 2]],
    answer: () => ({ text: `<b>Pakete</b> – Website und Spots aus einem Guss:<ul>${PR.pakete.items.map(i => `<li>${esc(i.name)}: <b>${euro(i.price)}</b> – ${esc(i.text)}</li>`).join('')}</ul>`, actions: [L('Pakete ansehen', 'preise.html#pakete')] }) },
  { id: 'price', keys: [['preis', 3], ['kosten', 3], ['kostet', 3], ['teuer', 3], ['guenstig', 3], ['budget', 2], ['euro', 2], ['€', 2], ['was zahle', 3], ['wie viel', 2], ['wieviel', 2], ['angebot', 1]],
    answer: () => ({ text: `Die wichtigsten <b>Startpreise</b>:<ul>${['Social Spot', 'Produkt-Spot', 'Reel-Abo', 'Onepager', 'Website', '3D-Website', 'Online-Shop', 'FAQ-Chatbot', 'KI-Chatbot', 'Basic'].map(n => `<li>${n === 'Basic' ? 'Betreuung' : esc(n)}: <b>${pp(n)}</b></li>`).join('')}</ul>Pakete gibt's ${pp('Starter')}. Mit dem Preisrechner bekommst du eine grobe Spanne für dein Projekt; das feste Angebot gibt's nach dem Erstgespräch – ohne versteckte Kosten.`, actions: [L('Alle Preise', 'preise.html'), L('Preisrechner', 'preise.html#rechner')], chips: ['Was ist im Katalog?', 'Pakete', 'Gibt es Rabatt?'] }) },
  { id: 'calc', keys: [['rechner', 4], ['preisrechner', 6], ['schaetzung', 3], ['kalkul', 3], ['ausrechnen', 3], ['grob', 2]],
    answer: () => guide('So nutzt du den Preisrechner:', ['Öffne <b>Preise → Preisrechner</b>.', 'Wähle aus, was du brauchst (z. B. Werbespots, Website oder Chatbot).', 'Lege Anzahl, Extras und Zeitrahmen fest – die Spanne aktualisiert sich sofort.', 'Mit „Mit dieser Auswahl anfragen“ landet alles automatisch im Anfrageformular.'], [L('Zum Preisrechner', 'preise.html#rechner')]) },
  { id: 'catalog', keys: [['katalog', 4], ['extra', 3], ['zusatz', 3], ['dazu buchen', 3], ['plus button', 3], ['zur anfrage', 3], ['auswahl', 2]],
    answer: () => ({ text: `Im <b>Katalog</b> kannst du Extras dazunehmen – zum Beispiel ${CATS.slice(0, 6).map(c => `${esc(c.name)} (${esc(c.price)})`).join(', ')} und mehr.<br><br><b>So geht's:</b> Bei jedem Punkt auf <b>+ Zur Anfrage</b> tippen. Unten erscheint eine Leiste mit deiner Auswahl – ein Tipp darauf, und alles steht schon im Anfrageformular.`, actions: [L('Katalog öffnen', 'preise.html')] }) },
  { id: 'contact', keys: [['kontakt', 3], ['erreich', 4], ['email', 3], ['e mail', 3], ['mail', 2], ['telefon', 3], ['nummer', 3], ['anrufen', 3], ['whatsapp', 3], ['instagram', 2], ['schreiben', 1], ['melden', 1]],
    answer: () => ({ text: `So erreichst du ${esc(first)}:<br>${contactLine()}<br><br>Antwort innerhalb von ${esc(C.responseTime || '24 Stunden')} an Werktagen.`, actions: contactActions() }) },
  { id: 'request', keys: [['anfrage', 3], ['anfragen', 3], ['beauftragen', 3], ['loslegen', 3], ['starten', 2], ['auftrag', 3], ['buchen', 1], ['angebot bekommen', 4], ['zusammenarbeit', 2], ['projekt starten', 4]],
    answer: () => guide('So stellst du eine Anfrage (dauert ca. 2 Minuten):', ['Öffne <b>Kontakt → Projekt anfragen</b>.', '<b>Schritt 1:</b> Wähle, was du brauchst (Spot, Website, Shop …) und deine Branche.', '<b>Schritt 2:</b> Budget, Zeitraum und ein paar Sätze zu deinem Projekt.', '<b>Schritt 3:</b> Name, E-Mail und Zustimmung zum Datenschutz – absenden.', `${esc(first)} meldet sich innerhalb von ${esc(C.responseTime || '24 Stunden')} – mit Fragen oder Terminvorschlägen.`], [L('Jetzt anfragen', 'kontakt.html#anfrage'), L('Lieber Termin buchen', 'kontakt.html#termin')]) },
  { id: 'termin', keys: [['termin', 4], ['erstgespraech', 4], ['gespraech', 3], ['call', 3], ['meeting', 3], ['beratung', 3], ['kennenlernen', 3], ['telefonat', 3], ['zoom', 3], ['videocall', 3]],
    answer: () => C.calLink
      ? guide('Kostenloses Erstgespräch buchen:', ['Öffne <b>Kontakt → Termin buchen</b>.', 'Tippe auf „Kalender laden“.', 'Wähle Tag und Uhrzeit (15–30 Min., per Video oder Telefon).', 'Name und E-Mail eintragen – du bekommst sofort eine Bestätigung.'], [L('Termin buchen', 'kontakt.html#termin')])
      : { text: `Das <b>Erstgespräch</b> ist kostenlos und unverbindlich (15–30 Minuten, per Video oder Telefon). Die Online-Buchung ist gleich startklar – bis dahin schick einfach eine kurze Anfrage, ${esc(first)} meldet sich mit Terminvorschlägen.`, actions: [L('Anfrage senden', 'kontakt.html#anfrage')] } },
  { id: 'check', keys: [['gratis', 4], ['kostenlos', 3], ['check', 4], ['feedback', 2], ['analyse', 3], ['bewertung meines', 3], ['einschaetzung', 2], ['umsonst', 3]],
    answer: () => guide('Der Gratis-Check – kostenlos & unverbindlich:', ['Öffne <b>Gratis-Check</b>.', 'Wähle, was geprüft werden soll: Instagram, TikTok und/oder Website.', 'Link, Name und E-Mail eintragen und absenden.', `Innerhalb von 48 Stunden bekommst du ein kurzes Video mit <b>drei konkreten Verbesserungen</b>.`], [L('Gratis-Check starten', 'check.html')]) },
  { id: 'work', keys: [['arbeiten', 3], ['projekte', 3], ['referenz', 3], ['portfolio', 3], ['beispiel', 3], ['was hast du gemacht', 4], ['kunden', 2], ['zeig mir', 2], ['showreel', 3]],
    answer: t => { const b = findBranche(t); if (b) return brancheAnswer(b);
      return { text: `Im Portfolio sind ${P.length} Arbeiten aus ${new Set(P.map(p => p.branche)).size} Branchen:<ul>${P.map(p => `<li><b>${esc(p.title)}</b> – ${esc(p.sub)}</li>`).join('')}</ul>Auf der Seite <b>Arbeiten</b> kannst du nach Branche filtern.`, actions: [L('Alle Arbeiten', 'arbeiten.html'), L('Nur Werbespots', 'arbeiten.html#spots'), L('Nur Webseiten', 'arbeiten.html#web')], chips: B.slice(0, 4).map(b => 'Arbeiten für ' + b.name) }; } },
  { id: 'spec', keys: [['fuer bmw', 4], ['fuer ferrari', 4], ['fuer porsche', 4], ['fuer apple', 4], ['echte kunden', 4], ['offiziell', 3], ['beauftragt', 3], ['gearbeitet fuer', 4], ['spec', 3], ['fake', 3], ['echt', 1]],
    answer: () => ({ text: `Ehrliche Antwort: Die gezeigten Marken-Spots (BMW, Ferrari, Porsche, iPhone) und Konzeptseiten sind <b>unbeauftragte Spec-Arbeiten</b> – sie zeigen, was möglich ist, ohne Verbindung zu den Marken. Die Fotos sind echt und frei lizenziert (siehe Bildnachweise). Die ersten Kundenprojekte erscheinen bald im Portfolio.`, actions: [L('Bildnachweise', 'bildnachweise.html')] }) },
  { id: 'aiq', keys: [['ki generiert', 4], ['mit ki', 3], ['kuenstliche intelligenz', 3], ['ai ', 2]],
    answer: () => ({ text: `Die Spots entstehen aus <b>echten Produktfotos</b>, die freigestellt, retuschiert und in einem virtuellen Studio inszeniert werden – keine erfundenen Fantasie-Produkte. Moderne Werkzeuge helfen beim Freistellen und Rendern, die Gestaltung macht ${esc(first)} selbst.` }) },
  { id: 'process', keys: [['ablauf', 4], ['wie laeuft', 4], ['schritte', 3], ['prozess', 3], ['vorgehen', 3], ['wie geht', 2], ['wie funktioniert', 2], ['wie arbeitest', 4]],
    answer: () => guide('So läuft ein Projekt:', ['<b>Anfrage oder Termin</b> – Antwort in 24 Stunden.', '<b>Kostenloses Erstgespräch</b> (15–30 Min.): Ziel, Zielgruppe, Budget, Zeitplan.', '<b>Festes Angebot</b> – schriftlich, mit Umfang und Termin. 50 % Anzahlung.', '<b>Konzept & Umsetzung</b> – Look zuerst, dann Animation, Code, Sound; Zwischenstände zum Klicken.', '<b>Launch</b> – Abnahme, Übergabe aller Dateien, Einweisung. Auf Wunsch Betreuung.'], [L('Ablauf im Detail', 'leistungen.html#ablauf'), L('Projekt starten', 'kontakt.html#anfrage')]) },
  { id: 'duration', keys: [['wie lange', 4], ['dauer', 3], ['dauert', 3], ['wann fertig', 4], ['zeitraum', 2], ['lieferzeit', 3], ['bis wann', 3], ['deadline', 3]],
    answer: () => ({ text: `Typische Dauer:<ul><li>Werbespot: <b>3–5 Werktage</b> (Express in 48 h, ${cp('Express in 48 Stunden')})</li><li>Onepager: <b>ca. 1 Woche</b></li><li>Website: <b>1–2 Wochen</b></li><li>3D-Website: <b>2–4 Wochen</b></li><li>Chatbot: <b>3–7 Werktage</b></li><li>Online-Shop: <b>3–5 Wochen</b></li></ul>Den genauen Termin bekommst du mit dem Angebot.`, actions: [L('Anfrage mit Wunschtermin', 'kontakt.html#anfrage')] }) },
  { id: 'payment', keys: [['bezahl', 5], ['zahlen', 3], ['anzahlung', 4], ['rechnung', 3], ['raten', 3], ['ueberweisung', 3], ['vorkasse', 3], ['mwst', 3], ['umsatzsteuer', 3], ['steuer', 2]],
    answer: () => ({ text: `<b>Bezahlung:</b> 50 % bei Auftrag, 50 % bei Abnahme – per Rechnung und Überweisung. Abos und Betreuung monatlich im Voraus.<br>${esc(C.vatNote || '')}`, actions: [L('Preise', 'preise.html')] }) },
  { id: 'expensive', keys: [['zu teuer', 8], ['ziemlich teuer', 7], ['so teuer', 7], ['warum kostet', 6], ['geht das billiger', 8], ['billiger', 4], ['kleines budget', 7], ['wenig budget', 7], ['wenig geld', 6]],
    answer: () => ({ text: `Verständlich – deshalb sind die Preise transparent. Sie orientieren sich an <b>marktüblichen Freelancer-Preisen</b> in Deutschland; Agenturen liegen für Vergleichbares oft beim Doppelten. Bei kleinem Budget gibt's Wege: mit einem <b>Onepager</b> oder <b>einzelnen Spot</b> starten und später ausbauen, oder ein <b>Paket</b> nehmen, das günstiger ist als die Einzelteile. Die ersten Kunden bekommen außerdem Startkonditionen.`, actions: [L('Pakete ansehen', 'preise.html#pakete'), L('Budget besprechen', 'kontakt.html#termin')] }) },
  { id: 'discount', keys: [['rabatt', 4], ['gutschein', 4], ['nachlass', 4], ['studenten', 3], ['startkondition', 4], ['sonderpreis', 4], ['guenstiger', 3], ['verhandeln', 3]],
    answer: () => ({ text: `Die ersten Kunden bekommen <b>Startkonditionen</b> – sprich es im Erstgespräch einfach an. Bei mehreren Spots (z. B. Kampagne oder Reel-Abo) wird es pro Spot automatisch günstiger.`, actions: [L('Erstgespräch', 'kontakt.html#termin')] }) },
  { id: 'rights', keys: [['rechte', 4], ['nutzungsrecht', 4], ['gehoert', 3], ['eigentum', 3], ['urheber', 3], ['lizenz', 2], ['darf ich', 2]],
    answer: () => ({ text: `Nach vollständiger Bezahlung darfst du Spots und Website <b>zeitlich unbegrenzt für deine Marke</b> nutzen. Musik und Bilder sind lizenziert oder selbst erstellt – du bekommst alle Dateien.` }) },
  { id: 'material', keys: [['was brauchst du', 5], ['material', 3], ['unterlagen', 3], ['fotos', 2], ['vorbereiten', 3], ['mitbringen', 3]],
    answer: () => ({ text: `Ideal sind: <b>Logo</b>, <b>Produktfotos</b> (falls vorhanden – Handyfotos reichen oft), deine <b>wichtigste Botschaft</b> und ein, zwei <b>Beispiele</b>, die dir gefallen. Den Rest erarbeitet ihr zusammen.` }) },
  { id: 'photos', keys: [['professionelle fotos', 5], ['fotograf', 3], ['keine fotos', 4], ['handyfoto', 4], ['produktfoto', 3]],
    answer: () => ({ text: `Professionelle Fotos sind <b>nicht nötig</b>. Vorhandene Produktfotos werden freigestellt, retuschiert und im Studio-Look inszeniert. Bei Bedarf kommt ein Fotograf aus dem Netzwerk dazu.` }) },
  { id: 'formats', keys: [['format', 3], ['hochformat', 4], ['querformat', 4], ['9:16', 4], ['16:9', 4], ['1:1', 4], ['youtube', 2], ['instagram format', 4]],
    answer: () => ({ text: `Standard ist <b>9:16</b> (TikTok, Reels, Shorts). Zusätzliche Formate wie <b>16:9, 1:1 oder 4:5</b> gibt es für ${cp('Zusätzliches Format')} je Format.` }) },
  { id: 'revisions', keys: [['korrektur', 4], ['aenderung', 3], ['aendern', 2], ['feedback runde', 4], ['nicht gefaellt', 4], ['ueberarbeitung', 3]],
    answer: () => ({ text: `<b>Zwei Korrekturrunden</b> sind immer inklusive. Kleine Textänderungen danach meist einfach so; weitere Runden ${cp('Zusätzliche Korrekturrunde')}. Bei Webseiten kannst du Inhalte auf Wunsch selbst pflegen oder Änderungen im Betreuungspaket machen lassen.` }) },
  { id: 'privacy', keys: [['datenschutzkonform', 7], ['dsgvo konform', 7], ['sicher meine daten', 6], ['daten sicher', 5], ['was passiert mit meinen daten', 7]],
    answer: () => ({ text: `Ja. Diese Website setzt keine Cookies und kein Tracking. Ich als Chat laufe komplett in deinem Browser – deine Fragen werden nirgendwohin gesendet. Formulare gehen verschlüsselt per E-Mail an ${esc(first)}. Bei KI-Chatbots für Kunden gibt es einen Datenschutz-Hinweis und einen Anbieter mit Auftragsverarbeitungsvertrag.`, actions: [L('Datenschutz', 'datenschutz.html')] }) },
  { id: 'legal', keys: [['impressum', 4], ['datenschutz', 4], ['agb', 4], ['rechtstext', 4], ['abmahnung', 3], ['dsgvo', 4], ['cookie', 3]],
    answer: t => ({ text: has(t, 'cookie') ? `Diese Website setzt <b>keine Cookies</b> und nutzt kein Tracking.` : `Rechtstexte für Kunden-Webseiten schreibt ${esc(first)} nicht selbst, bindet aber Texte von Anbietern wie eRecht24 oder IT-Recht-Kanzlei sauber ein (${cp('Rechtstexte einbinden')}). Die Texte dieser Seite findest du unten im Footer.`, actions: [L('Impressum', 'impressum.html'), L('Datenschutz', 'datenschutz.html'), L('AGB', 'agb.html')] }) },
  { id: 'career', keys: [['job', 4], ['karriere', 4], ['bewerb', 4], ['stelle', 3], ['praktikum', 4], ['nebenjob', 4], ['werkstudent', 4], ['freelancer', 3], ['mitarbeiten', 4], ['mitmachen', 3], ['arbeiten bei', 4], ['bei dir arbeiten', 8], ['bei euch arbeiten', 8], ['fuer dich arbeiten', 8], ['team verstaerken', 6], ['suchst du', 4]],
    answer: () => JOBS.length
      ? { text: `Aktuell ausgeschrieben:<ul>${JOBS.map(j => `<li><b>${esc(j.title)}</b> – ${esc(j.type)}</li>`).join('')}</ul>`, actions: [L('Zu den Stellen', 'karriere.html')] }
      : guide('Gerade ist keine Stelle ausgeschrieben – aber du kannst dich initiativ bewerben:', ['Öffne <b>Karriere</b> und scrolle zur Initiativbewerbung.', 'Wähle deinen Bereich (Motion, 3D, Web, Content, Vertrieb) und die Art (Freelance, Nebenjob, Praktikum).', 'Ein paar Sätze zu dir + Link zu Arbeitsproben.', 'Absenden – Antwort innerhalb einer Woche.'], [L('Jetzt bewerben', 'karriere.html#bewerbung')]) },
  { id: 'edit', keys: [['selbst aendern', 5], ['selbst pflegen', 5], ['cms', 4], ['inhalte aendern', 4], ['wordpress', 3]],
    answer: () => ({ text: `Ja – auf Wunsch baut ${esc(first)} ein einfaches Pflegesystem ein, damit du Texte und Bilder selbst änderst. Oder du lässt Änderungen im Betreuungspaket „Plus“ (${pp('Plus')}, 1 Stunde Änderungen inklusive) machen.` }) },
  { id: 'tech', keys: [['technik', 3], ['software', 3], ['programm', 2], ['three', 3], ['webgl', 4], ['after effects', 3], ['womit arbeitest', 4], ['tools', 3]],
    answer: () => ({ text: `Webseiten entstehen mit sauberem HTML, CSS und JavaScript – 3D mit <b>Three.js / WebGL</b>. Shops über <b>Stripe</b> oder <b>Shopify</b>, Chatbots als schlanker Browser-Assistent oder mit KI-Anbindung. Spots werden aus echten Fotos freigestellt, in einem virtuellen Studio inszeniert und mit eigenem Sound gemischt.` }) },
  { id: 'still', keys: [['bewegung', 3], ['animation aus', 4], ['anhalten', 3], ['zu viel bewegung', 4], ['ruhig', 2]],
    answer: () => ({ text: `Ganz unten im Footer gibt es den Schalter <b>„Bewegung anhalten“</b> – damit stoppen alle Animationen und Videos. Er bleibt auch auf den anderen Seiten aktiv.` }) },
  { id: 'other', keys: [['logo', 4], ['branding', 4], ['corporate design', 4], ['flyer', 4], ['visitenkarte', 4], ['druck', 3], ['plakat', 4], ['fotoshooting', 4], ['fotografie', 4], ['social media betreuung', 5], ['posten', 3], ['ads schalten', 5], ['anzeigen schalten', 5], ['marketing', 3], ['app entwickl', 5], ['podcast', 4]],
    answer: () => ({ text: `Der Schwerpunkt liegt auf <b>Werbespots, Webseiten, Shops und Betreuung</b>. Vieles drumherum geht trotzdem: einfache Logo-Überarbeitungen, Social-Media-Grafiken oder Texte nach Absprache – Fotografie, Druck oder Ads-Betreuung über Partner aus dem Netzwerk. Beschreib kurz, was du brauchst, dann sagt ${esc(first)} ehrlich, ob es passt.`, actions: [L('Anfrage stellen', 'kontakt.html#anfrage')] }) },
  { id: 'menu', keys: [['menue', 4], ['navigation', 3], ['reiter', 3], ['handy menue', 4]],
    answer: () => ({ text: `Auf dem Handy öffnest du das Menü oben rechts (☰). Bereiche mit „+“ klappen auf und zeigen Unterseiten, z. B. Arbeiten nach Branche. Am Computer öffnen sich die Menüs beim Drüberfahren.`, chips: ['Wo finde ich die Preise?', 'Wo buche ich einen Termin?'] }) },
];

/* FAQ fallback matcher */
const STOP = new Set('ich du er sie es wir ihr der die das ein eine einen und oder aber auch mit fuer von zu im in am an auf ist sind bin hast hat habe kann koennen wie was wo wann warum wer mein meine dein deine mir dir mich dich nicht noch schon gibt es man den dem des bei als so ja nein bitte mal'.split(' '));
const toks = t => t.trim().split(' ').filter(w => w.length > 2 && !STOP.has(w));
const faqMatch = t => {
  const q = toks(t); if (!q.length) return null;
  let best = null, bs = 0;
  FAQ.forEach(f => { const ft = toks(norm(f.q + ' ' + f.a)); const s = q.filter(w => ft.some(x => x.startsWith(w.slice(0, 5)))).length / q.length; if (s > bs) { bs = s; best = f; } });
  return bs >= 0.5 ? best : null;
};

const reply = raw => {
  const t = norm(raw);
  // direct entity hits first
  const pj = findProject(t);
  if (pj && !/(fuer|gearbeitet|offiziell|echt)/.test(t)) return projectAnswer(pj);
  const pr = findProduct(t), cat = findCat(t);
  const priceQ = /(preis|kost|teuer|euro|€|wie viel|wieviel|guenstig)/.test(t);
  if (cat && (priceQ || toks(t).length <= 3)) return { text: `<b>${esc(cat.name)}</b> (${esc(cat.group)}): <b>${esc(cat.price)}</b><br>${esc(cat.text)}<br><small><b>Warum das wichtig ist:</b> ${esc(cat.why)}</small>`, actions: [L('Zum Katalog', 'preise.html')] };
  if (pr && priceQ) return productAnswer(pr);
  const br = findBranche(t);
  if (br && /(arbeit|projekt|beispiel|referenz|portfolio|zeig|habt|hast|fuer|branche|gibt)/.test(t)) return brancheAnswer(br);
  // scored intents
  const ranked = INTENTS.map(it => ({ it, s: it.keys.reduce((n, [k, w]) => n + (has(t, k) ? w : 0), 0) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  for (const { it, s } of ranked) { if (s < 2) break; const a = it.answer(t); if (a) return a; }
  const best = ranked[0] && ranked[0].it, score = ranked[0] ? ranked[0].s : 0;
  if (pr) return productAnswer(pr);
  if (cat) return { text: `<b>${esc(cat.name)}</b>: ${esc(cat.price)} – ${esc(cat.text)}`, actions: [L('Zum Katalog', 'preise.html')] };
  if (br) return brancheAnswer(br);
  const f = faqMatch(t);
  if (f) return { text: `<b>${esc(f.q)}</b><br>${esc(f.a)}`, actions: [L('Alle FAQ', 'faq.html')] };
  if (best && score >= 1) { const a = best.answer(t); if (a) return a; }
  return { text: `Da bin ich mir nicht sicher – das beantwortet ${esc(first)} am besten persönlich. Soll ich deine Frage direkt ins Anfrageformular übernehmen?`,
    actions: [L('Frage an ' + first + ' senden', 'kontakt.html?frage=' + encodeURIComponent(raw) + '#anfrage')], chips: ['Was kostet eine Website?', 'Wie läuft ein Projekt ab?', 'Arbeiten ansehen', 'Kontakt'] };
};

/* ───────── UI ───────── */
const store = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
const root = document.createElement('div');
root.className = 'bot';
root.innerHTML = `
  <button class="bot-fab" aria-label="Chat öffnen" aria-expanded="false" aria-controls="bot-panel">
    <svg class="i-open" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4.5 21l3.9-2c1.1.3 2.3.5 3.6.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3Zm-4 9.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"/></svg>
    <svg class="i-close" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg>
    <span class="bot-dot" aria-hidden="true"></span>
  </button>
  <section class="bot-panel" id="bot-panel" role="dialog" aria-label="Chat mit dem ${esc(C.brand)}-Assistenten" hidden>
    <header class="bot-head">
      <span class="bot-ava" aria-hidden="true"><img src="brand/fluxe-mark.svg" alt="" width="30" height="30"></span>
      <span><b>${esc(C.brand)} Assistent</b><small><i></i>Antwortet sofort · automatisch</small></span>
      <button class="bot-reset" aria-label="Chat neu starten" title="Neu starten">↺</button>
      <button class="bot-x" aria-label="Chat schließen">✕</button>
    </header>
    <div class="bot-log" role="log" aria-live="polite"></div>
    <div class="bot-chips"></div>
    <form class="bot-input"><input type="text" placeholder="Frag mich etwas …" aria-label="Nachricht" maxlength="300" autocomplete="off"><button type="submit" aria-label="Senden">↑</button></form>
    <p class="bot-foot">Automatischer Assistent – für Persönliches antwortet ${esc(first)} in ${esc(C.responseTime || '24 Stunden')}.</p>
  </section>`;
document.body.appendChild(root);
const fab = root.querySelector('.bot-fab'), panel = root.querySelector('.bot-panel'), log = root.querySelector('.bot-log'), chipsEl = root.querySelector('.bot-chips'), form = root.querySelector('.bot-input'), input = form.querySelector('input');
let history = []; try { history = JSON.parse(store.get('fluxe-chat') || '[]'); } catch { history = []; }
const save = () => store.set('fluxe-chat', JSON.stringify(history.slice(-40)));

const bubble = (who, html, actions) => {
  const d = document.createElement('div'); d.className = 'msg ' + who;
  d.innerHTML = `<div class="b">${html}</div>${actions && actions.length ? `<div class="acts">${actions.map(a => `<a href="${esc(a.href)}">${esc(a.label)} →</a>`).join('')}</div>` : ''}`;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
};
const setChips = list => { chipsEl.innerHTML = (list || []).map(c => `<button type="button">${esc(c)}</button>`).join(''); requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); };
const START_CHIPS = ['Was kostet eine Website?', 'Was kostet ein Werbespot?', 'Chatbot für meine Website', 'Arbeiten ansehen', 'Termin buchen', 'Gratis-Check'];
const greet = () => {
  const h = new Date().getHours(), g = h < 11 ? 'Guten Morgen' : h < 18 ? 'Hi' : 'Guten Abend';
  const msg = { who: 'bot', html: `${g}! 👋 Ich bin der Assistent von <b>${esc(C.brand)}</b>. Ich kenne alle Leistungen, Preise, Projekte und den Ablauf – frag mich einfach oder tippe unten auf ein Thema. Ich bringe dich auch direkt an die richtige Stelle.` };
  history.push(msg); bubble('bot', msg.html); setChips(START_CHIPS); save();
};
const restore = () => { log.innerHTML = ''; history.forEach(m => bubble(m.who, m.html, m.actions)); setChips(history.length ? (history[history.length - 1].chips || START_CHIPS.slice(0, 4)) : START_CHIPS); };

const ask = text => {
  text = text.trim(); if (!text) return;
  const u = { who: 'me', html: esc(text) }; history.push(u); bubble('me', u.html);
  setChips([]);
  const typing = document.createElement('div'); typing.className = 'msg bot typing'; typing.innerHTML = '<div class="b"><i></i><i></i><i></i></div>';
  log.appendChild(typing); log.scrollTop = log.scrollHeight;
  const r = reply(text);
  setTimeout(() => {
    typing.remove();
    const m = { who: 'bot', html: r.text, actions: r.actions, chips: r.chips };
    history.push(m); bubble('bot', m.html, m.actions); setChips(r.chips || ['Preise', 'Arbeiten ansehen', 'Projekt anfragen']); save();
  }, Math.min(900, 380 + r.text.length * 1.2));
};
const open = o => {
  panel.hidden = !o; root.classList.toggle('open', o); fab.setAttribute('aria-expanded', o); fab.setAttribute('aria-label', o ? 'Chat schließen' : 'Chat öffnen');
  store.set('fluxe-chat-open', o ? '1' : '0');
  if (o) { if (!history.length) greet(); else if (!log.children.length) restore(); log.scrollTop = log.scrollHeight; if (matchMedia('(pointer: fine)').matches) input.focus(); root.querySelector('.bot-dot').hidden = true; }
  document.documentElement.classList.toggle('bot-lock', o && innerWidth < 600);
};
fab.addEventListener('click', () => open(panel.hidden));
root.querySelector('.bot-x').addEventListener('click', () => open(false));
root.querySelector('.bot-reset').addEventListener('click', () => { history = []; save(); log.innerHTML = ''; greet(); });
form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
chipsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
log.addEventListener('click', e => {
  const a = e.target.closest('.acts a'); if (!a) return;
  const href = a.getAttribute('href');
  // project deep link: arbeiten.html#branche|projectId → open filter and project
  if (href.includes('|')) { e.preventDefault(); const [pg, rest] = href.split('#'); const [br, id] = rest.split('|');
    store.set('fluxe-open-project', id); location.href = pg + '#' + br; if (location.pathname.endsWith(pg)) location.reload(); }
  if (innerWidth < 600) open(false);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });
if (history.length) restore();
if (store.get('fluxe-chat-open') === '1' && innerWidth >= 600) open(true);
if (!history.length) setTimeout(() => { if (panel.hidden) root.querySelector('.bot-dot').hidden = false; }, 4000); else root.querySelector('.bot-dot').hidden = true;
// open a project requested from the chat
const pid = store.get('fluxe-open-project');
if (pid) { store.set('fluxe-open-project', ''); setTimeout(() => { const c = document.querySelector(`[data-project="${pid}"]`); if (c) c.click(); }, 500); }
window.FLUXEBOT = { ask, open, reply };
})();
