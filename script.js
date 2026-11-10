/* ==========================================================================
   XY Residences – Motion-Ad & Landingpage
   Abhängigkeiten: GSAP 3 + ScrollTrigger (CDN), keine Build-Tools nötig.

   Aufbau:
   1. Daten (Etagen, Grundrisse, Tageszeiten)
   2. Gebäude-SVG generieren
   3. Hover / Auswahl / Info-Karte
   4. Intro-Timeline (Motion-Ad Opener)
   5. Übergang Gebäude ⇄ Penthouse
   6. Ausblick-Szene (Canvas)
   7. Innenraum: Hotspots, Parallax, Tageszeit
   8. Modals: Grundriss & Besichtigung
   9. Scroll-Reveals, Header, Motion-Ad Autoplay
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  if (!hasGSAP) {
    // Fallback: ohne GSAP bleibt die Seite statisch nutzbar.
    console.warn('[XY] GSAP nicht geladen – Animationen deaktiviert.');
    $('#intro')?.remove();
  } else if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ------------------------------------------------------------------------
     1. DATEN
     ------------------------------------------------------------------------ */
  // Reihenfolge: von unten nach oben
  const FLOORS = [
    { id: 'eg',  code: 'EG', name: 'Erdgeschoss',     title: 'Lobby & Concierge', h: 84, units: 'Gemeinschaft', rooms: 'Lobby · Spa · Fitness', size: '640 m² Amenities', price: 'Für Bewohner inklusive', status: 'Exklusiv für Bewohner', statusType: 'info', plan: false },
    { id: 'og1', code: '01', name: '1. Obergeschoss', title: 'Garden Residences',  h: 62, units: '4 Wohnungen', rooms: '2 – 3 Zimmer', size: '78 – 112 m²',  price: 'ab 690.000 €',   status: '2 verfügbar', statusType: 'ok' },
    { id: 'og2', code: '02', name: '2. Obergeschoss', title: 'City Residences',    h: 62, units: '3 Wohnungen', rooms: '3 – 4 Zimmer', size: '94 – 126 m²',  price: 'ab 840.000 €',   status: '1 verfügbar', statusType: 'ok' },
    { id: 'og3', code: '03', name: '3. Obergeschoss', title: 'City Residences',    h: 62, units: '3 Wohnungen', rooms: '3 – 4 Zimmer', size: '94 – 126 m²',  price: 'ab 875.000 €',   status: 'Reserviert',  statusType: 'res' },
    { id: 'og4', code: '04', name: '4. Obergeschoss', title: 'City Residences',    h: 62, units: '3 Wohnungen', rooms: '3 – 4 Zimmer', size: '98 – 134 m²',  price: 'ab 920.000 €',   status: '2 verfügbar', statusType: 'ok' },
    { id: 'og5', code: '05', name: '5. Obergeschoss', title: 'Sky Lofts',          h: 62, units: '2 Wohnungen', rooms: '4 Zimmer',     size: '128 – 156 m²', price: 'ab 1.290.000 €', status: '1 verfügbar', statusType: 'ok' },
    { id: 'og6', code: '06', name: '6. Obergeschoss', title: 'Sky Lofts',          h: 62, units: '2 Wohnungen', rooms: '4 – 5 Zimmer', size: '142 – 168 m²', price: 'ab 1.690.000 €', status: 'Reserviert',  statusType: 'res' },
    { id: 'ph',  code: 'PH', name: 'Penthouse',       title: 'Sky Residence',      h: 80, units: '1 Residenz',  rooms: '5 Zimmer',     size: '286 m² + 120 m² Terrasse', price: 'ab 4.950.000 €', status: '1 verfügbar', statusType: 'ok', ph: true }
  ];
  const floorById = id => FLOORS.find(f => f.id === id);

  const PLANS = {
    ph: {
      rooms: [
        { x: 20,  y: 20,  w: 320, h: 220, label: 'Wohnen & Essen', m: '92 m²' },
        { x: 340, y: 20,  w: 120, h: 120, label: 'Küche', m: '24 m²' },
        { x: 460, y: 20,  w: 120, h: 180, label: 'Master Suite', m: '38 m²' },
        { x: 340, y: 140, w: 120, h: 140, label: 'Zimmer 2', m: '21 m²' },
        { x: 460, y: 200, w: 120, h: 80,  label: 'Bad en suite', m: '16 m²' },
        { x: 340, y: 280, w: 240, h: 100, label: 'Entrée · Ankleide', m: '34 m²' },
        { x: 20,  y: 240, w: 320, h: 140, label: 'Dachterrasse', m: '120 m²', terrace: true }
      ],
      windows: [[40, 20, 320, 20], [20, 40, 20, 220], [480, 20, 560, 20], [580, 40, 580, 180], [360, 20, 440, 20]],
      doors: [[340, 200, 1], [460, 90, 1], [460, 230, 1], [400, 280, 0]]
    },
    apt: {
      rooms: [
        { x: 20,  y: 20,  w: 300, h: 200, label: 'Wohnen & Essen', m: '38 m²' },
        { x: 320, y: 20,  w: 130, h: 120, label: 'Küche', m: '12 m²' },
        { x: 450, y: 20,  w: 130, h: 200, label: 'Schlafen', m: '18 m²' },
        { x: 320, y: 140, w: 130, h: 80,  label: 'Bad', m: '8 m²' },
        { x: 20,  y: 220, w: 180, h: 160, label: 'Zimmer 2', m: '14 m²' },
        { x: 200, y: 220, w: 250, h: 160, label: 'Flur · Abstellraum', m: '11 m²' },
        { x: 450, y: 220, w: 130, h: 160, label: 'Loggia', m: '9 m²', terrace: true }
      ],
      windows: [[40, 20, 300, 20], [20, 40, 20, 200], [470, 20, 560, 20], [20, 250, 20, 360], [340, 20, 430, 20]],
      doors: [[320, 170, 1], [450, 100, 1], [120, 220, 0], [380, 220, 0]]
    }
  };

  // Farbpaletten der Tageszeiten (RGB-Arrays werden linear interpoliert)
  const PRESETS = {
    morgen: { top: [38, 52, 98],  mid: [214, 146, 150], hor: [255, 204, 150], sun: [255, 224, 180], sunA: 1, sunY: .8,  moonA: 0, stars: 0,   lights: .18, mFar: [122, 110, 142], mNear: [86, 78, 108], cFar: [96, 86, 114],  cNear: [34, 32, 48], water: [168, 128, 140], waterDeep: [30, 30, 52], cloud: [255, 214, 200], cloudA: .6 },
    tag:    { top: [34, 96, 176], mid: [112, 166, 222], hor: [214, 230, 240], sun: [255, 250, 235], sunA: 1, sunY: .16, moonA: 0, stars: 0,   lights: 0,   mFar: [132, 160, 188], mNear: [98, 124, 150], cFar: [120, 138, 160], cNear: [44, 52, 68], water: [86, 136, 176],  waterDeep: [20, 44, 70], cloud: [255, 255, 255], cloudA: .8 },
    abend:  { top: [22, 22, 56],  mid: [150, 68, 96],   hor: [255, 150, 78],  sun: [255, 180, 100], sunA: 1, sunY: .9,  moonA: 0, stars: .25, lights: .75, mFar: [98, 62, 96],   mNear: [62, 42, 70],  cFar: [52, 36, 62],   cNear: [18, 15, 26], water: [160, 88, 80],   waterDeep: [18, 14, 32], cloud: [255, 160, 130], cloudA: .55 },
    nacht:  { top: [3, 5, 14],    mid: [10, 16, 38],    hor: [34, 40, 78],    sun: [255, 200, 140], sunA: 0, sunY: 1.2, moonA: 1, stars: 1,   lights: 1,   mFar: [20, 24, 44],   mNear: [14, 16, 30],  cFar: [14, 16, 28],   cNear: [6, 7, 12],   water: [18, 24, 50],    waterDeep: [3, 4, 10],   cloud: [70, 80, 120],  cloudA: .25 }
  };

  /* ------------------------------------------------------------------------
     Helfer
     ------------------------------------------------------------------------ */
  const svgEl = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const pts = arr => arr.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ');
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpVal = (a, b, t) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], t)) : lerp(a, b, t);
  const clone = o => JSON.parse(JSON.stringify(o));
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const rgba = (a, al) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${Math.max(0, Math.min(1, al)).toFixed(3)})`;
  const mixWhite = (a, t) => a.map(v => lerp(v, 255, t));

  /* ------------------------------------------------------------------------
     2. GEBÄUDE-SVG
     ------------------------------------------------------------------------ */
  const G = { x0: 190, x1: 440, dx: 96, dy: -48, base: 700, labelX: 108 };
  const building = $('#building');

  function buildBuilding() {
    const ground = $('#ground');
    const floorsG = $('#floors');
    const fx = $('#building-fx');

    // Boden / Plaza
    svgEl('ellipse', { cx: 360, cy: 708, rx: 300, ry: 46, fill: 'url(#groundGlow)' }, ground);
    svgEl('polygon', { points: pts([[G.x0 - 70, G.base + 4], [G.x1 + 70, G.base + 4], [G.x1 + 70 + G.dx, G.base + 4 + G.dy], [G.x0 - 70 + G.dx, G.base + 4 + G.dy]]), fill: 'url(#plaza)' }, ground);
    svgEl('line', { x1: G.x0 - 120, y1: G.base + 4, x2: G.x1 + 150, y2: G.base + 4, stroke: 'rgba(201,164,106,.25)', 'stroke-width': .8 }, ground);

    let y = G.base;
    FLOORS.forEach(f => {
      const yb = y, yt = y - f.h;
      y = yt;
      const x0 = f.ph ? G.x0 + 46 : G.x0;
      const x1 = G.x1;
      const { dx, dy } = G;

      const g = svgEl('g', { class: 'floor', 'data-floor': f.id, tabindex: 0, role: 'button', 'aria-label': `${f.name} – ${f.title}${f.ph ? ' – Innenansicht öffnen' : ''}` }, floorsG);
      const fi = svgEl('g', { class: 'fi' }, g);

      // Unsichtbare Trefferfläche inkl. Label
      svgEl('rect', { class: 'hit', x: 20, y: yt, width: x1 + dx - 20, height: f.h }, fi);

      if (f.ph) {
        // Dachterrasse auf dem 6. OG + Glasgeländer
        svgEl('polygon', { class: 'terrace', points: pts([[G.x0, yb], [x0, yb], [x0 + dx, yb + dy], [G.x0 + dx, yb + dy]]) }, fi);
        svgEl('polygon', { class: 'rail', points: pts([[G.x0, yb], [G.x0 + dx, yb + dy], [G.x0 + dx, yb + dy - 13], [G.x0, yb - 13]]) }, fi);
      }

      // Seitenfläche
      const sidePts = [[x1, yb], [x1 + dx, yb + dy], [x1 + dx, yt + dy], [x1, yt]];
      svgEl('polygon', { class: 'side', points: pts(sidePts) }, fi);
      // Seitenfenster (schräg)
      const slab = 7;
      [[.1, .45], [.55, .9]].forEach(([t0, t1]) => {
        const p = svgEl('polygon', {
          class: 'spane' + (Math.random() < .3 ? ' lit' : ''),
          points: pts([[x1 + dx * t0, yt + 5 + dy * t0], [x1 + dx * t1, yt + 5 + dy * t1], [x1 + dx * t1, yb - slab + dy * t1], [x1 + dx * t0, yb - slab + dy * t0]])
        }, fi);
        return p;
      });
      svgEl('polygon', { class: 'slab-side', points: pts([[x1, yb], [x1 + dx, yb + dy], [x1 + dx, yb + dy - slab], [x1, yb - slab]]) }, fi);

      // Front
      svgEl('rect', { class: 'front', x: x0, y: yt, width: x1 - x0, height: f.h }, fi);
      const n = f.ph ? 5 : 6, pad = 6, gap = 4;
      const pw = (x1 - x0 - pad * 2 - gap * (n - 1)) / n;
      for (let k = 0; k < n; k++) {
        const px = x0 + pad + k * (pw + gap);
        if (f.id === 'eg' && (k === 2 || k === 3)) {
          if (k === 2) svgEl('rect', { class: 'door', x: px + pw * .35, y: yt + 22, width: pw * 1.3 + gap, height: f.h - 22 - 2 }, fi);
          continue;
        }
        svgEl('rect', { class: 'pane' + (Math.random() < .3 ? ' lit' : ''), x: px, y: yt + 5, width: pw, height: f.h - 5 - slab - 2 }, fi);
      }
      if (f.id === 'eg') svgEl('rect', { class: 'canopy', x: x0 + 70, y: yt + 16, width: 110, height: 4 }, fi);
      svgEl('rect', { class: 'slab', x: x0, y: yb - slab, width: x1 - x0, height: slab }, fi);

      if (f.ph) {
        // Auskragendes Dach
        const ry = yt - 8;
        svgEl('polygon', { class: 'roof', points: pts([[x0 - 12, ry], [x1 + 10, ry], [x1 + 10 + dx, ry + dy], [x0 - 12 + dx, ry + dy]]) }, fi);
        svgEl('polygon', { class: 'roof-side', points: pts([[x1 + 10, ry], [x1 + 10 + dx, ry + dy], [x1 + 10 + dx, ry + dy + 8], [x1 + 10, ry + 8]]) }, fi);
        svgEl('rect', { class: 'slab', x: x0 - 12, y: ry, width: x1 - x0 + 22, height: 8 }, fi);
        svgEl('rect', { class: 'rail', x: G.x0, y: yb - 13, width: x0 - G.x0, height: 13 }, fi);
      }

      // Highlight-Overlays
      svgEl('polygon', { class: 'hl', points: pts(sidePts) }, fi);
      svgEl('rect', { class: 'hl hl-front', x: x0, y: yt, width: x1 - x0, height: f.h }, fi);

      // Beschriftung
      const my = (yb + yt) / 2;
      const lg = svgEl('g', { class: 'floor-label' }, fi);
      svgEl('line', { class: 'leader', x1: G.labelX + 10, y1: my - 3, x2: G.x0 - 8, y2: my - 3 }, lg);
      const code = svgEl('text', { class: 'lbl-code', x: G.labelX, y: my + 3, 'text-anchor': 'end' }, lg);
      code.textContent = f.code;
      const nm = svgEl('text', { class: 'lbl-name', x: G.labelX, y: my + 16, 'text-anchor': 'end' }, lg);
      nm.textContent = f.ph ? 'Penthouse' : f.id === 'eg' ? 'Erdgeschoss' : `${f.code.replace(/^0/, '')}. OG`;

      if (f.ph) {
        // „3D erleben“-Badge
        const bx = x1 + dx + 18, by = my + dy + 4;
        const b = svgEl('g', { class: 'ph-badge' }, fi);
        svgEl('line', { x1: x1 + dx + 2, y1: by, x2: bx, y2: by, stroke: 'rgba(201,164,106,.6)', 'stroke-width': .8 }, b);
        svgEl('rect', { x: bx, y: by - 12, width: 92, height: 24, rx: 12 }, b);
        svgEl('circle', { class: 'pulse', cx: bx + 13, cy: by, r: 4 }, b);
        svgEl('circle', { class: 'core', cx: bx + 13, cy: by, r: 2.6 }, b);
        const t = svgEl('text', { x: bx + 24, y: by + 3 }, b);
        t.textContent = 'BETRETEN';
      }
    });

    // Glas-Reflex über der Fassade + Bäume im Vordergrund
    svgEl('polygon', { points: pts([[G.x0, G.base], [G.x1, G.base], [G.x1, 150], [G.x0, 150]]), fill: 'url(#sheen)' }, fx);
    [[150, 700, 16], [172, 706, 11], [520, 688, 13], [545, 694, 9]].forEach(([cx, cy, r]) => {
      svgEl('line', { class: 'trunk', x1: cx, y1: cy, x2: cx, y2: cy - r * .8 }, fx);
      svgEl('circle', { class: 'tree', cx, cy: cy - r * 1.4, r }, fx);
    });
  }

  /* ------------------------------------------------------------------------
     3. HOVER / AUSWAHL / INFO-KARTE
     ------------------------------------------------------------------------ */
  let hovered = null;
  let selected = 'ph';
  let busy = false;          // läuft gerade ein Übergang?
  let interiorOpen = false;

  function renderInfo(id) {
    const f = floorById(id);
    if (!f) return;
    $('#fi-code').textContent = f.code;
    $('#fi-name').textContent = f.name;
    $('#fi-title').textContent = f.title;
    $('#fi-units').textContent = f.units;
    $('#fi-rooms').textContent = f.rooms;
    $('#fi-size').textContent = f.size;
    $('#fi-price').textContent = f.price;
    const st = $('#fi-status');
    st.textContent = f.status;
    st.dataset.type = f.statusType;
    $('#fi-enter').hidden = !f.ph;
    const plan = $('#fi-plan');
    plan.hidden = f.plan === false;
    plan.dataset.openPlan = f.id;
    $('#fi-visit').dataset.openVisit = f.id;
    if (hasGSAP) gsap.fromTo('#fi-body', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out', overwrite: true });
  }

  function setHover(id) {
    if (busy && id) return;
    hovered = id;
    building.classList.toggle('has-hover', !!id);
    $$('.floor', building).forEach(g => g.classList.toggle('is-hover', g.dataset.floor === id));
    renderInfo(id || selected);
  }

  function selectFloor(id) {
    if (busy) return;
    if (id === 'ph') { enterPenthouse(); return; }
    selected = id;
    $$('.floor', building).forEach(g => g.classList.toggle('is-selected', g.dataset.floor === id));
    renderInfo(id);
    // Auf Mobilgeräten zur Info-Karte scrollen
    if (matchMedia('(max-width: 1023px)').matches) {
      $('#floor-info').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function bindFloors() {
    $$('.floor', building).forEach(g => {
      const id = g.dataset.floor;
      g.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setHover(id); });
      g.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setHover(null); });
      g.addEventListener('focus', () => setHover(id));
      g.addEventListener('blur', () => setHover(null));
      g.addEventListener('click', () => selectFloor(id));
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFloor(id); }
      });
    });

    // Lebendige Fassade: ab und zu geht irgendwo Licht an/aus
    setInterval(() => {
      if (document.hidden || interiorOpen) return;
      const panes = $$('#building .pane, #building .spane');
      panes[(Math.random() * panes.length) | 0]?.classList.toggle('lit');
    }, 1600);
  }

  /* ------------------------------------------------------------------------
     4. INTRO – Motion-Ad Opener
     ------------------------------------------------------------------------ */
  function runIntro() {
    const floors = $$('.floor', building);
    gsap.set('.hero-reveal', { opacity: 0, y: 26 });
    gsap.set('#floor-info', { opacity: 0, y: 26 });
    gsap.set(floors, { opacity: 0, y: 46 });
    gsap.set('#building-fx, #ground', { opacity: 0 });
    gsap.set('#site-header', { opacity: 0, y: -12 });
    document.documentElement.classList.add('no-scroll');

    const reveal = gsap.timeline({ paused: true, onComplete: () => gsap.set(floors, { clearProps: 'transform,opacity' }) })
      .to('#ground', { opacity: 1, duration: 1.2, ease: 'power2.out' })
      .to(floors, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .085 }, '<.1')
      .to('#building-fx', { opacity: 1, duration: 1 }, '-=.6')
      .to('.hero-reveal', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08 }, .25)
      .to('#floor-info', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }, '-=.8')
      .to('#site-header', { opacity: 1, y: 0, duration: .9, ease: 'expo.out' }, '-=1');

    const intro = gsap.timeline({
      onComplete: () => {
        $('#intro').remove();
        document.documentElement.classList.remove('no-scroll');
      }
    })
      .from('.intro-mask > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .12 }, .2)
      .from('.intro-line', { scaleX: 0, duration: 1, ease: 'expo.inOut' }, '-=.6')
      .from('.intro-tag', { opacity: 0, letterSpacing: '1.2em', duration: 1.2, ease: 'expo.out' }, '-=.7')
      .from('.intro-claim', { opacity: 0, y: 18, duration: .9, ease: 'power3.out' }, '-=.7')
      .to('#intro .text-center', { opacity: 0, y: -20, duration: .6, ease: 'power2.in' }, '+=.7')
      .to('#intro', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.2')
      .add(() => reveal.play(), '-=.55');

    const skip = () => { intro.progress(1); reveal.progress(1); };
    $('#skip-intro').addEventListener('click', skip);
    if (reduceMotion) skip();
  }

  /* ------------------------------------------------------------------------
     5. ÜBERGANG GEBÄUDE ⇄ PENTHOUSE
     ------------------------------------------------------------------------ */
  const stage = $('#stage');
  const interior = $('#interior');
  let enterTl = null;

  function enterPenthouse() {
    if (busy || interiorOpen) return;
    if (!hasGSAP) { showInterior(); return; }
    busy = true;
    closeAllModals(true);
    setHover(null);
    $$('.floor', building).forEach(g => g.classList.remove('is-selected'));

    // Sicherstellen, dass das Gebäude im Viewport ist
    if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.classList.add('no-scroll');

    requestAnimationFrame(() => {
      const ph = $('.floor[data-floor="ph"]', building);
      const target = $('.hl-front', ph).getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const cx = target.left + target.width / 2;
      const cy = target.top + target.height / 2;
      const scale = Math.max(innerWidth / target.width, innerHeight / target.height) * 1.25;
      const others = $$('.floor:not([data-floor="ph"])', building);
      const d = reduceMotion ? .3 : 1;

      ph.classList.add('is-entering');
      gsap.set(stage, { transformOrigin: `${cx - sr.left}px ${cy - sr.top}px` });

      enterTl = gsap.timeline({ onComplete: () => { busy = false; } })
        .to(['.hero-copy', '#floor-info', '.building-hint', '#site-header'], { opacity: 0, y: -14, duration: .5 * d, ease: 'power2.in', stagger: .04 })
        .to(others, { opacity: .08, duration: .6 * d, ease: 'power2.out' }, '<')
        .to('#building-fx, #ground', { opacity: 0, duration: .5 * d }, '<')
        .to(stage, { x: innerWidth / 2 - cx, y: innerHeight / 2 - cy, scale, duration: 1.7 * d, ease: 'expo.inOut' }, '-=.2')
        .to('#flash', { opacity: 1, duration: .55 * d, ease: 'power2.in' }, '-=.6')
        .add(showInterior)
        .fromTo('#interior-scene', { scale: 1.22 }, { scale: 1, duration: 2.2 * d, ease: 'expo.out' })
        .to('#flash', { opacity: 0, duration: 1.1 * d, ease: 'power2.out' }, '<')
        .fromTo('#interior .int-ui', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1 * d, ease: 'expo.out', stagger: .07 }, '-=1.5')
        .fromTo('.hotspot', { opacity: 0 }, { opacity: 1, duration: .6 * d, stagger: .08 }, '-=.8');
    });
  }

  function showInterior() {
    interior.classList.remove('hidden');
    interior.setAttribute('aria-hidden', 'false');
    interiorOpen = true;
    scene.resize();
    scene.start();
    requestAnimationFrame(() => moveTodIndicator(true));
    setTimeout(() => $('#exit-btn').focus({ preventScroll: true }), 300);
  }

  function hideInterior() {
    interior.classList.add('hidden');
    interior.setAttribute('aria-hidden', 'true');
    interiorOpen = false;
    scene.stop();
    hideTip();
  }

  function exitPenthouse() {
    if (busy || !interiorOpen) return;
    adTl?.kill();
    if (!hasGSAP) { hideInterior(); return; }
    busy = true;
    closeAllModals(true);
    const d = reduceMotion ? .3 : 1;
    const ph = $('.floor[data-floor="ph"]', building);
    gsap.timeline({
      onComplete: () => {
        busy = false;
        document.documentElement.classList.remove('no-scroll');
        gsap.set([stage, '.floor', '.hero-copy', '#floor-info', '.building-hint', '#site-header', '#building-fx', '#ground'], { clearProps: 'transform,opacity' });
        renderInfo(selected);
        if (!scene.touch) $('.floor[data-floor="ph"]', building).focus({ preventScroll: true });
      }
    })
      .to('#interior .int-ui', { opacity: 0, y: 12, duration: .35 * d, stagger: .03, ease: 'power2.in' })
      .to('#interior-scene', { scale: 1.12, duration: .7 * d, ease: 'power2.in' }, '<')
      .to('#flash', { opacity: 1, duration: .5 * d, ease: 'power2.in' }, '-=.4')
      .add(() => { hideInterior(); ph.classList.remove('is-entering'); })
      .to('#flash', { opacity: 0, duration: .9 * d, ease: 'power2.out' })
      .to(stage, { x: 0, y: 0, scale: 1, duration: 1.5 * d, ease: 'expo.inOut' }, '<')
      .to('.floor', { opacity: 1, duration: .7 * d }, '-=.7')
      .to('#building-fx, #ground', { opacity: 1, duration: .7 * d }, '<')
      .to(['.hero-copy', '#floor-info', '.building-hint', '#site-header'], { opacity: 1, y: 0, duration: .9 * d, ease: 'expo.out', stagger: .05 }, '-=.5');
  }

  /* ------------------------------------------------------------------------
     6. AUSBLICK-SZENE (Canvas)
     Himmel, Sonne/Mond, Sterne, Wolken, Berge, zwei Skyline-Ebenen mit
     Fensterlichtern, See mit Spiegelungen, Autos, Vögel und Bodenreflexion.
     ------------------------------------------------------------------------ */
  class ViewScene {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.p = clone(PRESETS.abend);
      this.mx = 0; this.my = 0; this.tmx = 0; this.tmy = 0;
      this.t = 0; this.last = 0;
      this.running = false;
      this.birds = [];
      this.nextBirds = 3;
      this.touch = matchMedia('(hover: none)').matches;
      this.room = $('#room');
      this.loop = this.loop.bind(this);
    }

    measure() {
      const r = $('#win-rect').getBoundingClientRect();
      this.w = innerWidth;
      this.h = innerHeight;
      this.winT = Math.max(0, r.top);
      this.winB = Math.min(this.h, r.bottom);
      this.winH = Math.max(50, this.winB - this.winT);
      this.H = this.winT + this.winH * .6;   // Horizont
    }

    resize() {
      this.room.style.transform = 'scale(1.05)';
      this.measure();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.c.width = Math.round(this.w * this.dpr);
      this.c.height = Math.round(this.h * this.dpr);
      this.gen();
    }

    gen() {
      const { w, H, winH, winT } = this;
      const M = this.M = 60;

      this.stars = Array.from({ length: Math.min(420, Math.round(w * (H - winT) / 2200)) }, () => ({
        x: rand(-M, w + M), y: rand(winT - 30, H - 10), r: rand(.4, 1.5), p: rand(0, 6.3), s: rand(.6, 2.4)
      }));

      const ridge = (amp, freq) => {
        const out = [], ph = [rand(0, 9), rand(0, 9), rand(0, 9)];
        for (let x = -M; x <= w + M + 8; x += 8) {
          const n = .5 * Math.sin(x * freq + ph[0]) + .3 * Math.sin(x * freq * 2.7 + ph[1]) + .2 * Math.sin(x * freq * 6.3 + ph[2]);
          out.push([x, H - amp * (.55 + .45 * n) - rand(0, amp * .03)]);
        }
        return out;
      };
      const f = 1 / Math.max(w, 600);
      this.mFar = ridge(winH * .24, 6 * f);
      this.mNear = ridge(winH * .13, 11 * f);

      const skyline = (minH, maxH, minW, maxW, center, spread, gapMax) => {
        const arr = [];
        let x = -M;
        while (x < w + M) {
          const bw = rand(minW, maxW);
          const d = (x + bw / 2 - center) / spread;
          const fac = Math.exp(-d * d);
          arr.push({ x, w: bw, h: minH + (maxH - minH) * fac * rand(.45, 1), ant: Math.random() < .15 });
          x += bw + rand(0, gapMax);
        }
        return arr;
      };
      const cx = w * .58;
      this.cFar = skyline(winH * .03, winH * .16, 10, 26, cx - w * .1, w * .45, 3);
      this.cNear = skyline(winH * .035, winH * .3, 18, 46, cx, w * .25, 10);
      this.tower = { x: cx - 18, w: 36, h: winH * .44 };

      this.lightsFar = this.bakeLights(this.cFar, .22, 4, 5);
      this.lightsNear = this.bakeLights([...this.cNear, this.tower], .32, 4.5, 5.5);

      this.refl = this.cNear.filter(b => b.h > winH * .08).flatMap(b =>
        Array.from({ length: Math.max(1, Math.round(b.w / 14)) }, () => ({
          x: b.x + rand(2, b.w - 4), w: rand(1, 2.4), len: rand(.25, .7), p: rand(0, 6.3),
          c: Math.random() < .8 ? '255,205,140' : '190,225,255'
        })));
      this.cars = Array.from({ length: Math.round(w / 40) }, () => ({ x: rand(0, w), v: rand(18, 42) * (Math.random() < .5 ? 1 : -1) }));
      this.clouds = Array.from({ length: 7 }, () => ({
        x: rand(-M, w + M), y: rand(winT + winH * .05, winT + winH * .34), s: rand(.6, 1.4), v: rand(4, 12),
        puffs: Array.from({ length: 5 }, (_, i) => ({ dx: (i - 2) * rand(22, 34), dy: rand(-10, 6), r: rand(26, 46) }))
      }));
    }

    // Fensterlichter einmalig in ein Offscreen-Canvas „backen“ (Performance)
    bakeLights(list, prob, sx, sy) {
      const { w, H, M, dpr } = this;
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.round((w + 2 * M) * dpr));
      off.height = Math.max(1, Math.round(H * dpr));
      const o = off.getContext('2d');
      o.scale(dpr, dpr);
      const cols = ['#ffd58f', '#ffe7b8', '#ffc977', '#ffd58f', '#cfe6ff'];
      for (const b of list) {
        for (let y = H - b.h + 5; y < H - 3; y += sy) {
          for (let x = b.x + 3; x < b.x + b.w - 3; x += sx) {
            if (Math.random() < prob) {
              o.fillStyle = cols[(Math.random() * cols.length) | 0];
              o.globalAlpha = .55 + Math.random() * .45;
              o.fillRect(x + M, y, 1.6, 2.2);
            }
          }
        }
      }
      return off;
    }

    toPreset(key, instant) {
      const target = PRESETS[key];
      if (!target) return;
      this.todTween?.kill();
      if (instant || !hasGSAP) { this.p = clone(target); return; }
      const from = clone(this.p);
      const o = { k: 0 };
      this.todTween = gsap.to(o, {
        k: 1, duration: reduceMotion ? .3 : 2.8, ease: 'power2.inOut',
        onUpdate: () => { for (const k in target) this.p[k] = lerpVal(from[k], target[k], o.k); }
      });
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.last = 0;
      requestAnimationFrame(this.loop);
    }

    stop() { this.running = false; }

    loop(now) {
      if (!this.running) return;
      const dt = this.last ? Math.min(.05, (now - this.last) / 1000) : .016;
      this.last = now;
      this.t += dt;
      if (this.touch) { this.tmx = Math.sin(this.t * .22) * .6; this.tmy = Math.sin(this.t * .15) * .3; }
      this.mx += (this.tmx - this.mx) * .045;
      this.my += (this.tmy - this.my) * .045;
      this.draw(dt);
      // Innenraum bewegt sich leicht gegenläufig → Tiefenwirkung
      this.room.style.transform = `translate3d(${(-this.mx * 14).toFixed(2)}px, ${(-this.my * 7).toFixed(2)}px, 0) scale(1.05)`;
      requestAnimationFrame(this.loop);
    }

    draw(dt) {
      const { ctx, w, h, H, winT, winB, winH, p, M, t } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const ox = d => -this.mx * 40 * d;
      const oy = d => -this.my * 14 * d;

      // Himmel
      const sky = ctx.createLinearGradient(0, winT, 0, H);
      sky.addColorStop(0, rgb(p.top));
      sky.addColorStop(.6, rgb(p.mid));
      sky.addColorStop(1, rgb(p.hor));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, H + 2);

      // Sterne
      if (p.stars > .01) {
        ctx.fillStyle = '#fff';
        for (const s of this.stars) {
          const tw = .35 + .65 * (.5 + .5 * Math.sin(t * s.s + s.p));
          ctx.globalAlpha = Math.max(0, p.stars * tw * Math.min(1, (H - s.y) / (winH * .25)));
          ctx.fillRect(s.x + ox(.05), s.y + oy(.05), s.r, s.r);
        }
        ctx.globalAlpha = 1;
      }

      // Sonne
      const sx = w * .64 + ox(.1);
      const sy = winT + (H - winT) * p.sunY + oy(.1);
      if (p.sunA > .01) {
        const R = winH * .9;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        g.addColorStop(0, rgba(p.sun, .55 * p.sunA));
        g.addColorStop(.22, rgba(p.sun, .16 * p.sunA));
        g.addColorStop(1, rgba(p.sun, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, H);
        ctx.fillStyle = rgba(mixWhite(p.sun, .45), p.sunA);
        ctx.beginPath(); ctx.arc(sx, sy, winH * .038, 0, Math.PI * 2); ctx.fill();
      }

      // Mond
      const mxp = w * .3 + ox(.1), myp = winT + (H - winT) * .26 + oy(.1);
      if (p.moonA > .01) {
        const g = ctx.createRadialGradient(mxp, myp, 0, mxp, myp, winH * .35);
        g.addColorStop(0, `rgba(200,215,255,${.22 * p.moonA})`);
        g.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, H);
        ctx.fillStyle = `rgba(244,239,228,${p.moonA})`;
        ctx.beginPath(); ctx.arc(mxp, myp, winH * .03, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(200,195,185,${.35 * p.moonA})`;
        ctx.beginPath(); ctx.arc(mxp - winH * .008, myp - winH * .006, winH * .007, 0, Math.PI * 2); ctx.fill();
      }

      // Wolken
      for (const c of this.clouds) {
        c.x += c.v * dt;
        if (c.x > w + M + 160) c.x = -M - 160;
        const cx = c.x + ox(.15), cy = c.y + oy(.15);
        for (const pf of c.puffs) {
          const r = pf.r * c.s, x = cx + pf.dx * c.s, y = cy + pf.dy * c.s;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, rgba(p.cloud, .35 * p.cloudA));
          g.addColorStop(1, rgba(p.cloud, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }

      // Berge + Dunst
      const ridgeFill = (arr, col, d) => {
        const o = ox(d);
        ctx.fillStyle = rgb(col);
        ctx.beginPath();
        ctx.moveTo(arr[0][0] + o, H + 1);
        for (const [x, y] of arr) ctx.lineTo(x + o, y);
        ctx.lineTo(arr[arr.length - 1][0] + o, H + 1);
        ctx.closePath();
        ctx.fill();
      };
      const haze = a => {
        const g = ctx.createLinearGradient(0, H - winH * .2, 0, H);
        g.addColorStop(0, rgba(p.hor, 0));
        g.addColorStop(1, rgba(p.hor, a));
        ctx.fillStyle = g;
        ctx.fillRect(0, H - winH * .2, w, winH * .2);
      };
      ridgeFill(this.mFar, p.mFar, .2);
      haze(.45);
      ridgeFill(this.mNear, p.mNear, .3);
      haze(.22);

      // Skyline hinten
      let o = ox(.45);
      ctx.fillStyle = rgb(p.cFar);
      for (const b of this.cFar) ctx.fillRect(b.x + o, H - b.h, b.w, b.h + 2);
      if (p.lights > .01) {
        ctx.globalAlpha = p.lights * .55;
        ctx.drawImage(this.lightsFar, -M + o, 0, w + 2 * M, H);
        ctx.globalAlpha = 1;
      }
      haze(.12);

      // Skyline vorne + Landmark-Tower
      o = ox(.7);
      ctx.fillStyle = rgb(p.cNear);
      for (const b of this.cNear) {
        ctx.fillRect(b.x + o, H - b.h, b.w, b.h + 2);
        if (b.ant) ctx.fillRect(b.x + o + b.w / 2 - .5, H - b.h - 10, 1, 10);
      }
      const T = this.tower;
      ctx.fillRect(T.x + o, H - T.h, T.w, T.h + 2);
      ctx.beginPath();
      ctx.moveTo(T.x + o, H - T.h);
      ctx.lineTo(T.x + o + T.w / 2, H - T.h * 1.08);
      ctx.lineTo(T.x + o + T.w, H - T.h);
      ctx.fill();
      ctx.fillRect(T.x + o + T.w / 2 - .75, H - T.h * 1.2, 1.5, T.h * .13);
      if (p.lights > .01) {
        ctx.globalAlpha = p.lights;
        ctx.drawImage(this.lightsNear, -M + o, 0, w + 2 * M, H);
        ctx.globalAlpha = 1;
      }
      // Blinklicht auf dem Tower
      if (Math.sin(t * 2.4) > .55) {
        const bx = T.x + o + T.w / 2, by = H - T.h * 1.2;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
        g.addColorStop(0, `rgba(255,70,60,${.4 + .6 * p.lights})`);
        g.addColorStop(1, 'rgba(255,70,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx - 10, by - 10, 20, 20);
      }

      // See
      const wg = ctx.createLinearGradient(0, H, 0, winB);
      wg.addColorStop(0, rgb(p.water));
      wg.addColorStop(1, rgb(p.waterDeep));
      ctx.fillStyle = wg;
      ctx.fillRect(0, H, w, h - H);
      const sg = ctx.createLinearGradient(0, H, 0, H + winH * .06);
      sg.addColorStop(0, rgba(p.hor, .35));
      sg.addColorStop(1, rgba(p.hor, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(0, H, w, winH * .06);

      const span = Math.max(1, winB - H);
      // Sonnenglitzern
      if (p.sunA > .01 && p.sunY < 1.04) {
        const vis = Math.min(1, (1.04 - p.sunY) * 5) * p.sunA;
        ctx.fillStyle = rgba(mixWhite(p.sun, .3), 1);
        for (let y = H + 1; y < winB; y += 3) {
          const d = (y - H) / span;
          const ww = (winH * .03 + d * winH * .26) * (.55 + .45 * Math.sin(t * 1.6 + y * .37));
          ctx.globalAlpha = Math.max(0, vis * (1 - d * .8) * .5 * (.35 + .65 * Math.abs(Math.sin(t * 2.1 + y * .83))));
          ctx.fillRect(sx - ww / 2 + Math.sin(t * .9 + y * .21) * winH * .012, y, ww, 1.3);
        }
        ctx.globalAlpha = 1;
      }
      // Mondglitzern
      if (p.moonA > .01) {
        ctx.fillStyle = 'rgb(220,228,255)';
        for (let y = H + 1; y < winB; y += 3) {
          const d = (y - H) / span;
          const ww = (winH * .015 + d * winH * .12) * (.5 + .5 * Math.sin(t * 1.4 + y * .41));
          ctx.globalAlpha = Math.max(0, p.moonA * (1 - d) * .35 * Math.abs(Math.sin(t * 1.9 + y * .7)));
          ctx.fillRect(mxp - ww / 2 + Math.sin(t * .8 + y * .23) * 4, y, ww, 1.2);
        }
        ctx.globalAlpha = 1;
      }
      // Lichtspiegelungen der Stadt
      if (p.lights > .02) {
        o = ox(.7);
        for (const r of this.refl) {
          const L = span * r.len;
          ctx.fillStyle = `rgba(${r.c},${(.28 * p.lights).toFixed(3)})`;
          for (let y = H + 2; y < H + L; y += 4) {
            if (Math.sin(t * 2.6 + y * .45 + r.p) > -.1) ctx.fillRect(r.x + o + Math.sin(t * 1.8 + y * .32 + r.p) * 1.6, y, r.w, 2);
          }
        }
      }

      // Uferpromenade mit Autos
      o = ox(.7);
      ctx.fillStyle = rgb(p.cNear);
      ctx.fillRect(0, H - 1, w, 3);
      if (p.lights > .05) {
        for (const c of this.cars) {
          c.x += c.v * dt;
          if (c.x > w + M) c.x = -M; else if (c.x < -M) c.x = w + M;
          ctx.fillStyle = c.v > 0 ? `rgba(255,236,200,${p.lights})` : `rgba(255,80,70,${p.lights})`;
          ctx.fillRect(c.x + o, H, 2, 1.2);
        }
      }

      // Vögel
      this.nextBirds -= dt;
      if (this.nextBirds <= 0 && p.stars < .6) {
        const y0 = rand(winT + winH * .12, H - winH * .25);
        for (let i = 0; i < 6; i++) this.birds.push({ x: -40 - i * rand(12, 24), y: y0 + rand(-14, 14), v: rand(38, 52), ph: rand(0, 6) });
        this.nextBirds = rand(10, 18);
      }
      if (this.birds.length) {
        ctx.strokeStyle = 'rgba(18,16,24,.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const b of this.birds) {
          b.x += b.v * dt;
          const fl = Math.sin(t * 9 + b.ph) * 3;
          ctx.moveTo(b.x - 5, b.y - fl);
          ctx.quadraticCurveTo(b.x - 2, b.y - 1, b.x, b.y);
          ctx.quadraticCurveTo(b.x + 2, b.y - 1, b.x + 5, b.y - fl);
        }
        ctx.stroke();
        this.birds = this.birds.filter(b => b.x < w + 60);
      }

      // Polierter Boden: gestauchte Spiegelung des gesamten Ausblicks
      if (h - winB > 4) {
        ctx.fillStyle = '#060608';
        ctx.fillRect(0, winB, w, h - winB);
        ctx.save();
        ctx.globalAlpha = .3;
        ctx.translate(0, winB);
        ctx.scale(1, -1);
        ctx.drawImage(this.c, 0, winT * this.dpr, this.c.width, (winB - winT) * this.dpr, 0, -(h - winB), w, h - winB);
        ctx.restore();
      }
    }
  }

  const scene = new ViewScene($('#view'));

  /* ------------------------------------------------------------------------
     7. INNENRAUM – Hotspots, Parallax, Tageszeit
     ------------------------------------------------------------------------ */
  function decorateRoom() {
    const planks = $('#planks');
    for (let x = 260; x <= 1340; x += 90) {
      svgEl('line', { x1: x, y1: 700, x2: 800 + (x - 800) * 1.333, y2: 900 }, planks);
    }
  }

  const tip = $('#hotspot-tip');
  let openSpot = null;

  function showTip(spot) {
    if (openSpot === spot) { hideTip(); return; }
    hideTip();
    openSpot = spot;
    spot.classList.add('is-open');
    $('#tip-title').textContent = spot.dataset.title;
    $('#tip-text').textContent = spot.dataset.text;
    tip.hidden = false;
    const r = spot.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.right + 14, top = r.top + r.height / 2 - th / 2;
    if (left + tw > innerWidth - 16) left = r.left - tw - 14;
    left = Math.max(16, Math.min(left, innerWidth - tw - 16));
    top = Math.max(80, Math.min(top, innerHeight - th - 16));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    if (hasGSAP) gsap.fromTo(tip, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out' });
  }

  function hideTip() {
    if (!openSpot) return;
    openSpot.classList.remove('is-open');
    openSpot = null;
    tip.hidden = true;
  }

  function bindInterior() {
    $$('.hotspot').forEach(s => {
      s.addEventListener('click', e => { e.stopPropagation(); showTip(s); });
      s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showTip(s); } });
      s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && openSpot !== s) showTip(s); });
      s.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
    });
    interior.addEventListener('click', hideTip);

    interior.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      scene.tmx = (e.clientX / innerWidth) * 2 - 1;
      scene.tmy = (e.clientY / innerHeight) * 2 - 1;
    });

    $('#exit-btn').addEventListener('click', e => { e.stopPropagation(); exitPenthouse(); });

    $$('.tod-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setTod(b.dataset.tod); }));

    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (interiorOpen) { scene.resize(); moveTodIndicator(true); hideTip(); }
      }, 150);
    });
  }

  function setTod(key) {
    $$('.tod-btn').forEach(b => {
      const on = b.dataset.tod === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    moveTodIndicator();
    scene.toPreset(key);
  }

  function moveTodIndicator(instant) {
    const btn = $('.tod-btn.is-active');
    const ind = $('.tod-ind');
    if (!btn || !ind) return;
    const props = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (instant || !hasGSAP) { ind.style.width = props.width + 'px'; ind.style.transform = `translateX(${props.x}px)`; }
    else gsap.to(ind, { ...props, duration: .6, ease: 'expo.out' });
  }

  /* ------------------------------------------------------------------------
     8. MODALS – Grundriss & Besichtigung
     ------------------------------------------------------------------------ */
  let lastFocus = null;
  let currentPlanFloor = 'ph';

  function openModal(m) {
    lastFocus = document.activeElement;
    m.hidden = false;
    document.documentElement.classList.add('no-scroll');
    if (hasGSAP) {
      gsap.fromTo($('.modal-backdrop', m), { opacity: 0 }, { opacity: 1, duration: .4 });
      gsap.fromTo($('.modal-panel', m), { opacity: 0, y: 34, scale: .98 }, { opacity: 1, y: 0, scale: 1, duration: .7, ease: 'expo.out' });
    }
    setTimeout(() => ($('input:not([type=radio]):not([type=checkbox])', m) || $('.modal-x', m))?.focus({ preventScroll: true }), 60);
  }

  function closeModal(m, instant) {
    if (!m || m.hidden) return;
    const done = () => {
      m.hidden = true;
      if (!interiorOpen && !busy) document.documentElement.classList.remove('no-scroll');
      if (!instant) lastFocus?.focus?.({ preventScroll: true });
    };
    if (instant || !hasGSAP) { done(); return; }
    gsap.to($('.modal-panel', m), { opacity: 0, y: 20, duration: .3, ease: 'power2.in' });
    gsap.to($('.modal-backdrop', m), { opacity: 0, duration: .35, onComplete: done });
  }

  const closeAllModals = instant => $$('.modal').forEach(m => closeModal(m, instant));

  function openPlan(id) {
    const f = floorById(id) || floorById('ph');
    if (f.plan === false) { openVisit(id); return; }
    currentPlanFloor = f.id;
    const plan = f.ph ? PLANS.ph : PLANS.apt;
    $('#plan-title').textContent = f.ph ? 'Penthouse · Sky Residence' : `${f.name} · ${f.title}`;
    $('#plan-meta').textContent = f.ph ? '286 m² Wohnfläche · 120 m² Dachterrasse · 5 Zimmer · ab 4.950.000 €' : `${f.size} · ${f.rooms} · Beispielgrundriss · ${f.price}`;

    const svg = $('#plan-svg');
    svg.innerHTML = '';
    const defs = svgEl('defs', {}, svg);
    const pat = svgEl('pattern', { id: 'hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: 'rgba(201,164,106,.25)', 'stroke-width': 1.2 }, pat);

    const draw = [];
    plan.rooms.forEach(r => {
      const p = svgEl('path', { class: r.terrace ? 'plan-terrace plan-draw' : 'plan-room plan-draw', d: `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z` }, svg);
      draw.push(p);
    });
    draw.push(svgEl('path', { class: 'plan-outer plan-draw', d: f.ph ? 'M20 20H580V380H340V240H20Z' : 'M20 20H580V380H20Z' }, svg));
    plan.windows.forEach(([x1, y1, x2, y2]) => draw.push(svgEl('path', { class: 'plan-win plan-draw', d: `M${x1} ${y1}L${x2} ${y2}` }, svg)));
    plan.doors.forEach(([x, y, vertical]) => {
      const d = vertical ? `M${x} ${y}l${-26} 0a26 26 0 0 1 26 -26` : `M${x} ${y}l0 ${-26}a26 26 0 0 1 26 26`;
      draw.push(svgEl('path', { class: 'plan-door plan-draw', d }, svg));
    });

    const texts = [];
    plan.rooms.forEach(r => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const l = svgEl('text', { class: 'plan-label', x: cx, y: cy }, svg); l.textContent = r.label;
      const a = svgEl('text', { class: 'plan-area', x: cx, y: cy + 16 }, svg); a.textContent = r.m;
      texts.push(l, a);
    });
    // Nordpfeil + Maßstab
    const meta = svgEl('g', {}, svg);
    svgEl('path', { d: 'M570 398l6 18 -6 -4 -6 4z', fill: '#C9A46A' }, meta);
    const nT = svgEl('text', { class: 'plan-meta', x: 566, y: 395 }, meta); nT.textContent = 'N';
    svgEl('path', { d: 'M20 410h100M20 405v10M70 407v6M120 405v10', stroke: 'rgba(236,230,220,.45)', 'stroke-width': 1, fill: 'none' }, meta);
    const sT = svgEl('text', { class: 'plan-meta', x: 130, y: 413 }, meta); sT.textContent = '5 M';
    texts.push(meta);

    openModal($('#modal-plan'));

    if (hasGSAP && !reduceMotion) {
      draw.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; });
      gsap.to(draw, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: .05, delay: .2, onComplete: () => draw.forEach(p => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }) });
      gsap.fromTo(texts, { opacity: 0 }, { opacity: 1, duration: .6, stagger: .04, delay: .9 });
    }
  }

  function buildVisitForm() {
    const sel = $('#v-interest');
    sel.add(new Option('Allgemeine Anfrage', ''));
    FLOORS.filter(f => f.plan !== false).slice().reverse().forEach(f => sel.add(new Option(`${f.name} – ${f.title}`, f.id)));

    const days = $('#v-days');
    const d = new Date();
    let n = 0;
    while (n < 6) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue; // Sonntag geschlossen
      const label = document.createElement('label');
      label.className = 'chip';
      label.innerHTML = `<input type="radio" name="day" value="${d.toISOString().slice(0, 10)}" ${n === 0 ? 'checked' : ''} />
        <span><small>${d.toLocaleDateString('de-DE', { weekday: 'short' })}</small>${d.getDate()}.${d.getMonth() + 1}.</span>`;
      days.appendChild(label);
      n++;
    }

    const form = $('#visit-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const okName = name.length > 1;
      const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const okPriv = !!data.get('privacy');
      form.elements.name.closest('.field').classList.toggle('is-invalid', !okName);
      form.elements.email.closest('.field').classList.toggle('is-invalid', !okMail);
      form.elements.privacy.closest('.check').classList.toggle('is-invalid', !okPriv);
      if (!(okName && okMail && okPriv)) {
        if (hasGSAP) gsap.fromTo($('#modal-visit .modal-panel'), { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
        return;
      }
      // Prototyp: hier würde der Request an CRM / API erfolgen.
      const day = new Date(data.get('day') + 'T12:00:00');
      const dayTxt = isNaN(day) ? '' : day.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      $('#visit-success-text').textContent = `${name.split(' ')[0]}, wir haben Ihre Anfrage für ${dayTxt} um ${data.get('time')} Uhr erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.`;
      form.hidden = true;
      $('#visit-success').hidden = false;
      if (hasGSAP) {
        ['#ok-circle', '#ok-check'].forEach((s, i) => {
          const p = $(s), L = p.getTotalLength();
          gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: .9, delay: i * .5, ease: 'power2.inOut' });
        });
      }
    });
  }

  function openVisit(id) {
    const form = $('#visit-form');
    form.hidden = false;
    $('#visit-success').hidden = true;
    $$('.is-invalid', form).forEach(n => n.classList.remove('is-invalid'));
    const sel = $('#v-interest');
    sel.value = [...sel.options].some(o => o.value === id) ? id : '';
    openModal($('#modal-visit'));
  }

  function bindGlobal() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-enter], [data-open-plan], [data-open-visit], [data-close]');
      if (!t) return;
      if (t.hasAttribute('data-close')) { closeModal(t.closest('.modal')); return; }
      e.stopPropagation();
      if (t.hasAttribute('data-enter')) enterPenthouse();
      else if (t.hasAttribute('data-open-plan')) openPlan(t.dataset.openPlan);
      else if (t.hasAttribute('data-open-visit')) openVisit(t.dataset.openVisit);
    });

    $('#plan-visit').addEventListener('click', () => { closeModal($('#modal-plan'), true); openVisit(currentPlanFloor); });
    $('#plan-expose').addEventListener('click', () => { closeModal($('#modal-plan'), true); openVisit(currentPlanFloor); });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = $$('.modal').find(m => !m.hidden);
      if (open) closeModal(open);
      else if (openSpot) hideTip();
      else if (interiorOpen) exitPenthouse();
    });

    // Header-Hintergrund beim Scrollen
    const header = $('#site-header');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------------
     9. SCROLL-REVEALS & MOTION-AD AUTOPLAY
     ------------------------------------------------------------------------ */
  function scrollReveals() {
    if (!hasGSAP || !window.ScrollTrigger) return;
    $$('.reveal').forEach(el => {
      gsap.from(el, { y: 44, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count;
      const o = { v: end > 1000 ? end - 40 : 0 };
      el.textContent = Math.round(o.v);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
      });
    });
  }

  let adTl = null;
  function playAd() {
    if (!hasGSAP || busy || interiorOpen) return;
    adTl?.kill();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const step = .32;
    adTl = gsap.timeline();
    FLOORS.forEach((f, i) => adTl.call(() => setHover(f.id), null, i * step));
    adTl.call(() => setHover('ph'), null, FLOORS.length * step + .2)
      .call(() => enterPenthouse(), null, '+=1.1')
      .call(() => setTod('nacht'), null, '+=5.2')
      .call(() => setTod('morgen'), null, '+=4.2')
      .call(() => setTod('tag'), null, '+=4.2')
      .call(() => setTod('abend'), null, '+=4.2');
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  buildBuilding();
  bindFloors();
  decorateRoom();
  bindInterior();
  buildVisitForm();
  bindGlobal();
  renderInfo(selected);
  $('#play-ad').addEventListener('click', playAd);

  if (hasGSAP) {
    runIntro();
    scrollReveals();
    // ?ad=1 → Motion-Ad startet nach dem Intro automatisch (z. B. für Screen-Recording)
    if (new URLSearchParams(location.search).has('ad')) gsap.delayedCall(reduceMotion ? .5 : 5.2, playAd);
  }
})();
