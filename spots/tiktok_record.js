// Frame-exact recorder: virtual time for rAF/performance.now, CDP screenshots at 1080x1920.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/frames';
const BASE = 'http://localhost:8767/';
const FPS = 30, DT = 1000 / FPS;

const VT = `(() => {
  let vt = 0; let q = []; let id = 0;
  const realRaf = window.requestAnimationFrame.bind(window);
  window.__vtOn = false;
  window.requestAnimationFrame = cb => { if (!window.__vtOn) return realRaf(cb); q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = i => { q = q.filter(x => x[0] !== i); };
  const pn = performance.now.bind(performance);
  let offset = 0;
  performance.now = () => window.__vtOn ? vt : pn();
  window.__startVT = () => { vt = pn(); window.__vtOn = true; };
  window.__step = ms => { vt += ms; const cbs = q; q = []; for (const [, cb] of cbs) { try { cb(vt); } catch (e) { console.error(e); } } };
})();`;
const NOREVEAL = `.reveal{opacity:1!important;transform:none!important;transition:none!important}`;

async function clip(browser, name, url, plan, opts = {}) {
  const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: opts.dpr || 8 / 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(VT);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(name, 'ERR', e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(BASE + url, { waitUntil: 'load' });
  await p.addStyleTag({ content: NOREVEAL + (opts.css || '') });
  await p.waitForTimeout(opts.settle || 1500);
  if (opts.ready) { for (let i = 0; i < 200 && !(await p.evaluate(opts.ready)); i++) await p.waitForTimeout(150); }
  if (opts.before) await opts.before(p);
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.__startVT());
  let n = 0;
  for (const seg of plan) {
    const frames = Math.round(seg.dur * FPS);
    for (let f = 0; f < frames; f++) {
      const t = frames > 1 ? f / (frames - 1) : 1;
      if (seg.scroll) {
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const [a, b] = seg.scroll;
        await p.evaluate(([a, b, e]) => {
          const R = v => { if (typeof v === 'number') return v; const [sel, fr] = v.split('@'); const el = document.querySelector(sel); return el.offsetTop + (+fr) * (el.offsetHeight - innerHeight); };
          const H = document.documentElement.scrollHeight - innerHeight;
          window.scrollTo({ top: Math.max(0, Math.min(H, R(a) + (R(b) - R(a)) * e)), behavior: 'instant' });
        }, [a, b, seg.ease === false ? t : e]);
      }
      if (seg.at && f === 0) await seg.at(p);
      await p.evaluate(ms => window.__step(ms), DT);
      await p.waitForTimeout(seg.realWait || opts.realWait || 90);   // let the compositor rasterize the new scroll position
      const sy = await p.evaluate(() => scrollY);
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: sy, width: 405, height: 720, scale: 1080 / 405 } });
      fs.writeFileSync(`${dir}/${String(n++).padStart(4, '0')}.jpg`, Buffer.from(r.data, 'base64'));
    }
  }
  console.log(name, n, 'frames');
  await ctx.close();
}

(async () => {
  const which = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const px = sel => p => p.evaluate(s => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY : 0; }, sel);
  const RB = { ready: () => !!document.querySelector('#loader.done'), settle: 500 };
  const P = 'portfolio/';
  const ck = async p => { await p.evaluate(() => { document.querySelectorAll('[data-ck]').forEach((b, i) => { if (!i) b.click(); }); }); await p.waitForTimeout(400); };
  const J = {
    old: () => clip(b, 'old', 'tt/old.html', [{ dur: 0.1 }]),
    vestier: () => clip(b, 'vestier', P + 'projekte/vestier/', [{ dur: 0.3 }, { dur: 2.5, scroll: [0, 2300] }]),
    beschte: () => clip(b, 'beschte', P + 'projekte/beschte/', [{ dur: 0.3 }, { dur: 2.3, scroll: [0, 1900] }], { before: ck }),
    redbull: () => clip(b, 'redbull', P + 'projekte/redbull/', [{ dur: 1.9 }], RB),
    redflav: () => clip(b, 'redflav', P + 'projekte/redbull/', [{ dur: 0.2, scroll: ['#geschmack@0.3', '#geschmack@0.3'] }, { dur: 1.6, at: p => p.evaluate(() => document.getElementById('flavNext').click()) }], { ...RB,
      before: async p => { await p.evaluate(() => scrollTo({ top: document.getElementById('geschmack').offsetTop + (document.getElementById('geschmack').offsetHeight - innerHeight) * 0.3, behavior: 'instant' })); await p.waitForTimeout(5000); } }),
    redtray: () => clip(b, 'redtray', P + 'projekte/redbull/', [{ dur: 0.2, scroll: ['#tray@0.0', '#tray@0.0'] }, { dur: 2.6, scroll: ['#tray@0.0', '#tray@0.92'] }, { dur: 0.5, scroll: ['#tray@0.92', '#tray@0.92'] }], { ...RB,
      before: async p => { await p.evaluate(() => scrollTo({ top: document.getElementById('tray').offsetTop, behavior: 'instant' })); await p.waitForTimeout(5000); } }),
    katerkit: () => clip(b, 'katerkit', P + 'projekte/kater-kit/', [{ dur: 0.5, scroll: [0, 40] }], { before: ck }),
    aurene: () => clip(b, 'aurene', P + 'projekte/aurene/', [{ dur: 0.5, scroll: [0, 40] }], { before: ck, settle: 3000 }),
    schwarzstich: () => clip(b, 'schwarzstich', P + 'projekte/schwarzstich/', [{ dur: 0.5, scroll: [0, 40] }], { before: ck }),
    lumyx: () => clip(b, 'lumyx', '', [{ dur: 0.5, scroll: [0, 40] }], { settle: 2500 }),
    kryo: () => clip(b, 'kryo', 'kryo/', [{ dur: 0.5 }], { settle: 5000, before: async p => { await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /18|ja|bestätig/i.test(x.textContent)); g && g.click(); }); await p.waitForTimeout(3000); } }),
    pablo: () => clip(b, 'pablo', 'kryo/pablo.html', [{ dur: 0.5 }], { settle: 5000, before: async p => { await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /18|ja|bestätig/i.test(x.textContent)); g && g.click(); }); await p.waitForTimeout(3000); } }),
    portfolio: () => clip(b, 'portfolio', P, [{ dur: 2.2 }], { settle: 2500 }),
    chat: () => clip(b, 'chat', P, [{ dur: 0.4, at: p => p.click('.bot-fab') }, { dur: 0.6 },
      { dur: 3.2, realWait: 25, at: async p => { await p.fill('.bot-input input', 'Was kostet eine Website?'); await p.press('.bot-input input', 'Enter'); } }], { settle: 2500 }),
  };
  for (const k of which) await J[k]();
  await b.close();
})();
