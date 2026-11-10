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

# Revolut – 13 s spec spot (fan-made)

A 13 s vertical (1080×1920, 30 fps) TikTok spot with synthesized 120 BPM sound design. It covers
Revolut's real product features only: sending money, currency exchange, stocks, crypto, Vaults savings,
budgets & analytics, disposable virtual cards, bill splitting, Apple Pay & Google Pay, RevPoints,
Revolut <18 and the Premium/Metal/Ultra plans.
Structure: a glitchy wordmark slam that zooms through the "o", then a spinning card, then 12 feature cuts
on the beat, then a hyperspace run into the app, then the drop and the end card.
Effects: RGB split, glitch slices, flash frames, zoom punches, camera shake, speed lines, particles, grain.
The end card says it is a fan-made spec ad and not an official Revolut ad.

**Output:** [`out/revolut_spot.mp4`](out/revolut_spot.mp4)

```bash
cd revolut
python3 audio.py                         # -> spot_audio.wav
node render.js                           # -> ../out/revolut_spot.mp4 (Playwright + ffmpeg)
node render.js --preview 0.6 3.2 11.0    # single JPG frames in preview/
```
Open `revolut/spot.html` in a browser to watch a live loop. All copy lives in `spot.html` (`F` array and scene functions).
