#!/usr/bin/env node
/**
 * Build apps/web/public/search.json — the lazy-loaded search index.
 * Entries: { n: name, u: canonical url, t: "place" | "polity", d?: snippet }
 * Runs as part of the web build (see apps/web package.json build script).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const CURATED = [
  ["constantinople", "Constantinople", "Byzantion · Constantinople · Istanbul — curated"],
  ["rome", "Rome", "from kingdom to republic to empire to papacy — curated"],
  ["mystras", "Mystras", "Byzantium's last capital, now empty — curated"],
  ["babylon", "Babylon", "the ancient world's greatest city"],
  ["carthage", "Carthage", "Phoenician maritime empire"],
  ["alexandria", "Alexandria", "Alexander's Mediterranean capital"],
  ["samarkand", "Samarkand", "Silk Road crossroads, Timur's capital"],
  ["baghdad", "Baghdad", "Round City of the Abbasids"],
  ["kyoto", "Kyoto", "imperial capital of Japan"],
  ["angkor", "Angkor", "largest pre-industrial city on Earth"],
  ["cahokia", "Cahokia", "Mississippian mound city"],
  ["timbuktu", "Timbuktu", "Saharan gold and salt trade"],
  ["great-zimbabwe", "Great Zimbabwe", "stone capital of the gold trade"],
  ["tenochtitlan", "Tenochtitlan", "Aztec island capital"],
  ["vijayanagara", "Vijayanagara", "south India's last great Hindu empire"],
  ["cusco", "Cusco", "navel of the Inca world"],
];

const out = [];
for (const [slug, name, d] of CURATED)
  out.push({ n: name, u: `/place/${slug}`, t: "place", d });

for (const p of read("apps/web/lib/places-auto.json"))
  out.push({ n: p.name, u: `/place/${p.slug}`, t: "place", d: p.desc });

const polities = read("apps/web/lib/polities.json");
for (const [slug, e] of Object.entries(polities))
  out.push({ n: e.name, u: `/polity/${slug}`, t: "polity" });

writeFileSync(join(root, "apps", "web", "public", "search.json"), JSON.stringify(out));
console.log(`search index: ${out.length} entries`);
