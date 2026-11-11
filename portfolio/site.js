/* Gemeinsame Logik aller Seiten: Navigation (Apple-Stil mit Flyouts), Footer,
   Projekt-Karten & -Details, Video-Lightbox, Formulare (Web3Forms), Terminbuchung. */
(() => {
const C = window.CONFIG || {};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = document.body.dataset.page || '';
const euro = n => n == null ? 'auf Anfrage' : n.toLocaleString('de-DE') + ' €';
window.SITE = { esc, euro, $, $$ };

/* ───────── header ───────── */
const B = window.BRANCHEN || [], P = window.PROJECTS || [];
const count = id => P.filter(p => p.branche === id).length;
const NAV = [
  { href: 'arbeiten.html', label: 'Arbeiten', key: 'arbeiten', flyout: {
      head: 'Arbeiten nach Branche', big: B.slice(0, 5).map(b => [`arbeiten.html#${b.id}`, b.name, count(b.id) ? `${count(b.id)} Projekt${count(b.id) > 1 ? 'e' : ''}` : 'Demnächst']),
      small: [['arbeiten.html', 'Alle Projekte'], ['arbeiten.html#spots', 'Nur Werbespots'], ['arbeiten.html#web', 'Nur Webseiten'], ...B.slice(5).map(b => [`arbeiten.html#${b.id}`, b.name])] } },
  { href: 'leistungen.html', label: 'Leistungen', key: 'leistungen', flyout: {
      head: 'Leistungen', big: [['leistungen.html#spots', 'Werbespots', 'TikTok · Reels · Ads'], ['leistungen.html#web', '3D-Webseiten', 'Landingpages · Markenseiten'], ['leistungen.html#shop', 'Online-Shops', 'Stripe · Shopify'], ['leistungen.html#betreuung', 'Betreuung', 'Hosting · Updates · Content']],
      small: [['leistungen.html#ablauf', 'So läuft ein Projekt'], ['preise.html', 'Preise ansehen'], ['faq.html', 'Häufige Fragen']] } },
  { href: 'preise.html', label: 'Preise', key: 'preise' },
  { href: 'check.html', label: 'Gratis-Check', key: 'check' },
  { href: 'ueber-mich.html', label: 'Über mich', key: 'ueber' },
  { href: 'karriere.html', label: 'Karriere', key: 'karriere' },
  { href: 'faq.html', label: 'FAQ', key: 'faq' },
  { href: 'kontakt.html', label: 'Kontakt', key: 'kontakt' },
];
const header = document.createElement('header');
header.className = 'gnav'; header.id = 'nav';
header.innerHTML = `
  <div class="gnav-bar">
    <a class="logo" href="index.html" aria-label="${esc(C.brand)} – Startseite"><span class="dot"></span><span>${esc(C.brand)}</span></a>
    <nav class="gnav-links" aria-label="Hauptnavigation">
      ${NAV.map((n, i) => `<a href="${n.href}" class="${page === n.key ? 'active' : ''}" ${n.flyout ? `data-fly="${i}" aria-haspopup="true"` : ''}>${n.label}</a>`).join('')}
    </nav>
    <div class="gnav-right">
      <a class="btn btn-sm" href="kontakt.html#termin">Termin buchen</a>
      <button class="burger" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span></button>
    </div>
  </div>
  <div class="flyout" aria-hidden="true">
    ${NAV.map((n, i) => n.flyout ? `<div class="fly-panel" data-panel="${i}">
      <div class="fly-col"><p class="fly-head">${n.flyout.head}</p>${n.flyout.big.map(([h, t, s]) => `<a class="fly-big" href="${h}">${esc(t)}<small>${esc(s || '')}</small></a>`).join('')}</div>
      <div class="fly-col fly-small"><p class="fly-head">Mehr</p>${n.flyout.small.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</div>
    </div>` : '').join('')}
  </div>
  <div class="mnav" hidden>
    ${NAV.map(n => `<div class="mnav-item">${n.flyout ? `<button class="mnav-toggle" aria-expanded="false">${n.label}<i>›</i></button>
      <div class="mnav-sub" hidden><a href="${n.href}">Übersicht</a>${n.flyout.big.concat(n.flyout.small.filter(s => s[0] !== n.href)).map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</div>`
      : `<a href="${n.href}">${n.label}</a>`}</div>`).join('')}
    <a class="btn" href="kontakt.html#termin">Termin vereinbaren</a>
    ${C.whatsapp ? `<a class="btn btn-ghost" href="https://wa.me/${esc(C.whatsapp)}" target="_blank" rel="noopener">Über WhatsApp schreiben</a>` : ''}
    <p class="mnav-note">Antwort innerhalb von ${esc(C.responseTime || '24 Stunden')}</p>
  </div>`;
document.body.prepend(header);
document.body.insertAdjacentHTML('afterbegin', '<div class="blobs" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div><div class="grain" aria-hidden="true"></div><div class="fly-dim"></div>');

// desktop flyouts (hover + keyboard)
const fly = $('.flyout', header), dim = $('.fly-dim');
let flyTimer = null;
const openFly = i => {
  clearTimeout(flyTimer);
  $$('.fly-panel', fly).forEach(p => p.classList.toggle('on', p.dataset.panel == i));
  header.classList.add('fly-open'); fly.setAttribute('aria-hidden', 'false');
};
const closeFly = () => { flyTimer = setTimeout(() => { header.classList.remove('fly-open'); fly.setAttribute('aria-hidden', 'true'); }, 120); };
$$('[data-fly]', header).forEach(a => {
  a.addEventListener('mouseenter', () => openFly(a.dataset.fly));
  a.addEventListener('focus', () => openFly(a.dataset.fly));
});
$$('.gnav-links a:not([data-fly])', header).forEach(a => a.addEventListener('mouseenter', closeFly));
fly.addEventListener('mouseenter', () => clearTimeout(flyTimer));
header.addEventListener('mouseleave', closeFly);
addEventListener('keydown', e => { if (e.key === 'Escape') { header.classList.remove('fly-open'); } });

// mobile menu
const burger = $('.burger', header), mnav = $('.mnav', header);
burger.addEventListener('click', () => {
  const open = mnav.hidden;
  mnav.hidden = !open; header.classList.toggle('m-open', open);
  burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
});
$$('.mnav-toggle', mnav).forEach(b => b.addEventListener('click', () => {
  const sub = b.nextElementSibling; sub.hidden = !sub.hidden; b.setAttribute('aria-expanded', !sub.hidden);
}));
const onScroll = () => header.classList.toggle('solid', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ───────── footer ───────── */
const social = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn']].filter(([k]) => C[k]);
const footer = document.createElement('footer');
footer.className = 'site-foot';
footer.innerHTML = `
  <div class="foot-cta reveal">
    <h2>Bereit für etwas,<br>das man nicht wegscrollt?</h2>
    <div class="foot-cta-btns"><a class="btn btn-big" href="kontakt.html">Projekt anfragen</a><a class="btn btn-ghost" href="kontakt.html#termin">Kostenloses Erstgespräch</a></div>
  </div>
  <div class="foot-grid">
    <div><a class="logo" href="index.html"><span class="dot"></span><span>${esc(C.brand)}</span></a>
      <p class="foot-claim">Werbespots & 3D-Webseiten aus ${esc(C.city)}.<br>${esc(C.region)}.</p>
      ${C.email ? `<a class="foot-mail" href="mailto:${esc(C.email)}">${esc(C.email)}</a>` : ''}<p class="foot-claim">Antwort innerhalb von ${esc(C.responseTime || '24 Stunden')}.</p></div>
    <div><p class="fh">Arbeiten</p>${B.slice(0, 6).map(b => `<a href="arbeiten.html#${b.id}">${esc(b.name)}</a>`).join('')}</div>
    <div><p class="fh">Studio</p><a href="check.html">Gratis-Check</a><a href="leistungen.html">Leistungen</a><a href="preise.html">Preise</a><a href="ueber-mich.html">Über mich</a><a href="ueber-mich.html#team">Team</a><a href="karriere.html">Karriere</a><a href="faq.html">FAQ</a></div>
    <div><p class="fh">Kontakt</p><a href="kontakt.html">Projekt anfragen</a><a href="kontakt.html#termin">Termin buchen</a>${social.map(([k, l]) => `<a href="${esc(C[k])}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>
  </div>
  <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${esc(C.brand)} · ${esc(C.owner)}</span>
    <span class="foot-links"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a><a href="agb.html">AGB</a><a href="bildnachweise.html">Bildnachweise</a><button class="motion-toggle" type="button">Bewegung anhalten</button></span></div>`;
document.body.appendChild(footer);

if (C.whatsapp) {
  document.body.insertAdjacentHTML('beforeend', `<a class="wa-float" href="https://wa.me/${esc(C.whatsapp)}?text=${encodeURIComponent('Hi ' + (C.owner || '').split(' ')[0] + ', ich habe eine Frage zu einem Projekt.')}" target="_blank" rel="noopener" aria-label="WhatsApp schreiben"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z"/></svg></a>`);
}

/* ───────── config bindings ───────── */
$$('[data-cfg]').forEach(el => { const v = C[el.dataset.cfg]; if (v) el.textContent = v; else if (el.dataset.empty) el.textContent = el.dataset.empty; });
$$('[data-if]').forEach(el => { if (!C[el.dataset.if]) el.remove(); });

/* ───────── project cards & detail ───────── */
const bName = id => (B.find(b => b.id === id) || {}).name || '';
window.SITE.projectCard = p => p.kind === 'spot' ? `
  <button class="pcard spot-card${p.wide ? ' wide' : ''} reveal" style="--c:${p.color}" data-project="${p.id}" aria-label="${esc(p.title)} ansehen">
    <span class="pmedia"><video src="${p.video}" poster="${p.poster}" muted loop playsinline preload="none"></video><span class="play" aria-hidden="true">▶</span></span>
    <span class="pinfo"><small>${esc(bName(p.branche))} · Werbespot · ${esc(p.format)}</small><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></span>
  </button>` : `
  <button class="pcard web-card reveal" style="--c:${p.color}" data-project="${p.id}" aria-label="${esc(p.title)} ansehen">
    <span class="pmedia"><span class="pbrowser"><i></i><i></i><i></i></span><img src="${p.images[0]}" alt="" loading="lazy"><img class="pmob" src="${p.mobile}" alt="" loading="lazy"></span>
    <span class="pinfo"><small>${esc(bName(p.branche))} · Website</small><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></span>
  </button>`;
window.SITE.soonCard = b => `
  <a class="soon-card reveal" style="--c:${b.color}" href="kontakt.html?branche=${encodeURIComponent(b.name)}">
    <span class="soon-ico">${b.icon}</span>
    <span class="soon-badge">Demnächst verfügbar</span>
    <b>${esc(b.name)}</b>
    <span>Hier entsteht gerade etwas. Du bist aus dieser Branche? Werde das erste Projekt.</span>
    <span class="soon-link">Projekt anfragen →</span>
  </a>`;

const modal = document.createElement('div');
modal.className = 'pmodal'; modal.hidden = true;
modal.innerHTML = '<div class="pm-box" role="dialog" aria-modal="true"><button class="pm-close" aria-label="Schließen">✕</button><div class="pm-body"></div></div>';
document.body.appendChild(modal);
const openProject = id => {
  const p = P.find(x => x.id === id); if (!p) return;
  const media = p.kind === 'spot'
    ? `<div class="pm-media${p.wide ? ' wide' : ''}"><video src="${p.video}" poster="${p.poster}" controls playsinline autoplay></video></div>`
    : `<div class="pm-media web"><div class="pm-slides">${p.images.map((s, i) => `<img src="${s}" alt="${esc(p.title)} Ansicht ${i + 1}" class="${i ? '' : 'on'}">`).join('')}</div>
       <div class="pm-dots">${p.images.map((_, i) => `<button aria-label="Bild ${i + 1}" class="${i ? '' : 'on'}" data-i="${i}"></button>`).join('')}</div></div>`;
  $('.pm-body', modal).innerHTML = `${media}
    <div class="pm-text" style="--accent:${p.color}">
      <p class="kicker">${esc(bName(p.branche))} · ${p.kind === 'spot' ? 'Werbespot' : 'Website'}</p>
      <h3>${esc(p.title)}</h3><p class="pm-sub">${esc(p.sub)}</p>
      <p>${esc(p.text)}</p>
      <ul class="tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="pm-cta">${p.live ? `<a class="btn btn-accent" href="${p.live}" target="_blank" rel="noopener">Live ansehen ↗</a>` : ''}<a class="btn btn-ghost" href="kontakt.html?projekt=${encodeURIComponent(p.title)}">So etwas anfragen</a></div>
      <p class="note">${esc(p.note || 'Unbeauftragte Spec-Arbeit zur Demonstration. Keine Verbindung zur gezeigten Marke.')}</p>
    </div>`;
  modal.hidden = false; document.body.style.overflow = 'hidden';
  const dots = $$('.pm-dots button', modal), imgs = $$('.pm-slides img', modal);
  dots.forEach(d => d.addEventListener('click', () => { imgs.forEach((im, i) => im.classList.toggle('on', i == d.dataset.i)); dots.forEach(x => x.classList.toggle('on', x === d)); }));
  $('.pm-close', modal).focus();
};
const closeModal = () => { const v = $('video', modal); if (v) v.pause(); modal.hidden = true; $('.pm-body', modal).innerHTML = ''; document.body.style.overflow = ''; };
document.addEventListener('click', e => {
  const c = e.target.closest('[data-project]'); if (c) { e.preventDefault(); openProject(c.dataset.project); return; }
  if (e.target === modal || e.target.closest('.pm-close')) closeModal();
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

/* ───────── generic behaviours ───────── */
window.SITE.refresh = () => {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  $$('.reveal:not(.in)').forEach(el => io.observe(el));
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = $('video', e.target); if (!v) return;
    if (e.isIntersecting && !reduce) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.45 });
  $$('.spot-card:not([data-v])').forEach(el => { el.dataset.v = 1; vio.observe(el); });
  $$('.slides:not([data-s])').forEach(box => {
    box.dataset.s = 1; const imgs = $$('img', box); imgs[0].classList.add('on'); if (reduce) return;
    let i = 0, t = null; const step = () => { imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on'); };
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !t) t = setInterval(step, 2600); if (!e.isIntersecting && t) { clearInterval(t); t = null; } }, { threshold: 0.3 }).observe(box);
  });
};
requestAnimationFrame(() => document.body.classList.add('ready'));

// Apple-style segmented tabs: [data-tabs] container with buttons [data-tab] and panels [data-panel]
window.SITE.tabs = (root, onChange) => {
  const btns = $$('[data-tab]', root.querySelector('.seg') || root);
  const panels = $$('[data-tabpanel]', root);
  const set = id => {
    btns.forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    panels.forEach(p => { p.hidden = p.dataset.tabpanel !== id; });
    move();
    onChange && onChange(id); window.SITE.refresh();
  };
  const move = () => {
    const ind = root.querySelector('.seg-ind'), cur = btns.find(b => b.classList.contains('on'));
    if (ind && cur) { ind.style.width = cur.offsetWidth + 'px'; ind.style.transform = `translateX(${cur.offsetLeft}px)`; }
  };
  btns.forEach(b => b.addEventListener('click', () => set(b.dataset.tab)));
  addEventListener('resize', move); document.fonts && document.fonts.ready.then(move);
  return set;
};

/* ───────── forms → E-Mail (Web3Forms) ───────── */
window.SITE.form = (form, { subject, onDone } = {}) => {
  const status = $('.form-status', form);
  const show = (cls, html) => { status.className = 'form-status ' + cls; status.innerHTML = html; status.hidden = false; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    if (fd.get('botcheck')) return;                       // spam honeypot
    const data = {};
    for (const [k, v] of fd.entries()) { if (k === 'botcheck') continue; data[k] = data[k] ? data[k] + ', ' + v : v; }
    const subj = (typeof subject === 'function' ? subject(data) : subject) || 'Neue Anfrage über die Website';
    const btn = $('button[type=submit]', form);
    if (!C.web3formsKey) {
      // Fallback, solange kein Formular-Schlüssel eingetragen ist: E-Mail-Programm öffnen
      if (!C.email) { show('warn', 'Das Formular ist gleich startklar – die E-Mail-Adresse wird gerade eingerichtet. Bitte versuch es in Kürze noch einmal oder schreib über Instagram.'); return; }
      const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:${C.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
      show('ok', 'Dein E-Mail-Programm öffnet sich mit deiner Anfrage – nur noch auf „Senden“ tippen.');
      return;
    }
    btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Wird gesendet …';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: C.web3formsKey, subject: subj, from_name: C.brand + ' Website', replyto: data.E_Mail || data.email || '', ...data }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || 'Fehler');
      form.reset(); onDone ? onDone() : (location.href = 'danke.html');
    } catch (err) {
      show('err', `Das hat leider nicht geklappt (${esc(err.message)}). Bitte versuch es noch einmal${C.email ? ` oder schreib direkt an <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>` : ''}.`);
    } finally { btn.disabled = false; btn.textContent = btn.dataset.label; }
  });
};

