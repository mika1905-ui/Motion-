# VOLTA Energy – 3D Motion Website

An Apple-style product page for a fictional energy drink, **VOLTA**, built around a real-time 3D can (Three.js) with liquid motion.

## What's on the page
- **Intro:** the can falls into the scene and lands with a liquid splash.
- **Hero:** a giant "VOLTA" word with parallax, droplets that orbit the can, and pointer tilt. Clicking the hero makes the drink splash.
- **"Was drin ist"** (scroll-driven, sticky): the can spins, the four key facts light up one after another, and then the **pull tab opens** with a fountain of drops. "Pssst."
- **Geschmäcker:** six flavours. Each switch spins the can, swaps the label and fires a splash in the new colour. Light, glow and accent colours change across the whole page. ← → keys work here too.
- **Fast scrolling** flings drops off the can.
- **Bento grid** with count-up numbers and 3D tilt cards.
- **Shop** (single can / 12 pack / 24 tray) with a cart counter, **price tiers** including a subscription, **FAQ** and footer.

All images are original. The cans are generated procedurally: the geometry and the label artwork (canvas) live in `js/can.js`. The product photos in `img/` are rendered from that same model.

## Run locally
The page uses ES modules, so serve it over HTTP:

```bash
cd site && python3 -m http.server 8000   # → http://localhost:8000
```

Works on GitHub Pages too (serve the `site/` folder). No build step, and all libraries are stored locally (`vendor/`).

## Regenerate the product images
```bash
node tools/render_images.mjs     # needs Playwright + Chromium → site/img/src/*.png
python3 tools/pack_images.py     # crops → site/img/*.webp
```

## Customise
Flavours, colours, prices and copy live in `FLAVORS` in `js/can.js`. Pack prices are in `PACKS` in `js/main.js`.
