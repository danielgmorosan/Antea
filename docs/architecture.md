# Antea — Technical Architecture

> **Direction update (2026-11-17).** The product is atlas-first: a modern
> Encarta on a time-aware map — accurate-as-honestly-possible borders, and
> authored, sourced articles for polities, cities, and villages. The 3D
> dioramas (§ "Dioramas" below and prototypes v1/v2) are **parked** as a
> possible premium feature. "World view" below is now the whole product
> surface, not a navigation layer. Working dataset for v1 borders:
> `aourednik/historical-basemaps` (GPL-3.0, research-grade, 55 world
> snapshots + 2,340 dated places) — see CLAUDE.md for licensing rules.

A reference architecture for a time-aware atlas of the world: historical
borders you can scrub through, with AI-composed, human-promoted place dossiers.
Optimized for one or two builders, near-zero fixed costs, and no dead-end choices —
every early piece survives into the scaled version.

---

## 1. The shape of the system

```
┌────────────────────────────────────────────────────────────────┐
│  CLIENT  (Next.js + React)                                     │
│                                                                │
│   World view ──────────► City view                             │
│   MapLibre GL JS         Three.js diorama                      │
│   · OHM time slider      · procedural low-poly city            │
│   · border layers        · era transitions                     │
│   · place markers        · camera fly-in from map              │
│                                                                │
│   Dossier panel  ◄── /api/place/:id?year=1200                  │
└───────────────┬────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────┐   ┌────────────────────────────┐
│  EDGE / STATIC (Cloudflare)  │   │  API (Node/TS on Fly.io)   │
│  · site + JS bundles         │   │  · place queries (PostGIS) │
│  · PMTiles basemap + borders │   │  · dossier cache           │
│  · city spec JSONs           │   │  · search / "near me in    │
│  · pre-rendered vignettes    │   │    the year 900"           │
└──────────────────────────────┘   └──────────┬─────────────────┘
                                              │
                              ┌───────────────▼─────────────────┐
                              │  DATA LAYER                     │
                              │  Postgres + PostGIS (Neon)      │
                              │  places · eras · polities ·     │
                              │  events · sources · dossiers    │
                              └───────────────▲─────────────────┘
                                              │  offline batch
                              ┌───────────────┴─────────────────┐
                              │  INGEST PIPELINE (Python)       │
                              │  Wikidata · Pleiades · OHM ·    │
                              │  Natural Earth · GeoNames ·     │
                              │  LLM dossier composer           │
                              └─────────────────────────────────┘
```

Two rendering worlds, one seam: MapLibre owns the planet, Three.js owns the
diorama. The seam is a camera fly-in — when a user zooms past a threshold on a
flagship city, the map animates down and cross-fades into the diorama scene.
Keeping them separate (rather than rendering Three.js inside MapLibre's custom
layer) is deliberate for v1: full artistic control, no projection math, and the
diorama can run on its own page/URL for sharing.

---

## 2. Frontend

**Framework: Next.js (App Router) + TypeScript.** Server-side rendering matters
here more than for most apps: every place and every era should be a crawlable URL
(`/place/constantinople/1200`) because organic search for "what did X look like
in year Y" is the primary growth channel. Static-generate flagship pages.

**World map: MapLibre GL JS** (BSD-3). The open fork of Mapbox GL. Reasons over
alternatives:
- Renders vector tiles client-side, so restyling borders per-year is instant.
- OpenHistoricalMap publishes time-aware vector tiles designed for exactly this;
  you filter features by `start_date`/`end_date` against the slider year.
- Terrain support (hillshade + optional 3D terrain) built in, matching the
  pale-relief look of the reference designs.

**Why not CesiumJS?** Cesium gives you a globe and photoreal 3D tiles, but it is
heavy (multi-MB), hard to art-direct into a soft low-poly aesthetic, and its
strengths (real-world 3D buildings) are the opposite of the product's charm.

**Dioramas: Three.js** (MIT), structured as a small engine:
- `city-spec.json` per city — terrain source, water level, landmark list with
  coordinates and builder names, era array (extent, density, wall type, marks).
- A shared **landmark kit**: parametric builders (temple, basilica, dome complex,
  minaret, wall, tower, ziggurat, pyramid, aqueduct…). Each new city mostly
  recombines the kit.
- Terrain from real elevation: crop a DEM tile (AWS Terrain Tiles, public
  domain), downsample to ~100×70 vertices, same vertex-color shading as the
  prototype. The prototype's hand-written height function gets replaced by data.
- Instanced houses/trees exactly as in the prototype; it already scales to
  thousands of instances at 60fps.

**State: Zustand** (tiny, no boilerplate). **Styling: Tailwind + CSS variables**
for the glass design system. **Animation: the browser** — the prototype shows you
need almost nothing beyond rAF and CSS transitions.

---

## 3. Map data and tiles

**Serve tiles as PMTiles on Cloudflare R2.** PMTiles packs an entire tileset into
one static file served with range requests — no tile server, no per-request
compute, essentially free bandwidth (R2 has zero egress fees). This single choice
removes the classic map-startup cost trap.

Layers:
1. **Basemap** — build with Planetiler from OSM land/water/physical features
   (style it pale and label-free; modern roads/cities off).
2. **Historical borders** — OpenHistoricalMap extracts, or import OHM +
   supplementary datasets into your own PostGIS and cut PMTiles per major layer.
   Keep a `confidence` property per boundary; render disputed/uncertain edges
   dashed. Honesty is a feature.
