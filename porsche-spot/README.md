# Porsche – 13-Sekunden Motion-Spot

Inoffizieller Konzept-/Fan-Spot (kein offizielles Porsche-Material, keine offiziellen Logos).
Sechs echte Modelle: **911 · Taycan · Panamera · Cayenne · Macan · 718 Cayman**.

**Fertiges Video:** [`out/porsche-spot.mp4`](out/porsche-spot.mp4) – 1920×1080, 60 fps, 13,0 s, mit Ton.

## Ablauf

| Zeit | Szene |
|---|---|
| 0,0 – 1,8 s | Intro: Lichtlinie, Herzschlag – „Sechs Charaktere. Ein Herzschlag.“ |
| 1,8 – 10,2 s | Sechs Modelle à 1,4 s: Slice-Reveal, Ken-Burns-Kamerafahrt, Licht-Sweep, Typo-Einblendung, Whip-Pan raus |
| 10,2 – 13,0 s | Outro: Montage aller sechs Modelle → Lichtlinie → Wortmarke „PORSCHE – Fahrspaß. In jeder Form.“ |

Ton: prozedural synthetisiert, synchron zu den Schnitten (Herzschlag, Kicks/Hi-Hats, Motor-Vorbeifahrten mit Doppler, E-Motor-Surren beim Taycan, Impact beim Logo).

## Dateien

- `index.html` – die Animation (Canvas 2D, deterministisch über `renderAt(t)`); im Browser öffnen und auf „Spot abspielen“ klicken
- `photos/` – Fahrzeugfotos (siehe Bildnachweise)
- `audio/soundtrack.wav` – Soundtrack
- `tools/gen-audio.mjs` – erzeugt den Soundtrack neu
- `tools/render.mjs` – rendert das MP4 Frame für Frame (Playwright + ffmpeg)
- `tools/snap.mjs` – einzelne Frames als PNG

```bash
node tools/gen-audio.mjs     # Soundtrack
node tools/render.mjs 60     # Video -> out/porsche-spot.mp4
```

## Bildnachweise

| Modell | Foto | Urheber | Lizenz |
|---|---|---|---|
| 911 Turbo | vom Auftraggeber bereitgestellt | – | – |
| Taycan GTS | [2024 Porsche Taycan GTS IAA 2025 DSC 1988](https://commons.wikimedia.org/wiki/File:2024_Porsche_Taycan_GTS_IAA_2025_DSC_1988.jpg) | Alexander-93 | CC BY-SA 4.0 |
| Panamera | [Porsche 971 Panamera (Singapore)](https://commons.wikimedia.org/wiki/File:Porsche_971_Panamera_(Singapore).jpg) | Pangalau | CC BY-SA 4.0 |
| Cayenne | [Porsche Cayenne, Auto 2024, Zurich (PANA0862)](https://commons.wikimedia.org/wiki/File:Porsche_Cayenne,_Auto_2024,_Zurich_(PANA0862).jpg) | Matti Blume | CC BY-SA 4.0 |
| Macan | [Porsche Macan (89633)](https://commons.wikimedia.org/wiki/File:Porsche_Macan_(89633).jpg) | Calreyn88 | CC BY-SA 4.0 |
| 718 Cayman | [Porsche 718 Cayman GTS 1X7A7165](https://commons.wikimedia.org/wiki/File:Porsche_718_Cayman_GTS_1X7A7165.jpg) | Alexander-93 | CC BY-SA 4.0 |

Die Wikimedia-Fotos wurden verkleinert sowie farblich bearbeitet (Kontrast/Sättigung, Overlays) und werden unter CC BY-SA 4.0 weitergegeben.
Schrift: Montserrat (SIL Open Font License).
