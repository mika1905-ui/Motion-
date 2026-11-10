# Ferrari – „The Hypercar Dynasty“ · 13-Sekunden Motion-Spot

Inoffizieller Fan-/Konzept-Spot (kein offizielles Ferrari-Material). Texte auf Englisch.
Sechs Sondermodelle in Folge: **F40 (1987) → F50 (1995) → Enzo (2002) → LaFerrari (2013) → Daytona SP3 (2021) → F80 (2024)**.

**Fertiges Video:** [`out/ferrari-spot.mp4`](out/ferrari-spot.mp4) – 1920×1080, 60 fps, 13,0 s, mit Ton.

## Ablauf

| Zeit | Szene |
|---|---|
| 0,00 – 0,55 s | Makro: verchromtes Cavallino am Grill – „SOME CARS ARE BUILT.“ |
| 0,55 – 1,10 s | Glitch-Schnitt auf das Wappen-Badge – „THESE WERE BORN.“ |
| 1,10 – 1,52 s | Jahreszahlen-Stroboskop 1987 … 2024, Snare-Roll, Riser |
| 1,52 – 1,60 s | Stille – dann der Drop |
| 1,60 – 9,40 s | 6 Modelle à 1,3 s (4 Beats): Zoom-Punch + RGB-Split/Glitch, Jahreszahl als Zählwerk, PS-Drehzahl-HUD mit Zähler, Tricolore, Zoom-Through-Übergang |
| 9,40 – 10,40 s | Kachelwand: alle sechs Legenden „slammen“ im Beat rein, dann Kollaps |
| 10,40 – 10,55 s | Stille, ein roter Lichtfaden |
| 10,55 – 13,0 s | Impact: Ferrari-Wappen, Glanz-Sweep, Funken – „SIX LEGENDS. ONE OBSESSION.“ |

Ton: prozedural (Tick-Uhr, Riser, Beat mit 808-Bass + Sidechain, V8-Biturbo mit Blow-off beim F40, V12 bei F50/Enzo/SP3, V12-Hybrid bei LaFerrari, V6-Hybrid beim F80, Impact + V12-Gasstoß beim Logo).

Technische Daten im Spot (CV/km/h, Motor): F40 478 CV · 324 km/h · 2.9 L V8 Biturbo; F50 520 CV · 325 km/h · 4.7 L V12; Enzo 660 CV · 350 km/h · 6.0 L V12; LaFerrari 963 CV · 350+ km/h · 6.3 L V12 Hybrid; Daytona SP3 840 CV · 340+ km/h · 6.5 L V12; F80 1200 CV · 350 km/h · 3.0 L V6 Hybrid.

## Dateien

- `index.html` – Animation (Canvas 2D, deterministisch über `renderAt(t)`), im Browser abspielbar
- `photos/` – Fotos, Wappen, Schriftzug (`wordmark.svg`)
- `audio/soundtrack.wav`, `tools/gen-audio.mjs` – Soundtrack
- `tools/render.mjs` – MP4-Render (Playwright + ffmpeg), `tools/snap.mjs` – Einzelframes

```bash
node tools/gen-audio.mjs && node tools/render.mjs 60
```

## Bild- und Logo-Nachweise

| Motiv | Datei | Urheber | Lizenz |
|---|---|---|---|
| F40 | [F40 Ferrari 20090509.jpg](https://commons.wikimedia.org/wiki/File:F40_Ferrari_20090509.jpg) | Will ainsworth | CC BY-SA 3.0 |
| F50 | [Black Ferrari F50.jpg](https://commons.wikimedia.org/wiki/File:Black_Ferrari_F50.jpg) | MrWalkr | CC BY-SA 4.0 |
| Enzo | [Red Enzo Ferrari (12273651534).jpg](https://commons.wikimedia.org/wiki/File:Red_Enzo_Ferrari_(12273651534).jpg) | Axion23 | CC BY 2.0 |
| LaFerrari | [Ferrari LaFerrari at the Ferrari museum.jpg](https://commons.wikimedia.org/wiki/File:Ferrari_LaFerrari_at_the_Ferrari_museum.jpg) | Matyáš Solařík | CC BY-SA 4.0 |
| Daytona SP3 | [Ferrari Daytona SP3 (82743).jpg](https://commons.wikimedia.org/wiki/File:Ferrari_Daytona_SP3_(82743).jpg) | Calreyn88 | CC BY-SA 4.0 |
| F80 | [2025 Ferrari F80.jpg](https://commons.wikimedia.org/wiki/File:2025_Ferrari_F80.jpg) | Calreyn88 | CC BY-SA 4.0 |
| Ferrari-Wappen (Outro) | [DSC00458 (7614921264).jpg](https://commons.wikimedia.org/wiki/File:DSC00458_(7614921264).jpg) | Dennis G. Jarvis | CC BY-SA 2.0 |
| Wappen-Badge 458 Speciale (Intro) | [Ferrari logo on 458 Speciale.jpg](https://commons.wikimedia.org/wiki/File:Ferrari_logo_on_458_Speciale.jpg) | Handelsgeselschaft | CC BY-SA 4.0 |
| Cavallino am Grill (Intro) | [Il Cavallino Rampante (33202615).jpeg](https://commons.wikimedia.org/wiki/File:Il_Cavallino_Rampante_(33202615).jpeg) | Jordi Elías | CC BY 3.0 |
| Ferrari-Schriftzug | [Ferrari wordmark.svg](https://commons.wikimedia.org/wiki/File:Ferrari_wordmark.svg) | Ferrari | gemeinfrei (Textlogo), markenrechtlich geschützt |

Fotos verkleinert, zugeschnitten und farblich bearbeitet; Weitergabe unter den jeweiligen Lizenzen.
**Markenhinweis:** Ferrari, das Cavallino Rampante und das Wappen sind Marken der Ferrari S.p.A. Dieser Spot ist ein inoffizielles Fan-Projekt; vor einer kommerziellen Nutzung oder Veröffentlichung als Werbung ist eine Freigabe des Markeninhabers nötig.
Schriften: Montserrat, Bebas Neue (SIL Open Font License).
