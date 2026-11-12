#!/usr/bin/env node
// Renders the HD placeholder art into public/assets/ using a headless browser
// (the drawing code in this folder uses the Canvas 2D API).
//
//   npm run art          -> only writes PNGs that don't exist yet (your art is safe)
//   npm run art:force    -> regenerates everything, overwriting existing PNGs
//   node scripts/art-hd/render.mjs --force --only terrain   -> just paths containing "terrain"
//
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..', 'public');
const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is required to render art: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const SCRIPTS = ['core.js', 'terrain.js', 'nature.js', 'things.js', 'character.js'];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.setContent('<!doctype html><html><body></body></html>');
for (const s of SCRIPTS) {
  const file = path.join(here, s);
  if (fs.existsSync(file)) await page.addScriptTag({ content: fs.readFileSync(file, 'utf8') + `\n//# sourceURL=${s}` });
}
const list = await page.evaluate(() => ART.assets.map((a) => a.path));
let written = 0, skipped = 0;
for (const rel of list) {
  if (only && !only.some((o) => rel.includes(o))) continue;
  const file = path.join(root, rel);
  if (!force && fs.existsSync(file)) { skipped++; continue; }
  const dataUrl = await page.evaluate((p) => {
    const a = ART.assets.find((x) => x.path === p);
    const c = makeCanvas(a.w, a.h);
    const g = c.getContext('2d');
    a.draw(g, a.w, a.h);
    return c.toDataURL('image/png');
  }, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  written++;
}
await browser.close();
console.log(`Wrote ${written} PNGs${skipped ? `, kept ${skipped} existing (use --force to overwrite)` : ''}.`);
