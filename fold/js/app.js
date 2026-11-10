/* =========================================================
   iPhone Fold – Kampagnen-Prototyp
   GSAP 3 (ScrollTrigger, ScrollToPlugin, Flip)
   ---------------------------------------------------------
   Architektur
   - S  (Scroll-State): von einer gescrubbten Master-Timeline animiert
   - F  (Focus-State):  vom Feature-Showcase animiert (Kamera-Zoom, X-Ray, Explosion)
   - apply(): setzt jedes Frame die 3D-Transforms aus S + F + Pointer-Tilt
   ========================================================= */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Flip);

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const device = $('#device');
  const halfL = $('.half--l'), halfR = $('.half--r');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // Filmmodus (?film=1): keine Website-UI, automatische Kamerafahrt für das Video-Rendering
  const FILM = new URLSearchParams(location.search).has('film');
  if (FILM) root.classList.add('film');

  /* ---------- 1. Geometrie (responsive) ---------- */
  const G = { vw: 0, vh: 0, H: 0, hw: 0, t: 0, mobile: false };
  function measure() {
    G.vw = innerWidth; G.vh = innerHeight; G.mobile = G.vw < 768;
    G.land = FILM && G.vw > G.vh;                 // Film im Querformat: Titel links, Gerät rechts
    root.classList.toggle('film-land', G.land);
    const avH = G.vh * (G.land ? .66 : FILM ? .5 : G.mobile ? .44 : .5);
    const avW = G.vw * (G.land ? .46 : FILM ? .94 : G.mobile ? .9 : .6);
    G.H = Math.round(Math.min(avH, avW * 1.1));     // offen: Seitenverhältnis ~ 1 : 1.1
    G.hw = G.H / 2.2;
    G.t = Math.max(5, G.H * .022);
    root.style.setProperty('--H', G.H + 'px');
    root.style.setProperty('--hw', G.hw + 'px');
    root.style.setProperty('--t', G.t + 'px');
    root.style.setProperty('--r', G.H * .075 + 'px');
    root.style.setProperty('--bz', Math.max(4, G.H * .016) + 'px');
  }

  // Gehäusedicke: gestapelte Titan-Schichten je Hälfte
  function buildSlabs() {
    const N = 8;
    [halfL, halfR].forEach(h => {
      for (let i = 0; i < N; i++) {
        const s = document.createElement('div');
        s.className = 'slab';
        const k = -.5 + (i / (N - 1)) * .7;          // bis 0.2·t – Abstand zur Display-Ebene
        s.style.transform = `translateZ(calc(var(--t) * ${k.toFixed(4)}))`;
        s.style.filter = `brightness(${(.55 + i * .05).toFixed(2)})`;
        h.prepend(s);
      }
    });
  }

  /* ---------- 2. State ---------- */
  const S = { fold: 0, rx: 10, ry: -30, rz: 0, zoom: 1.05, sy: .17, hue: 220 };
  const F = { fx: 0, fy: 0, fz: 0, zoom: 1, rx: 0, ry: 0, rz: 0, xray: 0, explode: 0, flexAmp: 0, sx: 0, sy: 0 };
  const flex = { v: 0 };
  const ui = { v: 0 };
  const tilt = { x: 0, y: 0 };
  let time = 0;

  /* ---------- 3. Render ---------- */
  function apply() {
    const u = S.fold;
    const angle = -180 * (1 - u) - 62 * flex.v * F.flexAmp;
    halfR.style.transform = `rotateY(${angle}deg)`;

    // geschlossen: sichtbare Hälfte zentrieren (Pivot in Mitte des Stapels)
    const fx = -G.hw / 2 * (1 - u) + F.fx;
    const fy = F.fy;
    const fz = G.t / 2 * (1 - u) + F.fz;
    const idle = reduce ? 0 : Math.sin(time * .9) * 6 * (1 - F.xray) * (1 - F.explode);
    const tk = 1 - .7 * Math.max(F.xray, F.explode);
    const rx = S.rx + F.rx - tilt.y * 6 * tk;
    const ry = S.ry + F.ry + tilt.x * 9 * tk;
    const zoom = S.zoom * F.zoom;
    const sx = F.sx + (G.land ? G.vw * .2 : 0);
    const sy = (G.land ? S.sy * G.vh * .25 : S.sy * G.vh) + F.sy + idle;

    device.style.transform =
      `translate3d(${sx}px,${sy}px,0) scale(${zoom}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${S.rz + F.rz}deg) translate3d(${-fx}px,${-fy}px,${-fz}px)`;

    const ds = device.style;
    ds.setProperty('--spine', (1 - u) ** 2);
    ds.setProperty('--rs', 1 - clamp((u - .55) / .25)); // Kantenschichten rechts: im offenen Zustand verdeckt
    ds.setProperty('--seam', Math.sin(Math.PI * clamp(u * 1.05)) * .95 * (1 - ui.v * .9));
    ds.setProperty('--ui', ui.v);
    ds.setProperty('--xray', F.xray);
    ds.setProperty('--explode', F.explode);
    ds.setProperty('--ha', (angle / 2) + 'deg');
    ds.setProperty('--sheen', (50 - ry * 1.6) + '%');
    root.style.setProperty('--hue', S.hue.toFixed(1));
    root.style.setProperty('--halo-x', sx + 'px');
    root.style.setProperty('--halo-y', sy + 'px');
  }

  /* ---------- 4. Scroll-Master-Timeline ---------- */
  let master;
  function buildTimeline() {
    if (master) { master.scrollTrigger && master.scrollTrigger.kill(); master.kill(); }
    const max = root.scrollHeight - innerHeight;
    const at = id => clamp($(id).offsetTop / max);
    const pU = at('#s-unfold'), pS = at('#s-seam'), pO = at('#s-os'), pF = at('#s-features'), pC = at('#s-cta');

    master = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '#content', start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1,
        onUpdate: self => gsap.set('#progress i', { scaleX: self.progress })
      }
    });
    master
      // Stage 1: geschlossen, Titan-Reflexe wandern mit der Drehung
      .to(S, { ry: -12, rx: 6, zoom: 1.02, sy: .15, duration: pU }, 0)
      // Unfold
      .to(S, { fold: 1, duration: (pS - pU) * .9, ease: 'power3.inOut' }, pU)
      .to(S, { ry: 0, rx: 4, zoom: 1, sy: .12, duration: (pS - pU) * .9 }, pU)
      .to(S, { hue: 250, duration: pS - pU, ease: 'none' }, pU)
      // Seamless: flacher Winkel zeigt die faltenfreie Fläche
      .to(S, { rx: 22, ry: -10, duration: (pO - pS) }, pS)
      // OS: sanfter Schwenk → Parallax der Widgets sichtbar
      .to(S, { rx: 3, ry: 12, hue: 275, duration: (pF - pO) * .5 }, pO)
      .to(S, { ry: -8, duration: (pF - pO) * .5 }, pO + (pF - pO) * .5)
      // Features: neutral & mittig
      .to(S, { rx: 0, ry: 0, sy: .08, zoom: 1, hue: 220, duration: (pC - pF) * .3 }, pF)
      // CTA: Gerät steigt auf und dreht sich frei
      .to(S, { sy: -.17, zoom: .62, ry: -26, rx: 12, hue: 205, duration: 1 - pC }, pC)
      .set({}, {}, 1); // Timeline-Länge = 1 ⇒ Positionen = Scroll-Progress
  }

  /* ---------- 5. Holo-OS Boot ---------- */
  const cards = $$('#holo .card');
  const boot = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .to(ui, { v: 1, duration: .5, ease: 'power2.out' }, 0)
    .fromTo('#holo .grid i', { scaleX: 0 }, { scaleX: 1, duration: .9, stagger: .05 }, 0)
    .fromTo(cards, { opacity: 0, scale: .82, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .9, stagger: .07 }, .15)
    .fromTo('#holo .dock', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .8 }, .4)
    .fromTo('#holo .orb', { scale: 0 }, { scale: 1, duration: 1.1, stagger: .12, ease: 'back.out(2.2)' }, .35);
  let booted = false;
  function checkBoot() {
    if (!booted && S.fold > .985) { booted = true; boot.timeScale(1).play(); }
    else if (booted && S.fold < .93) { booted = false; collapseCard(true); boot.timeScale(2.2).reverse(); }
  }

  // Schwebende Widgets (Parallax-Ebenen bekommen eigene Float-Phasen)
  if (!reduce) {
    $$('#holo .fl').forEach((el, i) => {
      gsap.to(el, { y: gsap.utils.random(-7, 7), x: gsap.utils.random(-4, 4),
        duration: gsap.utils.random(2.6, 4.2), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .2 });
    });
    $$('#holo .orb').forEach((el, i) => {
      gsap.to(el, { x: gsap.utils.random(-18, 18), y: gsap.utils.random(-14, 14), duration: gsap.utils.random(3, 5),
        ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .4 });
    });
  }

  /* ---------- 6. Flip: Widget expandieren ---------- */
  const expandHost = $('#holo-expand');
  let expanded = null, expandedHome = null;
  function expandCard(card) {
    if (expanded === card) return collapseCard();
    if (expanded) collapseCard(true);
    const state = Flip.getState(card);
    expandedHome = card.parentNode;
    expandHost.appendChild(card);
    card.classList.add('big');
    expanded = card;
    Flip.from(state, { duration: .75, ease: 'expo.inOut', absolute: true, scale: true });
  }
  function collapseCard(instant) {
    if (!expanded) return;
    const card = expanded;
    const state = Flip.getState(card);
    expandedHome.appendChild(card);
    card.classList.remove('big');
    expanded = null;
    if (!instant) Flip.from(state, { duration: .65, ease: 'expo.inOut', absolute: true, scale: true });
  }
  $$('#holo .card[data-expand]').forEach(c => c.addEventListener('click', e => {
    e.stopPropagation();
    if (S.fold > .98 && !current) expandCard(c);
  }));

  /* ---------- 7. Pointer: Tilt + Lichtstreuung ---------- */
  const qx = gsap.quickTo(tilt, 'x', { duration: .9, ease: 'power3' });
  const qy = gsap.quickTo(tilt, 'y', { duration: .9, ease: 'power3' });
  const holo = $('#holo');
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    qx((e.clientX / G.vw - .5) * 2);
    qy((e.clientY / G.vh - .5) * 2);
    const r = holo.getBoundingClientRect();
    holo.style.setProperty('--mx', clamp((e.clientX - r.left) / r.width) * 100 + '%');
    holo.style.setProperty('--my', clamp((e.clientY - r.top) / r.height) * 100 + '%');
  }, { passive: true });

  /* ---------- 8. Entfalten per Klick ---------- */
  const scrollToSection = (id, extra = 0) =>
    gsap.to(window, { scrollTo: { y: $(id).offsetTop + extra, autoKill: true }, duration: reduce ? 0 : 1.8, ease: 'power2.inOut' });
  function unfold() { if (S.fold < .5) scrollToSection('#s-seam', -G.vh * .05); }
  device.addEventListener('click', () => { if (!current) unfold(); });
  $('#btn-unfold').addEventListener('click', unfold);
  $$('[data-scroll]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToSection(a.getAttribute('href')); }));

  /* ---------- 9. Feature-Showcase (Stage 3) ---------- */
  const FEATURES = {
    hinge: {
      eyebrow: 'Liquid Hinge', title: 'Ein Scharnier wie Flüssigmetall.',
      text: '112 Mikro-Glieder verteilen die Biegung so fein, dass das Display niemals knickt – und das Gerät ohne Spalt schließt.',
      specs: [['Faltzyklen', '500.000+'], ['Spaltmaß geschlossen', '0,0 mm'], ['Winkel', 'stufenlos 0–180°']],
      cam: () => ({ fx: 0, fy: -G.H * .2, fz: 0, zoom: G.mobile || G.land ? 1.9 : 2.3, rx: 14, ry: -40, rz: 0, xray: 1, explode: 0, flexAmp: 1 })
    },
    oled: {
      eyebrow: 'Seamless OLED', title: 'Fünf Schichten. Null Falte.',
      text: 'Ultra-Thin Glass, ein flexibles OLED und ein neues Flex-Shield verschmelzen zu einer Fläche, die sich anfühlt wie ein einziges Blatt Glas.',
      specs: [['Innen / Außen', '7,9″ / 6,3″'], ['Bildrate', '1–120 Hz adaptiv'], ['Helligkeit', 'bis 3.000 nits']],
      cam: () => ({ fx: 0, fy: 0, fz: G.H * .25, zoom: G.mobile ? .62 : .78, rx: 56, ry: 0, rz: -30, xray: 0, explode: 1, flexAmp: 0 })
    },
    chip: {
      eyebrow: 'Quantum Chip', title: 'Q1. Gebaut für zwei Displays.',
      text: 'Ein 2-nm-Chip mit Neural Engine rendert beide Hälften synchron und verteilt Apps fließend – sobald du aufklappst.',
      specs: [['Fertigung', '2 nm'], ['Neural Engine', '38 TOPS'], ['Effizienz', '+40 %']],
      cam: () => ({ fx: -G.hw * .5, fy: -G.H * .24, fz: 0, zoom: G.mobile || G.land ? 2.2 : 2.7, rx: 16, ry: 24, rz: 0, xray: 1, explode: 0, flexAmp: 0 })
    }
  };
  const ZERO = { fx: 0, fy: 0, fz: 0, zoom: 1, rx: 0, ry: 0, rz: 0, xray: 0, explode: 0, flexAmp: 0, sx: 0, sy: 0 };
  const flexTween = gsap.to(flex, { v: 1, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
  const info = $('#info');
  let current = null;

  function focusFeature(key) {
    if (key === current) key = null;
    current = key;
    collapseCard(true);
    const f = key && FEATURES[key];
    const target = f ? { ...ZERO, ...f.cam(), sx: FILM || G.mobile ? 0 : -Math.min(260, G.vw * .16), sy: G.land ? 0 : FILM ? G.vh * .07 : G.mobile ? -G.vh * .17 : 0 } : ZERO;
    gsap.to(F, { ...target, duration: reduce ? 0 : 1.5, ease: 'expo.inOut', overwrite: true });
    if (key === 'hinge') flexTween.play(); else { flexTween.pause(); gsap.to(flex, { v: 0, duration: .8 }); }

    $$('.chip-btn').forEach(b => b.classList.toggle('on', b.dataset.feature === key));
    if (f) {
      $('#info-eyebrow').textContent = f.eyebrow;
      $('#info-title').textContent = f.title;
      $('#info-text').textContent = f.text;
      $('#info-specs').innerHTML = f.specs.map(([k, v]) => `<li>${k}<b>${v}</b></li>`).join('');
      info.classList.add('on');
    } else info.classList.remove('on');
  }
  $$('.chip-btn').forEach(b => b.addEventListener('click', () => focusFeature(b.dataset.feature)));
  $('.info__close').addEventListener('click', () => focusFeature(null));
  addEventListener('keydown', e => { if (e.key === 'Escape') { focusFeature(null); collapseCard(); } });

  /* ---------- 10. Section-Copy & Feature-UI Sichtbarkeit ---------- */
  function buildSectionTriggers() {
    $$('.sec').forEach(sec => {
      const copy = $('.copy', sec);
      ScrollTrigger.create({
        trigger: sec, start: 'top 65%', end: 'bottom 35%',
        onToggle: self => copy.classList.toggle('on', self.isActive)
      });
    });
    ScrollTrigger.create({
      trigger: '#s-features', start: 'top 20%', end: 'bottom 60%',
      onToggle: self => {
        $('#features-ui').classList.toggle('on', self.isActive);
        $('#features-ui').setAttribute('aria-hidden', !self.isActive);
        if (!self.isActive && current) focusFeature(null);
      }
    });
  }

  /* ---------- 11. Farbwahl (live auf dem Gerät) ---------- */
  const COLORS = {
    natural: { name: 'Titan Natur', v: ['#dedad3', '#8e8a82', '#c6c2b9'] },
    black:   { name: 'Deep Space Black', v: ['#55555b', '#16161a', '#36363b'] },
    blue:    { name: 'Titan Blau', v: ['#7d93ba', '#27334b', '#5a6d93'] },
    white:   { name: 'Titan Weiß', v: ['#fbfbf9', '#bdbdb9', '#e4e4e0'] }
  };
  function setColor(key) {
    const c = COLORS[key]; if (!c) return;
    const from = { a: getComputedStyle(root).getPropertyValue('--ti1').trim(), b: getComputedStyle(root).getPropertyValue('--ti2').trim(), c: getComputedStyle(root).getPropertyValue('--ti3').trim() };
    gsap.to(from, { a: c.v[0], b: c.v[1], c: c.v[2], duration: .8, ease: 'power2.inOut',
      onUpdate: () => { root.style.setProperty('--ti1', from.a); root.style.setProperty('--ti2', from.b); root.style.setProperty('--ti3', from.c); } });
    $$('.sw').forEach(s => s.classList.toggle('on', s.dataset.color === key));
    $('#sw-name').textContent = c.name;
    const r = $(`#opt-color input[value="${key}"]`); if (r) r.checked = true;
  }
  $$('.sw').forEach(s => s.addEventListener('click', () => setColor(s.dataset.color)));
  $$('#opt-color input').forEach(r => r.addEventListener('change', () => setColor(r.value)));

  /* ---------- 12. Dialog: Vorbestellen ---------- */
  const PRICES = [2199, 2449, 2899];
  const fmt = n => n.toLocaleString('de-DE') + ' €';
  $$('input[name="cap"]').forEach(r => r.addEventListener('change', () => { $('#order-total').textContent = fmt(PRICES[+r.value]); }));
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.open)));
  function openDialog(id) {
    const d = document.getElementById(id);
    if (id === 'dlg-order') $('.dlg__done', d).hidden = true;
    d.showModal();
    if (id === 'dlg-ar') startAR();
  }
  $('#order-submit').addEventListener('click', () => { $('#dlg-order .dlg__done').hidden = false; });

  /* ---------- 13. Dialog: AR-Vorschau ----------
     Zeigt das Gerät über dem Live-Kamerabild (getUserMedia, braucht https/localhost).
     Für echtes iOS AR Quick Look: <a rel="ar" href="iphone-fold.usdz"> mit einem USDZ-Modell ergänzen. */
  const arDlg = $('#dlg-ar'), arVideo = $('#ar-video'), arPhone = $('#ar-phone'), arWrap = $('.ar');
  const AR = { ry: -25, rx: 12, s: 1, open: 0 };
  let stream = null;
  function renderAR() {
    arPhone.style.transform = `scale(${AR.s}) rotateX(${AR.rx}deg) rotateY(${AR.ry}deg) translateX(${-55 * (1 - AR.open)}px)`;
    $('.ar__half--r').style.transform = `rotateY(${-180 * (1 - AR.open)}deg)`;
  }
  async function startAR() {
    renderAR();
    const st = $('#ar-status');
    if (!navigator.mediaDevices?.getUserMedia) { st.textContent = 'Studio-Ansicht (Kamera nicht verfügbar)'; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      arVideo.srcObject = stream; arWrap.classList.add('has-cam');
      st.textContent = 'AR-Vorschau aktiv';
    } catch { st.textContent = 'Studio-Ansicht (Kamera-Zugriff verweigert)'; }
  }
  function stopAR() { stream && stream.getTracks().forEach(t => t.stop()); stream = null; arWrap.classList.remove('has-cam'); }
  arDlg.addEventListener('close', stopAR);
  $('#ar-close').addEventListener('click', () => arDlg.close());
  $('#ar-toggle').addEventListener('click', e => {
    const to = AR.open > .5 ? 0 : 1;
    e.currentTarget.textContent = to ? 'Zuklappen' : 'Aufklappen';
    gsap.to(AR, { open: to, duration: 1.2, ease: 'power3.inOut', onUpdate: renderAR });
  });
  (() => { // Drehen + Pinch/Wheel
    const pts = new Map(); let pinch0 = 0, s0 = 1;
    const stage = $('#ar-stage');
    stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); s0 = AR.s; } });
    stage.addEventListener('pointermove', e => {
      const prev = pts.get(e.pointerId); if (!prev) return;
      if (pts.size === 1) { AR.ry += (e.clientX - prev.clientX) * .5; AR.rx = clamp(AR.rx - (e.clientY - prev.clientY) * .3, -60, 60); }
      pts.set(e.pointerId, e);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; AR.s = clamp(s0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch0, .5, 2.2); }
      renderAR();
    });
    const up = e => pts.delete(e.pointerId);
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', e => { e.preventDefault(); AR.s = clamp(AR.s - e.deltaY * .001, .5, 2.2); renderAR(); }, { passive: false });
  })();

  /* ---------- 14. Staub-Partikel (Lichtstreuung im Raum) ---------- */
  const cv = $('#dust'), cx = cv.getContext('2d');
  let parts = [];
  function sizeDust() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = G.vw * dpr; cv.height = G.vh * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: G.mobile ? 40 : 80 }, () => ({ x: Math.random() * G.vw, y: Math.random() * G.vh, r: Math.random() * 1.6 + .3, v: Math.random() * .25 + .05, p: Math.random() * 6.28 }));
  }
  function drawDust() {
    cx.clearRect(0, 0, G.vw, G.vh);
    for (const p of parts) {
      p.y -= p.v; p.x += Math.sin(time * .5 + p.p) * .15;
      if (p.y < -5) { p.y = G.vh + 5; p.x = Math.random() * G.vw; }
      cx.globalAlpha = .25 + .35 * Math.sin(time + p.p) ** 2;
      cx.fillStyle = `hsl(${S.hue} 90% 85%)`;
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
    }
  }

  /* ---------- 15. Loop & Init ---------- */
  const tick = (t) => {
    time = t;
    checkBoot();
    apply();
    if (!reduce) drawDust();
  };
  gsap.ticker.add(tick);

  function init() {
    measure();
    buildSlabs();
    sizeDust();
    if (FILM) buildFilm(); else { buildTimeline(); buildSectionTriggers(); }
    setColor('natural');
    if (reduce) drawDust();
  }
  let rT;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { measure(); sizeDust(); buildTimeline(); ScrollTrigger.refresh(); if (current) focusFeature(current) || focusFeature(current); }, 150);
  });
  init();

  // Für Tests/Debugging
  window.__fold = { S, F, focusFeature, scrollToSection };

  /* ---------- 16. Filmmodus: Choreografie des Videos ---------- */
  function buildFilm() {
    const ui = $('#film-ui');
    const title = (at, dur, html, cls = '') => {
      const el = document.createElement('div');
      el.className = 'ft ' + cls; el.innerHTML = html; ui.appendChild(el);
      film.fromTo(el, { opacity: 0, y: 40, scale: 1.08, filter: 'blur(16px)', letterSpacing: '.06em' },
                      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', letterSpacing: '-.035em', duration: .7, ease: 'expo.out' }, at)
          .to(el, { opacity: 0, y: -30, filter: 'blur(14px)', duration: .35, ease: 'power2.in' }, at + dur - .35);
    };
    const flash = (at, a = .9) => film.fromTo('#film-flash', { opacity: a }, { opacity: 0, duration: .45, ease: 'power2.out' }, at);
    const film = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } });

    // Start: Gerät fliegt aus der Tiefe ein, Scharnier glüht
    film.set(S, { fold: 0, rx: 18, ry: -75, rz: -8, zoom: .25, sy: .12, hue: 215 }, 0);
    flash(0, 1);
    film.to(S, { zoom: 1.05, ry: -24, rx: 8, rz: 0, duration: 1.8, ease: 'expo.out' }, 0)
        .to(S, { ry: -36, duration: 1, ease: 'sine.inOut' }, 1.8);
    title(.5, 2.1, '<p class="eb">Neu</p><h2 class="ti">iPhone Fold</h2>');

    // Entfalten
    film.to(S, { fold: 1, ry: 0, rx: 4, zoom: 1.08, sy: .1, hue: 255, duration: 1.7, ease: 'power3.inOut' }, 2.7);
    title(2.7, 2, '<h2>Entfalte das<br><span class="grad">Unmögliche.</span></h2>');

    // Holo-OS (Boot startet automatisch), Parallax-Schwenk, Widget-Flip
    film.to(S, { ry: 16, rx: 12, zoom: 1.14, hue: 280, duration: 1.4, ease: 'sine.inOut' }, 4.6)
        .to(S, { ry: -12, rx: 2, duration: 1.5, ease: 'sine.inOut' }, 6.0)
        .call(() => expandCard($('.card--core')), null, 5.6)
        .call(() => collapseCard(), null, 6.9);
    title(4.8, 2.7, '<h2>Ein OS mit <span class="grad">Tiefe.</span></h2>');

    // Features
    film.to(S, { ry: 0, rx: 0, zoom: 1, hue: 220, duration: .6 }, 7.4)
        .call(() => focusFeature('hinge'), null, 7.6);
    flash(7.6, .35);
    title(7.8, 2.1, '<p class="eb">Liquid Hinge</p><h2>Faltet.<br><span class="grad">Ohne Falte.</span></h2><p class="sub">500.000+ Faltzyklen · 0,0 mm Spalt</p>');
    film.call(() => focusFeature('oled'), null, 9.8);
    flash(9.8, .35);
    title(10.0, 2.0, '<p class="eb">Seamless OLED</p><h2>Fünf Schichten.<br><span class="grad">Ein Blatt Glas.</span></h2><p class="sub">7,9″ innen · 1–120 Hz</p>');
    film.call(() => focusFeature('chip'), null, 12.0);
    flash(12.0, .35);
    title(12.2, 1.9, '<p class="eb">Quantum Chip</p><h2>Q1.<br><span class="grad">2 Nanometer.</span></h2><p class="sub">38 TOPS Neural Engine</p>');
    film.call(() => focusFeature(null), null, 14.0);

    // 360°-Drehung mit Farbwechsel
    film.to(S, { ry: 360, rx: 10, zoom: .9, sy: .12, hue: 210, duration: 2.2, ease: 'power2.inOut' }, 14.3)
        .call(() => setColor('blue'), null, 14.6)
        .call(() => setColor('black'), null, 15.2)
        .call(() => setColor('white'), null, 15.8)
        .call(() => setColor('natural'), null, 16.3);
    title(14.4, 2.0, '<h2>Vier Farben.<br><span class="grad">Ganz aus Titan.</span></h2>');

    // Endcard
    film.set(S, { ry: 0 }, 16.55)
        .to(S, { sy: -.16, zoom: .62, ry: -22, rx: 10, duration: 1.2, ease: 'expo.out' }, 16.55)
        .to(S, { ry: 18, duration: 2.4, ease: 'sine.inOut' }, 17.6);
    flash(16.55, .8);
    film.fromTo('#film-end', { opacity: 0, y: 40, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'expo.out' }, 16.8)
        .fromTo('#film-end .pill', { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .8, ease: 'back.out(2)' }, 17.6)
        .to('#film-end .pill', { boxShadow: '0 0 60px 10px rgba(41,151,255,.7)', duration: .6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 18.2)
        .to('#film-black', { opacity: 1, duration: .4, ease: 'power2.in' }, 19.6)
        .set({}, {}, 20);
    // Frame-genaues Rendern: GSAP-Zeit wird extern gesteuert (gsap.updateRoot)
    let base = 0;
    window.__film = {
      duration: film.duration(),
      start: () => film.play(0),
      manual: () => { gsap.ticker.remove(gsap.updateRoot); gsap.ticker.remove(tick); base = gsap.globalTimeline.time(); film.play(0); },
      renderAt: t => { gsap.updateRoot(base + t); tick(t); }
    };
  }
})();
