"""Cut the car out of assets/red_car.jpg -> assets/car_cutout.png (RGBA).

A hand-traced outline (in 2x preview coordinates of the 588x330 photo) bounds the
car; GrabCut refines the edge inside that band.
"""
import cv2, numpy as np

S = 3  # working upscale
OUTLINE_2X = [(62,262),(100,246),(180,244),(240,238),(300,220),(345,206),(420,190),(500,184),
              (580,182),(650,194),(720,214),(800,262),(818,240),(840,234),(858,244),(856,262),
              (836,276),(880,290),(950,288),(1000,293),(1050,338),(1102,382),(1108,482),(1060,494),
              (800,502),(620,494),(600,508),(540,518),(480,492),(462,472),(220,442),(150,462),
              (95,462),(66,432),(56,300)]

img = cv2.imread("assets/red_car.jpg")
img2 = cv2.resize(img, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
H, W = img2.shape[:2]
poly = (np.array(OUTLINE_2X, np.float32) * S / 2).astype(np.int32)
inside = np.zeros((H, W), np.uint8); cv2.fillPoly(inside, [poly], 255)
band_out = cv2.dilate(inside, np.ones((9*S, 9*S), np.uint8))
band_in = cv2.erode(inside, np.ones((9*S, 9*S), np.uint8))

mask = np.full((H, W), cv2.GC_BGD, np.uint8)
mask[band_out > 0] = cv2.GC_PR_BGD
mask[inside > 0] = cv2.GC_PR_FGD
mask[band_in > 0] = cv2.GC_FGD
bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
cv2.grabCut(img2, mask, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)

n, lab, st, _ = cv2.connectedComponentsWithStats(m)
m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
m = cv2.GaussianBlur(m, (5, 5), 0)

out = cv2.cvtColor(img2, cv2.COLOR_BGR2BGRA); out[..., 3] = m
ys, xs = np.where(m > 10)
out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cv2.imwrite("assets/car_cutout.png", out)
print(out.shape)
