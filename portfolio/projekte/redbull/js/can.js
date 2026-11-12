// Red Bull spec – 3D can (slim 250 ml), label textures, liquid drops
import * as THREE from 'three';
import { CAN, FLAVORS, drawLabel, drawMaterialMap } from './label.js';
export { CAN, FLAVORS };

export function labelTextures(f, renderer, width) {
  const c = drawLabel(f, width);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
  const mr = new THREE.CanvasTexture(drawMaterialMap(c, f));
  return { map, mr, dispose() { map.dispose(); mr.dispose(); } };
}

/** Builds the can. Returns { group, body, label, tab, mouth, droplets, setOpen(v) } */
export function createCan(tex, opts = {}) {
  const segs = opts.segs || 128, withDrops = opts.droplets !== false;
  const { r, bodyH } = CAN;
  const group = new THREE.Group();
  const top = bodyH / 2, bot = -bodyH / 2;

  const metal = opts.metal || new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  const metalDark = opts.metalDark || new THREE.MeshStandardMaterial({ color: 0xa9adb5, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });

  const label = opts.material || new THREE.MeshPhysicalMaterial({ map: tex.map, metalnessMap: tex.mr, roughnessMap: tex.mr, metalness: 1, roughness: 1, clearcoat: 1, clearcoatRoughness: 0.06 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bodyH, segs, 1, true, Math.PI), label);
  group.add(body);

  const v = (x, y) => new THREE.Vector2(x, y);
  // original slim-can shape (250 ml): short necked shoulder, rolled rim, recessed lid – measured from the product photo
  const topProfile = [v(r, top - 0.001), v(r, top + 0.012), v(r * 0.985, top + 0.028), v(r * 0.958, top + 0.042), v(r * 0.948, top + 0.052),
    v(r * 0.952, top + 0.06), v(r * 0.964, top + 0.066), v(r * 0.968, top + 0.073), v(r * 0.958, top + 0.08), v(r * 0.938, top + 0.079),
    v(r * 0.93, top + 0.07), v(r * 0.92, top + 0.058), v(r * 0.9, top + 0.054), v(r * 0.6, top + 0.053), v(r * 0.3, top + 0.0525), v(0.0001, top + 0.052)];
  const topMesh = new THREE.Mesh(new THREE.LatheGeometry(topProfile, segs), metal);
  group.add(topMesh);

  // tapered base with a narrow foot ring and an inward dome
  const botProfile = [v(0.0001, bot - 0.05), v(r * 0.45, bot - 0.056), v(r * 0.68, bot - 0.072), v(r * 0.76, bot - 0.088), v(r * 0.8, bot - 0.092),
    v(r * 0.845, bot - 0.086), v(r * 0.9, bot - 0.066), v(r * 0.96, bot - 0.036), v(r * 0.993, bot - 0.012), v(r, bot + 0.001)].reverse();
  group.add(new THREE.Mesh(new THREE.LatheGeometry(botProfile, segs), metal));

  const lidY = top + 0.053;
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
  const N = withDrops ? 420 : 0;
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
  if (N) group.add(droplets);

  // centre vertically
  const SHIFT = 0.02;   // centre the can vertically
  group.children.forEach(ch => (ch.position.y += SHIFT));

  function setOpen(v) {
    tab.rotation.x = -v * 1.25;
    mouth.material.opacity = Math.min(1, v * 1.6);
  }

  return { group, body, label, tab, mouth, droplets, setOpen, lidY: lidY + SHIFT };
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
