# The Penthouse — 13 s TikTok motion ad

Vertikaler Clip (1080×1920, 30 fps, 13 s, mit Sound) aus **echten Fotos**:
Drohnenflug auf die New Yorker Skyline bei Sonnenuntergang → Sturzflug in die obersten Etagen
des Turms (Zoom-Blur + Flash) → Gimbal-Fahrt durch ein echtes Penthouse → Whip-Pan zum Ausblick
über Manhattan → Endkarte mit Preis **$12.5M** und „Book a private viewing“-Button.

**Video:** [`out/penthouse_motion.mp4`](out/penthouse_motion.mp4)

## Neu rendern

```bash
pip install numpy pillow opencv-python-headless   # + ffmpeg im PATH
python3 render.py                       # -> out/penthouse_motion.mp4
python3 render.py --preview 1 5.5 12    # einzelne PNG-Frames zum Prüfen
```

Texte, Preis und Timing stehen in `render.py` (`draw_text_layer`, `T_AB`, `T_BC`).
Kamerafahrten, Blur, Flash, Light-Leaks, Bloom, Color-Grade, Filmkorn, Typografie und
Sounddesign werden komplett im Skript erzeugt.

## Bildnachweise (Wikimedia Commons)

| Datei | Motiv | Urheber | Lizenz |
|---|---|---|---|
| `assets/1_skyline.jpg` | [Pink and purple skyline](https://commons.wikimedia.org/wiki/File:Pink_and_purple_skyline_(Unsplash).jpg) | srikanta H. U (Unsplash) | CC0 |
| `assets/2_penthouse.jpg` | [Penthouse Dukley Hotel & Resort](https://commons.wikimedia.org/wiki/File:Penthouse_Dukley_Hotel_%26_Resort.jpg) | Dukley | CC BY-SA 4.0 |
| `assets/3_view.jpg` | [Sunset in New York City](https://commons.wikimedia.org/wiki/File:Sunset_in_New_York_City_(Unsplash).jpg) | Joseph Barrientos (Unsplash) | CC0 |

Das Penthouse-Foto steht unter **CC BY-SA 4.0**: Beim Veröffentlichen muss der Urheber genannt
werden (z. B. in der Videobeschreibung: „Interior photo: Dukley, CC BY-SA 4.0, via Wikimedia Commons“),
und das Video selbst fällt dann ebenfalls unter CC BY-SA 4.0.
„Aurum Residences“ ist eine fiktive Marke; Preis und Angaben sind Platzhalter.
