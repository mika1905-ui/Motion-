# Aurum Residences — Penthouse Motion Prototype

Interaktiver Single-Page-Prototyp (Motion-Ad) für eine Luxus-Immobilie.

## Starten

Keine Installation, kein Build: `penthouse/index.html` einfach im Browser öffnen
(Internetverbindung nötig für Tailwind, GSAP und Google Fonts per CDN).

Optional über einen lokalen Server:

```bash
cd penthouse && python3 -m http.server 8080   # → http://localhost:8080
```

## Flow

1. **Tower** — isometrisches Wireframe-Gebäude (Titan/Gold), Stockwerke zeichnen sich beim Laden ein,
   jede Etage ist beschriftet (Ground Floor → Penthouse), Hover hebt Etage + Label hervor,
   Maus neigt das Modell in 3D. Andere Etagen zeigen „Sold/Reserved“-Hinweis.
2. **Klick auf das Penthouse** — GSAP-Timeline: UI blendet aus, Kamera taucht ins Penthouse,
   dessen Fassade morpht (Clip-Path) nahtlos zum Panoramafenster der Lounge.
3. **Lounge** — raumhohe Verglasung, Sonnenuntergang, 10 tiefengestaffelte Ebenen
   (Himmel, Sonne, Wolken, 3 Skyline-Layer, Glasreflexe, Raum, Möbel, Staub) mit Maus-Parallax.
   UI: Preis `$12.5M`, **Virtual Tour** (automatische Kamerafahrt mit Kapiteln),
   **Book Viewing** (Glas-Modal mit Termin-Auswahl), Hotspots mit Tooltips, „Tower“ spielt alles rückwärts.

`Esc` schließt Modal / beendet Tour / geht zurück. Ohne Mausbewegung driftet die Kamera automatisch (Ad-Modus).

## Struktur

```
penthouse/
├── index.html      Markup + Tailwind-Config
├── css/styles.css  Design-Tokens, SVG-Styling, Glass-UI
└── js/
    ├── scene.js    prozedurale SVG-Generierung (Tower, Skyline, Lounge)
    └── app.js      GSAP-Timelines, Parallax, Tour, Booking
```

Alles ist Vektor (SVG) — keine Bilddateien, gestochen scharf auf jedem Display.
Animiert werden nur `transform`/`opacity`/`clip-path` → GPU-composited, 60 FPS.
