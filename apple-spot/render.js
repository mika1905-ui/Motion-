// Rendert index.html Frame für Frame zu einem MP4 (1920x1080, 30 fps, 13 s).
// Nutzung: node render.js [ausgabe.mp4] [fps] [--vertical]   (--vertical = 1080x1920 TikTok)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const out = args[0] || path.join(__dirname, 'out', 'iphone-spot.mp4');
  const fps = +(args[1] || 30);
  const vert = process.argv.includes('--vertical');
  const [VW,VH] = vert ? [1080,1920] : [1920,1080];
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render=1' + (vert ? '&v=1' : ''));
  await page.evaluate(() => document.fonts.ready);
  const dur = await page.evaluate(() => window.DUR);
  const frames = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('fertig:', out);
})();
