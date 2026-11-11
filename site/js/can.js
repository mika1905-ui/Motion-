// VOLTA – procedural 3D can, label art and liquid drops (shared by the site and the image studio)
import * as THREE from 'three';

export const FLAVORS = [
  { id: 'original', name: 'Original', sub: 'Zitrus & Ingwer', c1: '#e4ff4a', c2: '#7fcf00', ink: '#0b0b0b', glow: '#c6ff2e', liquid: '#b8f000',
    desc: 'Der Klassiker. Spritzige Zitrone, ein Hauch Ingwer und ein Kick, der sofort ankommt.', price: 2.49, kcal: 45, sugar: '10,5 g' },
  { id: 'berry', name: 'Berry Storm', sub: 'Waldbeere & Açaí', c1: '#9a5cff', c2: '#3a0ca3', ink: '#ffffff', glow: '#9b5cff', liquid: '#8a2be2',
    desc: 'Dunkle Beeren, tiefes Violett, volle Ladung. Fruchtig, satt und überraschend frisch.', price: 2.49, kcal: 48, sugar: '11 g' },
  { id: 'mango', name: 'Mango Rush', sub: 'Mango & Maracuja', c1: '#ffc23d', c2: '#ff5a1f', ink: '#1a0900', glow: '#ff8a1f', liquid: '#ff7a00',
    desc: 'Sonnengereifte Mango trifft Maracuja. Tropisch, saftig – Sommer in der Dose.', price: 2.49, kcal: 49, sugar: '11,2 g' },
  { id: 'arctic', name: 'Arctic Ice', sub: 'Minze & Limette', c1: '#9ff3ff', c2: '#1592e0', ink: '#03243a', glow: '#4fd8ff', liquid: '#3fd0ff',
    desc: 'Eiskalte Minze, spritzige Limette. Der frischeste Energieschub, den du je hattest.', price: 2.49, kcal: 42, sugar: '9,8 g' },
  { id: 'cherry', name: 'Cherry Volt', sub: 'Kirsche & Granatapfel', c1: '#ff5272', c2: '#b0002a', ink: '#ffffff', glow: '#ff2d55', liquid: '#e0002e',
    desc: 'Tiefrote Kirsche und herber Granatapfel. Intensiv, elektrisierend, unverwechselbar.', price: 2.49, kcal: 47, sugar: '10,9 g' },
  { id: 'zero', name: 'Zero Black', sub: 'Zuckerfrei · Cola-Lime', c1: '#2b2b30', c2: '#050505', ink: '#f4f4f4', glow: '#d8ff3e', liquid: '#8a4a1c',
    desc: 'Null Zucker. Null Kompromisse. Cola trifft Limette – volle Energie, nur 3 kcal.', price: 2.69, kcal: 3, sugar: '0 g', zero: true },
];

export const CAN = { r: 0.5, bodyH: 2.3 };

const W = 2048, H = 1500;

