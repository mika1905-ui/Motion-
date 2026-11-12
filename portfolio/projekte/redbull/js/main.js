import * as THREE from 'three';
import { FLAVORS, createCan, labelTextures, LiquidDrops, studioEnvironment } from './can.js';
import { loadLabelAssets } from './label.js';
import { initTray } from './tray.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const euro = v => v.toFixed(2).replace('.', ',') + ' €';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.documentElement;
let flavorIndex = 0;

/* ======================================================================
   UI: reveal, counters, tilt, cart, shop
   ====================================================================== */
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: 0.15 });
$$('.reveal').forEach(el => io.observe(el));

const countIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const to = +e.target.dataset.count, t0 = performance.now();
    if (to === 0) { e.target.textContent = '0'; continue; }
    const step = now => {
      const p = clamp((now - t0) / 1600);
      e.target.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => countIO.observe(el));

if (!reduced && matchMedia('(hover: hover)').matches) {
  $$('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(0)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
  });
}

let bagCount = 0, toastTimer;
function addToBag(label, qty = 1) {
  bagCount += qty;
  const c = $('#bagCount');
  c.textContent = bagCount;
  c.classList.add('show');
  const bag = $('#bag');
  bag.classList.remove('bump'); void bag.offsetWidth; bag.classList.add('bump');
  const t = $('#toast');
  t.textContent = `✓ ${label} hinzugefügt`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
$('#bag').addEventListener('click', () => {
  const t = $('#toast');
  t.textContent = bagCount ? `Dein Warenkorb: ${bagCount} Artikel` : 'Dein Warenkorb ist noch leer';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
});

const PACKS = { 1: { label: 'Einzeldose', price: f => f.price, img: f => `img/can-${f.id}.webp`, w: 400, h: 1000 },
  24: { label: '24er Tray', price: () => 34.99, img: f => `img/tray-${f.id}.webp`, w: 800, h: 640 } };
let pack = 1;
const dispName = f => f.kind === 'edition' ? f.short + ' Edition' : f.short;
function renderProducts() {
  const P = PACKS[pack];
  $('#products').classList.toggle('trays', pack === 24);
  $('#products').innerHTML = FLAVORS.map((f, i) => {
    const p = P.price(f), per = p / pack;
    return `<article class="product reveal in" style="--c:${f.glow}">
      <div class="pimg"><img src="${P.img(f)}" alt="Red Bull ${dispName(f)} – ${P.label}" loading="lazy" width="${P.w}" height="${P.h}"></div>
      <h3>${dispName(f)}</h3><p class="psub">${f.sub}</p>
      <div class="prow"><p class="pprice">${euro(p)}${pack > 1 ? `<small>${euro(per)} / Dose</small>` : '<small>250 ml</small>'}</p>
      <button class="add" data-i="${i}">Hinzufügen</button></div></article>`;
  }).join('');
}
renderProducts();
$('#products').addEventListener('click', e => {
  const b = e.target.closest('.add');
  if (!b) return;
  const f = FLAVORS[+b.dataset.i];
  addToBag(`${dispName(f)} · ${PACKS[pack].label}`);
});
$('#packSeg').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  pack = +b.dataset.pack;
  $$('#packSeg button').forEach(x => x.classList.toggle('on', x === b));
  renderProducts();
});
$$('[data-add]').forEach(b => b.addEventListener('click', () => addToBag(`${b.dataset.add} (${euro(+b.dataset.price)})`)));

/* ======================================================================
   Flavour UI
   ====================================================================== */
$('#swatches').innerHTML = FLAVORS.map((f, i) =>
  `<button class="swatch" role="tab" aria-selected="${i === 0}" data-i="${i}" aria-label="${f.name}"><i style="--a:${f.c1 || f.baseHi};--b:${f.c2 || f.base}"></i>${f.short}</button>`).join('');

