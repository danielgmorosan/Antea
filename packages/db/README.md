# @antea/db

The editorial database: places, eras, dossiers, and the sources behind them.

## Why it exists

The city specs in `@antea/city-specs` remain the editorial source of truth —
they are diffable and reviewable in a way table rows are not. This package is
the queryable projection of them, and the one place where the brief's rule is
_enforced_ rather than merely observed:

> Every factual claim row in the DB must reference a `source` row.

`claim.source_id` is `NOT NULL` against a foreign key. An unsourced claim is
unstorable. A gap is recorded as an `unsourced_claim`, which is a different
thing and says so.

## Layout

```
migrations/0001_editorial.sql   tables, enums, constraints. No PostGIS.
migrations/0002_spatial.sql     PostGIS: derived geography column + GIST index
src/migrate.ts                  runner; each migration in its own transaction
src/seed.ts                     loads a CitySpec into the database, idempotent
src/queries.ts                  read paths
src/cli/migrate.ts              the CLI that runs against Neon
```

The spatial migration is separate on purpose. Tests run Postgres compiled to
WASM, which has no PostGIS; splitting it means every editorial rule is
exercised in tests and only the spatial index is not.

Coordinates live in plain `lng`/`lat` columns; `0002` adds a **generated**
`geography` column from them. PostGIS accelerates queries without becoming a
storage requirement or letting two representations drift apart.

## Running it

```bash
# against Neon, or any Postgres with PostGIS
export DATABASE_URL='postgresql://…?sslmode=require'
pnpm --filter @antea/db migrate           # schema only
pnpm --filter @antea/db migrate --seed    # schema, then load the city specs
```

Tests need no database at all:

```bash
pnpm test
```

## Status

Nothing in `apps/web` reads from this yet — the site still renders from the
JSON specs. The database is additive until there is a reason to switch, and
`claim` stays empty until claims are authored or ingested, since the specs do
not currently pair individual assertions with individual sources.
