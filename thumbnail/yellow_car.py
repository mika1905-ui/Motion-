"""Recolour the red car cutout to yellow -> assets/car_yellow.png."""
import numpy as np
from PIL import Image

im = Image.open("assets/car_cutout.png").convert("RGBA")
a = np.asarray(im)[..., 3]
hsv = np.asarray(im.convert("RGB").convert("HSV")).astype(np.float32)
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
red = (h < 24) | (h > 226)                        # body paint (any saturation, so edges follow)
w = np.clip((s - 40) / 110, 0, 1) * red           # how strongly a pixel is paint
h = np.where(red, 33.0, h)                        # ~47 deg: warm yellow
v = np.clip(v * (1 + 0.16 * w) + 14 * w, 0, 255)  # yellow needs a bit more value than red
out = Image.fromarray(np.stack([h, s, v], -1).astype(np.uint8), "HSV").convert("RGB")
out.putalpha(Image.fromarray(a))
out.save("assets/car_yellow.png")
