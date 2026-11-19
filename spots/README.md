# Spots – Studio-Neufassung

Fünf Spec-Spots aus **echten Fotos** (keine KI-generierten Produkte), neu gerendert im Kino-/Studio-Look.

| Spot | Format | Skript | Fertiges Video |
|---|---|---|---|
| BMW M – „One Letter.“ | 9:16, 15 s | `python3 studio.py bmw` | `final/bmw.mp4` |
| Ferrari – „The Hypercar Dynasty“ | 16:9, 13 s | `python3 studio.py ferrari` | `final/ferrari.mp4` |
| Porsche – „Sechs Charaktere“ | 16:9, 13 s | `python3 studio.py porsche` | `final/porsche.mp4` |
| Pacha Ibiza (nicht im Portfolio) | 9:16, 15 s | `python3 pacha.py` | `final/pacha.mp4` |
| iPhone 17 Pro | 9:16, 13 s | `python3 iphone_spot.py` | `final/iphone.mp4` |

**Autos:** Fotos von Wikimedia Commons, freigestellt (`cars/`), Kennzeichen durch neutrale Schilder ersetzt,
in ein virtuelles Studio gesetzt (Hohlkehle, Bodenspiegelung entlang der Radlinie, Kontaktschatten, Lichtkante),
langsame Kamerafahrt, Bloom, Vignette, Filmkorn. Ton: `audio.py` (Pad, Sub-Pulse auf dem Beat, Whoosh je Schnitt, Impact).

**iPhone:** echte Produktfotos (CC0), freigestellt, Unterkante rekonstruiert, als 3D-Körper mit Seitenkante und Spiegelung auf Schwarz – Quellen in `iphone/products/SOURCES.md`.

**Pacha:** Insel-Intro (Es Vedrà, A.Savin, FAL) + bereitgestellte Clubfotos in `pacha/` – Rechte dieser Fotos vor
Veröffentlichung klären. Musik: `pacha_music.py`.

Bildnachweise der Autos: siehe `portfolio/bildnachweise.html`. Alle Spots sind unbeauftragte Spec-Arbeiten.

```bash
pip install numpy scipy pillow opencv-python-headless   # + ffmpeg
python3 studio.py bmw --preview 2 6 13                  # Einzelbilder nach out/
```
