import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import {
  BRAND, FLAVORS, STRENGTHS, PRODUCTS, BUNDLES, FREE_SHIPPING_FROM,
  flavorById, strengthByLevel, formatPrice,
} from './products.js';

// ───────────────────────── helpers ─────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────────────────────── age gate ─────────────────────────
const gate = $('#age-gate');
if (store.get('kryo-age-ok') === '1') gate.classList.add('gone');
else document.body.classList.add('locked');
$('#age-yes').onclick = () => {
  store.set('kryo-age-ok', '1');
  gate.classList.add('gone');
  document.body.classList.remove('locked');
};
$('#age-no').onclick = () => { $('#age-denied').hidden = false; };

// ───────────────────────── textures ─────────────────────────
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

function spacedText(ctx, text, x, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
}

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function drawLidTop(flavor, level) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S * 0.38, S * 0.32, 40, S / 2, S / 2, S * 0.62);
  grad.addColorStop(0, flavor.light);
  grad.addColorStop(0.55, flavor.base);
  grad.addColorStop(1, flavor.dark);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  // eiskristall-facetten
  const rnd = seeded(flavor.id.length * 9973 + 7);
  g.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 46; i++) {
    const x = rnd() * S, y = rnd() * S, r = 60 + rnd() * 220, a = rnd() * Math.PI * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.lineTo(x + Math.cos(a + 0.7) * r * 0.7, y + Math.sin(a + 0.7) * r * 0.7);
    g.closePath();
    g.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.12})`;
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  // ringe
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 8; g.beginPath(); g.arc(S / 2, S / 2, 470, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.arc(S / 2, S / 2, 440, 0, Math.PI * 2); g.stroke();

  g.fillStyle = '#fff';
  g.textBaseline = 'middle';
  g.font = `600 34px ${FONT}`;
  spacedText(g, 'NICOTINE POUCHES · SLIM', S / 2, 250, 6);

  g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
  g.font = `900 250px ${FONT}`;
  spacedText(g, BRAND, S / 2, 450, 26);
  g.shadowColor = 'transparent';

  g.font = `800 66px ${FONT}`;
  spacedText(g, flavor.name.toUpperCase(), S / 2, 620, 8);

  const st = strengthByLevel(level);
  g.font = `600 38px ${FONT}`;
  spacedText(g, `${st.mg} MG / POUCH`, S / 2, 700, 5);

  // stärke-punkte
  for (let i = 0; i < 4; i++) {
    const x = S / 2 + (i - 1.5) * 64, y = 790;
    g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2);
    g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
    if (i < level) { g.fillStyle = '#fff'; g.fill(); }
  }
  return c;
}

function drawSide(flavor) {
  const W = 2048, H = 256, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, flavor.light);
  grad.addColorStop(0.5, flavor.base);
  grad.addColorStop(1, flavor.dark);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.font = `800 96px ${FONT}`;
  g.textBaseline = 'middle';
  const txt = `${BRAND}  ✱  ${flavor.name.toUpperCase()}  ✱  `;
  const w = g.measureText(txt).width;
  const reps = Math.max(1, Math.round(W / w));
  const scale = W / (w * reps);
  g.save(); g.scale(scale, 1);
  for (let i = 0; i < reps; i++) g.fillText(txt, i * w, H / 2 + 4);
  g.restore();
  return c;
}

const texCache = new Map();
function tex(key, draw) {
  if (!texCache.has(key)) {
    const t = new THREE.CanvasTexture(draw());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
const topTex = (f, l) => tex(`top-${f.id}-${l}`, () => drawLidTop(f, l));
const sideTex = (f) => tex(`side-${f.id}`, () => drawSide(f));

// ───────────────────────── can model ─────────────────────────
const R = 1, BODY_H = 0.5, LID_H = 0.25;

function buildCan(flavor, level, withPouches = false) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(flavor.dark).multiplyScalar(0.55), roughness: 0.55, metalness: 0.05,
    clearcoat: 0.4, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BODY_H, 96, 1, true), bodyMat);
  spin.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 96), bodyMat);
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = -BODY_H / 2 + 0.02;
  spin.add(bottom);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R - 0.015, 0.028, 16, 120),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1 }),
  );
  rim.rotation.x = Math.PI / 2; rim.position.y = BODY_H / 2;
  spin.add(rim);

  // Deckel: [Seite, Oben, Unten]
  const lidSide = new THREE.MeshPhysicalMaterial({
    map: sideTex(flavor), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12,
  });
  const lidTop = new THREE.MeshPhysicalMaterial({
    map: topTex(flavor, level), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  const lidBottom = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(flavor.dark), roughness: 0.6 });
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.045, R + 0.045, LID_H, 96, 1), [lidSide, lidTop, lidBottom]);
  lid.rotation.y = Math.PI / 2; // Schrift zur Kamera ausrichten
  const lidPivot = new THREE.Group();
  lidPivot.position.y = BODY_H / 2 - LID_H / 2 + 0.06;
  lidPivot.add(lid);
  spin.add(lidPivot);

  const pouches = [];
  if (withPouches) {
    const geo = new THREE.CapsuleGeometry(0.115, 0.36, 8, 20);
    geo.rotateZ(Math.PI / 2);
    geo.scale(1, 0.5, 1);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f6f8, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.6,
    });
    const N = 20;
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(geo, mat);
      const ring = i < 13 ? 0.72 : 0.36;
      const k = i < 13 ? i / 13 : (i - 13) / 7;
      const a = k * Math.PI * 2 + (i < 13 ? 0 : 0.3);
      m.userData.home = new THREE.Vector3(Math.cos(a) * ring, -0.08 + (i % 2) * 0.06, Math.sin(a) * ring);
      m.userData.homeRot = new THREE.Euler(0, -a + Math.PI / 2, 0);
      const oa = (i / N) * Math.PI * 2;
      const orad = 1.55 + (i % 3) * 0.3;
      m.userData.out = new THREE.Vector3(Math.cos(oa) * orad, 0.55 + Math.sin(i * 1.7) * 0.35, Math.sin(oa) * orad);
      m.userData.outRot = new THREE.Euler(Math.sin(i) * 1.4, oa * 2, Math.cos(i * 1.3) * 1.2);
      m.userData.delay = (i / N) * 0.35;
      m.position.copy(m.userData.home);
      m.rotation.copy(m.userData.homeRot);
      spin.add(m);
      pouches.push(m);
    }
  }

  root.userData = { spin, lidPivot, lidSide, lidTop, bodyMat, lidBottom, pouches };
  return root;
}

function setCanFlavor(can, flavor, level) {
  const u = can.userData;
  u.lidSide.map = sideTex(flavor);
  u.lidTop.map = topTex(flavor, level);
  u.bodyMat.color.set(flavor.dark).multiplyScalar(0.55);
  u.lidBottom.color.set(flavor.dark);
  u.lidSide.needsUpdate = u.lidTop.needsUpdate = true;
}

// ───────────────────────── main scene ─────────────────────────
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environment = envTex;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 9);

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 5, 6);
scene.add(key);
const rimLight = new THREE.PointLight(0x4aa8ff, 30, 20);
rimLight.position.set(-3, 2, -3);
scene.add(rimLight);

let fontsReady = Promise.race([
  document.fonts ? document.fonts.load(`900 100px Inter`).then(() => document.fonts.ready) : Promise.resolve(),
  new Promise((r) => setTimeout(r, 2500)),
]);

let can;
let currentFlavor = 0;
const state = {
  x: 0, y: 0, s: 1, tiltX: 0.8, tiltZ: 0, spin: 0, lid: 0, pouch: 0, opacity: 1,
};
const target = { ...state };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.z = w / h < 0.8 ? 13.5 : w / h < 1.2 ? 11 : 9;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ───────────────────────── scroll choreography ─────────────────────────
const secHero = $('#hero'), secOpen = $('#open'), secFlav = $('#flavors'), secStr = $('#strength'), secFeat = $('#features');
const heroText = $('.hero-text');
const lines = [...document.querySelectorAll('.big-line')];
const stats = $('.stats');

function progress(el) {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight));
}
function enter(el) { // 0 wenn Sektion unten ankommt, 1 wenn oben anliegt
  const r = el.getBoundingClientRect();
  return clamp(1 - r.top / innerHeight);
}

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
  const portrait = innerWidth / innerHeight < 0.9;
  const side = portrait ? 0 : 1.75;

  // Hero
  const pHero = clamp(scrollY / innerHeight);
  heroText.style.transform = `translateY(${pHero * -80}px) scale(${1 - pHero * 0.12})`;
  heroText.style.opacity = 1 - pHero * 1.6;

  let x = 0, y = portrait ? -2.2 : -1.75, s = portrait ? 1.05 : 0.95, tiltX = 0.85, tiltZ = -0.12;
  let spin = Math.sin(t * 0.5) * 0.35;
  let lid = 0, pouch = 0;

  // → Öffnen
  y = lerp(y, portrait ? -1.2 : -0.85, pHero);
  s = lerp(s, portrait ? 1.0 : 1.05, pHero);
  tiltX = lerp(tiltX, 0.55, pHero);
  tiltZ = lerp(tiltZ, 0, pHero);
  const pOpen = progress(secOpen);
  const close = smooth(0.86, 1, pOpen);
  lid = smooth(0.06, 0.35, pOpen) * (1 - close);
  pouch = smooth(0.22, 0.62, pOpen) * (1 - close);
  spin += pOpen * Math.PI * 1.2;
  tiltX = lerp(tiltX, 0.75, smooth(0.3, 0.6, pOpen));

  const step = pOpen < 0.3 ? 0 : pOpen < 0.62 ? 1 : 2;
  lines.forEach((l, i) => l.classList.toggle('on', i === step && pOpen > 0.01 && pOpen < 0.97));
  stats.classList.toggle('on', pOpen > 0.62 && pOpen < 0.97);
  if (pOpen > 0.62) countUp();

  // → Sorten
  const eFlav = enter(secFlav);
  const pFlav = progress(secFlav);
  x = lerp(x, side, eFlav);
  y = lerp(y, portrait ? -0.9 : 0, eFlav);
  s = lerp(s, portrait ? 1.0 : 1.2, eFlav);
  tiltX = lerp(tiltX, 0.95, eFlav);
  tiltZ = lerp(tiltZ, portrait ? 0 : -0.25, eFlav);
  const idx = Math.min(FLAVORS.length - 1, Math.floor(pFlav * FLAVORS.length));
  setFlavor(eFlav > 0.5 ? idx : 0);
  // volle Drehung bei jedem Sortenwechsel (stetig über die Sortengrenzen)
  const local = idx === FLAVORS.length - 1 && pFlav >= 1 ? 1 : (pFlav * FLAVORS.length) % 1;
  spin += eFlav * (idx + smooth(0, 0.25, local)) * Math.PI * 2;

  // → Stärke
  const eStr = enter(secStr);
  const pStr = progress(secStr);
  x = lerp(x, portrait ? 0 : -side, eStr);
  y = lerp(y, portrait ? -1.4 : 0, eStr);
  s = lerp(s, portrait ? 0.9 : 1.05, eStr);
  tiltX = lerp(tiltX, 0.5 + pStr * 0.6, eStr);
  tiltZ = lerp(tiltZ, portrait ? 0 : 0.3, eStr);
  updateMeter(eStr > 0.6 ? pStr : 0);

  // → raus
  const eFeat = enter(secFeat);
  const out = smooth(0.0, 0.8, eFeat);
  y = lerp(y, 3.2, out);
  s = lerp(s, 0.7, out);

  Object.assign(target, { x, y, s, tiltX, tiltZ, spin, lid, pouch, opacity: 1 - smooth(0.4, 0.95, eFeat) });
}

// ───────────────────────── flavor UI ─────────────────────────
const panels = $('#flavor-panels'), dots = $('#flavor-dots');
FLAVORS.forEach((f, i) => {
  const p = document.createElement('div');
  p.className = 'flavor-panel';
  p.innerHTML = `
    <div class="num">0${i + 1} / 0${FLAVORS.length}</div>
    <h2 style="color:${f.light}">${f.name}</h2>
    <h3>${f.tagline}</h3>
    <p>${f.copy}</p>
    <a href="#shop" class="btn primary" style="background:${f.base};box-shadow:0 8px 30px -8px ${f.base}" data-filter="${f.id}">${f.name} kaufen</a>`;
  panels.appendChild(p);
  dots.appendChild(document.createElement('i'));
});
panels.addEventListener('click', (e) => {
  const a = e.target.closest('[data-filter]');
  if (a) applyFilter(a.dataset.filter);
});

function setAccent(f) {
  const r = document.documentElement.style;
  r.setProperty('--accent', f.accent);
  r.setProperty('--accent-light', f.light);
  rimLight.color.set(f.accent);
}

function setFlavor(i) {
  if (!can) return;
  [...panels.children].forEach((p, k) => p.classList.toggle('on', k === i));
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  if (i === currentFlavor) return;
  currentFlavor = i;
  const f = FLAVORS[i];
  setCanFlavor(can, f, i === 3 ? 3 : 2);
  setAccent(f);
}

// ───────────────────────── strength meter ─────────────────────────
const meter = $('#meter');
STRENGTHS.forEach((s) => {
  const row = document.createElement('div');
  row.className = 'meter-row';
  row.innerHTML = `<span class="lbl">${s.label}</span>
    <div class="meter-track"><div class="meter-fill"></div></div>
    <span class="mg"><span class="dots">${dotsHtml(s.level)}</span></span>`;
  row.title = `${s.mg} mg pro Pouch`;
  meter.appendChild(row);
});
const fills = [...meter.querySelectorAll('.meter-fill')];
const mgs = [...meter.querySelectorAll('.mg')];
function updateMeter(p) {
  fills.forEach((f, i) => {
    const k = smooth(i * 0.15, i * 0.15 + 0.35, p);
    f.style.width = `${k * (STRENGTHS[i].mg / 16) * 100}%`;
    mgs[i].textContent = `${Math.round(k * STRENGTHS[i].mg)} mg`;
  });
}
function dotsHtml(level) {
  return Array.from({ length: 4 }, (_, i) => `<i class="${i < level ? 'f' : ''}"></i>`).join('');
}

// ───────────────────────── render loop ─────────────────────────
const tmpV = new THREE.Vector3();
const glow = $('.glow');
function frame(ms) {
  const t = ms / 1000;
  computeTargets(reducedMotion ? 0 : t);
  const k = 0.085;
  for (const key in state) state[key] = lerp(state[key], target[key], key === 'spin' ? 0.07 : k);
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.05);

  if (can) {
    const u = can.userData;
    can.position.set(state.x, state.y + Math.sin(t * 1.2) * 0.06, 0);
    can.scale.setScalar(state.s);
    can.rotation.set(state.tiltX + mouse.sy * 0.15, mouse.sx * 0.25, state.tiltZ);
    u.spin.rotation.y = state.spin;

    // Deckel abheben
    const L = state.lid;
    u.lidPivot.position.y = BODY_H / 2 - LID_H / 2 + 0.06 + L * 1.35;
    u.lidPivot.position.z = -L * 0.4;
    u.lidPivot.rotation.x = -L * 0.35;
    u.lidPivot.rotation.z = L * 0.15;

    // Pouches
    u.pouches.forEach((m, i) => {
      const d = m.userData;
      const pk = clamp((state.pouch - d.delay) / (1 - 0.35));
      const e = easeOutBack(pk);
      tmpV.copy(d.home).lerp(d.out, e);
      if (pk > 0) {
        const orbit = t * 0.25 * pk;
        const cx = tmpV.x, cz = tmpV.z;
        tmpV.x = cx * Math.cos(orbit) - cz * Math.sin(orbit);
        tmpV.z = cx * Math.sin(orbit) + cz * Math.cos(orbit);
        tmpV.y += Math.sin(t * 1.5 + i) * 0.08 * pk;
      }
      m.position.copy(tmpV);
      m.rotation.set(
        lerp(d.homeRot.x, d.outRot.x + t * 0.4, pk),
        lerp(d.homeRot.y, d.outRot.y, pk),
        lerp(d.homeRot.z, d.outRot.z + t * 0.3, pk),
      );
      m.visible = state.lid > 0.02 || pk > 0;
    });
  }

  canvas.style.opacity = state.opacity;
  glow.style.opacity = 0.35 + state.opacity * 0.65;
  // Glow folgt der Dose
  tmpV.set(state.x, state.y, 0).project(camera);
  glow.style.setProperty('--gx', `${(tmpV.x * 0.5 + 0.5) * 100}%`);
  glow.style.setProperty('--gy', `${(-tmpV.y * 0.5 + 0.5) * 100}%`);

  if (state.opacity > 0.01) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ───────────────────────── pricing ─────────────────────────
const tiers = $('#tiers');
const single = BUNDLES[0].price / BUNDLES[0].cans;
BUNDLES.forEach((b) => {
  const per = b.price / b.cans;
  const save = Math.round((1 - per / single) * 100);
  const el = document.createElement('div');
  el.className = `tier reveal${b.featured ? ' featured' : ''}`;
  el.innerHTML = `
    ${b.featured ? '<span class="pill">Beliebt</span>' : ''}
    <h3>${b.name}</h3>
    <div class="cans">${b.cans} ${b.cans === 1 ? 'Dose' : 'Dosen'} · ${b.cans * 20} Pouches</div>
    <div class="price">${formatPrice(b.price)}</div>
    <div class="per">${formatPrice(per)} pro Dose${save > 0 ? `<span class="save">−${save}%</span>` : ''}</div>
    <ul>
      <li>${b.note}</li>
      <li>Alle Sorten & Stärken kombinierbar</li>
      <li>${b.price >= FREE_SHIPPING_FROM ? 'Versandkostenfrei' : 'Versand 3,90 €'}</li>
    </ul>
    <button class="btn primary">In den Warenkorb</button>`;
  el.querySelector('button').onclick = () => addToCart({ id: `bundle-${b.id}`, name: b.name, sub: `${b.cans} Dosen Mix`, price: b.price });
  tiers.appendChild(el);

  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateY(${(px - 0.5) * 12}deg) rotateX(${(0.5 - py) * 12}deg)`;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

