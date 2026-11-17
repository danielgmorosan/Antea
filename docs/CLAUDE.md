# CLAUDE.md — Antea

Project context for Claude Code. Read this fully before making changes.

## What this is

Antea (antea.world — Latin: "before") is a modern Encarta built on a map: a
time-aware atlas of the world where users scrub through 5,000 years of borders
and open an authored, sourced article for any polity, city, or village. The
product values are editorial quality in a bounded experience (Encarta, not
wiki sprawl), honesty about uncertainty (border-precision rendering,
"peoples without fixed states" instead of blank space, cited claims), and
every place-era being a crawlable URL (SEO is the growth engine).

Pivot note (2026-11-17): the 3D low-poly city dioramas are PARKED. They live
in `prototype/` as a possible future premium feature (along with generated
period imagery) and are not part of the core build. The core is the 2D atlas
+ article system.

## Current state

- `prototype/antea-atlas.html` — v3, the current direction: 2D historical
  atlas. MapLibre with an inline style (no external tiles — the border
  polygons themselves are the basemap, so no modern-coastline anachronisms),
  44 border snapshots 3000 BC–AD 2000 from historical-basemaps (simplified,
  ~8MB as per-year JSON files), year slider with snap, hover tooltips with
  suzerainty ("subject to") and precision, dashed coarse borders, clickable
  polities, unnamed regions as "peoples without fixed states" with their own
  article, 16 city markers with year-aware names (Byzantion → Constantinople
  → Kostantiniyye → Istanbul), and an Encarta-style article panel with two
  tiers: curated articles (Constantinople, Rome, Mystras) and auto-compiled
  stubs. Light/dark theme. Falls back to fetching borders from the
  historical-basemaps GitHub raw URLs when local `data/` is absent.
- `prototype/palimpsest.html`, `prototype/palimpsest-globe.html` — v1/v2
  diorama experiments (parked).
- `docs/architecture.md` — stack reference, updated for the atlas-first
  direction. Follow it unless it conflicts with reality; then update it in
  the same PR.

## Target stack (see docs/architecture.md for rationale)

- **Monorepo:** pnpm workspaces. `apps/web`, `packages/schema`,
  `pipeline/`, `tiles/`, `infra/`.
- **Web:** Next.js (App Router) + TypeScript + Tailwind, MapLibre GL JS v5.
- **Map data:** per-year border tiles as PMTiles on Cloudflare R2; v1 ships
  the simplified historical-basemaps snapshots, later blended with
  OpenHistoricalMap extracts.
- **DB:** Postgres + PostGIS on Neon. **API:** Next.js route handlers.
- **Pipeline:** Python 3.12 (GitHub Actions cron): Wikidata, Pleiades,
  historical-basemaps `places.geojson` (2,340 settlements with
  inhabited-from/until and Wikidata IDs — a ready-made seed), OHM.
- **Articles:** LLM-composed offline from structured, sourced facts; cached
  in the DB with a `review_state`; tier promoted by human review
  (auto-compiled → curated). Never generated at request time.

## Phase 1 tasks (in order)

1. Scaffold the monorepo (pnpm, Next.js, TS strict, ESLint+Prettier, Vitest).
2. Port v3 into components: `AtlasMap.tsx` (map + border layers + theme),
   `TimeSlider.tsx`, `ArticlePanel.tsx`; year data served from `/data`.
3. Pages with real URLs: `/` (atlas), `/place/[slug]` and
   `/place/[slug]/[year]` (atlas centered + panel open, statically
   generated, full meta tags), `/polity/[slug]/[year]`.
4. Postgres schema (see architecture doc) + seed script importing
   `places.geojson` and the three curated articles.
5. CI: typecheck, lint, test, build on PR.

Do NOT start Phase 2 (ingest pipeline, auto-compiled articles at scale,
OHM blending) until Phase 1 is merged and deployed.

## Conventions

- TypeScript strict; no `any` without a comment saying why.
- Pure, unit-testable logic for anything year-dependent (name switching,
  phase lookup, marker visibility); the v3 smoke tests become Vitest tests.
- Performance budget: ≤1.5MB JS gzipped on the atlas route; border files
  lazy-loaded per year and cached; 60fps pan on a mid-range phone.
- Accessibility floor: keyboard-operable slider and panel, visible focus,
  `prefers-reduced-motion` respected.
- Copy style: sentence case, plain verbs, no exclamation marks. Article
  prose is editorial content — never lorem ipsum, never invented facts;
  every factual claim in the DB references a `source` row.
- Honesty is a feature, not a disclaimer: precision rendering, "subject to"
  relations, and unnamed-region articles ship in every view.

## Design tokens (do not improvise new ones)

- Base `#e9e6dd` · Ink `#22302f` · Ink-soft `#66756f` · Accent (verdigris)
  `#38756a`; dark theme: base `#161c1b`, ink `#e3e6df`, accent `#64a695`.
- Glass panels `rgba(252,251,247,.74)` light / `rgba(26,33,32,.82)` dark,
  14–20px backdrop blur, 1px line `rgba(34,48,47,.14)`, radius 22px panels /
  999px pills.
- Type: Fraunces (display, years, numbers) + Archivo (UI). No all-caps
  headings; uppercase only for small section labels with letter-spacing.
- Map palette: ocean/terra/polity colors are generated (golden-angle hue
  from polity name, theme-dependent saturation/lightness) — in code, not
  hand-picked per polity.

## Data licensing rules (hard requirements)

- historical-basemaps is **GPL-3.0** and research-grade (work in progress,
  author asks for verification before academic use). Fine for prototypes
  and attributed display. Before commercial launch: decide whether border
  geometry stays a clearly-separated GPL component, gets replaced by our
  own OHM-derived tiles, or is licensed otherwise. Do not mix it into the
  editorial database.
- OSM-derived geometry stays in its own tileset with attribution (ODbL);
  never import OSM data into the editorial Postgres database.
- Pleiades is CC-BY (attribute in UI footer and on articles). OHM and
  Wikidata are CC0. Our editorial content is ours.
- Every factual claim row must reference a `source` row.

## Market note

`Atlas Pi` (atlaspi.it) appeared in this space: a REST+MCP API of historical
geography — 1,000+ polities with GeoJSON borders, events, dynastic chains,
cited sources, per-record confidence, 4500 BCE–2024. Evaluate it as a data
source/partner before building equivalent ingest ourselves; it validates
the sourced-and-confidence-scored approach. Our differentiation stays the
product layer: the atlas experience, editorial articles, place-era URLs.

## Gotchas learned so far

- The border dataset covers the whole landmass (unnamed regions are
  polygons too), so it doubles as the basemap — no external tiles needed,
  and the map stays period-pure.
- MapLibre: `line-dasharray` is not data-driven — use two line layers
  filtered on the precision property.
- MapLibre's CSS must be inlined when CSP blocks external stylesheets;
  a ~15-line subset (map, canvas, marker) suffices when popups and
  controls aren't used.
- Simplify border geometry with shapely (`tolerance 0.12°, 2-decimal
  coords`) → ~8MB for 44 world snapshots.
- Pin CDN libraries to exact versions with a jsDelivr fallback.
- Year-dependent placement/name logic must be validated numerically, not
  visually.

## Commands (once scaffolded — keep this section updated)

```
pnpm install
pnpm dev          # apps/web on :3000
pnpm test         # vitest, includes year-logic tests
pnpm build        # all workspaces
pnpm lint
```
