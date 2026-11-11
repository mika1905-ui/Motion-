// Rendert den Spot Frame für Frame (deterministisch) und muxt den Soundtrack.
// Aufruf: node tools/render.mjs [fps=60]  ->  out/bmw-m-spot.mp4
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = +(process.argv[2] || 60);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => { console.error('Seitenfehler:', e.message); process.exit(1); });
await page.goto('file://' + root + '/index.html?render');
await page.evaluate(() => window.__ready);
const DUR = await page.evaluate(() => window.DURATION);
const frames = Math.round(DUR * FPS);

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-i', resolve(root, 'audio/soundtrack.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-tune', 'film',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart',
  resolve(root, 'out/bmw-m-spot.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });

for (let f = 0; f < frames; f++) {
  const data = await page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/png'); }, f / FPS);
  const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) process.stdout.write(`\rFrame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
await browser.close();
console.log(`\nfertig: out/bmw-m-spot.mp4 (${frames} Frames @ ${FPS} fps)`);
