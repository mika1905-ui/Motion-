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

# Café Europa Bielefeld – Instagram reel

15 s vertical reel (1080×1920, 30 fps, 128 BPM with its own synthesized house beat):
club intro **CAFÉ EUROPA – BIELEFELD** → **JEDEN MITTWOCH / FREITAG / SAMSTAG** (one scene per day,
cut on the beat) → jumping crowd with lights and lasers, **PARTY – BIS IN DEN MORGEN** → end card with
**MI · FR · SA**, Jahnplatz 4, 33602 Bielefeld and @cafe_europa_bi.

**Output:** [`out/cafe_europa_reel.mp4`](out/cafe_europa_reel.mp4)

```bash
python3 europa_reel.py                    # -> out/cafe_europa_reel.mp4
python3 europa_reel.py --preview 1 3.3 13 # single PNG frames
```

**Real footage:** put your own clips (filmed in the club, or clips you have the rights to) as `.mp4`/`.mov`
into `clips/`. They're used in name order as the background for intro, Wednesday, Friday, Saturday and
crowd scenes (colour-graded to the scene's colour), and the text and graphics stay on top. Texts, address
and handle are at the top of `europa_reel.py`.
