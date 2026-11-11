"""Crops the studio renders to their content and writes web-ready WebP files."""
from pathlib import Path
from PIL import Image
src = Path(__file__).resolve().parent.parent / "site/img/src"
dst = src.parent
for p in sorted(src.glob("*.png")):
    im = Image.open(p).convert("RGBA")
    l, t, r, b = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = int(0.04 * max(r - l, b - t))
    im = im.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, im.width), min(b + pad, im.height)))
    maxh = 1000 if p.stem.startswith("can-") else 1100
    if im.height > maxh:
        im = im.resize((round(im.width * maxh / im.height), maxh), Image.LANCZOS)
    im.save(dst / f"{p.stem}.webp", "WEBP", quality=86, method=6)
    print(p.stem, im.size, (dst / f"{p.stem}.webp").stat().st_size // 1024, "KB")