// ───────────────────────── shop grid ─────────────────────────
const grid = $('#grid'), filters = $('#filters');
const thumbs = new Map();
PRODUCTS.forEach((p) => {
  const f = flavorById(p.flavor), s = strengthByLevel(p.strength);
  const el = document.createElement('article');
  el.className = 'card reveal';
  el.dataset.flavor = p.flavor;
  el.style.setProperty('--c', f.base);
  el.innerHTML = `
    ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
    <div class="img">${p.image ? `<img src="${p.image}" alt="${BRAND} ${f.name} ${s.label}" loading="lazy" />` : '<div class="skeleton"></div>'}</div>
    <h3>${f.name}</h3>
    <div class="meta"><span class="dots">${dotsHtml(s.level)}</span>${s.label} · ${s.mg} mg</div>
    <div class="row"><span class="p">${formatPrice(p.price)}</span><button class="add" aria-label="${f.name} in den Warenkorb">+</button></div>`;
  el.querySelector('.add').onclick = () =>
    addToCart({ id: p.id, name: `${BRAND} ${f.name}`, sub: `${s.label} · ${s.mg} mg`, price: p.price, img: p.image || thumbs.get(p.id) });
  grid.appendChild(el);
});

['alle', ...FLAVORS.map((f) => f.id)].forEach((id, i) => {
  const b = document.createElement('button');
  b.textContent = id === 'alle' ? 'Alle' : flavorById(id).name;
  b.dataset.id = id;
  if (i === 0) b.classList.add('on');
  b.onclick = () => applyFilter(id);
  filters.appendChild(b);
});
function applyFilter(id) {
  [...filters.children].forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  [...grid.children].forEach((c) => c.classList.toggle('hide', id !== 'alle' && c.dataset.flavor !== id));
}

