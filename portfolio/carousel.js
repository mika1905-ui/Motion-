/* Projekt-Reise unter dem Hero: Beim normalen Scrollen fahren die Projekte seitlich durch (Scroll → Wischen),
   der Hintergrund färbt sich in der Farbe des aktuellen Projekts, Branchen-Chips springen direkt zur Branche.
   Ohne Bewegung (prefers-reduced-motion) wird daraus ein normaler Wisch-Slider. */
(() => {
  const host = document.getElementById('pj');
  if (!host) return;
  const P = window.PROJECTS || [], B = window.BRANCHEN || [];
  const { esc } = window.SITE;
  const bOf = id => B.find(b => b.id === id) || { name: '', id };
  const kindName = { spot: 'Werbespot', web: 'Website', bot: 'Chatbot' };
  const short = { 'Gastronomie & Nightlife': 'Gastro', 'Tech & Elektronik': 'Tech', 'Food & Getränke': 'Food', 'Lifestyle & Konsumgüter': 'Lifestyle',
    'Gesundheit & Praxen': 'Gesundheit', 'Mode & Beauty': 'Mode & Beauty', 'Handwerk & Lokales': 'Handwerk', 'Sport & Fitness': 'Sport' };
  const pad = n => String(n).padStart(2, '0');
  const N = P.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Branchen in der Reihenfolge, in der sie im Slider zum ersten Mal auftauchen
  const order = [];
  P.forEach((p, i) => { if (!order.some(o => o.id === p.branche)) order.push({ id: p.branche, first: i, n: 0 }); order.find(o => o.id === p.branche).n++; });

  const media = p => {
    if (p.kind === 'spot') return `<img class="pj-cover" src="${esc(p.poster)}" alt="" loading="lazy" decoding="async" draggable="false">
        <video class="pj-cover" muted loop playsinline preload="none" data-src="${esc(p.video)}"></video>`;
    return `<img class="pj-cover pj-d" src="${esc(p.images[0])}" alt="" loading="lazy" decoding="async" draggable="false">
        <img class="pj-cover pj-m" src="${esc(p.mobile || p.images[0])}" alt="" loading="lazy" decoding="async" draggable="false">
        ${p.mobile ? `<span class="pj-phone pj-d"><img src="${esc(p.mobile)}" alt="" loading="lazy" decoding="async" draggable="false"></span>` : ''}`;
  };

  host.innerHTML = `
    <div class="pj-pin">
      <div class="pj-head">
        <div class="pj-title"><p class="kicker">Projekte</p><h2>Scroll dich <mark>durch</mark>.</h2></div>
        <div class="pj-count" aria-hidden="true"><b>01</b><span>/ ${pad(N)}</span></div>
      </div>
      <div class="pj-chips" role="tablist" aria-label="Nach Branche springen">
        <button class="pj-chip on" type="button" data-to="0" data-all>Alle <i>${N}</i></button>
        ${order.map(o => `<button class="pj-chip" type="button" data-b="${o.id}" data-to="${o.first}" style="--cc:${bOf(o.id).color || '#6A3BFF'}">${esc(short[bOf(o.id).name] || bOf(o.id).name)} <i>${o.n}</i></button>`).join('')}
      </div>
      <div class="pj-view">
        <div class="pj-track">
          ${P.map((p, i) => `<article class="pj-item${p.kind === 'spot' ? (p.wide ? ' is-wide' : ' is-tall') : ''}" style="--c:${p.color}" data-i="${i}">
            <button class="pj-card" type="button" data-project="${p.id}" aria-label="${esc(p.title)} ansehen">${media(p)}<span class="pj-open" aria-hidden="true">Ansehen →</span></button>
            <div class="pj-meta"><span class="pj-num">${pad(i + 1)}</span><div><small>${esc(short[bOf(p.branche).name] || bOf(p.branche).name)} · ${kindName[p.kind] || ''}</small><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></div></div>
          </article>`).join('')}
          <article class="pj-item pj-end" style="--c:#6A3BFF">
            <div class="pj-card pj-endcard"><p>Das war ein Ausschnitt.<br><b>Dein Projekt kommt als Nächstes?</b></p>
              <div><a class="btn" href="kontakt.html">Projekt anfragen</a><a class="btn btn-ghost" href="arbeiten.html">Alle Arbeiten →</a></div></div>
          </article>
        </div>
      </div>
      <div class="pj-bar" aria-hidden="true"><i></i></div>
      <p class="pj-hint" aria-hidden="true">Einfach weiterscrollen ↓</p>
    </div>`;

  const pin = host.querySelector('.pj-pin'), view = host.querySelector('.pj-view'), track = host.querySelector('.pj-track');
  const items = [...host.querySelectorAll('.pj-item')], chips = [...host.querySelectorAll('.pj-chip')], chipBox = host.querySelector('.pj-chips');
  const countEl = host.querySelector('.pj-count b'), bar = host.querySelector('.pj-bar i');
  const pinned = !reduce;
  host.classList.add(pinned ? 'pj-pinned' : 'pj-free');

  const RATIO = matchMedia('(max-width: 700px)').matches ? 0.75 : 0.55; // vertikale Scroll-Pixel pro seitlichem Pixel
  let maxX = 0, dist = 0, x = 0, cur = -1;
  const measure = () => {
    maxX = Math.max(0, track.scrollWidth - view.clientWidth);
    dist = Math.round(maxX * RATIO);
    if (pinned) host.style.height = `calc(100svh + ${dist}px)`;
    update(true);
  };
  const top = () => host.getBoundingClientRect().top + scrollY;
  const posX = () => pinned ? Math.min(maxX, Math.max(0, (scrollY - top()) / (dist || 1) * maxX)) : view.scrollLeft;

  const play = (i, on) => {
    const v = items[i] && items[i].querySelector('video'); if (!v) return;
    if (on && !document.documentElement.classList.contains('still') && !reduce) {
      if (!v.src) v.src = v.dataset.src;
      v.play().then(() => items[i].classList.add('playing')).catch(() => {});
    } else { v.pause(); }
  };
  const setCur = i => {
    if (i === cur) return;
    if (cur >= 0) { items[cur].classList.remove('cur'); play(cur, false); }
    cur = i; const it = items[i]; it.classList.add('cur');
    const p = P[i];
    host.style.setProperty('--hc', p ? p.color : '#6A3BFF');
    countEl.textContent = pad(Math.min(N, i + 1));
    chips.forEach(c => c.classList.toggle('on', p ? c.dataset.b === p.branche : c.hasAttribute('data-all')));
    const on = chips.find(c => c.classList.contains('on'));
    if (on) chipBox.scrollTo({ left: on.offsetLeft - chipBox.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
    if (visible) play(i, true);
  };
  const update = force => {
    x = posX();
    if (pinned) track.style.transform = `translate3d(${-x.toFixed(1)}px,0,0)`;
    bar.style.transform = `scaleX(${maxX ? (x / maxX).toFixed(4) : 0})`;
    const mid = x + view.clientWidth * 0.42;
    let best = 0, bd = 1e9;
    items.forEach((it, i) => { const c = it.offsetLeft + it.offsetWidth / 2, d = Math.abs(c - mid); if (d < bd) { bd = d; best = i; } });
    if (x >= maxX - 2) best = items.length - 1;
    if (x <= 2) best = 0;
    if (force) cur = -1;
    setCur(best);
  };

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  if (pinned) addEventListener('scroll', onScroll, { passive: true }); else view.addEventListener('scroll', onScroll, { passive: true });

  // zu einem Projekt springen (Chips)
  const goTo = i => {
    const it = items[i]; if (!it) return;
    const tx = i === 0 ? 0 : Math.min(maxX, Math.max(0, it.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
    if (pinned) scrollTo({ top: top() + tx / (maxX || 1) * dist + 1, behavior: 'smooth' });
    else view.scrollTo({ left: tx, behavior: 'smooth' });
  };
  chips.forEach(c => c.addEventListener('click', () => goTo(+c.dataset.to)));

  // seitliches Wischen / Ziehen / Trackpad bewegt trotzdem mit (übersetzt in Scrollen)
  if (pinned) {
    let sx = 0, moved = 0, down = false;
    view.addEventListener('pointerdown', e => { if (e.button) return; down = true; sx = e.clientX; moved = 0; });
    view.addEventListener('pointermove', e => {
      if (!down) return; const dx = e.clientX - sx; sx = e.clientX; moved += Math.abs(dx);
      if (moved > 4) scrollBy(0, -dx * RATIO * (e.pointerType === 'mouse' ? 1 : 1.6));
    });
    const up = () => { down = false; };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up); view.addEventListener('pointerleave', up);
    view.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    view.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) { e.preventDefault(); scrollBy(0, e.deltaX * RATIO); } }, { passive: false });
    view.addEventListener('dragstart', e => e.preventDefault());
  }

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (cur >= 0) play(cur, visible); }, { threshold: 0.15 }).observe(pin);
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
