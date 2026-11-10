// Rendert den Fold-Filmmodus (fold/index.html?film=1) Frame für Frame.
// Zeit ist komplett virtuell (Playwright-Clock + angehaltene CSS-Animationen) → ruckelfrei.
// Nutzung: node render-fold.js out.mp4 [fps] [startSek] [endSek]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || path.join(__dirname, 'out', 'fold-part.mp4');
  const fps = +(process.argv[3] || 30);
  const t0 = +(process.argv[4] || 0), t1 = process.argv[5] ? +process.argv[5] : null;
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: process.env.LAND ? { width: 960, height: 540 } : { width: 540, height: 960 }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.resolve(__dirname, '../fold/index.html') + '?film=1');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const dur = t1 ?? await page.evaluate(() => window.__film.duration);
  await page.evaluate(() => window.__film.manual());
  const dt = 1000 / fps;
  const step = () => page.evaluate(d => {
    for (const a of document.getAnimations()) { if (a.playState !== 'paused') a.pause(); a.currentTime = (a.currentTime || 0) + d; }
  }, dt);
  const frames = Math.round(dur * fps);
  const f0 = Math.round(t0 * fps);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__film.renderAt(t), (i + 1) / fps);
    await step();
    if (i < f0) continue;
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('fertig', out);
})();
