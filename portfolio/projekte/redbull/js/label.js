// Red Bull spec – label artwork drawn as vectors (any resolution) + one raster logo (bulls).
// Coordinates: x in units of label height H, relative to the front centre (x = 0 faces the camera);
// y (v) in units of H from the top edge of the printed body.
import { HEAD } from './head.js';

export const CAN = { r: 0.47, bodyH: 2.33 };
export const ASPECT = (2 * Math.PI * CAN.r) / CAN.bodyH; // label width / height
const HALF = ASPECT / 2;

const RED = '#d0103f';
const FONT = 'Jost, "Futura", "Century Gothic", Arial, sans-serif';

export const FLAVORS = [
  { id: 'original', kind: 'classic', name: 'Red Bull Energy Drink', short: 'Original', sub: 'Der Klassiker',
    base: '#24418f', baseHi: '#3557ad', glow: '#3d6bff', liquid: '#f3c623', ui: '#4f7dff',
    desc: 'Das Original seit 1987. Mit Koffein, Taurin und B-Vitaminen – belebt Geist und Körper.', price: 1.69, sugar: '11 g' },
  { id: 'zero', kind: 'classic', zero: true, name: 'Red Bull Zero', short: 'Zero', sub: 'Zero Zucker · Zero Kalorien',
    base: '#8fbbe6', baseHi: '#acd0f2', glow: '#8cc8ff', liquid: '#f6dc78', ui: '#9fd0ff',
    desc: 'Der Geschmack von Red Bull – ohne Zucker und ohne Kalorien. Gleiche 80 mg Koffein pro Dose.', price: 1.69, sugar: '0 g' },
  { id: 'orange', kind: 'edition', word: 'ORANGE', name: 'The Orange Edition', short: 'Orange', sub: 'Orange-Kumquat',
    c1: '#f6741d', c2: '#e2520a', ink: '#ffffff', accent: '#ffffff', glow: '#ff7a1f', liquid: '#ff8a1c', ui: '#ff8a2e',
    desc: 'Sonnige Orange trifft auf herb-süße Kumquat. Spritzig, fruchtig, mit vollem Red-Bull-Effekt.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'purple', kind: 'edition', word: 'PURPLE', name: 'The Purple Edition', short: 'Purple', sub: 'Açai',
    c1: '#62248f', c2: '#45166a', ink: '#ffffff', accent: '#efb8e6', glow: '#9b4dff', liquid: '#8f3ad6', ui: '#b07cff',
    desc: 'Dunkle Açai-Beere – tief, fruchtig und ein bisschen geheimnisvoll.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'yellow', kind: 'edition', word: 'YELLOW', name: 'The Yellow Edition', short: 'Yellow', sub: 'Tropical',
    c1: '#f7d417', c2: '#ebbc00', ink: '#55585e', accent: '#7c8087', stroke: '#8d9097', glow: '#ffd62e', liquid: '#ffd21f', ui: '#ffd84a',
    desc: 'Tropische Früchte in der Dose. Der Sommer-Klassiker unter den Editions.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'blue', kind: 'edition', word: 'BLUE', name: 'The Blue Edition', short: 'Blue', sub: 'Heidelbeere',
    c1: '#2c3aa6', c2: '#1f2a85', ink: '#ffffff', accent: '#a9c6ff', glow: '#4b6bff', liquid: '#4a5cff', ui: '#7d95ff',
    desc: 'Saftige Heidelbeere mit frischem Finish. Beerig, kühl, belebend.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'green', kind: 'edition', word: 'GREEN', name: 'The Green Edition', short: 'Green', sub: 'Kiwi-Apfel',
    c1: '#92cc2c', c2: '#6fb01a', ink: '#3f4448', accent: '#3f4448', stroke: '#5a6066', glow: '#9be33a', liquid: '#9bdc2a', ui: '#a6e04f',
    desc: 'Grüne Kiwi und knackiger Apfel. Frisch, leicht säuerlich, richtig wach.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'ruby', kind: 'edition', word: 'RUBY', name: 'The Ruby Edition', short: 'Ruby', sub: 'Pink Grapefruit',
    c1: '#e0164f', c2: '#bd0a40', ink: '#ffffff', accent: '#ffd23a', glow: '#ff2d6b', liquid: '#ff3d70', ui: '#ff5c8a',
    desc: 'Pinke Grapefruit – fruchtig-herb, leuchtend und unverwechselbar.', price: 1.69, sugar: '≈ 11 g' },
  { id: 'summer', kind: 'edition', word: 'SUMMER', name: 'The Summer Edition', short: 'Summer', sub: 'Kokos-Blaubeere',
    c1: '#fbfbfc', c2: '#e9ebee', ink: '#7c8086', accent: '#1f63c6', stroke: '#8a8e94', head: ['#9a9ea5', '#7d8188'], glow: '#7fb4ff', liquid: '#cfe2ff', ui: '#9cc4ff',
    desc: 'Cremige Kokosnuss trifft Blaubeere. Die limitierte Sommer-Sorte.', price: 1.69, sugar: '≈ 11 g' },
];

