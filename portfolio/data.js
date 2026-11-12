/* Inhalte der Seite: Branchen, Projekte, Preise, Stellen, Team, FAQ.
   Neue Projekte einfach unten in PROJECTS ergänzen – der Branchenfilter
   zeigt leere Branchen automatisch als "Demnächst verfügbar". */

window.BRANCHEN = [
  { id: 'automotive', name: 'Automotive', icon: '◐', color: '#1c69d4' },
  { id: 'tech', name: 'Tech & Elektronik', icon: '◇', color: '#ff8a3d' },
  { id: 'food', name: 'Food & Getränke', icon: '◉', color: '#d4ff3a' },
  { id: 'lifestyle', name: 'Lifestyle & Konsumgüter', icon: '✦', color: '#4aa8ff' },
  { id: 'gesundheit', name: 'Gesundheit & Praxen', icon: '✚', color: '#3ecfa0' },
  { id: 'immobilien', name: 'Immobilien', icon: '▲', color: '#c9a76b' },
  { id: 'gastro', name: 'Gastronomie & Nightlife', icon: '☾', color: '#ff2d55' },
  { id: 'mode', name: 'Mode & Beauty', icon: '❖', color: '#e8a0c8' },
  { id: 'sport', name: 'Sport & Fitness', icon: '◆', color: '#ffb800' },
  { id: 'handwerk', name: 'Handwerk & Lokales', icon: '■', color: '#9aa0a6' },
];

