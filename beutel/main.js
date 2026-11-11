import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

/* ------------------------------------------------------------------ *
 *  Data
 * ------------------------------------------------------------------ */
const FLAVORS = [
  { name: "Lavendel",    hex: "#8f6bd8", light: "#c9b5ff", text: "Wie ein Spaziergang durch die Provence. Nur mit Bohnen." },
  { name: "Erdbeere",    hex: "#ff3b5c", light: "#ff9fb0", text: "Fruchtig, frech und erstaunlich überzeugend." },
  { name: "Pfefferminz", hex: "#14c49c", light: "#8ff0d6", text: "Kühlt die Nase. Rettet die Situation." },
  { name: "Zitrone",     hex: "#ffcf0a", light: "#fff0a0", text: "Frisch gepresst statt frisch gepupst." },
  { name: "Blaubeere",   hex: "#3d5afe", light: "#9fb0ff", text: "Tiefblau. Tief durchatmen ausdrücklich erlaubt." },
  { name: "Mango",       hex: "#ff8a1f", light: "#ffc58f", text: "Tropisch. Sogar nach dem Bohnen-Chili." },
  { name: "Graphit",     hex: "#3a3a40", light: "#b8b8c2", text: "Ohne Duft. Für Puristen. Riecht nach absolut nichts." },
];

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ *
 *  Renderer / scene
 * ------------------------------------------------------------------ */
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0.2, 7.2);
camera.lookAt(0, 0, 0);

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 3.0);
rim.position.set(-4, 2, -3);
scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ------------------------------------------------------------------ *
 *  Bag geometry (lathe profile + fabric pleats)
 * ------------------------------------------------------------------ */
const profile = new THREE.SplineCurve([
  new THREE.Vector2(0.0, -1.22),
  new THREE.Vector2(0.5, -1.17),
  new THREE.Vector2(0.8, -1.02),
  new THREE.Vector2(0.96, -0.74),
  new THREE.Vector2(1.0, -0.36),
  new THREE.Vector2(0.95, 0.02),
  new THREE.Vector2(0.82, 0.38),
  new THREE.Vector2(0.6, 0.68),
  new THREE.Vector2(0.42, 0.88),
  new THREE.Vector2(0.37, 0.98),
  new THREE.Vector2(0.43, 1.08),
  new THREE.Vector2(0.56, 1.2),
  new THREE.Vector2(0.66, 1.3),
]).getPoints(120);

function bagGeometry(pleats = true, shrink = 1) {
  const pts = profile.map((p) => new THREE.Vector2(p.x * shrink, p.y));
  const geo = new THREE.LatheGeometry(pts, 160, Math.PI, Math.PI * 2);
  if (pleats) {
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.z);
      if (r < 1e-4) continue;
      const a = Math.atan2(v.x, v.z);
      const gather = smooth(0.15, 0.95, v.y);
      const ruffle = smooth(1.0, 1.3, v.y);
      let k = 1 + 0.075 * gather * Math.sin(a * 16) + 0.05 * ruffle * Math.sin(a * 9 + 1.3);
      k += 0.018 * Math.sin(a * 3 + v.y * 4) * (1 - gather);
      const y = v.y + ruffle * 0.05 * Math.sin(a * 7);
      pos.setXYZ(i, v.x * k, y, v.z * k);
    }
    geo.computeVertexNormals();
  }
  return geo;
}

// Fabric texture with debossed logo (tinted by material.color)
function fabricTexture() {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  // woven grain
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const weave = ((x >> 1) + (y >> 1)) % 2 ? 6 : 0;
      const n = 238 + weave + Math.random() * 11;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    }
  }
  g.putImageData(img, 0, 0);
  // stitched seam near the bottom
  g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 5; g.setLineDash([22, 16]);
  g.beginPath(); g.moveTo(0, 860); g.lineTo(2048, 860); g.stroke();
  g.setLineDash([]);
  // logo (front = u 0.5); compensate vertical stretch
  g.save();
  g.translate(1024, 560);
  g.scale(1, 0.86);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "800 210px Inter, Arial, sans-serif";
  g.fillStyle = "rgba(255,255,255,.55)";
  g.fillText("pöff", 3, 5);
  g.fillStyle = "rgba(0,0,0,.30)";
  g.fillText("pöff", 0, 0);
  g.font = "600 46px Inter, Arial, sans-serif";
  g.fillStyle = "rgba(0,0,0,.28)";
  g.fillText("ODOR-LOCK  ·  3 LAYER", 0, 150);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const bagMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(FLAVORS[0].hex),
  map: null,
  roughness: 0.62,
  sheen: 1,
  sheenRoughness: 0.45,
  sheenColor: new THREE.Color(FLAVORS[0].light),
  clearcoat: 0.25,
  clearcoatRoughness: 0.5,
  side: THREE.DoubleSide,
});