let bullsImg = null;
export async function loadLabelAssets(base = '') {
  const fonts = Promise.all(['700 50px Jost', '800 50px Jost', '500 50px Jost', 'italic 500 50px Jost', '400 50px Jost']
    .map(f => document.fonts.load(f).catch(() => {})));
  const img = new Image();
  img.decoding = 'async';
  img.src = new URL('../img/rb-bulls.webp', import.meta.url).href;
  await Promise.race([Promise.all([fonts, img.decode().catch(() => {})]), new Promise(r => setTimeout(r, 4000))]);
  bullsImg = img.complete && img.naturalWidth ? img : null;
}

/* ---------- helpers ---------- */
function mix(a, b, t) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// draw fn(ctx) at x-offsets 0 and ±W so artwork near the seam wraps cleanly
function wrap(ctx, W, fn) { for (const o of [-W, 0, W]) { ctx.save(); ctx.translate(o, 0); fn(); ctx.restore(); } }

function spaced(ctx, text, cx, y, size, weight, width) {
  // even letter spacing so the word spans exactly `width`
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'left';
  const ch = [...text], ws = ch.map(c => ctx.measureText(c).width);
  const gap = (width - ws.reduce((a, b) => a + b, 0)) / (ch.length - 1 || 1);
  let x = cx - width / 2;
  ch.forEach((c, i) => { ctx.fillText(c, x, y); x += ws[i] + gap; });
}

function silverFill(ctx, x0, x1, y0, y1, hi = '#eef0f3', lo = '#c3c8cf') {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hi); g.addColorStop(0.5, mix(hi, lo, 0.45)); g.addColorStop(1, lo);
  return g;
}

function grain(ctx, W, H, alpha = 0.035) {
  // fine vertical brushed lines – looks like printed aluminium up close
  ctx.save();
  ctx.globalAlpha = alpha;
  let s = 11;
  for (let x = 0; x < W; x += 2) {
    s = (s * 9301 + 49297) % 233280;
    ctx.fillStyle = s % 2 ? '#ffffff' : '#000000';
    ctx.fillRect(x, 0, 1, H);
  }
  ctx.restore();
}