window.PROJECTS = [
  { id: 'vestier', kind: 'web', branche: 'immobilien', title: 'VÉSTIER', sub: 'Private Estates · Luxus-Immobilien', color: '#b89b6a', featured: true,
    live: 'projekte/vestier/', images: ['img/vestier-1.webp', 'img/vestier-2.webp', 'img/vestier-3.webp'], mobile: 'img/vestier-mobile.webp',
    text: 'Edle Makler-Website im Apple-Stil: Hero mit Parallax, Objekt des Monats mit Scroll-Zoom, filterbarer Bestand mit Exposé-Ansicht, verschlüsseltes Off-Market-Portfolio, Team, Karriere, FAQ und Anfrageformular mit Kaufen/Verkaufen/Off-Market.',
    tags: ['Immobilien', 'Scroll-Animation', 'Objektfilter', 'Exposé-Ansicht'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'beschte', kind: 'web', branche: 'handwerk', title: 'Elektrotechnik Beschte', sub: 'Elektro-Meisterbetrieb · Website & Chatbot', color: '#FFC93C', featured: true,
    live: 'projekte/beschte/', images: ['img/beschte-1.webp', 'img/beschte-2.webp', 'img/beschte-3.webp'], mobile: 'img/beschte-mobile.webp',
    text: 'Website für einen Elektro-Meisterbetrieb: 24/7-Notdienst prominent, neun Leistungsbereiche von Photovoltaik bis Wallbox, Karriere mit Stellen und 2-Minuten-Bewerbung, FAQ, Anfrageformular und Chat-Assistent „Volti“, der Anfragen Schritt für Schritt aufnimmt.',
    tags: ['Handwerk', 'Chatbot', 'Karriere & Bewerbung', 'Anfrageformular'], note: 'Kontaktdaten in dieser Vorschau durch Platzhalter ersetzt.' },
  { id: 'redbull', kind: 'web', branche: 'food', title: 'Red Bull', sub: '3D-Produktseite · Spec-Arbeit', color: '#3d6bff', featured: true,
    live: 'projekte/redbull/', images: ['img/redbull-3.webp', 'img/redbull-2.webp', 'img/redbull-1.webp'], mobile: 'img/redbull-mobile.webp',
    text: 'Eine Dose, die man anfassen will: originale Slim-Can-Form in 3D, neun Sorten von Original über Zero bis zu den sieben Editions. Die Dose dreht sich beim Scrollen, öffnet die Lasche und versprüht Tropfen – und ein 24er Tray füllt sich Dose für Dose, in jeder Sorte.',
    tags: ['Three.js', '3D-Tray', 'Markenwechsel'], note: 'Unbeauftragte Spec-Arbeit, keine Verbindung zu Red Bull. Marken und Produktabbildungen gehören der Red Bull GmbH.' },
  { id: 'katerkit', kind: 'web', branche: 'lifestyle', title: 'Kater Kit', sub: 'Online-Shop · Hangover-Kits', color: '#D7FF3D', featured: true,
    live: 'projekte/kater-kit/', images: ['img/katerkit-1.webp', 'img/katerkit-2.webp', 'img/katerkit-3.webp'], mobile: 'img/katerkit-mobile.webp',
    text: 'Frecher Shop für „den Morgen danach“: Kategorien-Filter, Warenkorb, Hochzeits-Konfigurator mit Gästeanzahl und Mengenrabatt, Produktvergleich, eigenes Logo und Markenauftritt. Produktfotos im einheitlichen Studio-Look.',
    tags: ['Online-Shop', 'Warenkorb', 'Konfigurator', 'Branding'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'aurene', kind: 'web', branche: 'mode', title: 'AURÈNE', sub: 'Maison de Parfum · Online-Shop', color: '#c8a46a', featured: true,
    live: 'projekte/aurene/', images: ['img/aurene-1.webp', 'img/aurene-2.webp', 'img/aurene-3.webp'], mobile: 'img/aurene-mobile.webp',
    text: 'Luxuriöser Parfum-Shop mit 3D-Flakon, der sich beim Scrollen dreht und die Duftnoten (Kopf, Herz, Basis) entfaltet. Farbwechsel je Duft, Duftfinder, Discovery-Set, Warenkorb und Cookie-Einwilligung.',
    tags: ['3D-Flakon', 'Online-Shop', 'Duftfinder', 'Scroll-Animation'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'bmw', kind: 'spot', branche: 'automotive', title: 'BMW M', sub: 'One Letter.', format: '9:16 · 15 s',
    video: 'video/bmw.mp4', poster: 'img/spots/bmw.webp', color: '#1c69d4', featured: true,
    text: 'Sechs M-Modelle aus vier Jahrzehnten, freigestellt aus echten Fotos und in ein virtuelles Studio gesetzt: Bodenspiegelung, Kontaktschatten, Lichtkante und langsame Kamerafahrt. Eigener Score mit Sub-Pulsen auf dem Schnitt.',
    tags: ['Studio-Look', 'Freisteller', 'Sounddesign', 'Hochformat'] },
  { id: 'schwarzstich', kind: 'web', branche: 'mode', title: 'Schwarzstich', sub: 'Tattoo-Studio · Website', color: '#e0261b', featured: true,
    live: 'projekte/schwarzstich/', images: ['img/schwarzstich-1.webp', 'img/schwarzstich-2.webp', 'img/schwarzstich-3.webp'], mobile: 'img/schwarzstich-mobile.webp',
    text: 'Düstere, kraftvolle Website für ein Tattoo-Atelier: Blackletter-Branding, laufendes Stil-Band (Fineline bis Japanese), Bereiche für Stile, Arbeiten und Team sowie ein direkter Weg zur Terminanfrage mit Ideen-Upload.',
    tags: ['Branding', 'Galerie', 'Terminanfrage', 'Mobile first'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'lumyx', kind: 'web', branche: 'gesundheit', title: 'Lumyx', sub: 'SaaS-Website · KI-Praxistelefon', color: '#3ecfa0', light: true, featured: true,
    live: '../', images: ['img/lumyx-1.webp', 'img/lumyx-2.webp', 'img/lumyx-3.webp'], mobile: 'img/lumyx-mobile.webp',
    text: 'Ruhig, klinisch sauber, vertrauenswürdig: dezentes 3D-Linienband, funktionierende Telefon-Demo mit Sprachausgabe, Praxis-Dashboard, Ersparnis-Rechner und Preis-Umschalter.',
    tags: ['Interaktive Demo', 'Preisrechner', 'B2B'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'iphone', kind: 'spot', branche: 'tech', title: 'iPhone 17 Pro', sub: 'Gemacht für Pro.', format: '9:16 · 13 s',
    video: 'video/iphone.mp4', poster: 'img/spots/iphone.webp', color: '#ff8a3d', featured: true,
    text: 'Produkt-Spot im Keynote-Look: echte Produktfotos, sauber freigestellt und als 3D-Körper mit Aluminium-Kante, Perspektive und Spiegelung inszeniert. Kamera-Makro, Farbvarianten und Endcard.',
    tags: ['Produkt-Spot', '3D-Inszenierung', 'Keynote-Look'] },
  { id: 'assistent', kind: 'bot', branche: 'tech', title: 'Website-Assistent', sub: 'FAQ-Chatbot · Live auf dieser Seite', color: '#d4ff3a', featured: true,
    live: '#chat', images: ['img/chatbot-v2-1.webp', 'img/chatbot-v2-2.webp'], mobile: 'img/chatbot-v2-mobile.webp', ring: 'img/chatbot-ring.webp',
    text: 'Der Chat unten rechts: kennt alle Leistungen, Preise, Projekte und Abläufe dieser Website, gibt Schritt-für-Schritt-Anleitungen und leitet Besucher direkt zur richtigen Seite oder ins Formular. Läuft komplett im Browser – ohne laufende Kosten. So etwas baue ich auch für deine Website.',
    tags: ['FAQ-Chatbot', 'Navigation', 'Anleitungen', 'Datenschutzfreundlich'], note: 'Eigenes Projekt – direkt hier live testen.' },
  { id: 'kryo', kind: 'web', branche: 'lifestyle', title: 'KRYO', sub: '3D-Shop · Nicotine Pouches', color: '#4aa8ff',
    live: '../kryo/', images: ['img/kryo-1.webp', 'img/kryo-2.webp', 'img/kryo-3.webp'], mobile: 'img/kryo-mobile.webp',
    text: 'Apple-Look für ein Produkt aus dem Plastikregal: Der Deckel hebt sich, 20 Pouches fliegen heraus, jede Sorte hat eigene Farbe. Dazu Stärke-Skala, Bundles, Warenkorb und Altersabfrage.',
    tags: ['Three.js', 'Warenkorb', '18+-Gate'], note: 'Konzeptprojekt mit fiktiver Marke.' },
  { id: 'ferrari', kind: 'spot', branche: 'automotive', title: 'Ferrari', sub: 'The Hypercar Dynasty', format: '16:9 · 13 s', wide: true,
    video: 'video/ferrari.mp4', poster: 'img/spots/ferrari.webp', color: '#ff2800',
    text: 'Sechs Hypercars von F40 bis F80 im Kino-Format mit Letterbox, rotem Studio und Wappen-Endcard.',
    tags: ['Kino-Format', 'Studio-Look', '16:9'] },
  { id: 'pablo', kind: 'web', branche: 'lifestyle', title: 'Pablo Ice Cold', sub: 'Rebrand-Konzept · Händler-Shop', color: '#ff3b3b',
    live: '../kryo/pablo.html', images: ['img/pablo-1.webp', 'img/pablo-2.webp', 'img/pablo-3.webp'], mobile: 'img/pablo-mobile.webp',
    text: 'Dieselbe Engine, echtes Produkt: Das Originaldesign liegt als Textur auf der 3D-Dose, Farben und Texte sind umgestellt. Zeigt, wie schnell sich das System auf eine neue Marke anpassen lässt.',
    tags: ['Markenwechsel', 'Gleiche Engine'], note: 'Unbeauftragte Spec-Arbeit, keine Verbindung zur Marke Pablo.' },
  { id: 'porsche', kind: 'spot', branche: 'automotive', title: 'Porsche', sub: 'Sechs Charaktere. Ein Herzschlag.', format: '16:9 · 13 s', wide: true,
    video: 'video/porsche.mp4', poster: 'img/spots/porsche.webp', color: '#b5b5b5',
    text: 'Helles Studio statt Dunkelheit: sechs Modelle in einer ruhigen, cleanen Inszenierung.',
    tags: ['Helles Studio', '16:9'] },
  { id: 'claude', kind: 'spot', branche: 'tech', title: 'Claude Opus 5.5', sub: 'Claude baut.', format: '16:9 · 12 s', wide: true,
    video: 'video/claude.mp4', poster: 'img/spots/claude.webp', color: '#ff7a3d',
    text: 'Launch-Spot im Keynote-Stil: Lichtstrahlen, die sich zum Logo formen, eine animierte Chat-Oberfläche mit Modellwahl und ein warmer Farbverlauf als Bühne für den Claim.',
    tags: ['Produkt-Launch', 'UI-Animation', 'Motion Design', '16:9'] },
  { id: 'gpt', kind: 'spot', branche: 'tech', title: 'GPT-6', sub: 'GPT-6 forscht.', format: '16:9 · 12 s', wide: true,
    video: 'video/gpt.mp4', poster: 'img/spots/gpt.webp', color: '#4a7dff',
    text: 'Die Gegenversion in Blau und Violett: gleiche Dramaturgie, eigene Farbwelt – Lichtwirbel, Chat-Interface mit Modellauswahl und Endcard mit Claim.',
    tags: ['Produkt-Launch', 'UI-Animation', 'Farbwelt', '16:9'] },
];

window.PRICES = {
  spots: { label: 'Werbespots', items: [
    { name: 'Social Spot', price: 249, unit: '', text: 'Ein Spot für TikTok, Reels oder Ads – Animation, Texte und eigener Sound.', list: ['10–20 Sekunden', '9:16', '2 Korrekturrunden'] },
    { name: 'Produkt-Spot', price: 449, unit: '', badge: 'Beliebt', text: 'Dein Produkt im Studio-Look: freigestellt, inszeniert, mit Kamerafahrt.', list: ['Bis 20 Sekunden', '9:16 + 16:9', 'Freisteller & Retusche', '2 Korrekturrunden'] },
    { name: 'Reel-Abo', price: 690, unit: '/ Monat', text: 'Jeden Monat vier frische Spots im gleichen Look – einer pro Woche. Ideal für Gastro, Clubs und lokale Betriebe.', list: ['4 Spots pro Monat', 'Planung inklusive', 'Monatlich kündbar'] },
    { name: 'Kampagne', price: 990, unit: '', text: 'Fünf Spots aus einem Guss für einen Launch oder eine Aktion.', list: ['5 Spots', 'Alle Formate', 'Untertitel', 'Thumbnail-Set'] },
  ]},
  web: { label: 'Webseiten', items: [
    { name: 'Onepager', price: 690, unit: '', text: 'Eine moderne Seite mit allem Wichtigen – ideal für kleine Betriebe und Selbstständige.', list: ['1 Seite, mehrere Bereiche', 'Kontaktformular', 'Mobil optimiert', 'Hosting-Setup'] },
    { name: 'Website', price: 1290, unit: '', badge: 'Beliebt', text: 'Klassische Unternehmens-Website mit mehreren Unterseiten – schnell, modern, ohne Baukasten.', list: ['Bis 5 Seiten', 'Kontaktformular', 'SEO-Basics', 'Impressum & Datenschutz eingebunden'] },
    { name: '3D-Website', price: 1990, unit: '', text: 'Produkt- oder Markenseite mit echter 3D-Szene und Scroll-Animation – für den Wow-Effekt.', list: ['Bis 5 Bereiche', '3D-Szene', 'Kontaktformular', 'SEO-Basics'] },
    { name: 'Online-Shop', price: 2490, unit: '', text: 'Shop mit sicherer Zahlung (Karte, PayPal, Apple Pay) über Stripe oder Shopify.', list: ['Produktseiten', 'Warenkorb & Checkout', 'Rechtstexte-Einbindung', 'Einweisung'] },
  ]},
  chatbots: { label: 'Chatbots', items: [
    { name: 'FAQ-Chatbot', price: 390, unit: '', badge: 'Einstieg', text: 'Ein Assistent für deine Website, der Fragen zu Leistungen, Preisen und Öffnungszeiten beantwortet und Besucher weiterleitet.', list: ['Bis 50 Fragen & Antworten', 'In deinem Design', 'Leitet zu Seiten & Formular', 'Keine laufenden Kosten'] },
    { name: 'KI-Chatbot', price: 890, unit: '', text: 'Antwortet frei in ganzen Sätzen auf Basis deiner Inhalte – rund um die Uhr.', list: ['Trainiert auf deine Inhalte', 'Anfragen per E-Mail weiterleiten', 'Datenschutz-Hinweis', 'KI-Kosten nach Nutzung (meist wenige €/Monat)'] },
    { name: 'Chatbot-Betreuung', price: 29, unit: '/ Monat', text: 'Antworten aktuell halten, neue Fragen ergänzen, Auswertung, welche Fragen gestellt werden.', list: ['Monatliche Anpassungen', 'Neue Fragen ergänzen', 'Monatlich kündbar'] },
  ]},
  pakete: { label: 'Pakete', items: [
    { name: 'Starter', price: 890, unit: '', text: 'Für den Start: Onepager und ein passender Spot.', list: ['Onepager', '1 Social Spot', 'Einheitlicher Look'] },
    { name: 'Business', price: 1990, unit: '', badge: 'Empfohlen', text: 'Website, Chatbot und drei Spots – der komplette Auftritt für lokale Betriebe.', list: ['Website (bis 5 Seiten)', 'FAQ-Chatbot', '3 Social Spots', 'Alle Social-Formate'] },
    { name: 'Launch', price: 3490, unit: '', text: 'Der große Auftritt: 3D-Website oder Shop, fünf Spots und drei Monate Betreuung.', list: ['3D-Website oder Shop', '5 Spots', 'FAQ-Chatbot', '3 Monate Betreuung Plus'] },
  ]},
  betreuung: { label: 'Betreuung', items: [
    { name: 'Basic', price: 29, unit: '/ Monat', text: 'Deine Seite bleibt sicher, schnell und erreichbar.', list: ['Hosting & Domain-Verwaltung', 'Updates & Backups', 'Erreichbarkeits-Check'] },
    { name: 'Plus', price: 69, unit: '/ Monat', badge: 'Beliebt', text: 'Wie Basic – plus kleine Änderungen jeden Monat.', list: ['Alles aus Basic', '1 Stunde Änderungen', 'Chatbot-Pflege inklusive'] },
    { name: 'Content', price: 249, unit: '/ Monat', text: 'Website-Betreuung und ein frischer Spot pro Monat.', list: ['Alles aus Plus', '1 Social Spot / Monat', 'Priorisierte Antwort'] },
  ]},
};
/* Katalog zum Dazunehmen – mit „+“ landet ein Punkt in der Anfrage. */
window.CATALOG = [
  { group: 'Für Spots', items: [
    { name: 'Untertitel / Captions', price: '29 €', text: 'Eingebrannte Untertitel im Look des Spots.', why: 'Ein Großteil schaut Reels ohne Ton – ohne Text geht die Botschaft verloren.' },
    { name: 'Zusätzliches Format', price: '39 €', text: '1:1, 4:5 oder 16:9 zusätzlich zum Hochformat.', why: 'Jede Plattform hat ihr Format. Passend zugeschnitten wirkt es nativ.' },
    { name: 'Thumbnail-Set', price: '49 €', text: 'Drei Vorschaubilder für YouTube, Reels-Cover und Ads.', why: 'Das Vorschaubild entscheidet, ob überhaupt geklickt wird.' },
    { name: 'Lizenzierte Musik', price: 'nach Aufwand', text: 'Bekannter Stil, sauber lizenziert für Werbung.', why: 'Nicht lizenzierte Musik kann Ads sperren oder Abmahnungen auslösen.' },
  ]},
  { group: 'Für Webseiten', items: [
    { name: 'Chatbot für deine Website', price: 'ab 290 €', text: 'Ein Assistent, der Besucherfragen beantwortet und zur Anfrage führt – wie hier unten rechts.', why: 'Viele Besucher fragen lieber kurz, als eine Seite zu durchsuchen – auch nachts.' },
    { name: 'Terminbuchung einbinden', price: '79 €', text: 'Kunden buchen direkt freie Termine auf deiner Seite.', why: 'Weniger Hin-und-her per Telefon, mehr Termine auch abends und am Wochenende.' },
    { name: 'WhatsApp-Button', price: '29 €', text: 'Ein Tipp, und Kunden schreiben dir direkt auf WhatsApp.', why: 'Für viele Kunden ist WhatsApp die bequemste Art, Kontakt aufzunehmen.' },
    { name: 'Google-Unternehmensprofil', price: '99 €', text: 'Einrichten oder überarbeiten, mit Fotos und Öffnungszeiten.', why: 'Bei „in der Nähe“-Suchen ist das Profil oft wichtiger als die Website.' },
    { name: 'SEO-Grundpaket', price: 'ab 199 €', text: 'Titel, Beschreibungen, Struktur und Ladezeit optimiert.', why: 'Eine schöne Seite, die keiner findet, verkauft nichts.' },
    { name: 'Barrierefreiheits-Check', price: 'ab 249 €', text: 'Kontraste, Tastaturbedienung, Alternativtexte geprüft und verbessert.', why: 'Für viele Online-Shops gilt seit Juni 2025 das Barrierefreiheitsstärkungsgesetz.' },
    { name: 'Mehrsprachigkeit', price: 'ab 290 €', text: 'Deine Seite zusätzlich auf Englisch oder einer weiteren Sprache.', why: 'Touristen, internationale Kunden und Fachkräfte erreichen.' },
    { name: 'Rechtstexte einbinden', price: '49 €', text: 'Impressum, Datenschutz & AGB von einem Rechtstexte-Anbieter, sauber eingebunden.', why: 'Fehlende Pflichtangaben gehören zu den häufigsten Abmahngründen.' },
  ]},
  { group: 'Service', items: [
    { name: 'Express in 48 Stunden', price: '+ 30 %', text: 'Dein Projekt rückt in der Planung nach vorne.', why: 'Für Aktionen, Events und kurzfristige Launches.' },
    { name: 'Zusätzliche Korrekturrunde', price: '49 €', text: 'Eine weitere Feedbackschleife nach den inklusiven Runden.', why: 'Wenn mehrere Leute mitentscheiden.' },
    { name: 'Zusätzliche Arbeit', price: '65 € / Std.', text: 'Alles außerhalb des Angebots – fair nach Aufwand abgerechnet.', why: 'Transparent statt Pauschale: Du zahlst nur, was wirklich anfällt.' },
    { name: 'Texte & Copywriting', price: 'ab 99 €', text: 'Headlines und Texte, die verkaufen – statt Füllwörtern.', why: 'Gute Gestaltung braucht gute Worte.' },
  ]},
];

/* Offene Stellen. Leer lassen = "Aktuell keine offenen Stellen" + Initiativbewerbung.
   Beispiel zum Kopieren:
   { title: 'Freelance Motion Designer (m/w/d)', type: 'Freelance · Remote', hours: 'projektbasiert',
     text: 'Du animierst Spots für Kunden aus ...', tasks: ['...'], profile: ['...'], perks: ['...'] }, */
window.JOBS = [];

/* Team. Foto: Datei in img/team/ ablegen und Pfad eintragen. */
window.TEAM = [
  { name: 'Mika Wittenborn', role: 'Gründer · Konzept, Motion & Web', photo: 'img/team/mika.png', text: 'BWL-Student an der FHM Bielefeld. Baut Werbespots, Webseiten und Chatbots, die man nicht wegscrollt – und kümmert sich persönlich um jedes Projekt.' },
];

/* Kundenstimmen, die auf der Website erscheinen.
   Nur echte Bewertungen von echten Kunden eintragen – mit deren schriftlicher Zustimmung.
   Erfundene oder gekaufte Bewertungen sind in Deutschland verboten (UWG, Anhang Nr. 23b/23c). */
window.TESTIMONIALS = [  // echte Kundenstimmen (alle 5/5 Sterne), Veröffentlichung von den Kunden freigegeben

  { quote: 'Durch das monatliche Video-Abo konnte ich regelmäßig extrem starke Reels veröffentlichen, die viral gegangen sind und meine Reichweite massiv gepusht haben.', name: 'Leon (27)', company: 'Content Creator & Influencer' },
  { quote: 'Herausragende Umsetzung. Unsere neue Website sorgt nicht nur für deutlich zufriedenere Kunden, sondern spart uns im Alltag durch die integrierten Automatisierungen enorm viel Zeit.', name: 'Melanie (47)', company: 'Geschäftsführerin, Software-Agentur' },
  { quote: 'Man kommt heutzutage nicht mehr darum herum, seinen Betrieb digital gut aufzustellen. Mikas Arbeit hat uns enorm weitergebracht – unkompliziert, schnell und eine ganz klare Empfehlung.', name: 'Dietrich (62)', company: 'Inhaber, Elektro-Meisterbetrieb' },
  { quote: 'Die neue Seite präsentiert unsere Immobilien endlich auf Top-Niveau. Vor allem die Übersichtlichkeit und die smarten Kontakt- und Anfragefunktionen erleichtern unseren Maklern die tägliche Arbeit massiv.', name: 'Christian (41)', company: 'Co-Founder, Immobilienberatung' },
  { quote: 'Unser neuer Online-Shop lädt blitzschnell und die Conversion-Rate ist direkt nach dem Launch spürbar nach oben gegangen. Endlich eine Seite, die auf dem Smartphone genauso stark aussieht wie am Desktop.', name: 'Sarah (34)', company: 'Gründerin, E-Commerce-Brand' },
];
window.TESTIMONIALS_NOTE = 'Einige Kunden möchten aus Gründen der Vertraulichkeit nicht genannt werden.';

window.FAQ = [
  { cat: 'Allgemein', q: 'Wo sitzt du – und arbeitest du nur lokal?', a: 'Ich sitze in Bielefeld und arbeite gern mit Betrieben aus OWL zusammen. Spots und Webseiten liefere ich aber deutschlandweit und remote.' },
  { cat: 'Allgemein', q: 'Wie schnell meldest du dich?', a: 'Innerhalb von 24 Stunden an Werktagen – meistens deutlich schneller.' },
  { cat: 'Allgemein', q: 'Was brauchst du von mir?', a: 'Logo, Produktfotos (wenn vorhanden), deine wichtigste Botschaft und ein, zwei Beispiele, die dir gefallen. Den Rest erarbeiten wir gemeinsam.' },
  { cat: 'Werbespots', q: 'Wie lange dauert ein Werbespot?', a: 'Meist 3–5 Werktage nach dem Briefing. Express in 48 Stunden ist gegen 30 % Aufpreis möglich.' },
  { cat: 'Werbespots', q: 'Brauche ich professionelle Fotos?', a: 'Nein. Ich kann vorhandene Produktfotos freistellen, retuschieren und im Studio-Look inszenieren.' },
  { cat: 'Werbespots', q: 'In welchen Formaten bekomme ich den Spot?', a: 'Standard ist 9:16 für TikTok, Reels und Shorts. 16:9, 1:1 und 4:5 sind optional.' },
  { cat: 'Webseiten', q: 'Wie lange dauert eine Website?', a: 'Ein Onepager etwa 1 Woche, eine Website mit mehreren Seiten 1–2 Wochen, eine 3D-Website 2–4 Wochen, ein Shop 3–5 Wochen.' },
  { cat: 'Webseiten', q: 'Muss es eine 3D-Website sein?', a: 'Nein. Die meisten Betriebe brauchen eine klassische, schnelle Website – die gibt es ab 690 €. 3D ist ein Extra für Marken, die besonders auffallen wollen.' },
  { cat: 'Webseiten', q: 'Kann ich Inhalte später selbst ändern?', a: 'Ja, auf Wunsch baue ich ein einfaches Pflegesystem ein oder übernehme Änderungen im Betreuungspaket (ab 29 € im Monat).' },
  { cat: 'Webseiten', q: 'Kümmerst du dich um Hosting und Domain?', a: 'Ja, ich richte alles ein und erkläre dir, was wo liegt.' },
  { cat: 'Chatbots', q: 'Was kann ein Chatbot auf meiner Website?', a: 'Er beantwortet typische Fragen zu Leistungen, Preisen, Öffnungszeiten oder Terminen – rund um die Uhr – und leitet Besucher zur passenden Seite oder ins Kontaktformular. Den Chat unten rechts auf dieser Seite kannst du direkt ausprobieren.' },
  { cat: 'Chatbots', q: 'Was ist der Unterschied zwischen FAQ- und KI-Chatbot?', a: 'Der FAQ-Chatbot (ab 390 €) antwortet mit festgelegten Antworten und hat keine laufenden Kosten. Der KI-Chatbot (ab 890 €) formuliert frei auf Basis deiner Inhalte; dafür fallen kleine KI-Kosten je nach Nutzung an, meist wenige Euro im Monat.' },
  { cat: 'Chatbots', q: 'Ist ein Chatbot datenschutzkonform?', a: 'Der FAQ-Chatbot läuft komplett im Browser und sendet keine Daten nach außen. Beim KI-Chatbot gibt es einen Datenschutz-Hinweis und einen Anbieter mit Auftragsverarbeitungsvertrag.' },
  { cat: 'Preise & Zahlung', q: 'Wie läuft die Bezahlung?', a: '50 % bei Auftrag, 50 % bei Abnahme. Abos und Betreuung monatlich im Voraus.' },
  { cat: 'Preise & Zahlung', q: 'Sind die Preise Festpreise?', a: 'Die genannten Preise sind Startpreise und orientieren sich an marktüblichen Freelancer-Preisen in Deutschland. Nach dem Erstgespräch bekommst du ein festes Angebot – ohne versteckte Kosten.' },
  { cat: 'Preise & Zahlung', q: 'Warum bist du günstiger als eine Agentur?', a: 'Kein Büro, kein Vertriebsteam, kein Projektmanager dazwischen – du arbeitest direkt mit mir. Agenturen liegen für vergleichbare Leistungen oft beim Doppelten.' },
  { cat: 'Rechtliches', q: 'Wem gehören die Rechte am Ende?', a: 'Nach vollständiger Bezahlung darfst du Spots und Website zeitlich unbegrenzt für deine Marke nutzen. Musik und Bilder sind lizenziert oder selbst erstellt.' },
  { cat: 'Rechtliches', q: 'Schreibst du auch Impressum und Datenschutzerklärung?', a: 'Nein, Rechtstexte schreibe ich nicht. Ich binde aber Texte von Anbietern wie eRecht24 oder IT-Recht-Kanzlei sauber ein (49 €).' },
];
