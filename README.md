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

# McDonald's – 15 s TikTok spot (unofficial spec ad)

A 15 s vertical (1080×1920, 30 fps) ad with a synthesized 120 BPM jingle bed, cut on the beat:

| Time | Scene |
|---|---|
| 0.0–2.0 s | Red sunburst, the golden arches draw themselves, "EINMAL / ALLES, / BITTE." |
| 2.0–12.0 s | One second per classic, whip-wipe on every cut: Big Mac, Hamburger Royal Käse, Cheeseburger, McChicken, Filet-O-Fish, Chicken McNuggets, Pommes Frites, McFlurry, Apfeltasche, Softdrinks |
| 12.0–15.0 s | Impact, all ten products at once, logo, "ich liebe es", CTA "JETZT IN DER APP BESTELLEN" |

All products and the logo are drawn procedurally (no photos). Text and CTA stay out of TikTok's bottom UI zone.

**Output:** [`out/mcdonalds_ad.mp4`](out/mcdonalds_ad.mp4)

```bash
pip install numpy pillow opencv-python-headless scipy   # + ffmpeg on PATH
python3 mcd_products.py            # -> assets/mcd/*.png  (--sheet for a contact sheet)
python3 mcd_ad.py                  # -> out/mcdonalds_ad.mp4
python3 mcd_ad.py --preview 2.5 12.9   # single PNG frames
```

Product names, taglines and their order are in `SCENES` at the top of `mcd_ad.py`.
Note: McDonald's, Big Mac, the arches and "ich liebe es" are trademarks of McDonald's —
this is a spec/fan piece, not for publishing as a paid ad without their approval.
