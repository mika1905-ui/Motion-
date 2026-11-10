# XY Residences – Motion-Ad & Landingpage (Prototyp)

Interaktiver Web-Prototyp für die Immobilienfirma **XY**: Gebäude-Übersicht mit klickbaren Etagen, eine Zoom-Animation ins Penthouse und eine animierte Innenansicht mit raumhohem Panoramafenster.

## Starten

Es gibt keinen Build-Schritt. Zwei Möglichkeiten:

- `index.html` direkt im Browser öffnen, oder
- einen lokalen Server starten (empfohlen):
  ```bash
  npx serve .        # oder: python3 -m http.server 8080
  ```

Tailwind (Play-CDN), GSAP 3.12.5 + ScrollTrigger (cdnjs) und Google Fonts werden per CDN geladen. Dafür braucht der Browser eine Internetverbindung.

**Motion-Ad automatisch abspielen:** `index.html?ad=1`. Nach dem Intro fährt die Kamera durch alle Etagen, zoomt ins Penthouse und wechselt dort die Tageszeiten. Das eignet sich gut für eine Bildschirmaufnahme. Alternativ den Button „Motion-Ad abspielen“ im Hero anklicken.

## Struktur

| Datei        | Inhalt |
|--------------|--------|
| `index.html` | Markup: Intro, Hero mit Gebäude, Infokarte, Landing-Sektionen, Innenansicht (Raum als SVG), Modals |
| `styles.css` | Komponenten (Buttons, Glass-Karten, Modals), SVG-Styles, Keyframes, `prefers-reduced-motion` |
| `script.js`  | Etagendaten, Gebäude-Generator, Interaktion, GSAP-Timelines, Canvas-Ausblick, Grundrisse, Formular |

## Features

1. **Gebäude-Übersicht.** Ein isometrisches SVG-Modell (EG bis Penthouse) wird aus den `FLOORS`-Daten erzeugt. Hover oder Fokus hebt die Etage hervor und aktualisiert die Infokarte (Einheiten, Fläche, Preis, Status). Ein Klick auf eine Etage wählt sie aus, und die Infokarte bietet den Grundriss an.
2. **Übergang.** Ein Klick aufs Penthouse startet eine GSAP-Timeline: Die UI blendet aus, die übrigen Etagen dimmen ab und die Kamera zoomt per `expo.inOut` aufs Penthouse. Danach folgt ein warmer Licht-Flash und der Raum „landet“ (Scale 1.22 → 1). Der Rückweg spielt die gleiche Bewegung rückwärts.
3. **Innenansicht.** Der Raum ist in Ein-Punkt-Perspektive gezeichnet, mit Sofa, Bogenleuchte, Kamin und Pflanze als Silhouetten vor dem Fenster. Hinter dem Glas läuft eine Canvas-Szene:
   - Himmel, Sonne bzw. Mond, Sterne und Wolken
   - Berge mit Dunst und zwei Skyline-Ebenen mit Fensterlichtern
   - See mit Sonnen- und Lichtspiegelungen, Autos und Vögel
   - eine Spiegelung des Ausblicks im polierten Boden
   - Maus-Parallax (auf Touch-Geräten ein automatischer Drift)
   - Tageszeiten **Morgen / Tag / Abend / Nacht**, die weich ineinander überblenden
   - Hotspots mit Detail-Tooltips
4. **CTAs.** „Besichtigung vereinbaren“ öffnet ein Formular mit Validierung, Wunschtag und Uhrzeit sowie einer Erfolgsanimation. „Grundriss ansehen“ öffnet einen SVG-Grundriss, der sich selbst zeichnet.
5. **Responsive & performant.** Die Lichter werden einmalig in Offscreen-Canvases vorgerendert. Die Pixeldichte ist auf DPR 2 begrenzt. Die Animationsschleife läuft nur, solange die Innenansicht offen ist. Bedienung per Tastatur ist möglich (Tab/Enter, ESC schließt). `prefers-reduced-motion` wird respektiert.

## Anpassen

- **Etagen, Preise, Status:** Array `FLOORS` in `script.js`
- **Grundrisse:** Objekt `PLANS` (Räume als Rechtecke, Fenster, Türen)
- **Farben der Tageszeiten:** Objekt `PRESETS`
- **Markenfarben:** `tailwind.config` in `index.html` und `:root` in `styles.css`

## Für die Produktion

- Das Tailwind-Play-CDN ist nur für Prototypen gedacht. Für die Produktion das CSS per Tailwind-CLI bauen und das `<script src="https://cdn.tailwindcss.com…">` ersetzen.
- Das Formular sendet aktuell nichts ab. Die Anbindung an CRM oder API gehört in den `submit`-Handler in `buildVisitForm()`.
- Alle Inhalte (Preise, Flächen, Texte) sind Platzhalter.