3. **Terrain** — raster hillshade tiles pre-rendered from Copernicus/SRTM DEM,
   or MapTiler's free tier while small.
4. **Places** — your own place markers from the database, cut to PMTiles
   whenever the DB changes.

License note: OHM is CC0, Wikidata is CC0, Pleiades is CC-BY (attribute it),
Natural Earth public domain. Anything derived from OpenStreetMap itself is ODbL:
attribution required, and if you mix OSM data *into your database*, that derived
database inherits share-alike. Practical pattern: keep OSM-derived geometry in
its own tileset (attributed), keep your editorial database (dossiers, era facts,
city specs) fully separate so it stays yours.

---

## 4. Backend and database

**Postgres + PostGIS, hosted on Neon** (serverless, generous free tier, scales to
zero). Schema core:

```sql
place        (id, name, kind, geom point, pleiades_id, wikidata_id, osm_id)
polity       (id, name, wikidata_id)                     -- empires, kingdoms
place_era    (place_id, year_start, year_end, polity_id,
              population_est, population_source, summary)
event        (id, place_id?, geom?, year_start, year_end, kind, title, wikidata_id)
source       (id, kind, citation, url)                   -- provenance for every claim
claim_source (claim_table, claim_id, source_id)
dossier      (place_id, year_bucket, body_md, model, generated_at, review_state)
city_spec    (place_id, spec jsonb)                      -- drives the diorama
```

Every fact row points at a source row. This is the moat: aggregators without
provenance stay toys; you're building a citable reference.

**API: Node + Fastify + TypeScript on Fly.io** (or simply Next.js route handlers
until traffic demands separation). Endpoints are boring on purpose:
`GET /place/:id?year=`, `GET /search?q=&year=`, `GET /within?bbox=&year=`.
Add a Redis-compatible cache (Upstash) only when p95 says so.

---

## 5. Ingest pipeline (the real product)

Python, run as scheduled batch jobs (GitHub Actions cron is enough for a year):

1. **Pleiades dump** → ancient places, names, time periods, coordinates.
2. **Wikidata SPARQL** → settlements with inception dates, population statements
   (which carry point-in-time qualifiers — underused gold), ruler/polity chains
   via P6/P17/P131 with temporal qualifiers.
3. **OHM extract** → boundary geometries per year.
4. **Reconciliation** — match entities across sources by coordinates + name
   similarity + shared external IDs. Store all IDs; never merge destructively.
5. **Dossier composition** — for each (place, era-bucket): feed the *structured
   facts and their sources* to an LLM with instructions to write the narrative
   only from supplied facts, with inline citation markers. Generate offline,
   cache in `dossier`, mark `review_state`. Regenerate when facts change, not
   per request — LLM cost stays a rounding error and no user waits on a model.
6. **Vignettes** — pre-generate period impression images for flagship places,
   stored on R2, always labeled as artistic approximation with the source list.

---

## 6. Infra & cost envelope

| Piece                      | Service              | Early cost |
|----------------------------|----------------------|------------|
| Static site + edge         | Cloudflare Pages     | $0         |
| Tiles + images             | Cloudflare R2        | ~$1–5/mo   |
| Postgres/PostGIS           | Neon free tier       | $0–19/mo   |
| API                        | Fly.io shared VM     | $0–10/mo   |
| Batch pipeline             | GitHub Actions       | $0         |
| LLM dossier generation     | batch API, cached    | tens of $ per full regeneration |
| Domain, misc               |                      | ~$2/mo     |

Total: **under ~$50/month** until real traffic, and the expensive things
(tiles, dossiers, vignettes) are all pre-computed statics that scale for free.

---

## 7. Build order

**Phase 1 — the atlas, whole loop (4–6 wks):** Next.js shell, the v3 atlas
ported to components (map + slider + article panel), border snapshots served
per year, three curated articles + stub tier backed by a hand-seeded database,
crawlable `/place/[slug]/[year]` URLs.

**Phase 2 — coverage (6–10 wks):** ingest pipeline live (Pleiades + Wikidata +
places.geojson, ~2–5k well-attested places first, not millions), auto-compiled
articles with citations and `review_state`, OHM extracts blended into border
tiles, search ("show me the Aegean in 480 BC").

**Phase 3 — depth:** editorial promotion workflow (stub → curated), old-map
scan overlays (OldMapsOnline-style georeferencing), per-polity dossiers with
dynasties and conflicts, community corrections queue (suggest-an-edit →
review, not a wiki). Premium experiments: dioramas, generated period imagery.

---

## 8. Repo layout

```
palimpsest/
├── apps/
│   └── web/                 # Next.js: map, dioramas, dossier pages
│       ├── app/
│       ├── components/map/
│       ├── components/diorama/   # engine + landmark kit
│       └── styles/
├── packages/
│   ├── city-specs/          # constantinople.json, rome.json…
│   ├── landmark-kit/        # shared parametric builders
│   └── schema/              # zod types shared client/server/pipeline
├── pipeline/                # Python ingest
│   ├── sources/  (pleiades.py, wikidata.py, ohm.py)
│   ├── reconcile.py
│   └── dossier/  (compose.py, prompts/)
├── tiles/                   # planetiler configs, PMTiles build scripts
└── infra/                   # fly.toml, R2 sync, GH Actions workflows
```
