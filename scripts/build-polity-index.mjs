#!/usr/bin/env node
/**
 * Build apps/web/lib/polities.json from the border snapshots.
 *
 * For every named polity in every year file, record the centroid and weight
 * of its largest territory, its suzerain ("subject to") and border precision.
 * Only polity-years above MIN_PHYS get a page; tiny slivers stay map-only.
 *
 * Geometry math mirrors @antea/chrono (ringMetrics/physicalWeight/slugifyName);
 * keep them in sync.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "apps", "web", "public", "data");
const outFile = join(root, "apps", "web", "lib", "polities.json");
const MIN_PHYS = 0.8;

function ringMetrics(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const cr = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    a += cr; cx += (r[i][0] + r[i + 1][0]) * cr; cy += (r[i][1] + r[i + 1][1]) * cr;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { area: 0, c: r[0] };
  return { area: Math.abs(a), c: [cx / (6 * a), cy / (6 * a)] };
}
const phys = (area, lat) => area * Math.max(0.2, Math.cos((lat * Math.PI) / 180));
const slugify = (n) => n
  .replace(/\s*\(.*?\)\s*/g, " ")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const keyToYear = (k) => (k.startsWith("bc") ? -Number(k.slice(2)) : Number(k));

function largestOuterRing(g) {
  const polys = g.type === "Polygon" ? [g.coordinates]
    : g.type === "MultiPolygon" ? g.coordinates : [];
  let best = null;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || outer.length < 4) continue;
    const m = ringMetrics(outer);
    const w = phys(m.area, m.c[1]);
    if (!best || w > best.phys) best = { phys: w, c: m.c };
  }
  return best;
}

const index = {}; // slug -> { name, years: { key: { c, w, p, s? } } }
const collisions = {};
const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const key = file.replace(".json", "");
  const d = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
  const perYear = {}; // name -> best entry this year
  for (const f of d.features) {
    const n = f.properties?.n;
    if (!n) continue;
    const r = largestOuterRing(f.geometry);
    if (!r) continue;
    const prev = perYear[n];
    if (!prev || r.phys > prev.w)
      perYear[n] = {
        c: [Number(r.c[0].toFixed(2)), Number(r.c[1].toFixed(2))],
        w: Number(r.phys.toFixed(2)),
        p: f.properties.p ?? 1,
        ...(f.properties.s ? { s: f.properties.s } : {}),
      };
  }
  for (const [name, entry] of Object.entries(perYear)) {
    if (entry.w < MIN_PHYS) continue;
    let slug = slugify(name);
    if (!slug) continue;
    if (collisions[slug] && collisions[slug] !== name) slug = `${slug}-${slugify(name) === slug ? Object.keys(index).filter((s) => s.startsWith(slug)).length + 1 : 2}`;
    collisions[slug] = name;
    index[slug] ??= { name, years: {} };
    index[slug].years[key] = entry;
  }
}

// order years chronologically inside each polity
for (const s of Object.keys(index)) {
  const ordered = Object.entries(index[s].years)
    .sort((a, b) => keyToYear(a[0]) - keyToYear(b[0]));
  index[s].years = Object.fromEntries(ordered);
}

const sorted = Object.fromEntries(Object.entries(index).sort((a, b) => a[0].localeCompare(b[0])));
writeFileSync(outFile, JSON.stringify(sorted));
const pages = Object.values(sorted).reduce((n, p) => n + Object.keys(p.years).length, 0);
console.log(`polities: ${Object.keys(sorted).length}, polity-year pages: ${pages}, wrote ${outFile}`);