// Produktbilder: 3D-Dose offscreen rendern, wenn kein Originalbild hinterlegt ist
function renderThumbs() {
  const todo = PRODUCTS.filter((p) => !p.image);
  if (!todo.length) return;
  const size = 640;
  const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r2.setSize(size, size, false);
  r2.toneMapping = THREE.ACESFilmicToneMapping;
  const s2 = new THREE.Scene();
  s2.environment = new THREE.PMREMGenerator(r2).fromScene(new RoomEnvironment(r2), 0.04).texture;
  const l2 = new THREE.DirectionalLight(0xffffff, 1.6); l2.position.set(3, 5, 6); s2.add(l2);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0, 6.2);
  todo.forEach((p, i) => {
    const f = flavorById(p.flavor);
    const c = buildCan(f, p.strength);
    c.rotation.set(0.95, 0, -0.18 + (i % 2) * 0.1);
    c.userData.spin.rotation.y = -0.2;
    s2.add(c);
    r2.render(s2, cam);
    const url = r2.domElement.toDataURL('image/png');
    s2.remove(c);
    thumbs.set(p.id, url);
    const card = grid.children[PRODUCTS.indexOf(p)];
    card.querySelector('.img').innerHTML = `<img src="${url}" alt="${BRAND} ${f.name}" />`;
  });
  r2.dispose();
  r2.forceContextLoss();
}

