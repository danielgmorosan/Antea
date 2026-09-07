# CLAUDE.md — Antea

Project context for Claude Code. Read this fully before making changes.

## What this is

Antea is an atlas of lost cities: a time-aware world map where users spin a
globe, descend into flagship historical cities rendered as low-poly 3D dioramas,
and travel through eras with a timeline — watching Byzantion become
Constantinople become Kostantiniyye. Each place/era pairing has a "dossier":
population, ruler, and a short sourced narrative. The product values are
evocation over simulation (abstract low-poly, never fake precision), honesty
about uncertainty (confidence flags, "artistic approximation" labels, cited
sources), and every place-era being a crawlable URL (SEO is the growth engine).

## Current state

- `prototype/antea.html` — v1 (not in this repo): self-contained Three.js diorama of
  Constantinople across 4 eras (667 BC → AD 1550). Procedural terrain, instanced
  houses, parametric landmarks, era transitions, glass UI, custom orbit controls.
- `prototype/antea-globe.html` — v2: adds a MapLibre GL globe view
  (demotiles style repainted to our palette, spinning globe, city markers,
  fly-in descent to the diorama) and right-drag/two-finger panning.
- `docs/architecture.md` — full stack reference. Follow it unless it conflicts
  with reality; then update it in the same PR.

## Target stack (see docs/architecture.md for rationale)

- **Monorepo:** pnpm workspaces. `apps/web`, `packages/landmark-kit`,
  `packages/city-specs`, `packages/schema`, `pipeline/`, `tiles/`, `infra/`.
- **Web:** Next.js (App Router) + TypeScript + Tailwind. React 18+.
- **World view:** MapLibre GL JS v5+, `projection: globe`. Tiles as PMTiles on
  Cloudflare R2. OpenHistoricalMap layers for historical borders (time filter
  on `start_date`/`end_date` properties).
- **Dioramas:** Three.js. Port the prototype into a `<Diorama spec={...}>`
  component driven entirely by a city-spec JSON. No hand-placed meshes in app
  code — everything comes from the spec + the landmark kit.
- **State:** Zustand. **DB:** Postgres + PostGIS on Neon. **API:** Next.js
  route handlers for now. **Pipeline:** Python 3.12, runs via GitHub Actions.

## Phase 1 tasks (in order)

1. Scaffold the monorepo (pnpm, Next.js app, TypeScript strict, ESLint+Prettier,
   Vitest). Plain CSS variables + Tailwind for the design system below.
2. Extract the prototype into modules:
   - `packages/landmark-kit`: `terrain.ts`, `builders/` (temple, basilicaDome,
     minaret, wall, tower, hippodrome, column, pavilionCluster, ships, houses,
     trees), each a pure function `(THREE, spec) => Group | InstancedMesh`.
   - `packages/city-specs/constantinople.json`: eras, landmark placements,
     terrain params, dossier copy — byte-for-byte the content in the prototype.
   - `apps/web/components/diorama/Diorama.tsx`: renders any spec; owns the
     render loop, controls (orbit + pan + pinch), era transitions.
3. Pages: `/` (globe), `/city/[slug]` (diorama), `/city/[slug]/[year]`
   (diorama at era + dossier, statically generated, full meta tags).
4. Globe: port v2 globe code into a `WorldGlobe.tsx`; markers from
   `city-specs`; descent = flyTo + route change with a crossfade.
5. CI: typecheck, lint, test, build on PR.

Do NOT start Phase 2 (OHM border tiles, Postgres, ingest pipeline) until
Phase 1 is merged and deployed.

## Conventions

- TypeScript strict; no `any` without a comment saying why.
- All 3D math and placement logic must be pure and unit-testable (the prototype
  bug we caught — landmarks in water — must be a test: every spec landmark and
  ship asserts land/water correctly against the terrain function).
- Deterministic generation: seed all randomness (`mulberry32`) from the spec so
  a city looks identical on every load and in tests.
- Performance budget: diorama ≤ 1.5 MB JS gzipped (Three.js included),
  60 fps on a mid-range phone, zero render loop work while the globe view is
  active. MapLibre and Three must be code-split per route.
- Accessibility floor: keyboard operable timeline and view switching, visible
  focus, `prefers-reduced-motion` disables idle drift and count-ups.
- Copy style: sentence case, plain verbs, no exclamation marks. Dossier prose
  is editorial content — never lorem ipsum, never invented facts; leave
  `TODO(source)` markers if data is missing.

## Design tokens (do not improvise new ones)

- Base `#e9e6dd` · Ink `#22302f` · Ink-soft `#66756f` · Verdigris `#38756a`
- Glass `rgba(252,251,247,.68)` with 14–18px backdrop blur, 1px line
  `rgba(34,48,47,.14)`, radius 22px panels / 999px pills.
- Type: Fraunces (display, numbers) + Archivo (UI). No all-caps labels.
- 3D palette lives in the city spec, not in components.

## Data licensing rules (hard requirements)

- OSM-derived geometry stays in its own tileset with attribution (ODbL).
  Never import OSM data into the editorial Postgres database.
- Pleiades data is CC-BY: attribute in the UI footer and on dossier pages.
- OHM and Wikidata are CC0. Our editorial content (dossiers, specs) is ours.
- Every factual claim row in the DB must reference a `source` row.

## Gotchas learned so far

- Three.js r128+: no OrbitControls import in this setup — we ship our own
  spherical-coordinate controls (see prototype); keep them, they're 60 lines.
- MapLibre globe: call `map.setProjection({type:"globe"})` after `style.load`.
- A vector tileset's name is not its layer's name. OHM serves `land_polygons`
  with an internal layer called `land`. A wrong `source-layer` fails silently —
  tiles fetch and parse, then match nothing and draw nothing, with no error.
  Decode a real tile to check the layer name before suspecting anything else.
- Worker errors never reach the page console; they fire an `error` event on the
  Worker object. "No console errors" says nothing about a worker.
- OHM time filtering uses `start_decdate`/`end_decdate` (decimal years), not the
  `start_date`/`end_date` strings — only the former compare numerically.
- `maplibre-gl.css` loads after the app stylesheet, and its
  `.maplibregl-map { position: relative }` beats Tailwind's `.absolute` on
  source order — same specificity, later in the cascade. A map container
  positioned only with `absolute inset-0` silently collapses to zero height
  and MapLibre falls back to a 300px canvas. Always give it `h-full w-full`.
- MapLibre measures its container once, at construction, and never re-measures.
  Every map needs a ResizeObserver calling `map.resize()`, or it is wrong after
  any layout settle, window resize or orientation change.
- InstancedMesh: set `.count` after filling matrices and flag
  `instanceMatrix.needsUpdate`, or instances silently don't render.
- Terrain-dependent placement must be validated numerically, not visually.
- cdnjs pins in the prototypes are for the standalone demos only; the app
  imports from npm.

## Commands (once scaffolded — keep this section updated)

```
pnpm install
pnpm dev          # apps/web on :3000
pnpm test         # vitest, includes spec placement validation
pnpm build        # all workspaces
pnpm lint
```
