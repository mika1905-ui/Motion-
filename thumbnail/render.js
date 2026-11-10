// Render thumbnail.html -> ../out/thumbnail.png (1280x720, YouTube size).
//   node thumbnail/render.js
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, "thumbnail.html"));
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, "..", "out", "thumbnail.png");
  await page.locator("#thumb").screenshot({ path: out });
  await browser.close();
  console.log(out);
})();
