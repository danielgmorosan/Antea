#!/usr/bin/env node
/**
 * Apply db/schema.sql and seed the database.
 *
 *   DATABASE_URL=postgres://… pnpm --filter @antea/db seed   # real database (Neon)
 *   pnpm --filter @antea/db check                            # in-memory pglite dry run
 *
 * Editorial content comes from apps/web/lib/cities.ts (the same module the
 * app renders), so the database can never drift from what ships until the
 * app reads from the database instead. The staging layer imports the
 * vendored historical-basemaps places extract (GPL — see vendor/NOTICE.md).
 *
 * Node is run with --experimental-strip-types so cities.ts imports directly;
 * its "@antea/chrono" imports are type-only and erased.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "../apps/web/lib/cities.ts";

const here = dirname(fileURLToPath(import.meta.url));
const LOCAL = process.argv.includes("--local");
const url = process.env.DATABASE_URL;

async function connect() {
  if (LOCAL || !url) {
    if (!LOCAL) {
      console.error("DATABASE_URL is not set. Use `pnpm --filter @antea/db check` for a local dry run.");
      process.exit(1);
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite();
    return {
      label: "pglite (in-memory)",
      query: (q, params) => db.query(q, params),
      exec: (q) => db.exec(q),
      end: () => db.close(),
    };
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return {
    label: url.replace(/:\/\/[^@]*@/, "://***@"),
    query: (q, params) => client.query(q, params),
    exec: (q) => client.query(q),
    end: () => client.end(),
  };
}

const db = await connect();
console.log(`Seeding ${db.label}`);

await db.exec(readFileSync(join(here, "schema.sql"), "utf8"));

/* ---------- sources ---------- */
const SOURCES = [
  ["ds:historical-basemaps", "dataset", "A. Ourednik et al., historical-basemaps (border geometry and places)", "https://github.com/aourednik/historical-basemaps", "GPL-3.0"],
  ["db:wikidata", "database", "Wikidata", "https://www.wikidata.org", "CC0"],
  ["db:pleiades", "database", "Pleiades gazetteer of ancient places", "https://pleiades.stoa.org", "CC-BY"],
  ["book:mango-byzantium", "book", "C. Mango, Byzantium: The Empire of New Rome", null, null],
  ["book:krautheimer-rome", "book", "R. Krautheimer, Rome: Profile of a City, 312–1308", null, null],
  ["book:runciman-mistra", "book", "S. Runciman, Mistra: Byzantine Capital of the Peloponnese", null, null],
];
for (const [id, kind, citation, src, license] of SOURCES)
  await db.query(
    `insert into editorial.source (id, kind, citation, url, license)
     values ($1,$2,$3,$4,$5)
     on conflict (id) do update set citation = excluded.citation, url = excluded.url, license = excluded.license`,
    [id, kind, citation, src, license],
  );

const BOOK_BY_SLUG = {
  constantinople: "book:mango-byzantium",
  rome: "book:krautheimer-rome",
  mystras: "book:runciman-mistra",
};

