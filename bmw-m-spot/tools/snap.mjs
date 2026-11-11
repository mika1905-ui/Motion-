// Einzelne Frames als PNG speichern: node tools/snap.mjs outdir t1 t2 ...
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [out, ...times] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('PAGEERROR', e.message));
p.on('console', m => console.log('console:', m.text()));
await p.goto('file://' + root + '/index.html?render');
await p.evaluate(() => window.__ready);
for (const t of times) {
  const d = await p.evaluate(t => { renderAt(+t); return document.getElementById('c').toDataURL('image/png'); }, t);
  writeFileSync(`${out}/f_${t}.png`, Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
