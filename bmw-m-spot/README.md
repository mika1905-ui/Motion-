# BMW M – „Eight Legends. One Letter.“ · 15-Sekunden Vertical-Spot

Inoffizieller Fan-/Konzept-Spot (kein offizielles BMW-Material) im **Hochformat 9:16** für TikTok/Reels/Shorts, Texte auf Englisch.
**Fertiges Video:** [`out/bmw-m-spot.mp4`](out/bmw-m-spot.mp4) – 1080×1920, 60 fps, 15,0 s, mit Ton.

## Ablauf (Takt 200 BPM, 1 Beat = 0,3 s)

| Zeit | Szene |
|---|---|
| 0,0 – 0,9 s | **BAYERISCHE · MOTOREN · WERKE** – ein Wort-Slam pro Beat über wechselnden Emblem-Makros |
| 0,9 – 1,2 s | Alles außer den Initialen fällt weg → **B M W** |
| 1,2 – 1,8 s | Roundel dreht sich ein – „BAVARIAN MOTOR WORKS“ |
| 1,7 – 2,25 s | M-Streifen-Wipe über den ganzen Screen, M-Logo-Slam |
| 2,25 – 2,4 s | Stille – Drop |
| 2,4 – 12,0 s | 8 Modelle à 1,2 s, Schnitt auf jedem Beat: ganzes Auto im Band → Vollbild-Kamerafahrt → Jump-Cut aufs Detail → Whip-Pan; Richtung wechselt links/rechts, jeder zweite Wechsel als M-Streifen-Wipe |
| 12,0 – 13,0 s | Ping-Pong-Flicker: alle Modelle im 75-ms-Takt hin und her, „8 LEGENDS. / 1 LETTER.“ |
| 13,0 – 15,0 s | M-Logo-Impact, Roundel, „ONE LETTER. EIGHT LEGENDS.“ |

Modelle & Daten: M1 (1978, 3.5 L R6, 277 PS, 262 km/h) · M3 E30 (1986, 2.3 L R4, 200 PS, 235 km/h) · M2 (2023, 3.0 L R6 Biturbo, 460 PS, 285 km/h) · M3 Touring (2022, 510 PS, 280 km/h) · M4 CSL (2022, 550 PS, 307 km/h) · M8 Competition (2019, 4.4 L V8 Biturbo, 625 PS, 305 km/h) · M5 (2024, V8 Plug-in-Hybrid, 727 PS, 305 km/h) · XM (2023, V8 Plug-in-Hybrid, bis 748 PS, 290 km/h). Höchstgeschwindigkeiten jeweils mit M Driver's Package.

Ton: prozedural – Wort-Slams, Roundel-Spin, Drop, 200-BPM-Beat mit 808-Bass + Sidechain, Motorsound je Modell (R6-Sauger, hochdrehender R4, R6-Biturbo und V8 mit Schubabschalt-Knallen, V8-Hybrid mit E-Surren), Stotter-Riser, Logo-Impact.

## Dateien
- `index.html` – Animation (Canvas 2D, deterministisch über `renderAt(t)`), im Browser abspielbar
- `photos/` – Fotos und Logos · `audio/` – Soundtrack · `tools/` – `gen-audio.mjs`, `render.mjs`, `snap.mjs`

```bash
node tools/gen-audio.mjs && node tools/render.mjs 60
```

## Bild- und Logo-Nachweise

| Motiv | Datei | Urheber | Lizenz |
|---|---|---|---|
| M1 | [BMW M1 (E26, 1981) (52858728139).jpg](https://commons.wikimedia.org/wiki/File:BMW_M1_(E26,_1981)_(52858728139).jpg) | Charles from Port Chester, New York | CC BY 2.0 |
| M3 E30 | [BMW M3 E30, Pau 2015 2.jpg](https://commons.wikimedia.org/wiki/File:BMW_M3_E30,_Pau_2015_2.jpg) | Handelsgeselschaft | CC BY-SA 4.0 |
| M2 | [BMW M2 (G87) IMG 8806.jpg](https://commons.wikimedia.org/wiki/File:BMW_M2_(G87)_IMG_8806.jpg) | Alexander Migl | CC BY-SA 4.0 |
| M3 Touring | [BMW M3 Touring (G81, 2022) (52569510933).jpg](https://commons.wikimedia.org/wiki/File:BMW_M3_Touring_(G81,_2022)_(52569510933).jpg) | Charles from Port Chester, New York | CC BY 2.0 |
| M4 CSL | [2022 BMW M4 CSL FOS22.jpg](https://commons.wikimedia.org/wiki/File:2022_BMW_M4_CSL_FOS22.jpg) | MrWalkr | CC BY-SA 4.0 |
| M8 Competition | [BMW M8 Gran Coupe Competition (Facelift) 1X7A6106.jpg](https://commons.wikimedia.org/wiki/File:BMW_M8_Gran_Coupe_Competition_(Facelift)_1X7A6106.jpg) | Alexander Migl | CC BY-SA 4.0 |
| M5 | [BMW M5 (G90) MYLE Festival 2025 DSC 9764.jpg](https://commons.wikimedia.org/wiki/File:BMW_M5_(G90)_MYLE_Festival_2025_DSC_9764.jpg) | Alexander Migl | CC BY-SA 4.0 |
| XM | [BMW XM (G09) China.jpg](https://commons.wikimedia.org/wiki/File:BMW_XM_(G09)_China.jpg) | Dinkun Chen | CC BY-SA 4.0 |
| Emblem „50 Jahre M“ (Intro) | [BMW M 50 years logo 1X7A0228.jpg](https://commons.wikimedia.org/wiki/File:BMW_M_50_years_logo_1X7A0228.jpg) | Alexander Migl | CC BY-SA 4.0 |
| Motorsport-Emblem (Intro) | [BMW Motorsport Roundel (8202744702).jpg](https://commons.wikimedia.org/wiki/File:BMW_Motorsport_Roundel_(8202744702).jpg) | Stephen Hennessey from Murrieta, CA | CC BY 2.0 |
| Roundel auf Motorhaube (Intro) | [BMW roundel on a car bonnet, BMW Museum, Munich.jpg](https://commons.wikimedia.org/wiki/File:BMW_roundel_on_a_car_bonnet,_BMW_Museum,_Munich.jpg) | Wilfredor | CC0 |
| BMW-Roundel (klassisch) | [BMW.svg](https://commons.wikimedia.org/wiki/File:BMW.svg) | BMW | gemeinfrei, markenrechtlich geschützt |
| BMW-Roundel (2020, weiß) | [BMW logo (white).svg](https://commons.wikimedia.org/wiki/File:BMW_logo_(white).svg) | BMW | gemeinfrei, markenrechtlich geschützt |
| BMW-M-Logo | [BMW M logo.svg](https://commons.wikimedia.org/wiki/File:BMW_M_logo.svg) | BMW M GmbH | gemeinfrei, markenrechtlich geschützt |

Fotos verkleinert, zugeschnitten und farblich bearbeitet; Weitergabe unter den jeweiligen Lizenzen. Bei Veröffentlichung die Urheber nennen (z. B. in der Videobeschreibung).
**Markenhinweis:** BMW, das BMW-Logo, BMW M und das M-Logo sind Marken der BMW AG. Dieser Spot ist ein inoffizielles Fan-Projekt; für kommerzielle Nutzung oder Veröffentlichung als Werbung ist eine Freigabe der BMW AG nötig.
Schriften: Montserrat, Bebas Neue (SIL Open Font License).
