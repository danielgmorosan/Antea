#!/usr/bin/env node
/**
 * Phase 2 ingest, step 0: reconcile QID-less staged places against Wikidata.
 *
 * For every db/vendor/hb-places.json row without a QID, search Wikidata by
 * name and accept a candidate only if it carries coordinates (P625) within
 * MAX_KM of the dataset's point — name similarity alone is how reconciliation
 * projects poison themselves. Writes pipeline/reconciled-qids.json, which
 * enrich-wikidata.mjs merges before enrichment.
 *
 * Runs in CI (.github/workflows/reconcile.yml). No dependencies. Safe to
 * re-run; output is deterministic for a given Wikidata state.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = JSON.parse(readFileSync(join(root, "db", "vendor", "hb-places.json"), "utf8"));
const OUT = join(root, "pipeline", "reconciled-qids.json");
const STATE = join(root, "pipeline", "reconcile-state.json");

/* Resumable: tried keys and matches survive across runs; each run spends
 * at most BUDGET_MINUTES (default 90) and commits whatever it covered. */
const BUDGET_MS = Number(process.env.BUDGET_MINUTES ?? 90) * 60_000;
const DEADLINE = Date.now() + BUDGET_MS;
const keyOf = (r) => `${r.name}|${r.lon}|${r.lat}`;
const tried = new Set(
  existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")).tried ?? [] : [],
);
const prevMatches = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];

const API = "https://www.wikidata.org/w/api.php";
const UA = "AnteaAtlas/0.1 (https://github.com/danielgmorosan/antea) node";
const MAX_KM = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wd(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", maxlag: "5", ...params })}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) {
        const d = await r.json();
        if (!d.error) return d;
        if (d.error.code !== "maxlag") throw new Error(d.error.code);
      }
    } catch (e) {
      if (attempt === 4) throw e;
    }
    await sleep(2000 * attempt);
  }
}

function kmBetween(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const pending = rows.filter((r) => !r.wikidata && !tried.has(keyOf(r)));
console.log(`reconciling: ${pending.length} pending (${tried.size} already tried, ${prevMatches.length} matched so far)`);

/* pass 1: name search until ~60% of the budget is spent */
const searchDeadline = Date.now() + (DEADLINE - Date.now()) * 0.6;
const unresolved = [];
const candidates = new Map(); // row index -> qid[]
const allQids = new Set();
for (const r of pending) {
  if (Date.now() > searchDeadline) break;
  const i = unresolved.push(r) - 1;
  const d = await wd({
    action: "wbsearchentities", search: r.name, language: "en",
    uselang: "en", type: "item", limit: "5",
  });
  const qs = (d?.search ?? []).map((s) => s.id);
  if (qs.length) {
    candidates.set(i, qs);
    qs.forEach((q) => allQids.add(q));
  }
  if (i % 100 === 0) process.stdout.write(`  search ${i}/${pending.length}\r`);
  await sleep(60);
}
console.log(`\n  this run searched ${unresolved.length}; candidates for ${candidates.size} names, ${allQids.size} unique entities`);

/* pass 2: fetch candidate coordinates + descriptions in batches */
const coord = {}; const brief = {};
const qlist = [...allQids];
for (let i = 0; i < qlist.length; i += 50) {
  const d = await wd({
    action: "wbgetentities", ids: qlist.slice(i, i + 50).join("|"),
    props: "claims|descriptions", languages: "en",
  });
  for (const [q, e] of Object.entries(d?.entities ?? {})) {
    const v = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    if (v) coord[q] = { lat: v.latitude, lon: v.longitude };
    brief[q] = e.descriptions?.en?.value ?? null;
  }
  if (i % 500 === 0) process.stdout.write(`  entities ${i}/${qlist.length}\r`);
  await sleep(60);
}

/* pass 3: accept nearest candidate within MAX_KM, merge with earlier runs */
const matches = [...prevMatches];
let newMatches = 0;
for (const [i, qs] of candidates) {
  const r = unresolved[i];
  let best = null;
  for (const q of qs) {
    if (!coord[q]) continue;
    const km = kmBetween(r, coord[q]);
    if (km <= MAX_KM && (!best || km < best.km)) best = { q, km };
  }
  if (best) {
    matches.push({
      name: r.name, lon: r.lon, lat: r.lat,
      q: best.q, km: Number(best.km.toFixed(1)),
      desc: brief[best.q] ?? null,
    });
    newMatches++;
  }
}
for (const r of unresolved) tried.add(keyOf(r));
matches.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(OUT, JSON.stringify(matches, null, 1));
const remaining = pending.length - unresolved.length;
writeFileSync(STATE, JSON.stringify({
  done: remaining === 0,
  tried: [...tried].sort(),
  matched: matches.length,
  updated: new Date().toISOString(),
}));
console.log(`\nthis run: +${newMatches} coordinate-verified matches (${matches.length} total); ${remaining} names still pending — ${remaining === 0 ? "DONE" : "re-dispatch to continue"}`);
