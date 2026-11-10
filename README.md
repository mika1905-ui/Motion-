# Red car – TikTok motion clip

A 14 s vertical (1080×1920, 30 fps) clip, made in the style of the "website on a laptop" TikToks:
a laptop in a dark room shows a car-rental landing page. On the page, a drop of glossy red liquid
splashes down and rises into a column that forms the Ferrari shield badge — the liquid slides off, the badge springs free with a glint, then melts back. The puddle turns into a dome, bursts into spikes, then pours itself into
the shape of the car and drains away to reveal the red car. Caption: **UPGRADE YOUR WEBSITE. START HERE**.
The clip has its own synthesized sound design, motion blur, a phone-camera focus pull, handheld shake and film grain.

**Output:** [`out/red_car_motion.mp4`](out/red_car_motion.mp4)

## Rebuild

```bash
pip install numpy pillow opencv-python-headless scipy   # + ffmpeg on PATH
python3 cutout.py        # assets/red_car.jpg -> assets/car_cutout.png
python3 badge.py         # assets/badge_source.jpg -> assets/badge.png
python3 render.py        # -> out/red_car_motion.mp4
python3 render.py --preview 5.3 8.6   # single PNG frames for quick checks
```

To change the caption, brand or timing, edit the constants and the phase times at the top of
`render.py` (`CAPTION`, `BRAND`, `liquid_field`).

---

# Goldhähnchen – 15 s Instagram ad

A 15 s vertical ad (1080×1920, 30 fps, 120 BPM) for [@goldhaehnchen.de](https://www.instagram.com/goldhaehnchen.de/):

| Time | Beat |
|---|---|
| 0.0–1.5 s | Hook: gold **HUNGER?** slams in (zoom punch, shake, RGB split) |
| 1.5–5.0 s | A drop of liquid gold falls, splashes, rises into a column and pours itself into a drumstick, which gets a glint |
| 5.0 s | Beat drop: the gold fries into a crispy golden-brown crust, sparks fly, steam rises |
| 6.0–8.0 s | Claims on the beat: **KNUSPRIG. SAFTIG. GOLDEN. GOLD WERT.** |
| 8.0–11 s | Gold wordmark **GOLD HÄHNCHEN** with a shine sweep, tagline |
| 11–15 s | CTA **JETZT PROBIEREN →** (pulses on the beat, gets tapped), `@goldhaehnchen.de` |

Picture and sound (beat, splash, sizzle, impacts) are fully procedural.

**Output:** [`out/goldhaehnchen_ad.mp4`](out/goldhaehnchen_ad.mp4)

```bash
pip install numpy pillow opencv-python-headless scipy   # + ffmpeg on PATH
python3 goldhaehnchen.py                     # -> out/goldhaehnchen_ad.mp4
python3 goldhaehnchen.py --preview 3 6 12    # single PNG frames
```

Texts (`HOOK`, `WORDS`, `BRAND`, `TAGLINE`, `CTA`, `HANDLE`) and timings are constants at the top of `goldhaehnchen.py`.
