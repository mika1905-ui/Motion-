import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import {
  BRAND, FLAVORS, PRODUCTS, BUNDLES, NUTRITION, FREE_SHIPPING_FROM, DEPOSIT, flavorById, formatPrice,
} from './products.js';

// ───────────────────────── helpers ─────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = "'Archivo', 'Arial Narrow', Arial, sans-serif";

// ───────────────────────── label texture ─────────────────────────
const labelCache = new Map();
function labelTexture(f) {
  if (labelCache.has(f.id)) return labelCache.get(f.id);
  const W = 2048, H = 640, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = f.label; g.fillRect(0, 0, W, H);
  // feine Streifen oben/unten
  g.fillStyle = f.labelText;
  g.globalAlpha = 0.9;
  g.fillRect(0, 34, W, 8); g.fillRect(0, H - 42, W, 8);
  g.globalAlpha = 1;
  // zweimal ums Etikett: Logo + Sorte
  for (let k = 0; k < 2; k++) {
    const cx = W * (0.25 + k * 0.5);
    g.save();
    g.translate(cx, H / 2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = f.labelText;
    g.font = `italic 900 300px ${FONT}`;
    g.save(); g.scale(0.78, 1); g.fillText(BRAND, 0, -40); g.restore();
    g.font = `800 64px ${FONT}`;
    g.fillText(`COLA · ${f.name.toUpperCase()}`, 0, 170);
    g.restore();
  }
  // Swoosh
  g.strokeStyle = f.labelText; g.lineWidth = 10; g.globalAlpha = 0.55;
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    const x0 = W * (0.06 + k * 0.5), x1 = x0 + W * 0.38;
    g.moveTo(x0, H * 0.72); g.bezierCurveTo(x0 + 200, H * 0.62, x1 - 300, H * 0.86, x1, H * 0.7); g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  labelCache.set(f.id, t);
  return t;
}

// ───────────────────────── geometry ─────────────────────────
// Flaschenprofil (Radius, Höhe), Ursprung in der Flaschenmitte
const BOTTLE_PROFILE = [
  [0.0, 0], [0.48, 0], [0.56, 0.05], [0.58, 0.16], [0.58, 1.55], [0.55, 1.78], [0.43, 2.1],
  [0.29, 2.4], [0.21, 2.62], [0.2, 2.95], [0.235, 3.0], [0.235, 3.1], [0.2, 3.13],
];
const B_OFF = 1.6; // Höhe/2
const NECK_TIP = 3.1 - B_OFF;
const latheFrom = (pts, yOff = 0, inset = 0, seg = 72) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r - inset), y - yOff)), seg);

const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.17,
  clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
});

function buildBottle(f, { clip } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(latheFrom(BOTTLE_PROFILE, B_OFF), glassMat());
  glass.renderOrder = 3;
  g.add(glass);

  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(f.liquid), roughness: 0.15, clearcoat: 0.6, transparent: true, opacity: 0.94,
    side: THREE.DoubleSide, clippingPlanes: clip ? [clip] : null,
  });
  const inner = BOTTLE_PROFILE.slice(0, -3).map(([r, y]) => [r, y]);
  const liquid = new THREE.Mesh(latheFrom(inner.concat([[0.0, 2.95]]), B_OFF, 0.035), liquidMat);
  liquid.renderOrder = 1;
  g.add(liquid);

  const labelMat = new THREE.MeshPhysicalMaterial({ map: labelTexture(f), roughness: 0.4, clearcoat: 0.5 });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.586, 0.586, 0.95, 96, 1, true), labelMat);
  label.position.y = 0.72 - B_OFF + 0.2;
  label.rotation.y = -Math.PI / 2;
  label.renderOrder = 4;
  g.add(label);

  const capMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(f.cap), metalness: 0.85, roughness: 0.3, clearcoat: 1 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.17, 28, 1), capMat);
  cap.position.y = 3.06 - B_OFF;
  g.add(cap);

  g.userData = { liquid, liquidMat, label, labelMat, cap, capMat };
  return g;
}

