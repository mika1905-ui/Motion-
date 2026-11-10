// Usage: node scripts/render.js [outDir] [fps] [--stills t1,t2,...]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const args = process.argv.slice(2);
  const outDir = path.resolve(args[0] || 'frames');
  const fps = +(args[1] || 30);
  const si = args.indexOf('--stills');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, '../index.html') + '?render');
  await page.evaluate(() => document.fonts.ready);
  const stage = await page.$('#stage');
  const times = si >= 0 ? args[si + 1].split(',').map(Number)
    : [...Array(Math.round(await page.evaluate(() => DURATION) * fps)).keys()].map(i => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => renderAt(t), times[i]);
    await stage.screenshot({ path: path.join(outDir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
    if (i % 60 === 0) process.stdout.write(`${i}/${times.length}\n`);
  }
  await browser.close();
})();
