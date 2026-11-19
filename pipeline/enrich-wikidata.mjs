#!/usr/bin/env node
/**
 * Phase 2 ingest, step 1: enrich staged places from Wikidata (CC0).
 *
 * Reads db/vendor/hb-places.json, takes every row with a Wikidata QID,
 * fetches labels, descriptions, dates and sitelinks in batches, and writes
 * apps/web/lib/places-auto.json — the editorial-grade auto-place index.
 * Only entries with an English description make the cut: a page must say
 * something true, or it does not exist.
 *
 * Runs in CI (.github/workflows/enrich.yml); the shell sandbox has no
 * Wikidata egress. No dependencies. Idempotent and deterministic.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = JSON.parse(readFileSync(join(root, "db", "vendor", "hb-places.json"), "utf8"));

const API = "https://www.wikidata.org/w/api.php";
const UA = "AnteaAtlas/0.1 (https://github.com/danielgmorosan/antea) node";
// Flagship/stub cities already curated in apps/web/lib/cities.ts:
const SKIP_QIDS = new Set(["Q16869", "Q220", "Q313972"]);

const slugify = (n) => n
  .replace(/\s*\(.*?\)\s*/g, " ")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const RESERVED = new Set([
  "constantinople", "rome", "mystras", "babylon", "carthage", "alexandria",
  "samarkand", "baghdad", "kyoto", "angkor", "cahokia", "timbuktu",
  "great-zimbabwe", "tenochtitlan", "vijayanagara", "cusco",
]);

async function wd(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    if (attempt < 3) await new Promise((res) => setTimeout(res, 1500 * attempt));
    else throw new Error(`wikidata ${r.status} for ${url.slice(0, 120)}`);
  }
}

function yearOf(claims, prop) {
  const c = claims?.[prop]?.find((x) => x.mainsnak?.datavalue?.value?.time);
  if (!c) return null;
  const t = c.mainsnak.datavalue.value; // "+1453-05-29T00:00:00Z", precision 9=year
  if (t.precision < 7) return null;     // worse than century: unusable
  const m = /^([+-])(\d{1,6})/.exec(t.time);
  if (!m) return null;
  const y = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  return y === 0 || Math.abs(y) > 5000 ? null : y;
}

const withQ = rows.filter((r) => r.wikidata && /^Q\d+$/.test(r.wikidata) && !SKIP_QIDS.has(r.wikidata));
const byQ = new Map(withQ.map((r) => [r.wikidata, r]));
const qids = [...byQ.keys()];
console.log(`enriching ${qids.length} places from Wikidata…`);

const entities = {};
for (let i = 0; i < qids.length; i += 50) {
  const batch = qids.slice(i, i + 50);
  const d = await wd({
    action: "wbgetentities", ids: batch.join("|"),
    props: "labels|descriptions|claims|sitelinks", languages: "en",
    sitefilter: "enwiki",
  });
  Object.assign(entities, d.entities ?? {});
  process.stdout.write(`  ${Math.min(i + 50, qids.length)}/${qids.length}\r`);
}

/* resolve P31 (instance of) target labels in one extra pass */
const p31set = new Set();
for (const e of Object.values(entities))
  for (const c of e.claims?.P31 ?? []) {
    const id = c.mainsnak?.datavalue?.value?.id;
    if (id) p31set.add(id);
  }
const p31label = {};
const p31ids = [...p31set];
for (let i = 0; i < p31ids.length; i += 50) {
  const d = await wd({
    action: "wbgetentities", ids: p31ids.slice(i, i + 50).join("|"),
    props: "labels", languages: "en",
  });
  for (const [id, e] of Object.entries(d.entities ?? {}))
    p31label[id] = e.labels?.en?.value ?? null;
}

const out = [];
const taken = new Set(RESERVED);
let noDesc = 0, missing = 0;
for (const q of qids) {
  const e = entities[q];
  if (!e || e.missing !== undefined) { missing++; continue; }
  const name = e.labels?.en?.value ?? byQ.get(q).name;
  const desc = e.descriptions?.en?.value ?? null;
  if (!desc) { noDesc++; continue; }   // quality gate
  let slug = slugify(name);
  if (!slug) continue;
  let n = 2;
  while (taken.has(slug)) slug = `${slugify(name)}-${n++}`;
  taken.add(slug);
  const src = byQ.get(q);
  const kinds = (e.claims?.P31 ?? [])
    .map((c) => p31label[c.mainsnak?.datavalue?.value?.id])
    .filter(Boolean).slice(0, 3);
  const rec = {
    slug, q, name,
    ll: [src.lon, src.lat],
    desc,
    ...(kinds.length ? { kinds } : {}),
    ...(yearOf(e.claims, "P571") !== null ? { inception: yearOf(e.claims, "P571") } : {}),
    ...(yearOf(e.claims, "P576") !== null ? { dissolved: yearOf(e.claims, "P576") } : {}),
    ...(src.since !== undefined ? { hbSince: src.since } : {}),
    ...(src.until !== undefined ? { hbUntil: src.until } : {}),
    ...(e.sitelinks?.enwiki?.title ? { enwiki: e.sitelinks.enwiki.title } : {}),
  };
  out.push(rec);
}
out.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(join(root, "apps", "web", "lib", "places-auto.json"), JSON.stringify(out));
console.log(`\nwrote ${out.length} auto places (skipped: ${noDesc} without en description, ${missing} missing entities)`);