/* ───────── Terminbuchung (Cal.com, 2-Klick-Lösung) ───────── */
window.SITE.booking = el => {
  if (!el) return;
  if (!C.calLink) {
    el.innerHTML = `<div class="soon-card static" style="--c:#d4ff3a"><span class="soon-ico">◷</span><span class="soon-badge">Demnächst verfügbar</span>
      <b>Online-Terminbuchung</b><span>Bald kannst du hier direkt einen freien Termin für dein kostenloses Erstgespräch wählen. Bis dahin: schick einfach eine Anfrage – ich melde mich mit Terminvorschlägen.</span>
      <a class="soon-link" href="#anfrage">Zur Anfrage →</a></div>`;
    return;
  }
  el.innerHTML = `<div class="consent-box"><span class="soon-ico">◷</span><b>Kostenloses Erstgespräch buchen</b>
    <p>Wähle einen freien Termin (15–30 Min., per Video oder Telefon). Beim Laden des Kalenders werden Daten an Cal.com übertragen – mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>
    <button class="btn">Kalender laden</button></div>`;
  $('button', el).addEventListener('click', () => {
    el.innerHTML = `<iframe class="cal-frame" src="https://cal.com/${esc(C.calLink)}?embed=true&theme=dark&layout=month_view" title="Termin buchen" loading="lazy"></iframe>`;
  });
};

