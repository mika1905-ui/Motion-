"""Rebuild the bottom of the phone back photos (covered by the store holder) from each phone's
own rim cross-section, so the product reads as a clean, free-standing phone."""
import numpy as np, cv2, os
from PIL import Image
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'products'))
def rr(h, w, r):
    m = np.zeros((h, w), np.uint8); cv2.rectangle(m, (r, 0), (w - 1 - r, h - 1), 255, -1); cv2.rectangle(m, (0, r), (w - 1, h - 1 - r), 255, -1)
    for cx, cy in [(r, r), (w - 1 - r, r), (r, h - 1 - r), (w - 1 - r, h - 1 - r)]: cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return m
for n in ['orange', 'blue', 'silver']:
    o = np.asarray(Image.open(f'{n}_back.png').convert('RGBA')).astype(np.float32) / 255.
    h, w = o.shape[:2]; rgb = o[..., :3]
    outer = rr(h, w, int(w * 0.13))
    pad = np.pad((outer > 127).astype(np.uint8), 2)
    dist = cv2.distanceTransform(pad, cv2.DIST_L2, 5)[2:-2, 2:-2]
    rows = slice(int(h * 0.55), int(h * 0.78)); T = int(w * 0.06)
    prof = (rgb[rows, :T].mean(0) + rgb[rows, w - T:][:, ::-1].mean(0)) / 2
    prof = cv2.GaussianBlur(prof[None], (1, 5), 0)[0]
    # rim width = where the profile settles to the glass colour
    # gcol = rgb[int(h * 0.70):int(h * 0.78), int(w * 0.3):int(w * 0.7)].reshape(-1, 3).mean(0)
    rimw = int(0.046 * w)   # aluminium rim width (measured on the orange and silver photos)
    g1 = cv2.GaussianBlur(rgb[int(h * .70):int(h * .74)].mean(0)[None], (1, 61), 0)[0]
    g2 = cv2.GaussianBlur(rgb[int(h * .78):int(h * .82)].mean(0)[None], (1, 61), 0)[0]
    slope = (g2 - g1) / (h * 0.08)
    yy = np.arange(h)[:, None].astype(np.float32)
    glass = g2[None] + slope[None] * np.clip(yy - h * 0.80, 0, None)[..., None] * 0.6
    rim = prof[np.clip(dist, 0, T - 1).astype(np.int32)]
    k = np.clip((dist - rimw + 1.5) / 3.0, 0, 1)[..., None]
    synth = rim * (1 - k) + glass * k
    seam = np.exp(-((dist - rimw) / 1.6) ** 2)[..., None]          # thin dark seam between rim and glass
    synth = synth * (1 - 0.18 * seam)
    rng = np.random.default_rng(1)
    synth = np.clip(synth + cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), .8)[..., None] * .006, 0, 1)
    cut, fb = int(h * 0.83), int(h * 0.03)
    ramp = np.clip((yy - (cut - fb)) / fb, 0, 1)[..., None]
    res = rgb * (1 - ramp) + synth * ramp
    Image.fromarray((np.dstack([res, outer / 255.]) * 255).astype(np.uint8)).save(f'{n}_back_clean.png')
    print(n, 'rim width', rimw)