function setBottleFlavor(b, f) {
  const u = b.userData;
  u.labelMat.map = labelTexture(f); u.labelMat.needsUpdate = true;
  u.capMat.color.set(f.cap);
  u.liquidMat.color.set(f.liquid);
}

// ───────────────────────── renderer & scene ─────────────────────────
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.set(0, 0, 11);
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 6); scene.add(key);
const rim = new THREE.PointLight(0xff2d45, 40, 25); rim.position.set(-4, 2, -3); scene.add(rim);
const rim2 = new THREE.PointLight(0xff8a50, 18, 20); rim2.position.set(4, -2, -2); scene.add(rim2);

const stage = new THREE.Group();
scene.add(stage);

// Flasche
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
let bottle;

// Glas (Tumbler), Ursprung am Boden
const GLASS_H = 1.75;
const glassProfile = [[0, 0], [0.6, 0], [0.63, 0.03], [0.74, GLASS_H], [0.71, GLASS_H], [0.6, 0.16], [0, 0.16]];
const tumbler = new THREE.Group();
const tumblerMesh = new THREE.Mesh(latheFrom(glassProfile, 0, 0, 80), glassMat());
tumblerMesh.renderOrder = 3;
tumbler.add(tumblerMesh);
const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.725, 0.012, 8, 100),
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0 }));
rimRing.rotation.x = Math.PI / 2; rimRing.position.y = GLASS_H;
tumbler.add(rimRing);
stage.add(tumbler);

const LIQ_BASE = 0.165, LIQ_MAX = 1.42;
const glassLiquidMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(FLAVORS[0].liquid), roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.97,
});
const glassLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.585, 1, 72), glassLiquidMat);
let liquidH = -1;
glassLiquid.position.y = LIQ_BASE;
glassLiquid.renderOrder = 1;
tumbler.add(glassLiquid);

const foamMat = new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 1, transparent: true, opacity: 0.95 });
const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.66, 1, 64), foamMat);
foam.renderOrder = 2;
tumbler.add(foam);

// Bläschen
const BUBBLES = 140;
const bubbleMesh = new THREE.InstancedMesh(
  new THREE.SphereGeometry(1, 8, 6),
  new THREE.MeshPhysicalMaterial({ color: 0xffe2c8, roughness: 0.1, transparent: true, opacity: 0.6 }),
  BUBBLES,
);
bubbleMesh.renderOrder = 2;
tumbler.add(bubbleMesh);
const bubbles = Array.from({ length: BUBBLES }, () => ({
  a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()) * 0.55, y: Math.random(),
  s: 0.008 + Math.random() * 0.018, v: 0.15 + Math.random() * 0.35, w: Math.random() * 6,
}));

// Eiswürfel
const iceMat = new THREE.MeshPhysicalMaterial({
  color: 0xdff3ff, roughness: 0.12, transparent: true, opacity: 0.5, clearcoat: 1, envMapIntensity: 2, depthWrite: false,
});
const ice = [0, 1, 2].map((i) => {
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.07), iceMat);
  m.userData = { ox: [-0.2, 0.22, 0.02][i], oz: [0.12, -0.05, -0.25][i], floor: 0.38 + i * 0.32, rot: [0.3, 1.1, 2.0][i] };
  m.renderOrder = 4;
  tumbler.add(m);
  return m;
});

// Strahl
const streamMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(FLAVORS[0].liquid).multiplyScalar(1.6), roughness: 0.05, clearcoat: 1,
  transparent: true, opacity: 0.95,
});
const stream = new THREE.Mesh(new THREE.BufferGeometry(), streamMat);
stream.renderOrder = 2;
scene.add(stream);

// Spritzer beim Aufprall
const DROPS = 26;
const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), streamMat, DROPS);
scene.add(dropMesh);
const drops = Array.from({ length: DROPS }, (_, i) => ({ t: i / DROPS, a: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.6 }));

// ───────────────────────── resize ─────────────────────────
let portrait = false;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  portrait = w / h < 0.9;
  camera.position.z = w / h < 0.6 ? 17 : w / h < 0.9 ? 15 : w / h < 1.3 ? 12.5 : 11;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; });

