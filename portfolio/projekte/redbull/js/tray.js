// Red Bull spec – 24er Tray in 3D: printed cardboard tray + 24 cans, scroll-driven "fill the tray" motion.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { CAN, FLAVORS, createCan, labelTextures } from './can.js';

const COLS = 6, ROWS = 4, P = CAN.r * 2 + 0.03;
const IW = COLS * P, ID = ROWS * P, WALL = 0.82, T = 0.035;
const BASE_Y = 0;                       // inside floor
const CAN_Y = BASE_Y + CAN.bodyH / 2 + 0.092 - 0.02; // can group origin so the foot sits on the floor

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => { const c = 1.25; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

let bulls = null;
function bullsImg() {
  if (bulls) return bulls;
  bulls = new Image();
  bulls.src = new URL('../img/rb-bulls.webp', import.meta.url).href;
  return bulls;
}

function trayColors(f) {
  if (f.kind === 'classic') return { bg: f.zero ? '#8fbbe6' : '#24418f', bg2: f.zero ? '#a9cff1' : '#3152a8', ink: '#ffffff' };
  if (f.id === 'summer') return { bg: '#dde6f2', bg2: '#eef2f8', ink: '#1f63c6' };
  return { bg: f.c1, bg2: f.c2, ink: f.ink === '#ffffff' ? '#ffffff' : '#3f4448' };
}

function drawPrint(f, w, h, long) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const k = trayColors(f);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, k.bg2); g.addColorStop(1, k.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // silver/white diagonal corner like the real trays
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.beginPath();
  if (long) { ctx.moveTo(w * 0.86, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.8, h); }
  else { ctx.moveTo(0, 0); ctx.lineTo(w * 0.16, 0); ctx.lineTo(w * 0.08, h); ctx.lineTo(0, h); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.fillRect(0, 0, w, h * 0.04);
  const font = 'Jost, Futura, Arial, sans-serif';
  ctx.fillStyle = k.ink;
  ctx.textBaseline = 'alphabetic';
  const img = bullsImg();
  const drawBulls = (cx, cy, bw) => {
    if (!img.complete || !img.naturalWidth) return;
    const bh = bw * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, cx - bw / 2, cy - bh / 2, bw, bh);
  };
  if (long) {
    ctx.font = `800 ${h * 0.78}px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText('24', w * 0.05, h * 0.86);
    const w24 = ctx.measureText('24').width;
    ctx.font = `400 ${h * 0.5}px ${font}`;
    ctx.fillText('x 250 ml', w * 0.05 + w24 + h * 0.12, h * 0.8);
    if (f.kind === 'edition') {
      ctx.font = `700 ${h * 0.16}px ${font}`;
      ctx.textAlign = 'right';
      ctx.fillText(f.name.toUpperCase(), w * 0.79, h * 0.34);
      ctx.font = `italic 500 ${h * 0.14}px ${font}`;
      ctx.fillText(f.sub, w * 0.79, h * 0.56);
    }
    drawBulls(w * 0.92, h * 0.55, w * 0.13);
  } else {
    drawBulls(w * 0.56, h * 0.42, w * 0.5);
    ctx.font = `600 ${h * 0.15}px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(f.kind === 'edition' ? f.name.toUpperCase() : (f.zero ? 'RED BULL ZERO' : 'RED BULL ENERGY DRINK'), w * 0.56, h * 0.88);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Builds tray + cans. Returns { group, cans, setFlavor(f, renderer) } */
export function buildTray(renderer, f, opts = {}) {
  const group = new THREE.Group();
  const card = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.92, metalness: 0 });
  const printLong = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  const printShort = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });

  const OW = IW + 2 * T, OD = ID + 2 * T;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(OW, T, OD), card);
  floor.position.y = BASE_Y - T / 2;
  group.add(floor);
  const wallMats = (outerIndex, print) => { const m = [card, card, card, card, card, card]; m[outerIndex] = print; return m; };
  const front = new THREE.Mesh(new THREE.BoxGeometry(OW, WALL, T), wallMats(4, printLong));
  front.position.set(0, BASE_Y + WALL / 2 - T, ID / 2 + T / 2);
  const back = new THREE.Mesh(new THREE.BoxGeometry(OW, WALL, T), wallMats(5, printLong));
  back.position.set(0, BASE_Y + WALL / 2 - T, -ID / 2 - T / 2);
  const right = new THREE.Mesh(new THREE.BoxGeometry(T, WALL, ID), wallMats(0, printShort));
  right.position.set(IW / 2 + T / 2, BASE_Y + WALL / 2 - T, 0);
  const left = new THREE.Mesh(new THREE.BoxGeometry(T, WALL, ID), wallMats(1, printShort));
  left.position.set(-IW / 2 - T / 2, BASE_Y + WALL / 2 - T, 0);
  group.add(front, back, right, left);

  const labelMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 1, clearcoat: 1, clearcoatRoughness: 0.08 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0xa9adb5, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });
  const cans = [];
  // back row first, so the front row lands last (in view)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const can = createCan(null, { segs: 56, droplets: false, material: labelMat, metal, metalDark });
    const x = (c - (COLS - 1) / 2) * P, z = (r - (ROWS - 1) / 2) * P;
    can.group.position.set(x, CAN_Y, z);
    can.home = new THREE.Vector3(x, CAN_Y, z);
    can.spin = (c * 0.7 + r * 1.3) % (Math.PI * 2) * 0.15 - 0.2;   // labels slightly varied, mostly facing front
    can.group.rotation.y = can.spin;
    group.add(can.group);
    cans.push(can);
  }

  let tex = null, pl = null, ps = null;
  function setFlavor(fl) {
    const nt = labelTextures(fl, renderer, opts.labelWidth || 1536);
    labelMat.map = nt.map; labelMat.metalnessMap = nt.mr; labelMat.roughnessMap = nt.mr; labelMat.needsUpdate = true;
    tex?.dispose(); tex = nt;
    const npl = drawPrint(fl, 2560, Math.round(2560 * WALL / OW), true);
    const nps = drawPrint(fl, 1280, Math.round(1280 * WALL / ID), false);
    printLong.map = npl; printShort.map = nps; printLong.needsUpdate = printShort.needsUpdate = true;
    pl?.dispose(); ps?.dispose(); pl = npl; ps = nps;
  }
  setFlavor(f);
  return { group, cans, setFlavor, size: { w: OW, d: OD, h: CAN_Y + CAN.bodyH / 2 + 0.1 } };
}