function applyFlavorUI(i) {
  const f = FLAVORS[i];
  root.style.setProperty('--glow', f.glow);
  root.style.setProperty('--accent', f.ui);
  $$('.swatch').forEach((s, k) => s.setAttribute('aria-selected', k === i));
  const copy = $('.flav-copy');
  copy.classList.add('swap');
  setTimeout(() => {
    $('#flavName').textContent = dispName(f);
    $('#flavSub').textContent = f.sub;
    $('#flavDesc').textContent = f.desc;
    $('#flavKcal').textContent = f.sugar;
    $('#flavPrice').textContent = euro(f.price);
    copy.classList.remove('swap');
  }, 260);
}
applyFlavorUI(0);

let stage = null; // set when WebGL is up
function setFlavor(i) {
  i = (i + FLAVORS.length) % FLAVORS.length;
  if (i === flavorIndex) return;
  flavorIndex = i;
  applyFlavorUI(i);
  stage?.switchFlavor(i);
}
$('#swatches').addEventListener('click', e => { const b = e.target.closest('.swatch'); if (b) setFlavor(+b.dataset.i); });
$('#flavPrev').addEventListener('click', () => setFlavor(flavorIndex - 1));
$('#flavNext').addEventListener('click', () => setFlavor(flavorIndex + 1));
$('#flavAdd').addEventListener('click', () => { addToBag(`${dispName(FLAVORS[flavorIndex])} · Einzeldose`); stage?.splash(); });
addEventListener('keydown', e => {
  const r = $('#geschmack').getBoundingClientRect();
  if (r.top > innerHeight * 0.5 || r.bottom < innerHeight * 0.5) return;
  if (e.key === 'ArrowRight') setFlavor(flavorIndex + 1);
  if (e.key === 'ArrowLeft') setFlavor(flavorIndex - 1);
});

/* ======================================================================
   3D stage
   ====================================================================== */
