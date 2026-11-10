"""Cut the shield badge out of assets/badge_source.jpg (badge on black) -> assets/badge.png."""
import cv2, numpy as np

img = cv2.imread("assets/badge_source.jpg")
lum = img.max(2).astype(np.float32)
m = lum > 120
n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
m = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 800])
# the shield is convex: its hull drops the glow halo and fills the black horse
pts = np.column_stack(np.where(m)[::-1]).astype(np.int32)
m = np.zeros(m.shape, np.uint8)
cv2.fillPoly(m, [cv2.convexHull(pts)], 255)
m = cv2.erode(m, np.ones((5, 5), np.uint8))
a = cv2.GaussianBlur(m, (0, 0), 1.0)
out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA); out[..., 3] = a
ys, xs = np.where(a > 10)
out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cv2.imwrite("assets/badge.png", out)
print(out.shape)