// ───────────────────────── scroll choreography ─────────────────────────
const secPour = $('#pour'), secFlav = $('#flavors'), secBrand = $('#brand');
const heroText = $('.hero-text');
const lines = [...document.querySelectorAll('.big-line')];
const stats = $('.stats');
const progress = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
const enter = (el) => clamp(1 - el.getBoundingClientRect().top / innerHeight);

const S = { // aktueller Zustand
  sx: 0, sy: 0, ss: 1,
  bx: 0, by: -1.4, brz: -0.12, bry: 0, cap: 0, remain: 1,
  gx: -0.4, gy: -8, fill: 0, foam: 0, iceDrop: 0, pour: 0, opacity: 1,
};
const T = { ...S };

let statsDone = false;
function countUp() {
  if (statsDone) return; statsDone = true;
  stats.querySelectorAll('b').forEach((b) => {
    const to = parseFloat(b.dataset.count), dec = +(b.dataset.decimals || 0), suf = b.dataset.suffix || '';
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / 1400);
      b.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(dec).replace('.', ',') + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function computeTargets(t) {
  const side = portrait ? 0 : 1.5;
  const pHero = clamp(scrollY / innerHeight);
  heroText.style.transform = `translateY(${pHero * -80}px) scale(${1 - pHero * 0.1})`;
  heroText.style.opacity = 1 - pHero * 1.6;

  // Hero: Flasche mittig unter der Headline
  let sx = 0, sy = portrait ? -1.6 : -0.2, ss = portrait ? 0.85 : 1;
  let bx = 0, by = portrait ? -2.6 : -2.75, brz = -0.12, bry = Math.sin(t * 0.6) * 0.5;
  let gx = -0.45, gy = -9;
  let cap = 0, remain = 1, fill = 0, foamV = 0, iceDrop = 0, pour = 0;

  // → Einschenken
  const p = progress(secPour);
  const e = enter(secPour);
  sx = lerp(sx, side, e); sy = lerp(sy, portrait ? -1.2 : -0.6, e);
  bx = lerp(bx, 0.95, e); by = lerp(by, -0.15, e); brz = lerp(brz, 0, e);
  gy = lerp(gy, -2.0, smooth(0.3, 1, e));

  cap = smooth(0.02, 0.1, p);
  iceDrop = smooth(0.11, 0.24, p);
  const tilt = smooth(0.24, 0.34, p) * (1 - smooth(0.8, 0.9, p));
  bx = lerp(bx, 1.05, tilt); by = lerp(by, 0.85, tilt); brz = lerp(brz, 1.88, tilt);
  bry = lerp(bry, 0, Math.max(tilt, e));
  pour = smooth(0.33, 0.37, p) * (1 - smooth(0.77, 0.81, p));
  fill = smooth(0.35, 0.79, p);
  remain = 1 - fill * 0.85;
  foamV = smooth(0.38, 0.5, p) * (1 - smooth(0.78, 0.97, p)) * 0.7 + fill * 0.08;
  bx = lerp(bx, 1.35, smooth(0.86, 0.96, p));

  const step = p < 0.11 ? 0 : p < 0.24 ? 1 : p < 0.82 ? 2 : 3;
  lines.forEach((l, i) => l.classList.toggle('on', i === step && p > 0.005 && p < 0.985));
  stats.classList.toggle('on', p > 0.84 && p < 0.985);
  if (p > 0.84) countUp();

  // → Sorten
  const eF = enter(secFlav), pF = progress(secFlav);
  sx = lerp(sx, side, eF); sy = lerp(sy, portrait ? -1.0 : -0.3, eF);
  bx = lerp(bx, 0.8, eF); by = lerp(by, 0.05, eF);
  gx = lerp(gx, -0.75, eF); gy = lerp(gy, -1.9, eF);
  cap = lerp(cap, 0, smooth(0.3, 0.8, eF));
  remain = lerp(remain, 1, smooth(0.3, 0.8, eF));
  const idx = Math.min(FLAVORS.length - 1, Math.floor(pF * FLAVORS.length));
  setFlavor(eF > 0.5 ? idx : 0);
  const local = idx === FLAVORS.length - 1 && pF >= 1 ? 1 : (pF * FLAVORS.length) % 1;
  bry += eF * (idx + smooth(0, 0.3, local)) * Math.PI * 2;

  // → raus
  const eB = enter(secBrand);
  const out = smooth(0, 0.55, eB);
  sy = lerp(sy, 4.5, out);

  Object.assign(T, { sx, sy, ss, bx, by, brz, bry, cap, remain, gx, gy, fill, foam: foamV, iceDrop, pour, opacity: 1 - smooth(0.2, 0.6, eB) });
}

// ───────────────────────── flavors UI ─────────────────────────
const panels = $('#flavor-panels'), dots = $('#flavor-dots');
FLAVORS.forEach((f, i) => {
  const el = document.createElement('div');
  el.className = 'flavor-panel';
  el.innerHTML = `
    <div class="num">0${i + 1} / 0${FLAVORS.length}</div>
    <h2 style="color:${f.light}">${f.name}</h2>
    <h3>${f.tagline}</h3>
    <p>${f.copy}</p>
    <a href="#shop" class="btn primary" style="background:${f.accent};box-shadow:0 8px 30px -8px ${f.accent}">${f.name} bestellen</a>`;
  panels.appendChild(el);
  dots.appendChild(document.createElement('i'));
});

let currentFlavor = 0;
function setAccent(f) {
  const r = document.documentElement.style;
  r.setProperty('--accent', f.accent);
  r.setProperty('--accent-light', f.light);
  rim.color.set(f.accent);
}
function setFlavor(i) {
  [...panels.children].forEach((p, k) => p.classList.toggle('on', k === i));
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  if (i === currentFlavor || !bottle) return;
  currentFlavor = i;
  const f = FLAVORS[i];
  setBottleFlavor(bottle, f);
  glassLiquidMat.color.set(f.liquid);
  streamMat.color.set(f.liquid).multiplyScalar(1.6);
  setAccent(f);
}

// ───────────────────────── frame ─────────────────────────
const v = new THREE.Vector3(), v2 = new THREE.Vector3(), dir = new THREE.Vector3();
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
const glow = $('.glow');
let lastStreamKey = '';

function frame(ms) {
  const t = reducedMotion ? 0 : ms / 1000;
  computeTargets(t);
  for (const k in S) S[k] = lerp(S[k], T[k], k === 'bry' ? 0.06 : 0.09);
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05); mouse.sy = lerp(mouse.sy, mouse.y, 0.05);

  stage.position.set(S.sx, S.sy, 0);
  stage.scale.setScalar(S.ss * (portrait ? 0.85 : 1));
  stage.rotation.y = mouse.sx * 0.12;
  stage.rotation.x = mouse.sy * 0.05;

  // Flasche
  bottle.position.set(S.bx, S.by + Math.sin(t * 1.1) * 0.04 * (1 - S.pour), 0);
  bottle.rotation.set(0, 0, S.brz);
  bottle.userData.label.rotation.y = -Math.PI / 2 + S.bry;
  const u = bottle.userData;
  u.cap.position.y = 3.06 - B_OFF + S.cap * 2.2;
  u.cap.position.x = S.cap * 0.9;
  u.cap.rotation.z = -S.cap * 2.5;
  u.cap.visible = S.cap < 0.97;

  // Flüssigkeitsspiegel in der Flasche bleibt waagerecht (Clipping-Ebene in Weltkoordinaten)
  stage.updateMatrixWorld(true);
  const ends = [-B_OFF + 0.05, NECK_TIP - 0.1].map((y) => bottle.localToWorld(v.set(0, y, 0)).y);
  const wr = 0.58 * stage.scale.x * Math.abs(Math.sin(S.brz));
  const low = Math.min(...ends) - wr, high = Math.max(...ends) + wr;
  const tiltK = clamp(S.brz / 1.88);
  const level = lerp(0.8, 0.98, tiltK) * S.remain;
  clipPlane.constant = low + (high - low) * level;

  // Glas
  tumbler.position.set(S.gx, S.gy, 0);
  const lh = Math.max(0.0005, S.fill * LIQ_MAX);
  if (Math.abs(lh - liquidH) > 0.004) { // Radius folgt der konischen Glaswand
    liquidH = lh;
    const rTop = 0.585 + (0.7 - 0.585) * (lh / LIQ_MAX);
    glassLiquid.geometry.dispose();
    glassLiquid.geometry = new THREE.CylinderGeometry(rTop, 0.585, lh, 72);
  }
  glassLiquid.position.y = LIQ_BASE + lh / 2;
  glassLiquid.visible = S.fill > 0.005;
  const surf = LIQ_BASE + lh;
  const fh = Math.max(0.001, S.foam * 0.28);
  foam.scale.y = fh;
  foam.position.y = surf + fh / 2 - 0.01;
  foam.visible = S.fill > 0.02;
  const wob = Math.sin(t * 9) * 0.01 * S.pour;
  foam.scale.x = foam.scale.z = 1 + wob;

  // Bläschen
  bubbles.forEach((b, i) => {
    b.y += b.v * 0.016 * (0.4 + S.pour * 1.6);
    if (b.y > 1) b.y -= 1;
    const y = LIQ_BASE + b.y * lh;
    const x = Math.cos(b.a) * b.r + Math.sin(t * 3 + b.w) * 0.015;
    const z = Math.sin(b.a) * b.r;
    const s = S.fill > 0.03 ? b.s * (0.6 + b.y * 0.6) : 0;
    m4.compose(v.set(x, y, z), q.identity(), sc.setScalar(s));
    bubbleMesh.setMatrixAt(i, m4);
  });
  bubbleMesh.instanceMatrix.needsUpdate = true;

  // Eis
  ice.forEach((c, i) => {
    const d = c.userData;
    const k = clamp(S.iceDrop * 1.4 - i * 0.2);
    const startY = GLASS_H + 2.6 + i * 0.6;
    const rest = Math.max(d.floor, surf - 0.14 + i * 0.03);
    const y = lerp(startY, rest, k) + Math.sin(t * 1.4 + i) * 0.02 * S.fill;
    c.position.set(d.ox, y, d.oz);
    c.rotation.set(d.rot + (1 - k) * 2, d.rot * 1.3 + (1 - k) * 1.5, d.rot * 0.6);
    c.visible = k > 0.001 && S.gy > -6;
  });

  // Strahl: vom Flaschenhals ins Glas
  if (S.pour > 0.02) {
    const start = bottle.localToWorld(v.set(0, NECK_TIP + 0.02, 0)).clone();
    dir.set(0, 1, 0).applyQuaternion(bottle.getWorldQuaternion(q)).normalize();
    const end = tumbler.localToWorld(v2.set(0.05, surf, 0)).clone();
    const p1 = start.clone().addScaledVector(dir, 0.18);
    const p2 = new THREE.Vector3(lerp(p1.x, end.x, 0.7), lerp(p1.y, end.y, 0.35), 0);
    const curve = new THREE.CatmullRomCurve3([start, p1, p2, end]);
    const radius = 0.055 * stage.scale.x * S.pour;
    const key2 = `${start.x.toFixed(3)}${start.y.toFixed(3)}${end.y.toFixed(3)}${radius.toFixed(4)}${(t * 30) | 0}`;
    if (key2 !== lastStreamKey) {
      stream.geometry.dispose();
      stream.geometry = new THREE.TubeGeometry(curve, 48, radius, 10, false);
      lastStreamKey = key2;
    }
    stream.visible = true;
    // Spritzer
    drops.forEach((d, i) => {
      d.t += 0.025 * d.sp; if (d.t > 1) { d.t = 0; d.a = Math.random() * Math.PI * 2; }
      const r = d.t * 0.35 * stage.scale.x;
      const h = Math.sin(d.t * Math.PI) * 0.22 * d.sp * stage.scale.x;
      m4.compose(v.set(end.x + Math.cos(d.a) * r, end.y + h, end.z + Math.sin(d.a) * r), q.identity(),
        sc.setScalar(0.022 * (1 - d.t) * S.pour * stage.scale.x));
      dropMesh.setMatrixAt(i, m4);
    });
    dropMesh.instanceMatrix.needsUpdate = true;
    dropMesh.visible = true;
  } else {
    stream.visible = false;
    dropMesh.visible = false;
  }

  canvas.style.opacity = S.opacity;
  glow.style.opacity = 0.3 + S.opacity * 0.7;
  bottle.getWorldPosition(v).project(camera);
  glow.style.setProperty('--gx', `${(v.x * 0.5 + 0.5) * 100}%`);
  glow.style.setProperty('--gy', `${(-v.y * 0.5 + 0.5) * 100}%`);

  if (S.opacity > 0.01) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ───────────────────────── nutrition ─────────────────────────
$('#nutrition tbody').innerHTML = NUTRITION.map(([n, a, b]) =>
  `<tr class="${n.startsWith('davon') ? 'indent' : ''}"><td>${n}</td><td>${a}</td><td>${b}</td></tr>`).join('');

// ───────────────────────── pricing ─────────────────────────
const tiers = $('#tiers');
const single = PRODUCTS[0].price;
BUNDLES.forEach((b) => {
  const per = b.price / b.bottles;
  const save = Math.round((1 - per / single) * 100);
  const el = document.createElement('div');
  el.className = `tier reveal${b.featured ? ' featured' : ''}`;
  el.innerHTML = `
    ${b.featured ? '<span class="pill">Beliebt</span>' : ''}
    <h3>${b.name}</h3>
    <div class="cans">${b.bottles} × 0,33 l · ${(b.bottles * 0.33).toFixed(2).replace('.', ',')} l</div>
    <div class="price">${formatPrice(b.price)}</div>
    <div class="per">${formatPrice(per)} pro Flasche${save > 0 ? `<span class="save">−${save}%</span>` : ''}</div>
    <ul>
      <li>${b.note}</li>
      <li>Mehrweg-Glas, ${formatPrice(b.bottles * DEPOSIT)} Pfand</li>
      <li>${b.price >= FREE_SHIPPING_FROM ? 'Versandkostenfrei' : 'Versand ab 4,90 €'}</li>
    </ul>
    <button class="btn primary">In den Warenkorb</button>`;
  el.querySelector('button').onclick = () =>
    addToCart({ id: `bundle-${b.id}`, name: `${BRAND} ${b.name}`, sub: `${b.bottles} Flaschen, gemischt`, price: b.price, bottles: b.bottles });
  tiers.appendChild(el);
  el.addEventListener('pointermove', (ev) => {
    const r = el.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * 12}deg) rotateX(${(0.5 - py) * 12}deg)`;
    el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`);
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

// ───────────────────────── shop ─────────────────────────
const grid = $('#grid');
const thumbs = new Map();
PRODUCTS.forEach((p) => {
  const f = flavorById(p.flavor);
  const el = document.createElement('article');
  el.className = 'card reveal';
  el.style.setProperty('--c', f.accent);
  el.innerHTML = `
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
    <div class="img"><div class="skeleton"></div></div>
    <h3>${BRAND} ${f.name}</h3>
    <div class="size">${p.size} · zzgl. ${formatPrice(DEPOSIT)} Pfand</div>
    <div class="row"><span class="p">${formatPrice(p.price)}</span><button class="add" aria-label="${f.name} in den Warenkorb">+</button></div>`;
  el.querySelector('.add').onclick = () =>
    addToCart({ id: p.id, name: `${BRAND} ${f.name}`, sub: p.size, price: p.price, img: thumbs.get(p.id), bottles: 1 });
  grid.appendChild(el);
});

function renderThumbs() {
  const size = 640;
  const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r2.setSize(size, size, false);
  r2.toneMapping = THREE.ACESFilmicToneMapping;
  const s2 = new THREE.Scene();
  s2.environment = new THREE.PMREMGenerator(r2).fromScene(new RoomEnvironment(r2), 0.04).texture;
  const l2 = new THREE.DirectionalLight(0xffffff, 2.2); l2.position.set(4, 6, 6); s2.add(l2);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0.1, 7.4);
  PRODUCTS.forEach((p, i) => {
    const f = flavorById(p.flavor);
    const b = buildBottle(f);
    b.rotation.z = -0.12;
    b.userData.label.rotation.y = -Math.PI / 2 - 0.15;
    s2.add(b);
    r2.render(s2, cam);
    const url = r2.domElement.toDataURL('image/png');
    s2.remove(b);
    thumbs.set(p.id, url);
    grid.children[i].querySelector('.img').innerHTML = `<img src="${url}" alt="${BRAND} ${f.name} Flasche" />`;
  });
  r2.dispose(); r2.forceContextLoss();
}

// ───────────────────────── cart ─────────────────────────
const cart = new Map();
const countEl = $('#cart-count');
function addToCart(item) {
  const cur = cart.get(item.id);
  if (cur) cur.qty++; else cart.set(item.id, { ...item, qty: 1 });
  renderCart();
  countEl.classList.add('bump'); setTimeout(() => countEl.classList.remove('bump'), 300);
  toast(`${item.name} hinzugefügt`);
}
function renderCart() {
  const items = [...cart.values()];
  const qty = items.reduce((a, b) => a + b.qty, 0);
  const goods = items.reduce((a, b) => a + b.qty * b.price, 0);
  const dep = items.reduce((a, b) => a + b.qty * b.bottles * DEPOSIT, 0);
  countEl.textContent = qty;
  $('#cart-deposit').textContent = formatPrice(dep);
  $('#cart-total').textContent = formatPrice(goods + dep);
  const rest = FREE_SHIPPING_FROM - goods;
  $('#ship-text').textContent = rest > 0 ? `Noch ${formatPrice(rest)} bis zum kostenlosen Versand` : 'Kostenloser Versand freigeschaltet ✓';
  $('#ship-bar').style.width = `${clamp(goods / FREE_SHIPPING_FROM) * 100}%`;
  const box = $('#drawer-items');
  if (!items.length) { box.innerHTML = '<div class="empty">Dein Warenkorb ist leer.</div>'; return; }
  box.innerHTML = items.map((it) => `
    <div class="line" data-id="${it.id}">
      ${it.img ? `<img src="${it.img}" alt="" />` : `<div class="ph">${it.bottles}×</div>`}
      <div><div class="n">${it.name}</div><div class="s">${it.sub}</div>
        <div class="qty"><button data-d="-1" aria-label="weniger">−</button><span>${it.qty}</span><button data-d="1" aria-label="mehr">+</button></div></div>
      <b>${formatPrice(it.price * it.qty)}</b>
    </div>`).join('');
}
$('#drawer-items').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]');
  if (!b) return;
  const id = b.closest('.line').dataset.id, it = cart.get(id);
  it.qty += +b.dataset.d;
  if (it.qty <= 0) cart.delete(id);
  renderCart();
});
$('#cart-open').onclick = () => document.body.classList.add('cart-open');
const closeCart = () => document.body.classList.remove('cart-open');
$('#cart-close').onclick = closeCart;
$('#drawer-backdrop').onclick = closeCart;
addEventListener('keydown', (e) => e.key === 'Escape' && closeCart());
$('#checkout').onclick = () => toast(cart.size ? 'Demo-Shop: Hier würde der Checkout starten.' : 'Dein Warenkorb ist leer.');
renderCart();

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

// ───────────────────────── marquee & reveal ─────────────────────────
const words = FLAVORS.flatMap((f) => [`<span>${f.name}</span>`, `<span class="o">${BRAND} Cola</span>`]).join('');
$('#marquee').innerHTML = words + words;
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const sib = [...en.target.parentElement.children].indexOf(en.target);
    en.target.style.transitionDelay = `${(sib % 4) * 80}ms`;
    en.target.classList.add('in');
    io.unobserve(en.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ───────────────────────── boot ─────────────────────────
const fontsReady = Promise.race([
  document.fonts ? document.fonts.load(`italic 900 100px Archivo`).then(() => document.fonts.ready) : Promise.resolve(),
  new Promise((r) => setTimeout(r, 2500)),
]);
fontsReady.then(() => {
  bottle = buildBottle(FLAVORS[0], { clip: clipPlane });
  stage.add(bottle);
  setAccent(FLAVORS[0]);
  renderThumbs();
  requestAnimationFrame(frame);
});