/** Interactive tray section. */
export async function initTray({ canvas, section, flavor = 0, onCount }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const rim = new THREE.PointLight(FLAVORS[flavor].glow, 60, 30, 1.5);
  rim.position.set(4, 3, -5);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

  await new Promise(r => { const i = bullsImg(); if (i.complete) r(); else { i.onload = r; i.onerror = r; } });
  const tray = buildTray(renderer, FLAVORS[flavor]);
  const rig = new THREE.Group();
  rig.add(tray.group);
  scene.add(rig);
  tray.group.position.y = -tray.size.h / 2 + 0.2;

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = Math.max(15.5, 13.5 / camera.aspect);
    camera.position.set(0, dist * 0.42, dist);
    camera.lookAt(0, -0.3, 0);
    camera.updateProjectionMatrix();
  }
  layout();
  new ResizeObserver(layout).observe(canvas);

  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(section);
  let pointer = 0, pS = 0;
  addEventListener('pointermove', e => { pointer = e.clientX / innerWidth - 0.5; }, { passive: true });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hop = null, lastCount = -1;
  const clock = new THREE.Clock();
  let pSmooth = 0;

  function progress() {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    return clamp(-r.top / Math.max(1, total));
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible) return;
    const pt = reduced ? 1 : progress();
    pSmooth = lerp(pSmooth, pt, 1 - Math.pow(0.002, dt));
    const p = pSmooth;
    pS = lerp(pS, pointer, 0.05);

    // tray enters, turns while it fills, then shows its long side
    const enter = clamp(p / 0.12);
    const turn = clamp((p - 0.7) / 0.3);
    rig.position.y = (1 - (1 - Math.pow(1 - enter, 3))) * -6 + Math.sin(t * 1.1) * 0.06;
    rig.rotation.y = lerp(-0.75, -0.18, clamp(p / 0.7)) + turn * 0.55 + Math.sin(t * 0.4) * 0.04 + pS * 0.35;
    rig.rotation.x = lerp(0.12, 0, turn);

    let landed = 0;
    tray.cans.forEach((can, i) => {
      const t0 = 0.1 + i * 0.022;
      const q = clamp((p - t0) / 0.1);
      const g = can.group;
      g.visible = q > 0;
      let y = can.home.y + (1 - easeOutBack(q)) * 6.5;
      if (q >= 1) landed++;
      if (hop) {
        const hq = clamp((performance.now() - hop.t0 - i * 28) / 520);
        y += Math.sin(hq * Math.PI) * 0.9;
        g.rotation.y = can.spin + hop.dir * Math.sin(hq * Math.PI) * 1.6;
      } else g.rotation.y = can.spin + (1 - q) * 2.2;
      g.position.y = y;
    });
    if (hop) {
      if (!hop.swapped && performance.now() - hop.t0 > 260) { hop.swapped = true; tray.setFlavor(FLAVORS[hop.i]); }
      if (performance.now() - hop.t0 > 520 + 24 * 28) hop = null;
    }
    rim.color.lerp(new THREE.Color(FLAVORS[current].glow), 0.06);
    if (landed !== lastCount) { lastCount = landed; onCount?.(landed); }
    renderer.render(scene, camera);
  }
  let current = flavor;
  requestAnimationFrame(frame);

  return {
    setFlavor(i) {
      if (i === current) return;
      current = i;
      if (!visible || reduced) { tray.setFlavor(FLAVORS[i]); return; }
      hop = { t0: performance.now(), i, swapped: false, dir: Math.random() < 0.5 ? -1 : 1 };
    },
  };
}