/* ---------- editorial places from the app's own content ---------- */
let eras = 0, events = 0, names = 0;
for (const c of CITIES) {
  const wikidata = (c.sources ?? []).join(" ").match(/\bQ\d+\b/)?.[0] ?? null;
  const pleiades = (c.sources ?? []).join(" ").match(/Pleiades (\d+)/)?.[1] ?? null;
  await db.query(
    `insert into editorial.place (slug, name, kind, lon, lat, year_from, year_to, flagship, wikidata, pleiades)
     values ($1,$2,'city',$3,$4,$5,$6,$7,$8,$9)
     on conflict (slug) do update set
       name = excluded.name, lon = excluded.lon, lat = excluded.lat,
       year_from = excluded.year_from, year_to = excluded.year_to,
       flagship = excluded.flagship, wikidata = excluded.wikidata, pleiades = excluded.pleiades`,
    [c.slug, c.names?.[0]?.[1] ?? c.slug, c.ll[0], c.ll[1], c.from, c.to, !!c.flagship, wikidata, pleiades],
  );
  for (const [yearFrom, name] of c.names ?? []) {
    await db.query(
      `insert into editorial.place_name (place_slug, year_from, name) values ($1,$2,$3)
       on conflict (place_slug, year_from) do update set name = excluded.name`,
      [c.slug, yearFrom, name],
    );
    names++;
  }
  for (const [from, to, polity, blurb] of c.phases ?? []) {
    await db.query(
      `insert into editorial.place_era (place_slug, year_from, year_to, polity, blurb, source_id)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (place_slug, year_from) do update set
         year_to = excluded.year_to, polity = excluded.polity,
         blurb = excluded.blurb, source_id = excluded.source_id`,
      [c.slug, from, to, polity, blurb, BOOK_BY_SLUG[c.slug] ?? null],
    );
    eras++;
  }
  for (const [year, text] of c.timeline ?? []) {
    await db.query(
      `insert into editorial.place_event (place_slug, year, text, source_id)
       values ($1,$2,$3,$4)
       on conflict (place_slug, year) do update set text = excluded.text`,
      [c.slug, year, text, BOOK_BY_SLUG[c.slug] ?? null],
    );
    events++;
  }
  const overview = c.overview ?? c.desc;
  if (overview) {
    await db.query(
      `insert into editorial.article (place_slug, tier, review_state, overview, model)
       values ($1,$2,$3,$4,null)
       on conflict (place_slug) do update set
         tier = excluded.tier, review_state = excluded.review_state, overview = excluded.overview`,
      [c.slug, c.flagship ? "curated" : "auto", c.flagship ? "published" : "draft", overview],
    );
    const srcIds = [BOOK_BY_SLUG[c.slug], "ds:historical-basemaps"].filter(Boolean);
    for (const sid of srcIds)
      await db.query(
        `insert into editorial.article_source (place_slug, source_id) values ($1,$2)
         on conflict do nothing`,
        [c.slug, sid],
      );
  }
}

/* ---------- staging: vendored historical-basemaps places ---------- */
const hb = JSON.parse(readFileSync(join(here, "vendor", "hb-places.json"), "utf8"));
await db.query(`truncate staging.hb_place restart identity`);
for (const r of hb)
  await db.query(
    `insert into staging.hb_place (name, lon, lat, since, until, civ, wikidata, wikipedia, descr)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [r.name, r.lon, r.lat, r.since ?? null, r.until ?? null, r.civ ?? null, r.wikidata ?? null, r.wikipedia ?? null, r.desc ?? null],
  );

/* ---------- verify ---------- */
const counts = {};
for (const [label, q] of [
  ["places", "select count(*) n from editorial.place"],
  ["names", "select count(*) n from editorial.place_name"],
  ["eras", "select count(*) n from editorial.place_era"],
  ["events", "select count(*) n from editorial.place_event"],
  ["articles", "select count(*) n from editorial.article"],
  ["sources", "select count(*) n from editorial.source"],
  ["staging places", "select count(*) n from staging.hb_place"],
]) counts[label] = Number((await db.query(q)).rows[0].n);
console.table(counts);

// The acceptance query: a place dossier at a year, straight from SQL.
const dossier = await db.query(
  `select p.slug,
          (select name from editorial.place_name n where n.place_slug = p.slug and n.year_from <= $2 order by n.year_from desc limit 1) as name_then,
          e.polity, e.blurb, a.overview
     from editorial.place p
     join editorial.place_era e on e.place_slug = p.slug and e.year_from <= $2 and e.year_to > $2
     join editorial.article a on a.place_slug = p.slug
    where p.slug = $1`,
  ["constantinople", 1200],
);
const d = dossier.rows[0];
if (!d || d.name_then !== "Constantinople" || !/Byzantine/.test(d.polity))
  throw new Error("acceptance query failed: " + JSON.stringify(d));
console.log(`acceptance: ${d.slug} in 1200 = "${d.name_then}" under ${d.polity} ✓`);

await db.end();
console.log("done.");