function bolt(ctx, cx, cy, h, fill) {
  const s = h / 100;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(8 * s, -50 * s);
  ctx.lineTo(-26 * s, 6 * s);
  ctx.lineTo(-2 * s, 6 * s);
  ctx.lineTo(-10 * s, 50 * s);
  ctx.lineTo(26 * s, -8 * s);
  ctx.lineTo(2 * s, -8 * s);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function repeatText(ctx, text, y, color) {
  ctx.fillStyle = color;
  ctx.font = '600 44px InterDisplay, Inter, Arial, sans-serif';
  ctx.letterSpacing = '10px';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const w = ctx.measureText(text).width;
  for (let x = -40; x < W + w; x += w) ctx.fillText(text, x, y);
  ctx.letterSpacing = '0px';
}

/** Draws the full wrap-around label. x = W/2 is the front of the can. */
export function drawLabel(f) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // base gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, f.c1);
  g.addColorStop(1, f.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft highlight blob behind the logo
  const rg = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, 700);
  rg.addColorStop(0, 'rgba(255,255,255,0.28)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // diagonal energy stripes
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = f.ink;
  for (let i = -6; i < 14; i++) {
    ctx.beginPath();
    const x = i * 190;
    ctx.moveTo(x, H); ctx.lineTo(x + 60, H); ctx.lineTo(x + 60 + H * 0.6, 0); ctx.lineTo(x + H * 0.6, 0);
    ctx.fill();
  }
  ctx.restore();

  // halftone dots at the bottom
  ctx.save();
  ctx.fillStyle = f.ink;
  for (let y = H - 520; y < H - 110; y += 26) {
    const t = (y - (H - 520)) / 410;
    for (let x = 0; x < W; x += 26) {
      const rad = 1 + 7 * t * (0.5 + 0.5 * Math.sin(x * 0.004));
      ctx.globalAlpha = 0.16;
      ctx.beginPath(); ctx.arc(x + (y / 26 % 2) * 13, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // top + bottom bands
  ctx.fillStyle = f.ink;
  ctx.fillRect(0, 0, W, 104);
  ctx.fillRect(0, H - 104, W, 104);
  const bandTxt = f.zero ? f.glow : f.c1;
  repeatText(ctx, 'VOLTA ENERGY  ·  250 ML  ·  ', 54, bandTxt);
  repeatText(ctx, '160 MG KOFFEIN  ·  B-VITAMINE  ·  ' + (f.zero ? 'ZERO SUGAR  ·  ' : 'NATÜRLICHE AROMEN  ·  '), H - 50, bandTxt);

  // vertical brand on the front
  const cx = W / 2, cy = H / 2;
  ctx.save();
  ctx.translate(cx, cy + 10);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '900 330px InterDisplay, Inter, Arial Black, sans-serif';
  ctx.letterSpacing = '-6px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.strokeText('VOLTA', 8, 10);
  ctx.fillStyle = f.ink;
  ctx.fillText('VOLTA', 0, 0);
  ctx.restore();

  // bolt logo left of the brand
  bolt(ctx, cx - 230, cy - 360, 230, f.zero ? f.glow : f.ink);
  // flavour name to the right
  ctx.save();
  ctx.translate(cx + 225, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = f.zero ? f.glow : f.ink;
  ctx.font = '800 92px InterDisplay, Inter, Arial, sans-serif';
  ctx.fillText(f.name.toUpperCase(), 0, 0);
  ctx.font = '600 40px InterDisplay, Inter, Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.globalAlpha = 0.85;
  ctx.fillText(f.sub.toUpperCase(), 0, 84);
  ctx.restore();

  if (f.zero) {
    ctx.save();
    ctx.translate(cx - 230, cy + 260);
    ctx.fillStyle = f.glow;
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#050505';
    ctx.font = '900 54px InterDisplay, Inter, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ZERO', 0, 2);
    ctx.restore();
  }

  // side panel: nutrition facts (right side of the can)
  const px = W * 0.75 + 70, py = 330;
  ctx.save();
  ctx.fillStyle = f.ink;
  ctx.globalAlpha = 0.92;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 44px InterDisplay, Inter, Arial, sans-serif';
  ctx.fillText('NÄHRWERTE / 100 ML', px, py);
  ctx.font = '500 34px InterDisplay, Inter, Arial, sans-serif';
  const rows = [['Energie', `${Math.round(f.kcal * 4.18)} kJ / ${f.kcal} kcal`], ['Fett', '0 g'], ['Kohlenhydrate', f.sugar],
    ['davon Zucker', f.sugar], ['Eiweiß', '0 g'], ['Salz', '0,1 g'], ['Koffein', '64 mg'], ['Vitamin B6', '0,8 mg'], ['Vitamin B12', '0,4 µg']];
  rows.forEach(([k, v], i) => {
    const y = py + 70 + i * 54;
    ctx.fillText(k, px, y);
    ctx.textAlign = 'right'; ctx.fillText(v, px + 380, y); ctx.textAlign = 'left';
    ctx.globalAlpha = 0.3; ctx.fillRect(px, y + 16, 380, 2); ctx.globalAlpha = 0.92;
  });
  ctx.restore();

  // other side: ingredients + barcode
  const qx = W * 0.25 - 450, qy = 330;
  ctx.save();
  ctx.fillStyle = f.ink;
  ctx.font = '800 44px InterDisplay, Inter, Arial, sans-serif';
  ctx.fillText('ZUTATEN', qx, qy);
  ctx.font = '500 30px InterDisplay, Inter, Arial, sans-serif';
  const ingr = ['Wasser, ' + (f.zero ? 'Säuerungsmittel' : 'Rohrzucker') + ', Kohlensäure,', 'Säuerungsmittel Citronensäure,', 'natürliches Aroma (' + f.sub + '),', 'Taurin, Koffein (32 mg/100 ml),', 'Vitamine (B3, B5, B6, B12).', '', 'Erhöhter Koffeingehalt. Für Kinder', 'und schwangere oder stillende', 'Frauen nicht empfohlen.'];
  ingr.forEach((l, i) => ctx.fillText(l, qx, qy + 60 + i * 44));
  // barcode
  const by = qy + 520;
  ctx.fillStyle = '#fff';
  ctx.fillRect(qx, by, 330, 190);
  ctx.fillStyle = '#000';
  let seed = 7;
  for (let x = qx + 20; x < qx + 310;) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 2 + (seed % 5);
    ctx.fillRect(x, by + 18, w, 130);
    x += w + 2 + (seed % 4);
  }
  ctx.font = '600 24px InterDisplay, Inter, Arial, sans-serif';
  ctx.fillText('4 260123 45678 9', qx + 70, by + 178);
  ctx.restore();

  return c;
}

export function labelTexture(f, renderer) {
  const tex = new THREE.CanvasTexture(drawLabel(f));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  return tex;
}

/** Builds the can. Returns { group, body, label, tab, mouth, droplets, setOpen(v) } */
export function createCan(texture) {
  const { r, bodyH } = CAN;
  const group = new THREE.Group();
  const top = bodyH / 2, bot = -bodyH / 2;

  const metal = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0xa9adb5, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });

  const label = new THREE.MeshPhysicalMaterial({ map: texture, metalness: 0.55, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, 128, 1, true, Math.PI), label);
  group.add(body);

  const v = (x, y) => new THREE.Vector2(x, y);
  // shoulder, neck, rim and lid
  const topProfile = [v(r, top - 0.001), v(r, top + 0.02), v(r * 0.97, top + 0.09), v(r * 0.87, top + 0.21), v(r * 0.84, top + 0.25),
    v(r * 0.845, top + 0.285), v(r * 0.865, top + 0.3), v(r * 0.875, top + 0.315), v(r * 0.86, top + 0.33), v(r * 0.83, top + 0.325),
    v(r * 0.81, top + 0.305), v(r * 0.795, top + 0.272), v(r * 0.6, top + 0.268), v(r * 0.3, top + 0.266), v(0.0001, top + 0.265)];
  const topMesh = new THREE.Mesh(new THREE.LatheGeometry(topProfile, 128), metal);
  group.add(topMesh);

  const botProfile = [v(0.0001, bot - 0.08), v(r * 0.5, bot - 0.1), v(r * 0.66, bot - 0.135), v(r * 0.76, bot - 0.17), v(r * 0.86, bot - 0.15),
    v(r * 0.95, bot - 0.08), v(r * 0.995, bot - 0.02), v(r, bot + 0.001)].reverse();
  group.add(new THREE.Mesh(new THREE.LatheGeometry(botProfile, 128), metal));

  const lidY = top + 0.268;
  // scored opening (becomes a dark mouth when opened)
  const mouthShape = new THREE.Shape();
  mouthShape.absellipse(0, 0, 0.16, 0.1, 0, Math.PI * 2);
  const mouth = new THREE.Mesh(new THREE.ShapeGeometry(mouthShape, 40), new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0 }));
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.set(0, lidY + 0.002, 0.2);
  group.add(mouth);
  const score = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.182, 48), metalDark);
  score.scale.set(1, 0.62, 1);
  score.rotation.x = -Math.PI / 2;
  score.position.set(0, lidY + 0.001, 0.2);
  group.add(score);

  // pull tab (pivot at the rivet)
  const tabShape = new THREE.Shape();
  const tw = 0.15, tl1 = 0.13, tl2 = 0.3;
  tabShape.moveTo(-tw, -tl1 + 0.05);
  tabShape.quadraticCurveTo(-tw, -tl1, -tw + 0.05, -tl1);
  tabShape.lineTo(tw - 0.05, -tl1);
  tabShape.quadraticCurveTo(tw, -tl1, tw, -tl1 + 0.05);
  tabShape.lineTo(tw, tl2 - 0.08);
  tabShape.quadraticCurveTo(tw, tl2, 0, tl2);
  tabShape.quadraticCurveTo(-tw, tl2, -tw, tl2 - 0.08);
  tabShape.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, 0.16, 0.085, 0.075, 0, Math.PI * 2, true);
  tabShape.holes.push(hole);
  const tabGeo = new THREE.ExtrudeGeometry(tabShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 24 });
  const tabMesh = new THREE.Mesh(tabGeo, metal);
  tabMesh.rotation.x = Math.PI / 2;     // lay flat, +shapeY -> -z (back of the can)
  const tab = new THREE.Group();
  tab.position.set(0, lidY + 0.012, 0.02);
  tab.add(tabMesh);
  group.add(tab);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 24), metal);
  rivet.position.set(0, lidY + 0.01, 0.02);
  group.add(rivet);

  // condensation droplets on the body
  const dropGeo = new THREE.SphereGeometry(1, 14, 10);
  const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 0.2, transparent: true, opacity: 0.55, clearcoat: 1, ior: 1.33 });
  const N = 420;
  const droplets = new THREE.InstancedMesh(dropGeo, dropMat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = bot + 0.12 + Math.pow(Math.random(), 0.8) * (bodyH - 0.24);
    const big = Math.random() < 0.12;
    const sz = big ? 0.02 + Math.random() * 0.018 : 0.006 + Math.random() * 0.011;
    p.set(Math.sin(th) * (r + sz * 0.25), y, Math.cos(th) * (r + sz * 0.25));
    e.set(0, th, 0);
    q.setFromEuler(e);
    s.set(sz, sz * (big ? 1.5 : 1.15), sz * 0.45);
    m.compose(p, q, s);
    droplets.setMatrixAt(i, m);
  }
  group.add(droplets);

  // centre vertically
  group.children.forEach(ch => (ch.position.y -= 0.09));

  function setOpen(v) {
    tab.rotation.x = -v * 1.25;
    mouth.material.opacity = Math.min(1, v * 1.6);
  }

  return { group, body, label, tab, mouth, droplets, setOpen, lidY: lidY - 0.09 };
}