// ───────────────────────── cart ─────────────────────────
const cart = new Map();
const countEl = $('#cart-count');
function addToCart(item) {
  const cur = cart.get(item.id);
  if (cur) cur.qty++; else cart.set(item.id, { ...item, qty: 1 });
  renderCart();
  countEl.classList.add('bump');
  setTimeout(() => countEl.classList.remove('bump'), 300);
  toast(`${item.name} hinzugefügt`);
}
function renderCart() {
  const items = [...cart.values()];
  const qty = items.reduce((a, b) => a + b.qty, 0);
  const total = items.reduce((a, b) => a + b.qty * b.price, 0);
  countEl.textContent = qty;
  $('#cart-total').textContent = formatPrice(total);
  const rest = FREE_SHIPPING_FROM - total;
  $('#ship-text').textContent = rest > 0
    ? `Noch ${formatPrice(rest)} bis zum kostenlosen Versand`
    : 'Du hast kostenlosen Versand freigeschaltet ✓';
  $('#ship-bar').style.width = `${clamp(total / FREE_SHIPPING_FROM) * 100}%`;
  const box = $('#drawer-items');
  if (!items.length) { box.innerHTML = '<div class="empty">Dein Warenkorb ist leer.</div>'; return; }
  box.innerHTML = items.map((it) => `
    <div class="line" data-id="${it.id}">
      ${it.img ? `<img src="${it.img}" alt="" />` : `<div class="ph">${it.qty}×</div>`}
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
const openCart = () => document.body.classList.add('cart-open');
const closeCart = () => document.body.classList.remove('cart-open');
$('#cart-open').onclick = openCart;
$('#cart-close').onclick = closeCart;
$('#drawer-backdrop').onclick = closeCart;
addEventListener('keydown', (e) => e.key === 'Escape' && closeCart());
$('#checkout').onclick = () => toast(cart.size ? 'Demo-Shop – hier würde der Checkout mit Altersverifikation starten.' : 'Dein Warenkorb ist leer.');
renderCart();

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

// ───────────────────────── marquee & reveal ─────────────────────────
const words = FLAVORS.flatMap((f) => [`<span>${f.name}</span>`, `<span class="o">${BRAND}</span>`]).join('');
$('#marquee').innerHTML = words + words;

const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      const sib = [...en.target.parentElement.children].indexOf(en.target);
      en.target.style.transitionDelay = `${(sib % 4) * 80}ms`;
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ───────────────────────── boot ─────────────────────────
fontsReady.then(() => {
  can = buildCan(FLAVORS[0], 2, true);
  scene.add(can);
  setAccent(FLAVORS[0]);
  renderThumbs();
  requestAnimationFrame(frame);
});
