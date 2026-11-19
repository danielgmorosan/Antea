#!/usr/bin/env node
/**
 * Render apps/web/public/og.png (1200x630): the Antea share card — every
 * place in the atlas plotted as a constellation on the limestone ground.
 * Needs Playwright + Chromium (dev machine / CI), so it is run manually
 * and the PNG is committed; it is not part of `pnpm build`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// Resolves the globally preinstalled Playwright (CJS) even inside the pnpm
// workspace, where it is deliberately not a dependency.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const auto = JSON.parse(readFileSync(join(root, "apps/web/lib/places-auto.json"), "utf8"));
const vendor = JSON.parse(readFileSync(join(root, "db/vendor/hb-places.json"), "utf8"));

const dots = vendor.map((p) => [p.lon, p.lat, 0]);
for (const p of auto) dots.push([p.ll[0], p.ll[1], 1]);

const X = (lon) => ((lon + 180) / 360) * 1200;
const Y = (lat) => ((78 - lat) / 148) * 630;   // clip polar emptiness

/* landmass from the 1 BC snapshot, as a quiet ground layer */
const world = JSON.parse(readFileSync(join(root, "apps/web/public/data/bc1.json"), "utf8"));
let land = "";
for (const f of world.features) {
  const g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 8) continue;
    let d = "";
    for (let i = 0; i < ring.length; i += 2)
      d += (i ? "L" : "M") + X(ring[i][0]).toFixed(0) + " " + Y(ring[i][1]).toFixed(0);
    land += `<path d="${d}Z" fill="#dcd5c2" stroke="none"/>`;
  }
}
let circles = "";
for (const [lon, lat, hot] of dots)
  circles += `<circle cx="${X(lon).toFixed(1)}" cy="${Y(lat).toFixed(1)}" r="${hot ? 2.6 : 1.4}" fill="${hot ? "#38756a" : "#9aa59e"}" opacity="${hot ? 0.9 : 0.45}"/>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0}
  body{width:1200px;height:630px;background:#e9e6dd;font-family:"DejaVu Serif",Georgia,serif;overflow:hidden;position:relative}
  svg.map{position:absolute;inset:0}
  .veil{position:absolute;inset:0;background:
    radial-gradient(90% 80% at 28% 72%, rgba(233,230,221,.94) 0%, rgba(233,230,221,.55) 45%, rgba(233,230,221,0) 75%)}
  .text{position:absolute;left:84px;bottom:84px}
  h1{font-size:104px;font-weight:600;color:#22302f;letter-spacing:.5px}
  p{font-size:34px;color:#66756f;margin-top:10px;font-style:italic}
  .rule{width:118px;height:5px;background:#38756a;margin-bottom:26px}
  .vig{position:absolute;inset:0;background:radial-gradient(125% 95% at 50% 40%, transparent 60%, rgba(14,24,22,.14) 100%)}
</style></head><body>
  <svg class="map" viewBox="0 0 1200 630">${land}${circles}</svg>
  <div class="veil"></div>
  <div class="text"><div class="rule"></div><h1>Antea</h1><p>the world, before &mdash; an atlas of lost cities</p></div>
  <div class="vig"></div>
</body></html>`;

const tmp = join(root, "scripts", ".og-tmp.html");
writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto("file://" + tmp);
await page.screenshot({ path: join(root, "apps/web/public/og.png") });
await browser.close();
const { unlinkSync } = await import("node:fs");
unlinkSync(tmp);
console.log("wrote apps/web/public/og.png");