/* ───────── Bewegung anhalten ───────── */
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const applyMotion = still => {
  document.documentElement.classList.toggle('still', still);
  $$('video').forEach(v => { if (still) v.pause(); });
  $$('.motion-toggle').forEach(b => b.textContent = still ? 'Bewegung abspielen' : 'Bewegung anhalten');
};
applyMotion(store.get('fluxe-still') === '1');
document.addEventListener('click', e => { if (e.target.closest('.motion-toggle')) { const s = !document.documentElement.classList.contains('still'); store.set('fluxe-still', s ? '1' : '0'); applyMotion(s); } });

/* ───────── Auswahl für die Anfrage (Katalog „+“) ───────── */
const getSel = () => { try { return JSON.parse(store.get('fluxe-auswahl') || '[]'); } catch { return []; } };
const updSel = () => {
  const sel = getSel();
  $$('[data-add]').forEach(b => { const on = sel.includes(b.dataset.add); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); const l = b.querySelector('.lbl'); if (l) l.textContent = on ? 'In der Anfrage' : 'Zur Anfrage'; });
  let bar = $('.sel-bar');
  if (!sel.length || page === 'kontakt') { if (bar) bar.hidden = true; return; }
  if (!bar) { bar = document.createElement('a'); bar.className = 'sel-bar'; bar.href = 'kontakt.html#anfrage'; document.body.appendChild(bar); }
  bar.hidden = false;
  bar.innerHTML = `<b>${sel.length}</b> ${sel.length > 1 ? 'Leistungen' : 'Leistung'} ausgewählt <span>Anfrage senden →</span>`;
};
const setSel = a => { store.set('fluxe-auswahl', JSON.stringify(a)); updSel(); };
window.SITE.selection = { get: getSel, set: setSel, clear: () => setSel([]), update: updSel };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  const sel = getSel(), k = b.dataset.add;
  setSel(sel.includes(k) ? sel.filter(x => x !== k) : [...sel, k]);
});
updSel();

window.SITE.refresh();
})();