const root = new THREE.Group();       // pose (position / scale / tilt)
scene.add(root);
const outer = new THREE.Group();      // outer shell + drawstring
root.add(outer);
const outerMesh = new THREE.Mesh(bagGeometry(true), bagMat);
outer.add(outerMesh);

// drawstring
const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.85 });
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 12, 90), ropeMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.97;
outer.add(ring);
const strings = new THREE.Group();
strings.position.set(0, 0.97, 0.4);
outer.add(strings);
const toggleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1, metalness: 0.1 });
[-1, 1].forEach((s) => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.06 * s, -0.12, 0.08),
    new THREE.Vector3(0.12 * s, -0.4, 0.14),
    new THREE.Vector3(0.15 * s, -0.68, 0.12),
  ]);
  strings.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.018, 8), ropeMat));
  const tog = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 6, 14), toggleMat);
  tog.position.set(0.15 * s, -0.74, 0.12);
  strings.add(tog);
});

// inner layers (exploded view)
const foilMesh = new THREE.Mesh(
  bagGeometry(false, 0.97),
  new THREE.MeshPhysicalMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.22, side: THREE.DoubleSide }),
);
const carbonMesh = new THREE.Mesh(
  bagGeometry(false, 0.94),
  new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, side: THREE.DoubleSide }),
);
root.add(foilMesh, carbonMesh);
foilMesh.visible = carbonMesh.visible = false;

// floor glow
const glowTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 1.2),
  new THREE.MeshBasicMaterial({ map: glowTex, color: FLAVORS[0].hex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

/* ------------------------------------------------------------------ *
 *  Puff particles (scented gas getting sucked in)
 * ------------------------------------------------------------------ */
const PUFF_N = reduceMotion ? 120 : 380;
const puffGeo = new THREE.BufferGeometry();
const puffPos = new Float32Array(PUFF_N * 3);
const puffSize = new Float32Array(PUFF_N);
const puffAlpha = new Float32Array(PUFF_N);
const puffSeed = Array.from({ length: PUFF_N }, () => ({
  t: Math.random(), oy: Math.random() * 2 - 1, oz: Math.random() * 2 - 1, s: 0.6 + Math.random(), w: Math.random() * 6.28,
}));
puffGeo.setAttribute("position", new THREE.BufferAttribute(puffPos, 3));
puffGeo.setAttribute("aSize", new THREE.BufferAttribute(puffSize, 1));
puffGeo.setAttribute("aAlpha", new THREE.BufferAttribute(puffAlpha, 1));
const puffMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uColor: { value: new THREE.Color(FLAVORS[0].light) }, uPR: { value: renderer.getPixelRatio() } },
  vertexShader: /* glsl */ `
    attribute float aSize; attribute float aAlpha; varying float vA; uniform float uPR;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPR * (320.0 / -mv.z);
      vA = aAlpha;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(uColor, a * a * vA * 0.55);
    }`,
});
const puff = new THREE.Points(puffGeo, puffMat);
puff.frustumCulled = false;
scene.add(puff);

/* ------------------------------------------------------------------ *
 *  Splash drops (glossy liquid falling in)
 * ------------------------------------------------------------------ */
const DROP_N = 28;
const drops = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.07, 18, 14),
  new THREE.MeshPhysicalMaterial({ color: 0xc8d64a, roughness: 0.05, clearcoat: 1, transmission: 0.2, thickness: 0.3 }),
  DROP_N,
);
drops.frustumCulled = false;
scene.add(drops);
const dropSeed = Array.from({ length: DROP_N }, () => ({
  t: Math.random(), x: (Math.random() - 0.5) * 0.9, z: (Math.random() - 0.5) * 0.5, h: 2.2 + Math.random() * 1.6, s: 0.6 + Math.random() * 0.8,
}));
const dummy = new THREE.Object3D();

/* ------------------------------------------------------------------ *
 *  Scroll choreography
 * ------------------------------------------------------------------ */
