# iPhone Film – Gesamtvideo (TikTok 9:16, ~30 s, mit Sound)

**Video:** `out/iphone-film-tiktok.mp4` – 1080×1920, 30 fps, AAC-Stereo.

| Zeit | Inhalt |
|---|---|
| 0–2 s | Lichtlinie, „Etwas Großes kommt.“ |
| 2–5 s | iPhone fliegt in 3D ein |
| 5–7,6 s | Vier Farben fächern auf |
| 7,6–10,4 s | MacBook + iPhone, „Alles. Perfekt verbunden.“ |
| **10,4 s – Drop** | Weißblitz → **iPhone Fold** fliegt ein, Neon-Scharnier |
| 13 s | Entfalten, „Entfalte das Unmögliche.“ |
| 15 s | Holo-OS bootet, Parallax-Schwenk, Widget expandiert |
| 18 / 20 / 22 s | X-Ray Liquid Hinge · Explosion Seamless OLED · X-Ray Quantum Chip |
| 24,7 s | 360°-Drehung mit Farbwechsel |
| 27 s | Endcard: Logo, „iPhone Fold“, „Jetzt vorbestellen“ |

## Neu bauen
```bash
./build.sh                 # setzt alles zusammen (rendert fehlende Teile automatisch)
```
- `render-fold.js` – rendert `fold/index.html?film=1` Frame für Frame (GSAP-Zeit über `gsap.updateRoot`)
- `sound.py` – synthetisiert den Soundtrack (Drone, Hits, Whooshes, 120-BPM-Beat) synchron zu den Schnitten
- Vorschau des Fold-Teils im Browser: `fold/index.html?film=1`

Konzept-Spot – nicht offiziell von Apple. Vor öffentlicher/bezahlter Nutzung Markenrechte klären.
