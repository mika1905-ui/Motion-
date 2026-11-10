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

# Pacha Ibiza – 15 s spec ad

A 15 s vertical ad (1080×1920, 30 fps) for Pacha Ibiza. It opens slow over the island (Es Vedrà at sunset,
the Dalt Vila cathedral, the white Sant Jordi church, the old town) with a Spanish nylon-guitar intro.
On beat 12 (~5.8 s) the house beat drops with a white flash, and the edit cuts on the beat through the club:
the entrance, the bulb sign, the DJ booth, the CO₂ cannons, the crowd. It ends on the cherries sign:
**PACHA · IBIZA – THE NIGHT STARTS HERE – SINCE 1973**.

The music is synthesized in `pacha_music.py`: 124 BPM house in A Phrygian with the Andalusian cadence
(Am–G–F–E) on a Karplus-Strong nylon guitar, rasgueado strums, flamenco palmas, a riser, then kick, claps,
off-beat hats and bass with sidechained guitar stabs.

**Output:** [`out/pacha_ibiza_ad.mp4`](out/pacha_ibiza_ad.mp4)

```bash
python3 pacha_ad.py                    # -> out/pacha_ibiza_ad.mp4 (also writes out/pacha_music.wav)
python3 pacha_ad.py --preview 1 6 13   # single PNG frames
python3 pacha_music.py                 # soundtrack only
```

Shots, timing (in beats) and captions are the `SHOTS` / `TEXTS` tables at the top of `pacha_ad.py`.

This is an unofficial spec ad, not made by or affiliated with Pacha. Before publishing, check
trademark use (name and cherries logo) with the brand.

## Photo credits

All photos are from Wikimedia Commons under free licences (CC BY / CC BY-SA / Free Art License).
They are cropped and colour-graded in the ad.

| File | Source | Author | Licence |
|---|---|---|---|
| `cathedral.jpg` | [20230717 164928 Cathedral in Eivissa (Ibiza).jpg](https://commons.wikimedia.org/wiki/File:20230717_164928_Cathedral_in_Eivissa_(Ibiza).jpg) | Leon petrosyan | CC BY-SA 4.0 |
| `alesso.jpg` | [Alesso @ Masquera Motel Pacha Ibiza July 4th, 20111.jpg](https://commons.wikimedia.org/wiki/File:Alesso_@_Masquera_Motel_Pacha_Ibiza_July_4th,_20111.jpg) | Soulecrusader | CC BY-SA 3.0 |
| `co2.jpg` | [CO2 cannon at Pacha - lethal (2615737919).jpg](https://commons.wikimedia.org/wiki/File:CO2_cannon_at_Pacha_-_lethal_(2615737919).jpg) | Alex Harries from Portsmouth, England | CC BY 2.0 |
| `santjordi.jpg` | [Església de Sant Jordi.jpg](https://commons.wikimedia.org/wiki/File:Esgl%C3%A9sia_de_Sant_Jordi.jpg) | Ppibz | CC BY-SA 3.0 es |
| `daltvila.jpg` | [Ibiza City Dalt Vila asv2023-04 img1.jpg](https://commons.wikimedia.org/wiki/File:Ibiza_City_Dalt_Vila_asv2023-04_img1.jpg) | A.Savin | FAL |
| `vedra.jpg` | [Ibiza sunset at Es Vedrà asv2023-04 img2.jpg](https://commons.wikimedia.org/wiki/File:Ibiza_sunset_at_Es_Vedr%C3%A0_asv2023-04_img2.jpg) | A.Savin | FAL |
| `bulbsign.jpg` | [Pacha Ibiza Bulb Sign.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Bulb_Sign.jpg) | pravin.premkumar | CC BY 2.0 |
| `cherries.jpg` | [Pacha Ibiza Cherries.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Cherries.jpg) | Angel Abril Ruiz | CC BY 2.0 |
| `crowd.jpg` | [Pacha Ibiza Crowd.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Crowd.jpg) | pravin.premkumar | CC BY 2.0 |
| `entrance.jpg` | [Pacha Ibiza Entrance.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Entrance.jpg) | Dominic Milton Trott | CC BY 2.0 |
| `mainroom.jpg` | [Pacha Ibiza Main Room.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Main_Room.jpg) | pravin.premkumar | CC BY 2.0 |
| `party.jpg` | [Pacha Ibiza Party.jpg](https://commons.wikimedia.org/wiki/File:Pacha_Ibiza_Party.jpg) | BOMBMAN | CC BY 2.0 |
