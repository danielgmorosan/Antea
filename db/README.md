# @antea/db

Postgres schema and seed for the Antea knowledge layer.

```
pnpm --filter @antea/db check     # dry run against in-memory Postgres (pglite); runs in CI
DATABASE_URL=postgres://… pnpm --filter @antea/db seed   # apply schema + seed a real database (Neon)
```

Both are idempotent — re-running updates rows in place.

## Shape

- **editorial.\*** — our content. `place`, `place_name` (names through time),
  `place_era` (who ruled, half-open intervals), `place_event` (timelines),
  `article` (tiered: curated/auto, with review_state), `source` and the
  join tables. Every factual claim carries a `source_id`.
- **staging.hb_place** — the vendored historical-basemaps places extract
  (GPL-3.0, see `vendor/NOTICE.md`). Reference material for Phase 2 ingest;
  never joined into editorial tables. Replace with Wikidata/Pleiades, then drop.

The editorial seed imports `apps/web/lib/cities.ts` — the module the app
renders — so database and site cannot drift until the app reads from the
database directly.