function backPanels(ctx, W, H, X, f, dark) {
  const ink = dark ? '#1b2440' : '#ffffff';
  // left back: warning + ingredients
  const px = X(-0.6), py = 0.2 * H, pw = 0.215 * H;
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.14)';
  roundRect(ctx, px - 0.012 * H, py - 0.03 * H, pw + 0.024 * H, 0.47 * H, 0.012 * H); ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = `700 ${0.022 * H}px ${FONT}`;
  ctx.fillText('ZUTATEN', px, py);
  ctx.font = `400 ${0.0145 * H}px ${FONT}`;
  const lines = [f.zero ? 'Wasser, Säuerungsmittel Citronensäure,' : 'Wasser, Saccharose, Glucose,',
    f.zero ? 'Kohlensäure, Säureregulator Natrium-' : 'Säuerungsmittel Citronensäure,',
    f.zero ? 'citrate, Taurin, Süßungsmittel' : 'Kohlensäure, Säureregulatoren,',
    f.zero ? '(Acesulfam K, Sucralose), Koffein,' : 'Taurin, Koffein, Vitamine',
    f.zero ? 'Vitamine (Niacin, B5, B6, B12),' : '(Niacin, Pantothensäure, B6, B12),',
    'Aromen' + (f.kind === 'edition' ? ' (' + f.sub + ')' : '') + ', Farbstoffe.', '',
    'Erhöhter Koffeingehalt.', 'Für Kinder und schwangere oder', 'stillende Frauen nicht empfohlen', '(32 mg/100 ml).', '',
    'Konzept-Darstellung · FLUXE Studio.', 'Verbindlich sind die Angaben', 'auf der Originaldose.'];
  lines.forEach((l, i) => ctx.fillText(l, px, py + 0.04 * H + i * 0.0235 * H));
  ctx.restore();

  // right back: barcode + volume
  const qx = X(0.42), qy = 0.24 * H;
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.14)';
  roundRect(ctx, qx - 0.015 * H, qy - 0.015 * H, 0.2 * H, 0.33 * H, 0.012 * H); ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qx, qy, 0.15 * H, 0.09 * H, 0.008 * H); ctx.fill();
  ctx.fillStyle = '#000';
  let s = 5, x = qx + 0.012 * H;
  while (x < qx + 0.138 * H) {
    s = (s * 9301 + 49297) % 233280;
    const w = (1 + (s % 4)) * 0.0011 * H;
    ctx.fillRect(x, qy + 0.01 * H, w, 0.06 * H);
    x += w + (1 + (s % 3)) * 0.001 * H;
  }
  ctx.font = `500 ${0.011 * H}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('9 002490 000000', qx + 0.075 * H, qy + 0.083 * H);
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = `700 ${0.05 * H}px ${FONT}`;
  ctx.fillText('250 ml', qx, qy + 0.17 * H);
  ctx.font = `400 ${0.0145 * H}px ${FONT}`;
  ['Am besten eiskalt genießen.', 'Kohlensäurehaltig.', '', 'Pfand 0,25 €'].forEach((l, i) => ctx.fillText(l, qx, qy + 0.215 * H + i * 0.024 * H));
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wordmark(ctx, X, H, cx, base, cap, width, color) {
  // "Red Bull" in a geometric heavy sans; cap height ≈ 0.7 em for Jost
  const size = cap / 0.7;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.translate(X(cx), base * H);
  ctx.font = `800 ${size}px ${FONT}`;
  const w = ctx.measureText('Red Bull').width;
  ctx.scale(width / w, 1);
  ctx.textAlign = 'center';
  ctx.fillText('Red Bull', 0, 0);
  ctx.restore();
  ctx.font = `500 ${cap * 0.16}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('®', X(cx) + width / 2 + cap * 0.03, base * H - cap * 0.86);
}

