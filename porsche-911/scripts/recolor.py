"""Builds paint variants of the source photo by re-tinting only the Python Green paint.
Usage: python3 scripts/recolor.py <source image> <assets dir>"""
import sys, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); W, H = im.size
im.save(f'{out}/911-python-green.jpg', quality=90)
hsv = np.asarray(im.convert('HSV')).astype(np.float32)
h, s, v = hsv[...,0]*360/255, hsv[...,1]/255, hsv[...,2]/255
paint = (((h > 55) & (h < 165) & (s > .15) & (v > .12)) |
         ((h >= 165) & (h < 200) & (s > .18) & (v > .5)))
# body outline traced on the source photo (fractions of width/height) - excludes background & tyres
OUTLINE = [(405,298),(500,288),(590,240),(700,190),(850,160),(1000,153),(1150,163),(1250,200),(1340,288),
  (1400,298),(1550,318),(1650,328),(1705,380),(1745,440),(1750,480),(1745,560),(1700,592),(1470,602),(940,598),
  (640,590),(368,566),(358,450),(378,330)]
WINDSHIELD = [(880,176),(1160,166),(1262,203),(1352,294),(905,306)]
from PIL import ImageDraw
poly = Image.new('L', (W, H), 0)
ImageDraw.Draw(poly).polygon([(x/2000*W, y/667*H) for x, y in OUTLINE], fill=255)
ImageDraw.Draw(poly).polygon([(x/2000*W, y/667*H) for x, y in WINDSHIELD], fill=0)
# small painted parts that sit next to glass (A-pillar, far mirror): accept any green/teal there
extra = Image.new('L', (W, H), 0); d = ImageDraw.Draw(extra)
d.polygon([(x/2000*W, y/667*H) for x, y in [(862,175),(905,168),(952,302),(900,306)]], fill=255)
d.polygon([(x/2000*W, y/667*H) for x, y in [(1325,262),(1390,262),(1395,302),(1325,302)]], fill=255)
paint |= (np.asarray(extra) > 0) & (h > 55) & (h < 205) & (s > .12) & (v > .15)
mask = paint.astype(np.float32) * ((np.asarray(poly) > 0) | (np.asarray(extra) > 0))
m = Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(2))
m.save(f'{out}/_mask.png')
mask = np.asarray(m).astype(np.float32)[...,None]/255
rgb = np.asarray(im).astype(np.float32)/255
lum = (rgb*[.3,.59,.11]).sum(-1, keepdims=True)
def tint(target, gain=1.0, lift=0.0, gamma=1.0):
    t = np.array(target, np.float32)/255
    l = np.clip(lum*gain+lift, 0, 1)**gamma
    # overlay-style: keep reflections/highlights from luminance
    col = np.where(l < .5, 2*l*t, 1-2*(1-l)*(1-t))
    return col
variants = {
  'shark-blue':   tint((24, 92, 210), gain=1.7),
  'guards-red':   tint((205, 18, 28), gain=1.7),
  'carrara-white':tint((232, 233, 236), gain=1.9, lift=.12),
}
for name, col in variants.items():
    res = rgb*(1-mask) + col*mask
    Image.fromarray((np.clip(res,0,1)*255).astype(np.uint8)).save(f'{out}/911-{name}.jpg', quality=90)