const scenes = [...document.querySelectorAll(".scene")];
const beatsBy = scenes.map((s) => [...s.querySelectorAll(".beat")]);
const TURNS = [1, 1, 0, 1, 0]; // full turns of the bag per section

// pose keyframes per stage: x, y, scale, tilt (rotX)
const POSES_WIDE = [
  { x: 0, y: -1.35, s: 0.68, rx: 0.12 },
  { x: 1.45, y: -0.12, s: 1.0, rx: 0.05 },
  { x: -1.45, y: -0.35, s: 0.95, rx: 0.42 },
  { x: 0, y: -0.85, s: 0.62, rx: 0.1 },
  { x: 1.4, y: -0.1, s: 1.08, rx: 0.06 },
];
const POSES_NARROW = [
  { x: 0, y: -1.3, s: 0.55, rx: 0.12 },
  { x: 0, y: -0.95, s: 0.72, rx: 0.05 },
  { x: 0, y: -1.05, s: 0.68, rx: 0.42 },
  { x: 0, y: -0.75, s: 0.46, rx: 0.1 },
  { x: 0, y: -1.0, s: 0.66, rx: 0.06 },
];
let POSES = POSES_WIDE;
let narrow = false;

function readScroll() {
  const vh = innerHeight;
  let stage = 0;
  const prog = scenes.map((el, i) => {
    const r = el.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    if (r.top <= 0) stage = i + p;
    return p;
  });
  const last = scenes[scenes.length - 1].getBoundingClientRect();
  return { stage, prog, active: last.bottom > 0 };
}

function updateBeats(prog) {
  beatsBy.forEach((beats, i) => {
    const p = prog[i];
    beats.forEach((b) => {
      const a = parseFloat(b.dataset.in), z = parseFloat(b.dataset.out);
      const o = (a < 0 ? 1 : smooth(a, a + 0.08, p)) * (z > 1 ? 1 : 1 - smooth(z - 0.08, z, p));
      b.style.opacity = o.toFixed(3);
      b.style.transform = `translateY(${((1 - o) * (p < a + 0.08 ? 40 : -40)).toFixed(1)}px)`;
      b.style.pointerEvents = o > 0.5 ? "auto" : "none";
    });
  });
}

/* ------------------------------------------------------------------ *
 *  Flavor switching
 * ------------------------------------------------------------------ */
const target = { color: new THREE.Color(FLAVORS[0].hex), light: new THREE.Color(FLAVORS[0].light) };
let flavorIndex = 0;
const swatchWrap = document.getElementById("swatches");
const nameEl = document.getElementById("flavorName");
const textEl = document.getElementById("flavorText");
const puffHeadline = document.querySelector("#puff .beat:nth-child(2) .grad");
let spinKick = 0;

FLAVORS.forEach((f, i) => {
  const b = document.createElement("button");
  b.className = "swatch";
  b.style.setProperty("--c", f.hex);
  b.setAttribute("role", "radio");
  b.setAttribute("aria-label", f.name);
  b.setAttribute("aria-checked", i === 0 ? "true" : "false");
  b.addEventListener("click", () => setFlavor(i));
  swatchWrap.appendChild(b);
});

function setFlavor(i) {
  if (i === flavorIndex) return;
  flavorIndex = i;
  const f = FLAVORS[i];
  target.color.set(f.hex);
  target.light.set(f.light);
  document.documentElement.style.setProperty("--flavor", f.hex);
  document.documentElement.style.setProperty("--flavor-2", f.light);
  [...swatchWrap.children].forEach((s, j) => s.setAttribute("aria-checked", j === i ? "true" : "false"));
  nameEl.textContent = f.name;
  textEl.textContent = f.text;
  nameEl.classList.remove("swap"); void nameEl.offsetWidth; nameEl.classList.add("swap");
  puffHeadline.textContent = f.name === "Graphit" ? "riecht nach nichts." : `riecht nach ${f.name}.`;
  spinKick = 1;
}

/* ------------------------------------------------------------------ *
 *  Labels for exploded view
 * ------------------------------------------------------------------ */
const labels = [...document.querySelectorAll(".label")];
const tmpV = new THREE.Vector3();
function placeLabel(el, obj, opacity) {
  obj.getWorldPosition(tmpV);
  tmpV.y += 1.45 * root.scale.y;
  tmpV.project(camera);
  const x = (tmpV.x * 0.5 + 0.5) * innerWidth;
  const y = (-tmpV.y * 0.5 + 0.5) * innerHeight;
  el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  el.style.opacity = opacity.toFixed(3);
}