/* ---------- classic: Original & Zero ---------- */
function drawClassic(ctx, W, H, f) {
  const X = x => W / 2 + x * H;
  ctx.fillStyle = f.base;
  ctx.fillRect(0, 0, W, H);
  // soft vertical light on the blue
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 8; i++) lg.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

  const split = 0.522;
  const xd = v => 0.111 - 0.212 * v;           // front diagonal
  const sil = silverFill(ctx, 0, W, 0, H);
  ctx.fillStyle = sil;
  wrap(ctx, W, () => {
    // top half: silver between front diagonal and back diagonal
    ctx.beginPath();
    ctx.moveTo(X(xd(0)), 0); ctx.lineTo(X(xd(0) + HALF), 0); ctx.lineTo(X(xd(split) + HALF), split * H); ctx.lineTo(X(xd(split)), split * H);
    ctx.closePath(); ctx.fill();
    // bottom half: silver between back diagonal (left) and front diagonal
    ctx.beginPath();
    ctx.moveTo(X(xd(split) - HALF), split * H); ctx.lineTo(X(xd(split)), split * H); ctx.lineTo(X(xd(1)), H); ctx.lineTo(X(xd(1) - HALF), H);
    ctx.closePath(); ctx.fill();
  });
  grain(ctx, W, H, 0.03);

  if (f.zero) {
    // silver top band with repeating "ZERO KALORIEN"
    ctx.fillStyle = silverFill(ctx, 0, W, 0, 0.045 * H, '#f1f2f4', '#d3d7dc');
    ctx.fillRect(0, 0, W, 0.045 * H);
    ctx.fillStyle = RED;
    ctx.font = `700 ${0.026 * H}px ${FONT}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const t = 'ZERO KALORIEN  •  ', tw = ctx.measureText(t).width;
    ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
    for (let x = -tw; x < W + tw * 2; x += tw) ctx.fillText(t, x, 0.024 * H);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  } else {
    ctx.fillStyle = '#f0c75e';
    ctx.font = `500 ${0.021 * H}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('Am besten eiskalt.', X(-0.222), 0.104 * H);
    ctx.fillText('Kohlensäurehaltig.', X(-0.222), 0.131 * H);
  }

  // wordmark, bulls, descriptor
  wordmark(ctx, X, H, 0.012, 0.457, 0.11 * H, 0.465 * H, RED);
  if (bullsImg) ctx.drawImage(bullsImg, X(-0.1621), 0.4546 * H, 0.3238 * H, 0.1304 * H);
  ctx.fillStyle = RED;
  if (f.zero) spaced(ctx, 'ZERO', X(0.005), 0.632 * H, 0.052 * H, 500, 0.3 * H);
  else spaced(ctx, 'ENERGY DRINK', X(0.004), 0.62 * H, 0.042 * H, 500, 0.42 * H);

  // claim band
  const by = 0.912 * H, bh = 0.036 * H;
  if (f.zero) {
    ctx.fillStyle = 'rgba(235,238,242,.75)';
    ctx.fillRect(X(-0.225), by, 0.485 * H, bh);
    ctx.fillStyle = '#6b7079';
  } else {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(X(-0.05), by, 0.31 * H, bh);
    ctx.fillStyle = '#21357c'; ctx.fillRect(X(-0.225), by, 0.175 * H, bh);
  }
  ctx.font = `500 ${0.026 * H}px ${FONT}`;
  ctx.textAlign = 'left';
  if (!f.zero) ctx.fillStyle = '#ffffff';
  ctx.fillText('Mit Taurin.', X(-0.21), by + bh * 0.76);
  if (!f.zero) ctx.fillStyle = '#21357c';
  ctx.fillText('Belebt Geist und Körper®', X(-0.035), by + bh * 0.76);

  backPanels(ctx, W, H, X, f, true);
}

/* ---------- editions ---------- */
function headPath(H, X, ox) {
  const p = new Path2D();
  for (const poly of HEAD) {
    poly.forEach(([x, y], i) => (i ? p.lineTo(X(x + ox), y * H) : p.moveTo(X(x + ox), y * H)));
    p.closePath();
  }
  return p;
}

