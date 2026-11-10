/* ==========================================================================
   App — GSAP motion, parallax, interactions
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!window.gsap) {
    document.body.insertAdjacentHTML('beforeend',
      '<p style="position:fixed;inset:auto 0 24px;text-align:center;color:#d4b483;font:13px Inter,sans-serif;z-index:999">GSAP could not be loaded — please check your internet connection.</p>');
    return;
  }

  /* ───────────────────────────── Build ───────────────────────────── */
  const tower = Scene.buildTower($('#tower'));
  Scene.buildInterior();
  Scene.buildHotspots();

  const towerView = $('#tower-view');
  const interior = $('#interior');
  const stage = $('#stage');
  const tilt = $('#tilt');
  const scene = $('#scene');
  const camera = $('#camera');

  let state = 'intro'; // intro | tower | entering | interior | leaving | tour
  let enterTl = null;
  let tourTl = null;

  gsap.defaults({ ease: 'power3.out' });
  gsap.set(tilt, { transformPerspective: 1600 });
  gsap.set('.ui-in', { autoAlpha: 0, y: 28 });
  if (reduceMotion) gsap.globalTimeline.timeScale(2);

  /* ───────────────────────────── Dust motes in the sunbeam ───────────────────────────── */
  (function dust() {
    const layer = $('#l-dust');
    const n = finePointer ? 26 : 14;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      d.className = 'dust';
      const size = 1 + Math.random() * 2.4;
      d.style.width = d.style.height = size + 'px';
      layer.appendChild(d);
      const map = () => Scene.sliceMap(layer);
      const [x, y] = map()(700 + Math.random() * 700, 250 + Math.random() * 550);
      gsap.set(d, { x, y, opacity: 0 });
      const drift = () => {
        gsap.to(d, {
          x: '+=' + gsap.utils.random(-80, 80), y: '+=' + gsap.utils.random(-60, 40),
          opacity: gsap.utils.random(0.15, 0.7), duration: gsap.utils.random(5, 10), ease: 'sine.inOut',
          onComplete: drift
        });
      };
      gsap.delayedCall(Math.random() * 3, drift);
    }
  })();

  /* ───────────────────────────── Ambient motion ───────────────────────────── */
  gsap.to('#sun', { y: 46, duration: 40, ease: 'sine.inOut', repeat: -1, yoyo: true });
  gsap.to('#l-clouds > svg', { x: -90, duration: 60, ease: 'sine.inOut', repeat: -1, yoyo: true });
  const scanTl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
    .fromTo('#scanline', { y: 0, opacity: 0 }, { y: -tower.topZ, duration: 5.5, ease: 'power1.inOut' })
    .to('#scanline', { opacity: 1, duration: 0.6, ease: 'none' }, 0)
    .to('#scanline', { opacity: 0, duration: 0.8, ease: 'none' }, 4.7);
  scanTl.pause();

  /* ───────────────────────────── Intro ───────────────────────────── */
  const facesAndLines = $$('#floors .face, #floors .slab, #floors .mull');
  const introTl = gsap.timeline({
    delay: 0.15,
    onComplete() {
      gsap.set(facesAndLines, { clearProps: 'strokeDasharray,strokeDashoffset' });
      state = 'tower';
      scanTl.play();
    }
  });
  introTl
    .from('#topbar', { autoAlpha: 0, y: -16, duration: 1 }, 0)
    .from('#grid', { opacity: 0, duration: 1.6, ease: 'power1.out' }, 0)
    .from('#tower-shadow', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 1.8 }, 0.2)
    .fromTo(facesAndLines, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: { amount: 1.1, from: 'start' } }, 0.2)
    .from('#floors .floor', { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.2)
    .from('#floors .face', { fillOpacity: 0, duration: 1.2, ease: 'power1.out', stagger: 0.02 }, 0.8)
    .from('#floors .pane', { fillOpacity: 0, duration: 1, stagger: { amount: 0.8, from: 'random' } }, 1.4)
    .from('#ph-body .face', { stroke: '#ffffff', duration: 1.4 }, 1.6)
    .from('#labels .label', { opacity: 0, x: -14, duration: 0.9, stagger: 0.06 }, 1.1)
    .from('#tower-copy .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0.5)
    .from('#tower-copy .fade', { autoAlpha: 0, y: 22, duration: 1.1, stagger: 0.1 }, 0.9);

  /* ───────────────────────────── Pointer, cursor & parallax ───────────────────────────── */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, last: 0 };
  const cursor = $('#cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.18, ease: 'power3.out' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.18, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    cx(e.clientX); cy(e.clientY);
    if (state === 'tour') return;
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    ptr.last = performance.now();
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const hit = e.target.closest('button, a, [role="button"], .label');
    cursor.classList.toggle('is-active', !!hit);
  });

  const layers = $$('.layer').map((el) => ({
    d: parseFloat(el.dataset.depth) * (reduceMotion ? 0.3 : 1),
    sx: gsap.quickSetter(el, 'x', 'px'),
    sy: gsap.quickSetter(el, 'y', 'px')
  }));
  const tiltX = gsap.quickSetter(tilt, 'rotationX', 'deg');
  const tiltY = gsap.quickSetter(tilt, 'rotationY', 'deg');

  gsap.ticker.add((time) => {
    // Idle auto-drift keeps the "ad" alive when nobody touches the mouse
    if (state !== 'tour' && performance.now() - ptr.last > 3500) {
      ptr.tx = Math.sin(time * 0.22) * 0.55;
      ptr.ty = Math.cos(time * 0.17) * 0.22;
    }
    const k = 1 - Math.pow(1 - 0.06, gsap.ticker.deltaRatio());
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;

    if (state === 'tower' || state === 'intro') {
      tiltY(ptr.x * 7);
      tiltX(-ptr.y * 4);
    }
    if (state !== 'tower' && state !== 'intro') {
      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        l.sx(-ptr.x * l.d);
        l.sy(-ptr.y * l.d * 0.5);
      }
    }
  });

  /* ───────────────────────────── Tower interactions ───────────────────────────── */
  function setHover(id, on) {
    const f = $('#floor-' + id), l = $('#label-' + id);
    if (f) f.classList.toggle('is-hover', on);
    if (l) l.classList.toggle('is-hover', on);
  }
  $$('#floors .floor, #labels .label').forEach((el) => {
    const id = el.dataset.id;
    el.addEventListener('pointerenter', () => setHover(id, true));
    el.addEventListener('pointerleave', () => setHover(id, false));
    el.addEventListener('focus', () => setHover(id, true));
    el.addEventListener('blur', () => setHover(id, false));
    el.addEventListener('click', () => onFloor(id));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFloor(id); }
    });
  });
  $('[data-enter]').addEventListener('click', () => onFloor('ph'));
  $('[data-enter]').addEventListener('pointerenter', () => setHover('ph', true));
  $('[data-enter]').addEventListener('pointerleave', () => setHover('ph', false));

  function onFloor(id) {
    if (state === 'intro') { introTl.progress(1); }
    if (state !== 'tower') return;
    if (id === 'ph') return enterPenthouse();
    const f = Scene.FLOORS.find((x) => x.id === id);
    const msg = f.status === 'amenity'
      ? `<b>${f.name}</b> — Residents' lobby, concierge & spa. Select the Penthouse.`
      : `<b>${f.name}</b> — ${f.status}. Only the Penthouse is currently available.`;
    toast(msg);
    gsap.fromTo('#floor-' + id, { x: 0 }, { x: 4, duration: 0.07, repeat: 5, yoyo: true, ease: 'sine.inOut', clearProps: 'x' });
  }

  function toast(html) {
    const t = $('#toast');
    t.innerHTML = html;
    gsap.killTweensOf(t);
    gsap.timeline()
      .fromTo(t, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' })
      .to(t, { autoAlpha: 0, y: 8, duration: 0.5, ease: 'power2.in' }, 2.8);
  }

  /* ───────────────────────────── THE transition ───────────────────────────── */
  const priceObj = { v: 0 };
  const priceEl = $('#price');
  const renderPrice = () => { priceEl.textContent = '$' + priceObj.v.toFixed(1) + 'M'; };

  function enterPenthouse() {
    state = 'entering';
    scanTl.pause();
    setHover('ph', false);
    if (enterTl) enterTl.kill();

    // Neutralise tilt so the measured rect matches the zoom target exactly
    gsap.set(tilt, { rotationX: 0, rotationY: 0 });
    gsap.set(stage, { x: 0, y: 0, scale: 1 });

    const vw = window.innerWidth, vh = window.innerHeight;
    const sr = stage.getBoundingClientRect();
    const pr = $('#ph-body').getBoundingClientRect();
    const pcx = pr.left + pr.width / 2, pcy = pr.top + pr.height / 2;
    const s1 = Math.min((vw * 0.62) / pr.width, (vh * 0.46) / pr.height);
    const w1 = pr.width * s1, h1 = pr.height * s1;
    const it = Math.max(0, (vh - h1) / 2), il = Math.max(0, (vw - w1) / 2);
    // Clip is driven through a proxy: browsers normalise inset() shorthands,
    // which would break direct string interpolation.
    const clip = { t: it, l: il, r: 28 };
    const applyClip = () => {
      interior.style.clipPath = `inset(${clip.t.toFixed(1)}px ${clip.l.toFixed(1)}px round ${clip.r.toFixed(1)}px)`;
    };
    applyClip();

    gsap.set(stage, { transformOrigin: `${pcx - sr.left}px ${pcy - sr.top}px` });
    gsap.set(scene, { scale: 1.32, transformOrigin: '50% 50%' });
    ptr.x = ptr.tx; ptr.y = ptr.ty; // no parallax jump on reveal

    enterTl = gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      onComplete() { state = 'interior'; },
      onReverseComplete() {
        state = 'tower';
        gsap.set(stage, { clearProps: 'transform' });
        scanTl.restart();
      }
    });

    enterTl
      // 1 · Clear the stage
      .to('#tower-copy > *, #labels .label, #topbar nav', { autoAlpha: 0, y: -12, duration: 0.55, ease: 'power2.in', stagger: 0.015 }, 0)
      .to('#grid, #scanline, #tower-shadow', { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0)
      .to('#floors .floor:not(#floor-ph)', { opacity: 0.06, y: 18, duration: 0.9, ease: 'power2.inOut', stagger: { each: 0.04, from: 'end' } }, 0.05)
      .to('#ph-glow', { opacity: 0.9, duration: 0.8, ease: 'power2.out' }, 0.2)
      // 2 · Camera dives towards the penthouse
      .to(stage, { x: vw / 2 - pcx, y: vh / 2 - pcy, scale: s1, duration: 1.45 }, 0.15)
      .to('#ph-body .pane', { fillOpacity: 0.85, duration: 1.1, ease: 'power2.in' }, 0.5)
      // 3 · Morph: the penthouse facade becomes the window into the lounge
      .fromTo(interior, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, 1.38)
      .to(clip, { t: 0, l: 0, r: 0, duration: 1.35, ease: 'expo.inOut', onUpdate: applyClip }, 1.55)
      .to(stage, { scale: s1 * 3.4, duration: 1.4, ease: 'expo.in' }, 1.5)
      .to(towerView, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 2.3)
      .to(scene, { scale: 1, duration: 2.4, ease: 'expo.out' }, 1.45)
      .fromTo('#sweep', { xPercent: -120, opacity: 0 }, { xPercent: 320, opacity: 1, duration: 1.6, ease: 'power2.inOut', immediateRender: false }, 1.7)
      .to('#sweep', { opacity: 0, duration: 0.4 }, 2.9)
      // 4 · Interface settles in
      .to('.ui-in', { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 2.55)
      .fromTo(priceObj, { v: 0 }, { v: 12.5, duration: 1.8, ease: 'expo.out', onUpdate: renderPrice, immediateRender: false }, 2.7)
      .from('.hotspot', { scale: 0, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.12 }, 3.0);
  }

  function leavePenthouse() {
    if (state === 'tour') endTour(true);
    if (state !== 'interior' || !enterTl) return;
    state = 'leaving';
    hideTip();
    enterTl.timeScale(1.35).reverse();
  }

  $('#btn-back').addEventListener('click', leavePenthouse);

  /* ───────────────────────────── Hotspot tooltip ───────────────────────────── */
  const tip = $('#tip');
  function showTip(el) {
    const r = el.getBoundingClientRect();
    $('.tip-t', tip).textContent = el.dataset.title;
    $('.tip-d', tip).textContent = el.dataset.text;
    const left = Math.min(window.innerWidth - 256, Math.max(16, r.left + r.width / 2 + 18));
    const top = Math.max(16, r.top - 10);
    gsap.set(tip, { x: left, y: top });
    gsap.to(tip, { autoAlpha: 1, y: top - 6, duration: 0.45, ease: 'expo.out', overwrite: true });
  }
  function hideTip() { gsap.to(tip, { autoAlpha: 0, duration: 0.25, overwrite: true }); }
  $$('.hotspot').forEach((h) => {
    h.addEventListener('pointerenter', () => showTip(h));
    h.addEventListener('pointerleave', hideTip);
    h.addEventListener('focus', () => showTip(h));
    h.addEventListener('blur', hideTip);
    h.addEventListener('click', () => showTip(h));
  });

  /* ───────────────────────────── Virtual tour ───────────────────────────── */
  const TOUR = [
    { hs: 0, title: 'Panoramic glazing', text: '6.2 m of floor-to-ceiling glass, facing the sunset.', at: { x: 0.35, y: -0.45 }, zoom: 1.07 },
    { hs: 1, title: 'Skyline, uninterrupted', text: 'Protected air rights — the view is yours, forever.', at: { x: -0.9, y: -0.1 }, zoom: 1.12 },
    { hs: 2, title: 'The Lounge', text: 'Bespoke walnut & bouclé by Atelier Aurum.', at: { x: 0.1, y: 0.6 }, zoom: 1.1 },
    { hs: 3, title: 'Golden hour, every day', text: 'West-facing. Sunsets are part of the floor plan.', at: { x: -0.4, y: -0.3 }, zoom: 1.05 }
  ];

  function startTour() {
    if (state !== 'interior') return;
    state = 'tour';
    hideTip();
    const hs = $$('.hotspot');
    tourTl = gsap.timeline({ onComplete: () => endTour() });
    tourTl
      .to('.ui-in', { autoAlpha: 0, y: 16, duration: 0.6, ease: 'power2.in', stagger: 0.03 }, 0)
      .to('#tour-bar', { autoAlpha: 1, duration: 0.6 }, 0.3)
      .fromTo('#tour-progress', { scaleX: 0 }, { scaleX: 1, duration: TOUR.length * 3.6, ease: 'none' }, 0.4);

    TOUR.forEach((s, i) => {
      const t = 0.4 + i * 3.6;
      tourTl
        .to(ptr, { tx: s.at.x, ty: s.at.y, duration: 3.2, ease: 'sine.inOut' }, t)
        .to(camera, { scale: s.zoom, duration: 3.4, ease: 'sine.inOut' }, t)
        .call(() => {
          $('#tour-step').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(TOUR.length).padStart(2, '0');
          $('#tour-title').textContent = s.title;
          $('#tour-text').textContent = s.text;
          hs.forEach((h, j) => h.classList.toggle('is-active', j === s.hs));
        }, null, t)
        .fromTo('#tour-ui', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', immediateRender: false }, t + 0.2)
        .fromTo('#tour-title', { letterSpacing: '0.04em' }, { letterSpacing: '-0.03em', duration: 2.2, ease: 'expo.out', immediateRender: false }, t + 0.2)
        .to('#tour-ui', { autoAlpha: 0, y: -16, duration: 0.6, ease: 'power2.in' }, t + 2.9);
    });
  }

  function endTour(instant) {
    if (!tourTl) return;
    tourTl.kill();
    tourTl = null;
    $$('.hotspot').forEach((h) => h.classList.remove('is-active'));
    gsap.to('#tour-ui, #tour-bar', { autoAlpha: 0, duration: instant ? 0 : 0.4, overwrite: true });
    gsap.to(camera, { scale: 1, duration: instant ? 0 : 1.6, ease: 'expo.inOut' });
    gsap.to('.ui-in', { autoAlpha: 1, y: 0, duration: instant ? 0 : 1, ease: 'expo.out', stagger: instant ? 0 : 0.06, delay: instant ? 0 : 0.3 });
    ptr.last = performance.now();
    state = 'interior';
  }

  $('#btn-tour').addEventListener('click', startTour);
  $('#btn-tour-end').addEventListener('click', () => endTour());

  /* ───────────────────────────── Booking ───────────────────────────── */
  const booking = $('#booking');
  const panel = $('.booking-panel');
  const sel = { date: null, time: null };

  (function chips() {
    const days = $('#date-chips');
    const d0 = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.dataset.value = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      b.innerHTML = `<small>${d.toLocaleDateString('en-US', { weekday: 'short' })}</small>${d.getDate()}`;
      days.appendChild(b);
    }
    const times = $('#time-chips');
    [['10:00', 'Morning'], ['14:00', 'Afternoon'], ['17:30', 'Dusk'], ['19:40', 'Sunset']].forEach(([t, l]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.dataset.value = t;
      b.innerHTML = `<small>${l}</small>${t}`;
      times.appendChild(b);
    });
    const bind = (wrap, key) => wrap.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      $$('.chip', wrap).forEach((x) => x.classList.toggle('is-active', x === c));
      sel[key] = c.dataset.value;
    });
    bind(days, 'date'); bind(times, 'time');
    days.firstElementChild.click(); times.lastElementChild.click();
  })();

  function openBooking() {
    if (state === 'tour') endTour();
    $('#booking-form-wrap').classList.remove('hidden');
    $('#booking-done').classList.add('hidden');
    gsap.set('.done-circle, .done-check', { strokeDashoffset: 1 });
    gsap.timeline()
      .set(booking, { autoAlpha: 1 })
      .fromTo('.booking-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .fromTo(panel, { y: 40, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'expo.out' }, 0.05)
      .from('#booking-form-wrap > *, #booking-form > *', { y: 14, autoAlpha: 0, duration: 0.7, stagger: 0.04, ease: 'expo.out', clearProps: 'all' }, 0.2);
    setTimeout(() => $('input[name="name"]', booking).focus({ preventScroll: true }), 400);
  }
  function closeBooking() {
    gsap.timeline()
      .to(panel, { y: 24, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0)
      .to('.booking-backdrop', { opacity: 0, duration: 0.4 }, 0.1)
      .set(booking, { autoAlpha: 0 });
  }
  $$('[data-open-booking]').forEach((b) => b.addEventListener('click', openBooking));
  $$('[data-close-booking]').forEach((b) => b.addEventListener('click', closeBooking));

  $('#booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('input[name="name"]', booking);
    const email = $('input[name="email"]', booking);
    let ok = true;
    [[name, name.value.trim().length > 1], [email, /\S+@\S+\.\S+/.test(email.value)]].forEach(([el, valid]) => {
      el.parentElement.classList.toggle('is-error', !valid);
      if (!valid) { ok = false; gsap.fromTo(el, { x: 0 }, { x: 5, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' }); }
    });
    if (!ok) return;
    const first = name.value.trim().split(' ')[0];
    $('#booking-summary').textContent = `${sel.date}, ${sel.time} — see you there, ${first}.`;
    gsap.timeline()
      .to('#booking-form-wrap', { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power2.in' })
      .add(() => {
        $('#booking-form-wrap').classList.add('hidden');
        gsap.set('#booking-form-wrap', { clearProps: 'all' });
        $('#booking-done').classList.remove('hidden');
      })
      .from('#booking-done > *:not(svg)', { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out', clearProps: 'all' })
      .to('.done-circle', { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, '<')
      .to('.done-check', { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
  });

  /* ───────────────────────────── Misc ───────────────────────────── */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (booking.style.visibility === 'inherit' || gsap.getProperty(booking, 'autoAlpha') > 0) return closeBooking();
    if (state === 'tour') return endTour();
    if (state === 'interior') return leavePenthouse();
  });

  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      Scene.placeHotspots();
      // Rebuild the morph so it stays pixel-accurate after a resize
      if (state === 'interior' && enterTl) {
        enterTl.progress(1).kill();
        enterTl = null;
        state = 'interior';
      }
    }, 150);
  });
  // After a resize inside the penthouse the original zoom path is stale:
  // fall back to a clean cross-fade back to the tower.
  $('#btn-back').addEventListener('click', () => {
    if (state !== 'interior' || enterTl) return;
    state = 'leaving';
    gsap.timeline({
      onComplete() {
        gsap.set(stage, { clearProps: 'transform' });
        gsap.set('#floors .floor', { opacity: 1, y: 0 });
        gsap.set('#ph-body .pane', { fillOpacity: 0.34 });
        gsap.set('#ph-glow', { opacity: 0 });
        gsap.set('.ui-in', { autoAlpha: 0, y: 28 });
        state = 'tower';
        scanTl.restart();
      }
    })
      .to('.ui-in', { autoAlpha: 0, duration: 0.4 })
      .set(stage, { clearProps: 'transform' })
      .set(towerView, { autoAlpha: 1 })
      .set('#tower-copy > *, #labels .label, #topbar nav, #grid, #scanline, #tower-shadow', { autoAlpha: 1, y: 0 })
      .to(interior, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' });
  });

  const clock = $('#clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 15000);
})();