/* ------------------------------------------------------------------ *
 *  Pointer parallax
 * ------------------------------------------------------------------ */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

/* ------------------------------------------------------------------ *
 *  Resize
 * ------------------------------------------------------------------ */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  narrow = w / h < 0.9 || w < 834;
  POSES = narrow ? POSES_NARROW : POSES_WIDE;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

/* ------------------------------------------------------------------ *
 *  Main loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();
const glowEl = document.getElementById("glow");
const opening = new THREE.Vector3();
let spinOffset = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const { stage, prog, active } = readScroll();
  updateBeats(prog);
  canvas.style.visibility = glowEl.style.visibility = active ? "visible" : "hidden";
  if (!active) return;

  // --- pose ---
  const i = Math.min(Math.floor(stage), POSES.length - 1);
  const p = stage - i;
  const from = POSES[Math.max(0, i - 1)], to = POSES[i];
  const k = i === 0 ? 1 : easeInOut(smooth(0, 0.22, p));
  const px = lerp(from.x, to.x, k), py = lerp(from.y, to.y, k);
  const ps = lerp(from.s, to.s, k), prx = lerp(from.rx, to.rx, k);

  // section intensities
  const puffI = i === 1 ? smooth(0.08, 0.2, p) * (1 - smooth(0.92, 1, p)) : 0;
  const splashI = i === 2 ? smooth(0.12, 0.24, p) * (1 - smooth(0.9, 1, p)) : 0;
  const explode = i === 3 ? easeInOut(smooth(0.12, 0.45, p)) * (1 - easeInOut(smooth(0.82, 1, p))) : 0;
  const inflate = i === 1 ? smooth(0.15, 0.85, p) * (1 - smooth(0.9, 1, p)) : 0;

  // scroll-driven spin
  let scrollRot = 0;
  prog.forEach((q, j) => (scrollRot += TURNS[j] * Math.PI * 2 * easeInOut(q)));
  spinKick = Math.max(0, spinKick - dt * 0.9);
  spinOffset += dt * spinKick * 9;
  if (spinKick === 0) spinOffset = lerp(spinOffset, Math.round(spinOffset / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-dt * 3));

  mouse.sx = lerp(mouse.sx, mouse.x, 1 - Math.exp(-dt * 4));
  mouse.sy = lerp(mouse.sy, mouse.y, 1 - Math.exp(-dt * 4));

  const bob = reduceMotion ? 0 : Math.sin(t * 1.3) * 0.06;
  const wob = splashI * Math.sin(t * 14) * 0.012;
  root.position.set(px, py + bob, 0);
  root.scale.set(ps * (1 + inflate * 0.16 + wob), ps * (1 - inflate * 0.05 - wob), ps * (1 + inflate * 0.16 + wob));
  root.rotation.x = prx + mouse.sy * 0.12;
  root.rotation.z = Math.sin(t * 0.9) * 0.03 - mouse.sx * 0.05;

  const idle = reduceMotion ? 0 : Math.sin(t * 0.55) * 0.35;
  const ry = scrollRot + idle + mouse.sx * 0.35 + spinOffset;
  outer.rotation.y = ry;
  strings.rotation.x = Math.sin(t * 1.7) * 0.08 + 0.05;
  strings.rotation.z = Math.sin(t * 1.3) * 0.06;

  // exploded view
  const spread = narrow ? 1.25 : 2.1;
  outer.position.x = -spread * explode;
  outer.position.y = 0.15 * explode;
  foilMesh.visible = carbonMesh.visible = explode > 0.002;
  foilMesh.rotation.y = ry * 0.6 + 0.4;
  carbonMesh.rotation.y = ry * 0.4 - 0.3;
  carbonMesh.position.x = spread * explode;
  carbonMesh.position.y = -0.15 * explode;
  foilMesh.position.y = 0;
  labels.forEach((el, j) => placeLabel(el, [outer, foilMesh, carbonMesh][j], smooth(0.5, 0.95, explode)));

  // color tween
  const ct = 1 - Math.exp(-dt * 5);
  bagMat.color.lerp(target.color, ct);
  bagMat.sheenColor.lerp(target.light, ct);
  puffMat.uniforms.uColor.value.lerp(target.light, ct);
  floor.material.color.lerp(target.color, ct);
  floor.position.set(px, py - 1.3 * ps - 0.05, 0);
  floor.scale.setScalar(ps * (1 - explode * 0.3));
  glowEl.style.setProperty("--gx", `${50 + (px / 4.2) * 50}%`);

  // opening in world space
  root.updateMatrixWorld();
  opening.set(0, 1.05, 0);
  outer.localToWorld(opening);

  // puff particles
  const startX = narrow ? -3.2 : -5.5;
  for (let n = 0; n < PUFF_N; n++) {
    const sd = puffSeed[n];
    const q = (sd.t + t * 0.16 * sd.s) % 1;
    const sx = opening.x + startX + sd.oy * 0.6, sy = opening.y - 1.8 + sd.oy * 1.6, sz = sd.oz * 1.4;
    const cx = opening.x + startX * 0.35, cy = opening.y + 1.4 + sd.oy * 0.8, cz = sd.oz * 0.8;
    const u = q * q * (3 - 2 * q), iu = 1 - u;
    const swirl = Math.sin(t * 2 + sd.w) * 0.25 * (1 - q);
    puffPos[n * 3] = iu * iu * sx + 2 * iu * u * cx + u * u * opening.x + swirl;
    puffPos[n * 3 + 1] = iu * iu * sy + 2 * iu * u * cy + u * u * (opening.y + 0.05) + Math.cos(t * 1.7 + sd.w) * 0.2 * (1 - q);
    puffPos[n * 3 + 2] = iu * iu * sz + 2 * iu * u * cz + u * u * opening.z;
    puffSize[n] = (0.25 + (1 - q) * 0.9) * sd.s * ps;
    puffAlpha[n] = Math.pow(Math.sin(q * Math.PI), 0.8) * puffI;
  }
  puff.visible = puffI > 0.001;
  puffGeo.attributes.position.needsUpdate = true;
  puffGeo.attributes.aSize.needsUpdate = true;
  puffGeo.attributes.aAlpha.needsUpdate = true;

  // splash drops
  drops.visible = splashI > 0.001;
  if (drops.visible) {
    for (let n = 0; n < DROP_N; n++) {
      const sd = dropSeed[n];
      const q = (sd.t + t * 0.55) % 1;
      const fall = q * q;
      dummy.position.set(
        opening.x + sd.x * (1 - fall) * ps,
        opening.y + (sd.h * (1 - fall)) * ps,
        opening.z + sd.z * (1 - fall) * ps,
      );
      const sc = splashI * sd.s * ps * (q > 0.96 ? 0 : 1);
      dummy.scale.set(sc * (1 - q * 0.2), sc * (1 + q * 0.6), sc * (1 - q * 0.2));
      dummy.updateMatrix();
      drops.setMatrixAt(n, dummy.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ *
 *  Page UI: reveal, counters, tilt cards, cart
 * ------------------------------------------------------------------ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll?.("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.18 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
  io.observe(el);
});

function countUp(el) {
  const end = parseFloat(el.dataset.count), dec = +el.dataset.dec;
  const t0 = performance.now(), dur = 1600;
  const step = (now) => {
    const k = clamp((now - t0) / dur);
    const v = end * (1 - Math.pow(1 - k, 4));
    el.textContent = v.toFixed(dec).replace(".", ",");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

document.querySelectorAll(".tilt").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    if (!el.classList.contains("in")) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transitionDelay = "0ms";
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(10px)`;
  });
  el.addEventListener("pointerleave", () => (el.style.transform = ""));
});

let cartN = 0;
const cartBtn = document.querySelector(".cart");
const toast = document.getElementById("toast");
let toastTimer;
document.querySelectorAll(".buy").forEach((b) =>
  b.addEventListener("click", () => {
    cartN++;
    document.getElementById("cartCount").textContent = cartN;
    cartBtn.classList.remove("bump"); void cartBtn.offsetWidth; cartBtn.classList.add("bump");
    toast.textContent = `${b.dataset.name} in ${FLAVORS[flavorIndex].name} liegt im Warenkorb.`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }),
);

/* ------------------------------------------------------------------ *
 *  Start (wait for font so the logo texture uses Inter)
 * ------------------------------------------------------------------ */
const fontReady = document.fonts?.load("800 210px Inter").catch(() => {}) ?? Promise.resolve();
Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  bagMat.map = fabricTexture();
  bagMat.needsUpdate = true;
  frame();
  setTimeout(() => document.getElementById("loader").classList.add("done"), 250);
});
