// Renders the original product images used on the site: node tools/render_images.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site/img/src');
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const jobs = ['original', 'berry', 'mango', 'arctic', 'cherry', 'zero'].map(id => ({ name: `can-${id}`, q: `flavor=${id}&w=1200&h=1800`, w: 1200, h: 1800 }));
jobs.push({ name: 'lineup', q: 'lineup=1&w=2400&h=1500', w: 2400, h: 1500 });
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
  page.on('console', m => console.log('  [page]', m.text()));
  page.on('pageerror', e => console.log('  [error]', e.message));
  await page.goto(`http://localhost:${port}/tools/studio.html?${j.q}`);
  await page.waitForFunction('window.__done === true', null, { timeout: 120000 });
  await page.screenshot({ path: path.join(OUT, j.name + '.png'), omitBackground: true });
  console.log('rendered', j.name);
  await page.close();
}
await browser.close();
server.close();