/** Glossy liquid drops (teardrop shaped) as one instanced mesh with simple physics. */
export class LiquidDrops {
  constructor(count = 160, color = '#ffffff') {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;                     // 0 = bottom, 1 = tip
      const a = t * Math.PI;
      const rad = Math.sin(a) * (1 - 0.55 * t) ** 1.2;
      pts.push(new THREE.Vector2(Math.max(rad, 0.0001), -Math.cos(a) + t * 0.7));
    }
    const geo = new THREE.LatheGeometry(pts, 20);
    geo.computeVertexNormals();
    this.mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.05, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.0,
      ior: 1.36, specularIntensity: 1, transparent: true, opacity: 0.9, emissive: color, emissiveIntensity: 0.35, envMapIntensity: 1.6 });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, count);
    this.mesh.frustumCulled = false;
    this.count = count;
    this.p = new Float32Array(count * 3);
    this.v = new Float32Array(count * 3);
    this.life = new Float32Array(count);   // remaining life (s)
    this.size = new Float32Array(count);
    this.orbit = new Float32Array(count * 4); // ambient orbit params
    this.mode = new Uint8Array(count);     // 0 = dead, 1 = burst (physics), 2 = orbit
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._pos = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0); this._dir = new THREE.Vector3();
    for (let i = 0; i < count; i++) this._hide(i);
  }
  setColor(c) { this.mat.color.set(c); this.mat.emissive.set(c); }
  _hide(i) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); }
  _free() { for (let i = 0; i < this.count; i++) if (this.mode[i] === 0) return i; return -1; }

  /** Burst of drops from a point (world space) with a main direction */
  burst(origin, dir, n = 40, speed = 4, spread = 1.4, size = 0.06) {
    for (let k = 0; k < n; k++) {
      const i = this._free(); if (i < 0) return;
      this.mode[i] = 1;
      this.p[i * 3] = origin.x; this.p[i * 3 + 1] = origin.y; this.p[i * 3 + 2] = origin.z;
      const sp = speed * (0.45 + Math.random() * 0.75);
      this.v[i * 3] = (dir.x + (Math.random() - 0.5) * spread) * sp;
      this.v[i * 3 + 1] = (dir.y + (Math.random() - 0.5) * spread * 0.6) * sp;
      this.v[i * 3 + 2] = (dir.z + (Math.random() - 0.5) * spread) * sp;
      this.life[i] = 1.4 + Math.random() * 1.2;
      this.size[i] = size * (0.35 + Math.random() * 0.9);
    }
  }

  /** Ring-shaped splash (crown) around a centre */
  crown(origin, n = 60, speed = 3.6, size = 0.055) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      this.burst(origin, { x: Math.sin(a), y: 0.9 + Math.random() * 0.6, z: Math.cos(a) }, 1, speed, 0.35, size);
    }
  }

  /** Floating drops that orbit the can (ambient) */
  setOrbiters(n) {
    let have = 0;
    for (let i = 0; i < this.count; i++) if (this.mode[i] === 2) have++;
    for (; have < n; have++) {
      const i = this._free(); if (i < 0) break;
      this.mode[i] = 2;
      const o = i * 4;
      this.orbit[o] = 1.1 + Math.random() * 1.6;        // radius
      this.orbit[o + 1] = Math.random() * Math.PI * 2;   // phase
      this.orbit[o + 2] = (Math.random() - 0.5) * 2.8;   // height
      this.orbit[o + 3] = (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1); // speed
      this.size[i] = 0.03 + Math.random() * 0.07;
      this.life[i] = 1e9;
    }
    for (let i = this.count - 1; i >= 0 && have > n; i--) if (this.mode[i] === 2) { this.mode[i] = 0; this._hide(i); have--; }
  }

  update(dt, t, center, spread = 1) {
    const g = -9.0;
    for (let i = 0; i < this.count; i++) {
      const mo = this.mode[i];
      if (mo === 0) continue;
      let px, py, pz, vx, vy, vz;
      if (mo === 1) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.mode[i] = 0; this._hide(i); continue; }
        this.v[i * 3 + 1] += g * dt;
        const drag = Math.exp(-0.6 * dt);
        this.v[i * 3] *= drag; this.v[i * 3 + 2] *= drag;
        this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
        px = this.p[i * 3]; py = this.p[i * 3 + 1]; pz = this.p[i * 3 + 2];
        vx = this.v[i * 3]; vy = this.v[i * 3 + 1]; vz = this.v[i * 3 + 2];
      } else {
        const o = i * 4;
        const a = this.orbit[o + 1] + t * this.orbit[o + 3];
        const rad = this.orbit[o] * spread;
        const h = this.orbit[o + 2] + Math.sin(t * 0.8 + this.orbit[o + 1]) * 0.25;
        px = center.x + Math.sin(a) * rad; pz = center.z + Math.cos(a) * rad * 0.7; py = center.y + h * spread;
        vx = Math.cos(a) * this.orbit[o + 3]; vz = -Math.sin(a) * this.orbit[o + 3] * 0.7; vy = Math.cos(t * 0.8 + this.orbit[o + 1]) * 0.2 + 0.25;
      }
      const sp = Math.hypot(vx, vy, vz);
      // teardrop: tip trails behind the motion direction
      this._dir.set(-vx, -vy, -vz);
      if (sp > 1e-4) this._dir.multiplyScalar(1 / sp); else this._dir.set(0, 1, 0);
      this._q.setFromUnitVectors(this._up, this._dir);
      const sz = this.size[i] * (mo === 1 ? Math.min(1, this.life[i] * 2.5) : 1);
      const stretch = 1 + Math.min(sp * 0.12, 1.2);
      this._s.set(sz, sz * stretch, sz);
      this._pos.set(px, py, pz);
      this._m.compose(this._pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