async function initStage() {
  const canvas = $('#stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    canvas.remove();
    $('#fallback').hidden = false;
    return null;
  }
  try { await Promise.race([document.fonts.load('900 100px InterDisplay'), new Promise(r => setTimeout(r, 2500))]); } catch { /* ignore */ }
  await loadLabelAssets();

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  scene.environment = studioEnvironment(renderer);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rimA = new THREE.PointLight(FLAVORS[0].glow, 40, 20, 1.6);
  rimA.position.set(2.6, 1.5, -2.5);
  const rimB = new THREE.PointLight(FLAVORS[0].glow, 25, 20, 1.6);
  rimB.position.set(-2.8, -1.2, -2);
  scene.add(rimA, rimB);

  // high-res labels, built on demand (keeps GPU memory low on phones)
  const big = Math.max(screen.width, screen.height) * Math.min(devicePixelRatio, 2) > 2000 && renderer.capabilities.maxTextureSize >= 4096;
  const TEXW = big ? 4096 : 2048;
  const texCache = new Map();
  function getTex(i) {
    if (!texCache.has(i)) {
      texCache.set(i, labelTextures(FLAVORS[i], renderer, TEXW));
      renderer.initTexture(texCache.get(i).map);
    }
    const t = texCache.get(i);
    texCache.delete(i); texCache.set(i, t);         // most recent last
    for (const [k, old] of texCache) {
      if (texCache.size <= 3) break;
      if (k === flavorIndex || k === i) continue;
      texCache.delete(k); old.dispose();
    }
    return t;
  }
  const can = createCan(getTex(0));
  const rig = new THREE.Group();     // scroll-driven transform
  const spin = new THREE.Group();    // flavour spin + idle
  spin.add(can.group);
  rig.add(spin);
  scene.add(rig);

  const drops = new LiquidDrops(220, FLAVORS[0].liquid);
  scene.add(drops.mesh);


  /* ---------- layout & keyframes ---------- */
  let vh = innerHeight, visW = 8, keys = [], mobile = false;
  let featTop = 0, featEnd = 1, flavTop = 0, flavEnd = 1, outEnd = 1;

  const S = (x, y, rx, ry, rz, s) => ({ x, y, rx, ry, rz, s });
  function layout() {
    const w = innerWidth, h = innerHeight;
    vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visW = visH * camera.aspect;
    mobile = w < 760;
    const feat = $('#inhalt'), flav = $('#geschmack');
    featTop = feat.offsetTop; featEnd = featTop + feat.offsetHeight - h;
    flavTop = flav.offsetTop; flavEnd = flavTop + flav.offsetHeight - h;
    outEnd = flavEnd + h * 0.9;
    const TAU = Math.PI * 2;
    const heroS = mobile ? Math.min(0.62, visW / 3.4) : 0.66;
    const side = mobile ? 0 : visW * 0.2;
    const m = mobile ? { y: visH * 0.17, s: Math.min(0.62, visW / 3.6) } : { y: 0, s: 1 };
    keys = [
      [0, S(0, mobile ? -0.15 : -0.32, 0.08, -0.45, 0.1, heroS)],
      [featTop, S(side, m.y, 0.25, 0.5, -0.22, m.s)],
      [lerp(featTop, featEnd, 0.7), S(side, m.y, 0.42, 0.5 + TAU, 0.18, m.s * 1.02)],
      [featEnd, S(side, m.y - 0.1, 0.62, 0.35 + TAU, 0.08, m.s * 1.05)],
      [flavTop, S(mobile ? 0 : visW * 0.16, mobile ? visH * 0.2 : -0.05, 0.05, -0.3 + TAU * 2, 0.06, mobile ? m.s * 0.95 : 1.05)],
      [flavEnd, S(mobile ? 0 : visW * 0.16, mobile ? visH * 0.2 : -0.05, 0.05, -0.3 + TAU * 2, 0.06, mobile ? m.s * 0.95 : 1.05)],
      [outEnd, S(mobile ? 0 : visW * 0.1, visH * 0.9, -0.3, 1.4 + TAU * 2, -0.5, 0.8)],
    ];
  }
  layout();
  addEventListener('resize', layout);
  // sections change height when fonts/images land
  new ResizeObserver(layout).observe(document.body);

  function stateAt(y) {
    if (y <= keys[0][0]) return { ...keys[0][1] };
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, A] = keys[i], [b, B] = keys[i + 1];
      if (y <= b) {
        const t = smooth(clamp((y - a) / Math.max(1, b - a)));
        const o = {};
        for (const k in A) o[k] = lerp(A[k], B[k], t);
        return o;
      }
    }
    return { ...keys[keys.length - 1][1] };
  }

  /* ---------- interaction state ---------- */
  const cur = stateAt(scrollY);
  let pointer = { x: 0, y: 0 }, pSmooth = { x: 0, y: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  let lastScroll = scrollY, scrollVel = 0, spinExtra = 0, spinVel = 0;
  let switchAnim = null;
  let openPrev = 0, burstDone = false;
  const intro = { t: 0, splashed: false };

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const colA = new THREE.Color(), colB = new THREE.Color();
  let rimTarget = new THREE.Color(FLAVORS[0].glow);

  function worldPoint(x, y, z) { return can.group.localToWorld(tmp.set(x, y, z)).clone(); }

  function splash(strength = 1) {
    // crown around the bottom + a fountain out of the top
    drops.crown(worldPoint(0, -1.2, 0), Math.round(46 * strength), 3.4 * rig.scale.x + 0.6, 0.06 * rig.scale.x);
    drops.burst(worldPoint(0, 1.25, 0), { x: 0, y: 1, z: 0.15 }, Math.round(30 * strength), 5 * rig.scale.x, 1.2, 0.06 * rig.scale.x);
  }

  function switchFlavor(i) {
    getTex(i);                       // build before the spin reaches full speed
    const t0 = performance.now();
    switchAnim = { t0, i, swapped: false, from: spinExtra };
    rimTarget = new THREE.Color(FLAVORS[i].glow);
  }

  /* ---------- hero click = splash ---------- */
  $('.hero').addEventListener('click', e => { if (!e.target.closest('a,button')) splash(0.8); });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const heroWord = $('#heroWord');
  const glow = $('#glow');
  const featItems = $$('#featList li');
  const featBar = $('#featBar');
  const pssst = $('#pssst');
  let visible = true;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const y = scrollY;

    // scroll velocity (px/s)
    const dy = y - lastScroll; lastScroll = y;
    scrollVel = lerp(scrollVel, dy / Math.max(dt, 1e-3), 0.2);

    // target state from scroll, eased follow for weight
    const target = stateAt(y);
    const k = 1 - Math.pow(0.0018, dt);
    for (const key in target) cur[key] = lerp(cur[key], target[key], k);

    // intro: can drops in from above with a splash
    if (intro.t < 1) {
      intro.t = reduced ? 1 : Math.min(1, intro.t + dt / 1.5);
      if (!intro.splashed && intro.t > 0.62) { intro.splashed = true; requestAnimationFrame(() => splash(1.2)); }
    }
    const ie = 1 - Math.pow(1 - intro.t, 3);
    const introY = (1 - ie) * 7, introSpin = (1 - ie) * Math.PI * 3;

    // scroll-velocity spin, settling on the nearest full turn
    spinVel += scrollVel * 0.00004;
    spinVel *= Math.pow(0.04, dt);
    spinExtra += spinVel * dt * 10;
    if (!switchAnim) {
      const home = Math.round(spinExtra / (Math.PI * 2)) * Math.PI * 2;
      spinExtra = lerp(spinExtra, home, 1 - Math.pow(0.2, dt));
    }

    // flavour switch: 1 fast turn, label swaps at max speed + splash
    if (switchAnim) {
      const p = clamp((performance.now() - switchAnim.t0) / 1100);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      spinExtra = switchAnim.from + e * Math.PI * 2;
      if (!switchAnim.swapped && p > 0.45) {
        switchAnim.swapped = true;
        const nt = getTex(switchAnim.i);
        can.label.map = nt.map; can.label.metalnessMap = nt.mr; can.label.roughnessMap = nt.mr;
        can.label.needsUpdate = true;
        drops.setColor(FLAVORS[switchAnim.i].liquid);
        splash(1);
      }
      if (p >= 1) { spinExtra = switchAnim.from + Math.PI * 2; switchAnim = null; }
    }

    pSmooth.x = lerp(pSmooth.x, pointer.x, 0.05);
    pSmooth.y = lerp(pSmooth.y, pointer.y, 0.05);

    rig.position.set(cur.x, cur.y + introY + Math.sin(t * 1.3) * 0.05, 0);
    rig.rotation.set(cur.rx + pSmooth.y * 0.25, 0, cur.rz - pSmooth.x * 0.12);
    rig.scale.setScalar(cur.s);
    spin.rotation.y = cur.ry + spinExtra + introSpin + Math.sin(t * 0.55) * 0.09 + pSmooth.x * 0.5;

    // pull tab: opens at the end of the feature section, closes again in flavours
    const open = smooth(clamp((y - lerp(featTop, featEnd, 0.72)) / ((featEnd - featTop) * 0.18))) * (1 - smooth(clamp((y - featEnd) / (vh * 0.5))));
    can.setOpen(open);
    if (open > 0.6 && openPrev <= 0.6 && !burstDone) {
      burstDone = true;
      const mouth = worldPoint(0, can.lidY + 0.05, 0.2);
      drops.burst(mouth, { x: 0, y: 1, z: 0.35 }, 70, 5.5 * cur.s, 0.9, 0.055 * cur.s);
    }
    if (open < 0.1) burstDone = false;
    openPrev = open;
    pssst.classList.toggle('on', open > 0.6);

    // fling drops when scrolling fast
    const sv = Math.abs(scrollVel);
    if (sv > 900 && sv < 20000 && y < outEnd && Math.random() < Math.min(0.8, sv / 6000)) {
      const a = Math.random() * Math.PI * 2, hgt = (Math.random() - 0.5) * 2.2;
      const p0 = worldPoint(Math.sin(a) * 0.52, hgt, Math.cos(a) * 0.52);
      can.group.localToWorld(tmp2.set(Math.sin(a) * 2, hgt, Math.cos(a) * 2));
      const dir = tmp2.sub(p0).normalize();
      dir.y += Math.sign(scrollVel) * -0.4;
      drops.burst(p0, dir, 2, 2.5 + sv / 1500, 0.5, 0.045 * cur.s);
    }

    // ambient orbiting drops
    const inHero = y < featTop * 0.6, inFlav = y > flavTop - vh * 0.3 && y < flavEnd + vh * 0.2;
    drops.setOrbiters(y > outEnd ? 0 : inFlav ? 34 : inHero ? 26 : 12);
    drops.update(dt, t, rig.position, cur.s);

    // rim light colour follows flavour
    rimA.color.lerp(rimTarget, 0.06);
    rimB.color.lerp(rimTarget, 0.06);

    // DOM sync
    const fp = clamp((y - featTop) / Math.max(1, featEnd - featTop));
    featItems.forEach((li, i) => li.classList.toggle('on', fp > i * 0.18 + 0.02));
    featBar.style.width = (fp * 100).toFixed(1) + '%';
    heroWord.style.transform = `translate3d(0, ${y * 0.45}px, 0) scale(${1 + y / vh * 0.25})`;
    heroWord.style.opacity = clamp(1 - y / (vh * 0.8));
    heroWord.style.visibility = y > vh ? 'hidden' : 'visible';
    glow.style.setProperty('--gx', `${50 + (cur.x / visW) * 100}%`);
    glow.style.opacity = clamp(1 - (y - flavEnd) / vh);

    // only render while the can (or drops) can be seen
    const show = y < outEnd + vh * 0.2;
    if (show !== visible) { visible = show; canvas.style.visibility = show ? 'visible' : 'hidden'; }
    if (show) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { switchFlavor, splash: () => splash(0.9) };
}