function drawEdition(ctx, W, H, f) {
  const X = x => W / 2 + x * H;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, f.c1); g.addColorStop(1, f.c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 8; i++) lg.addColorStop(i / 8, i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

  // silver bull head (front) + silver shoulder band that wraps round the back
  const hd = f.head || ['#eef0f3', '#b9bec6'];
  const hg = ctx.createLinearGradient(0, 0, 0, 0.3 * H);
  hg.addColorStop(0, hd[0]); hg.addColorStop(1, hd[1]);
  ctx.fillStyle = hg;
  wrap(ctx, W, () => {
    ctx.fill(headPath(H, X, 0), 'evenodd');
    ctx.beginPath();
    const xr = 0.2405, xl = -0.2375 + ASPECT;   // right edge of head → round the back → left edge
    ctx.moveTo(X(xr - 0.002), 0);
    ctx.lineTo(X(xl + 0.002), 0);
    ctx.lineTo(X(xl + 0.002), 0.045 * H);
    ctx.bezierCurveTo(X(xl - 0.2), 0.05 * H, X(xr + 0.25), 0.13 * H, X(xr - 0.002), 0.123 * H);
    ctx.closePath(); ctx.fill();
  });
  grain(ctx, W, H, 0.025);

  ctx.textBaseline = 'alphabetic';
  const L = -0.238;
  // THE
  ctx.fillStyle = f.ink;
  ctx.font = `700 ${0.05 * H}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('THE', X(L), 0.36 * H);
  // big outlined edition word
  const cap = 0.085 * H, size = cap / 0.7;
  ctx.save();
  ctx.translate(X(L), 0.458 * H);
  ctx.font = `700 ${size}px ${FONT}`;
  const ww = ctx.measureText(f.word).width;
  ctx.scale(Math.min(1.7, 0.525 * H / ww), 1);
  ctx.textAlign = 'left';
  // outline: wide stroke first, fill on top hides the font's inner overlap contours
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.009 * H;
  ctx.strokeStyle = f.stroke || '#ffffff';
  ctx.strokeText(f.word, 0, 0);
  ctx.fillStyle = mix(f.c1, '#ffffff', f.id === 'summer' ? 0 : 0.14);
  ctx.fillText(f.word, 0, 0);
  ctx.restore();
  ctx.fillStyle = f.ink;
  ctx.font = `500 ${0.042 * H}px ${FONT}`;
  ctx.fillText('EDITION', X(L), 0.52 * H);

  // vertical "Red Bull" (reads bottom → top)
  ctx.save();
  ctx.translate(X(-0.152), 0.965 * H);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `800 ${0.165 * H}px ${FONT}`;
  const vw = ctx.measureText('Red Bull').width;
  ctx.scale(0.4 * H / vw, 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = f.ink;
  ctx.globalAlpha = f.ink === '#ffffff' ? 0.95 : 1;
  ctx.fillText('Red Bull', 0, 0);
  ctx.restore();

  // flavour line
  ctx.fillStyle = f.accent; ctx.strokeStyle = f.accent;
  ctx.lineWidth = 0.003 * H;
  ctx.beginPath(); ctx.moveTo(X(-0.062), 0.725 * H); ctx.lineTo(X(0.42), 0.725 * H); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(-0.062), 0.725 * H, 0.008 * H, 0, Math.PI * 2); ctx.fill();
  ctx.font = `italic 500 ${0.037 * H}px ${FONT}`;
  ctx.fillText(f.sub, X(-0.035), 0.712 * H);

  ctx.fillStyle = f.ink;
  ctx.font = `500 ${0.03 * H}px ${FONT}`;
  ctx.fillText('ENERGY DRINK', X(-0.05), 0.875 * H);
  ctx.font = `400 ${0.023 * H}px ${FONT}`;
  ctx.fillText('Belebt Geist und Körper®', X(-0.05), 0.912 * H);

  backPanels(ctx, W, H, X, f, f.ink !== '#ffffff');
}

/** Full wrap-around label. width = texture width in px. */
export function drawLabel(f, width = 2048) {
  const W = width, H = Math.round(width / ASPECT);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  (f.kind === 'classic' ? drawClassic : drawEdition)(ctx, W, H, f);
  return c;
}

/** Metal/roughness map derived from the artwork: unsaturated light areas = bare aluminium. */
export function drawMaterialMap(label, f) {
  const w = Math.min(label.width, 2048), h = Math.round(w / ASPECT);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(label, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h), p = d.data;
  const paintWhite = f.id === 'summer';
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, lum = (r + g + b) / 765;
    let metal = Math.max(0, 1 - sat / 0.14) * Math.min(1, Math.max(0, (lum - 0.5) / 0.2));
    if (lum > 0.965 || (paintWhite && lum > 0.86)) metal = 0;   // white ink / pearl-white paint
    const m = 0.2 + 0.68 * metal;              // printed colours keep a slight metallic sheen
    const rough = 0.36 - 0.2 * metal;
    p[i] = 255; p[i + 1] = Math.round(rough * 255); p[i + 2] = Math.round(m * 255); p[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}
