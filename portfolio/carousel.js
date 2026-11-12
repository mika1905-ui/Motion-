/* 3D-Projektkarussell im Hero: Swipen/Ziehen dreht den Ring, Pfeile & Tastatur ebenso,
   Tippen auf die vordere Karte öffnet das Projekt. */
(() => {
  const host = document.getElementById('ring');
  if (!host) return;
  const P = window.PROJECTS || [], B = window.BRANCHEN || [];
  const { esc } = window.SITE;
  const bName = id => (B.find(b => b.id === id) || {}).name || '';
  const kindName = { spot: 'Werbespot', web: 'Website', bot: 'Chatbot' };
  const items = P.map(p => ({ id: p.id, title: p.title, sub: p.sub, color: p.color, kicker: `${bName(p.branche)} · ${kindName[p.kind] || ''}`,
      video: p.kind === 'spot' ? p.video : null, poster: p.ring || (p.kind === 'spot' ? p.poster : (p.mobile || p.images[0])), wide: !!p.wide }));
  const N = items.length, STEP = 360 / N;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  host.innerHTML = `
    <div class="ring-stage"><div class="ring-track">
      ${items.map((it, i) => `<button class="ring-card${it.wide ? ' wide' : ''}" style="--c:${it.color}" data-i="${i}" tabindex="-1" aria-label="${esc(it.title)} – Projekt öffnen">
        <img src="${esc(it.poster)}" alt="" loading="eager" decoding="async" draggable="false">
        ${it.video ? `<video muted loop playsinline preload="none" data-src="${esc(it.video)}"></video>` : ''}
        <span class="shade" aria-hidden="true"></span>
      </button>`).join('')}
    </div></div>
    <div class="ring-ui">
      <button class="ring-arrow" data-dir="-1" aria-label="Vorheriges Projekt">‹</button>
      <div class="ring-label" aria-live="polite"><small></small><b></b><span></span></div>
      <button class="ring-arrow" data-dir="1" aria-label="Nächstes Projekt">›</button>
    </div>
    <p class="ring-hint">← Wischen zum Drehen · Tippen zum Öffnen →</p>`;

  const stage = host.querySelector('.ring-stage'), track = host.querySelector('.ring-track');
  const cards = [...host.querySelectorAll('.ring-card')];
  const lab = host.querySelector('.ring-label');
  let rot = 0, vel = 0, target = 0, dragging = false, moved = 0, lastX = 0, lastT = 0, front = -1, idle = 0, radius = 0;

  const layout = () => {
    const w = cards[0].offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.08);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${i * STEP}deg) translateZ(${radius}px)`; });
    track.style.setProperty('--r', radius + 'px');
  };
  const norm = a => ((a % 360) + 540) % 360 - 180;
  // only touch the DOM when the ring actually moved; darkening via a composited overlay (no CSS filter → no repaints)
  const shades = cards.map(c => c.querySelector('.shade'));
  const prev = cards.map(() => ({ o: -1, d: -1, pe: null }));
  let lastRot = NaN;
  const apply = () => {
    if (Math.abs(rot - lastRot) < 0.01) return;
    lastRot = rot;
    track.style.transform = `translateZ(${-radius}px) rotateY(${rot.toFixed(3)}deg)`;
    let best = 0, bd = 999;
    cards.forEach((c, i) => {
      const a = Math.abs(norm(i * STEP + rot));
      const o = a > 120 ? 0 : +(1 - Math.max(0, a - 30) / 110).toFixed(2);
      const d = +(Math.min(a, 90) / 160).toFixed(2);
      const pe = a > 100 ? 'none' : '';
      const p = prev[i];
      if (p.o !== o) { c.style.opacity = o; c.style.visibility = o ? '' : 'hidden'; p.o = o; }
      if (p.d !== d) { shades[i].style.opacity = d; p.d = d; }
      if (p.pe !== pe) { c.style.pointerEvents = pe; p.pe = pe; }
      if (a < bd) { bd = a; best = i; }
    });
    if (best !== front) setFront(best);
  };
  const setFront = i => {
    if (front >= 0) { const v = cards[front].querySelector('video'); if (v) v.pause(); cards[front].classList.remove('front'); cards[front].tabIndex = -1; }
    front = i; const c = cards[i], it = items[i];
    c.classList.add('front'); c.tabIndex = 0;
    lab.querySelector('small').textContent = it.kicker; lab.querySelector('b').textContent = it.title; lab.querySelector('span').textContent = it.sub;
    lab.style.setProperty('--c', it.color);
    const v = c.querySelector('video');
    if (v && !reduce && !document.documentElement.classList.contains('still')) {
      if (!v.src) v.src = v.dataset.src;
      v.play().then(() => c.classList.add('playing')).catch(() => {});
    }
  };
  const goTo = i => { target = -i * STEP; const d = norm(target - rot); target = rot + d; vel = 0; idle = performance.now(); };
  const step = dir => goTo(((front + dir) % N + N) % N);

  // animation loop: inertia while free, spring to snap target
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(48, now - last) / 16.67; last = now;
    if (!dragging) {
      if (Math.abs(vel) > 0.05) { rot += vel * dt; vel *= Math.pow(0.93, dt); target = Math.round(rot / STEP) * STEP; }
      else { vel = 0; rot += (target - rot) * Math.min(1, 0.12 * dt); }
      // autoplay when idle
      if (!reduce && !document.documentElement.classList.contains('still') && now - idle > 5000 && visible && !document.hidden) {
        idle = now; step(1);
      }
    }
    apply();
    // sleep when the ring is off-screen or the tab is hidden; wake on interaction / visibility
    if (visible && !document.hidden) requestAnimationFrame(tick); else running = false;
  };
  let running = false;
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) wake(); });

  // pointer / touch
  stage.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); vel = 0; idle = lastT;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, now = performance.now();
    moved += Math.abs(dx);
    const k = 360 / (radius * 2 * Math.PI) * 1.1;
    rot += dx * k; vel = dx * k / Math.max(1, (now - lastT) / 16.67) * 0.9;
    lastX = e.clientX; lastT = now;
  });
  const end = e => {
    if (!dragging) return; dragging = false; idle = performance.now();
    if (moved < 8) {
      const el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest('.ring-card');
      if (c) activate(+c.dataset.i);
      vel = 0; target = Math.round(rot / STEP) * STEP;
    } else { target = Math.round((rot + vel * 12) / STEP) * STEP; }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { dragging = false; target = Math.round(rot / STEP) * STEP; });

  const activate = i => {
    if (i !== front) { goTo(i); return; }
    const it = items[i];
    const v = cards[i].querySelector('video'); if (v) v.pause();
    const fake = document.createElement('button'); fake.dataset.project = it.id; fake.hidden = true;
    document.body.appendChild(fake); fake.click(); fake.remove();
  };
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); cards[front].focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); cards[front].focus(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(front); }
  });
  host.querySelectorAll('.ring-arrow').forEach(b => b.addEventListener('click', () => step(+b.dataset.dir)));
  // keep wheel/trackpad horizontal swipes
  stage.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); rot -= e.deltaX * 0.15; target = Math.round(rot / STEP) * STEP; idle = performance.now(); } }, { passive: false });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); const v = cards[front] && cards[front].querySelector('video'); if (v) { if (visible && !reduce) v.play().catch(() => {}); else v.pause(); } }, { threshold: .2 }).observe(host);
  addEventListener('resize', () => { layout(); lastRot = NaN; apply(); });
  layout(); apply(); idle = performance.now(); wake();
})();