initStage().then(s => {
  stage = s;
  $('#loader').classList.add('done');
}).catch(err => {
  console.error(err);
  $('#stage')?.remove();
  $('#fallback').hidden = false;
  $('#loader').classList.add('done');
});

/* ======================================================================
   24er Tray
   ====================================================================== */
const trayChips = $('#trayChips');
let trayIndex = 0, tray = null;
const setTrayAccent = () => { const t = $('#tray'); t.style.setProperty('--accent', FLAVORS[trayIndex].ui); t.style.setProperty('--glow', FLAVORS[trayIndex].glow); };
setTrayAccent();
trayChips.innerHTML = FLAVORS.map((f, i) => `<button class="chip" role="tab" aria-selected="${i === 0}" data-i="${i}"><i style="--a:${f.c1 || f.baseHi};--b:${f.c2 || f.base}"></i>${f.short}</button>`).join('');
trayChips.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  trayIndex = +b.dataset.i;
  $$('.chip', trayChips).forEach((x, k) => x.setAttribute('aria-selected', k === trayIndex));
  $('#trayName').textContent = dispName(FLAVORS[trayIndex]);
  setTrayAccent();
  tray?.setFlavor(trayIndex);
});
$('#trayAdd').addEventListener('click', () => addToBag(`${dispName(FLAVORS[trayIndex])} · 24er Tray`));
const trayIO = new IntersectionObserver(async es => {
  if (!es[0].isIntersecting) return;
  trayIO.disconnect();
  try {
    await loadLabelAssets();
    tray = await initTray({ canvas: $('#trayStage'), section: $('#tray'), flavor: trayIndex, onCount: n => {
      $('#trayCount').textContent = n;
      $('#trayBar').style.width = (n / 24 * 100) + '%';
      $('#tray').classList.toggle('full', n === 24);
    } });
    if (!tray) throw new Error('WebGL nicht verfügbar');
  } catch (err) {
    console.error(err);
    $('#trayStage')?.remove();
    $('#trayFallback').hidden = false;
    $('#trayCount').textContent = 24; $('#trayBar').style.width = '100%';
  }
}, { rootMargin: '600px' });
trayIO.observe($('#tray'));
