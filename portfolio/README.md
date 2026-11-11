# Portfolio – Motion & Web

Portfolio-Seite von **FLUXE Studio** (Arbeitsname) mit Showreel, 10 Werbespots und den vier 3D-Webseiten **VOLTA**, **KRYO**, **Pablo Ice Cold** (Spec-Arbeit) und **Lumyx**,
dazu Leistungen, Ablauf und Kontakt.

## Anpassen
- **Name, E-Mail, Ort, Instagram, TikTok:** in `index.html` ganz unten im `<script>` unter `CONFIG`.
- **Impressum / Datenschutz:** `impressum.html` und `datenschutz.html` sind Vorlagen. Platzhalter in [Klammern]
  ersetzen und rechtlich prüfen lassen, bevor die Seite geschäftlich genutzt wird.
- **Preise:** Abschnitt „Leistungen & Preise“ in `index.html` – die Startpreise sind Vorschläge.
- **Spots:** Liste `SPOTS` / `WIDE` im Script; Videos in `video/`, Standbilder in `img/spots/`.
- **Bilder:** `img/` (Screenshots der Live-Seiten, Desktop + Handy).

## Veröffentlichen
Gedacht für GitHub Pages im Ordner `/portfolio` des `gh-pages`-Branches. Die „Live ansehen“-Links zeigen relativ auf
`../volta/`, `../kryo/`, `../kryo/pablo.html` und `../` (Lumyx), die dort schon liegen.

Lokal ansehen: `gh-pages` auschecken, `portfolio/` hineinkopieren, `python3 -m http.server` und `/portfolio/` öffnen.

Keine externen Abhängigkeiten: Schriften liegen lokal, kein Google Fonts, keine Cookies, kein Tracking.
