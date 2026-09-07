# Antea — architecture

The stack reference for Antea, an atlas of lost cities. `CLAUDE.md` is the brief:
what we are building and in what order. This document is the other half: how the
thing is actually put together, why, and where it is currently wrong.

It describes the repository as it stands. Where something is planned but not
built, it says so — a reference that quietly describes intentions as facts is
worse than no reference.

---

## 1. The one architectural idea

**A city is data. The application is a renderer.**

Everything visible in a diorama — the coastline, the hills, every landmark, the
housing density, the moored ships, the editorial prose, the palette — comes from
a single JSON city spec validated against `@antea/schema`. No component contains
a hand-placed mesh, a hard-coded colour, or a sentence of copy.

The payoff is that adding Rome is a data exercise, not a coding one, and that
the parts most likely to be wrong (terrain placement, determinism, citations)
are pure functions and plain data that a test can interrogate without booting a
browser.

The constraint this imposes: **the landmark kit may never import Three.js.**
Three is injected into every builder as an argument, so the placement maths runs
in a test with no WebGL context and no DOM.

---

## 2. Status

| Area                                               | State                               |
| -------------------------------------------------- | ----------------------------------- |
| Monorepo, TypeScript strict, lint/format/test gate | built                               |
| `@antea/schema` — the city spec contract           | built                               |
| `@antea/landmark-kit` — terrain + 11 builders      | built                               |
| `@antea/city-specs` — Constantinople, 4 eras       | built                               |
| Diorama renderer, era transitions, camera controls | built                               |
| Routing, static generation, metadata, sitemap      | built                               |
| Editorial sources with provenance                  | built                               |
| World globe                                        | built, **basemap broken** — see §11 |
| CI on push and PR                                  | built                               |
| Vercel deployment                                  | built, behind Deployment Protection |
| OHM border tiles, PMTiles on R2                    | Phase 2, not started                |
| Postgres + PostGIS, ingest pipeline                | Phase 2, not started                |
| Cities beyond Constantinople                       | not started                         |

---

## 3. Layout

```
apps/web                  Next.js App Router — the only deployable
  app/                    routes, metadata, sitemap, robots
  components/diorama/     Diorama, CityView, Dossier, Timeline, controls
  components/globe/       WorldGlobe, GlobeView
  lib/                    site URL resolution
packages/schema           the CitySpec contract. No dependencies, by design
packages/landmark-kit     terrain maths + pure Three.js builders
packages/city-specs       editorial city data + loader/validator
prototype/                antea-globe.html, the frozen original. Reference only
docs/                     this file
```

Dependency direction is one-way and enforced by package manifests:

```
schema  ←  landmark-kit  ←  city-specs  ←  web
```

`schema` depends on nothing. Nothing depends on `web`.

### Internal packages ship TypeScript source

They have no build step. `main` and `types` point at `src/index.ts`, and
`next.config.ts` lists them in `transpilePackages`. Next compiles them with the
app; Vitest reads the same files.

The alternative — `tsc` emitting `dist/` per package — buys nothing here and
adds a build graph to keep in sync and stale-output bugs to chase. Revisit only
if a package is ever published to npm.

---

## 4. The city spec

`packages/schema/src/index.ts` is the whole contract. A `CitySpec` is:

- **identity** — `slug`, `name`, `location` (WGS84, for the globe marker)
- **`seed`** — the integer every random draw in the city derives from
- **`palette`** — the 3D colours, keyed by name. Builders reference keys, never
  hex. The design tokens in §7 are the UI; this is the diorama, and the two are
  deliberately separate
- **`terrain`** — elliptical land blobs, gaussian hills, a two-octave noise
  field, water level, land/water thresholds, colour bands, and the `origin` the
  settlement grows out from
- **`eras`** — ordered, each with a dossier, landmark placements and procedural
  fill parameters
- **`defaultEraYear`** — where a bare `/city/[slug]` lands
- **`sources`** — the citations the dossiers point at

### Landmarks are a discriminated union

`LandmarkPlacement` is a union tagged by `builder`, so each variant carries only
the parameters its builder understands, and `buildLandmark`'s switch is
exhaustive — adding a builder to the schema fails to compile until it is wired
up.

The split between spec and builder: **the spec says which landmark and where;
the builder knows how to model a cornice.** Proportions that never vary stay as
documented constants inside the builder. Knobs that differ between real
buildings are spec parameters — which is why one `basilicaDome` builder produces
Hagia Sophia as a basilica, the same mass reworked as a mosque, and the
Süleymaniye.

### JSON meets the type system exactly once

`resolveJsonModule` types a JSON import structurally, which cannot satisfy a
discriminated union — `builder` widens to `string`. Rather than cast blind,
`parseCitySpec` checks at load what the type system cannot: the union tag, era
ordering, terrain fields, source ids, provenance values, and that every dossier
cites something. The single assertion at the end is backed by those checks.

It runs at module load, so a malformed spec fails the build, not a page view.

---

## 5. Rendering the diorama

Three.js, one `<canvas>`, a render loop owned by `Diorama.tsx`.

- **Terrain** is a vertex-coloured `PlaneGeometry` displaced by `landHeight`,
  plus a translucent water plane. Colour bands come from the spec.
- **Landmarks** are built per era by `buildEra`, which seeds
  `mulberry32(spec.seed + era.year)` — so an era is identical on every load and
  in every test, and editing one era never reshuffles another.
- **Housing, cypress and shipping** are rejection-sampled onto land, inside the
  era's extent and outside every landmark's keep-out circle. Houses and trees
  are `InstancedMesh`; set `.count` after filling matrices and flag
  `instanceMatrix.needsUpdate`, or nothing renders.
- **Keep-out circles come from the spec**, not from the builders. Builders used
  to push to a shared list, which made house layout depend on the order
  landmarks happened to be built in.
- **Era transitions** scale the outgoing group's Y to nothing while the incoming
  group grows. Driven by `performance.now()`, not accumulated frame deltas: a
  backgrounded tab stops receiving animation frames, and an accumulator leaves
  the city frozen half-built on return.
- **Camera** is our own sixty lines of spherical orbit, pan and pinch. Three
  does not ship OrbitControls in the main bundle and the addons build pulls in
  far more than we use.
- The scene is rebuilt only when the **city** changes, keyed on `spec.slug`.
  Changing era swaps the contents and leaves the terrain and WebGL context
  alone.

## 6. Rendering the globe

MapLibre GL, `projection: globe`, the MapLibre demo tiles repainted into our
palette. This is a placeholder basemap; Phase 2 replaces it with our own PMTiles
on R2.

The globe is `aria-hidden`, and the same cities appear beside it as ordinary
links — so keyboard users, screen readers and crawlers never depend on a canvas.

**The basemap does not currently render landmasses.** See §11.

---

## 7. Routing, SEO and the design system

Every place-era pairing is a statically generated URL, because search is the
growth engine.

```
/                              globe
/city/[slug]                   308 → the city's defaultEraYear
/city/[slug]/[year]            the real page, one per era
/sitemap.xml  /robots.txt      generated from the specs
```

Era segments read as `667-bc` and `537`, not `-667`. `/city/[slug]` redirects
rather than rendering a second copy of one era, so there is exactly one URL per
place-era and no duplicate content.

**Era changes rewrite the URL with `pushState` instead of navigating.** A route
change would remount the canvas and rebuild the terrain on every timeline click,
which is the whole cost the spec model exists to avoid. Cold loads and crawlers
get static HTML; movement in the browser is a swap. Back and forward step
through eras, and timeline stops are real anchors, so they stay crawlable and
middle-clickable.

`metadataBase` comes from `resolveSiteUrl()`, which prefers
`NEXT_PUBLIC_SITE_URL`, falls back to Vercel's own domain, and treats an empty
string as unset — an empty environment variable reaching `new URL('')` once
broke the production build at module evaluation.

**Design tokens** live in `@theme` in `globals.css`, so each token is both a
plain CSS variable and a Tailwind utility, defined once. Fraunces and Archivo
load through `next/font`. Do not improvise tokens; the list in `CLAUDE.md` is
the whole system.

---

## 8. Editorial integrity

The product claim is honesty about uncertainty, so uncertainty is modelled
rather than smoothed away.

- **`Source.kind`** records provenance: `contemporary`, `later-tradition`, or
  `modern-scholarship`. Flattening these would let a 9th-century legend read
  like an eyewitness. It is rendered on the dossier, not just stored.
- **`Source.note`** carries the caveat — that a famous quotation is a later
  attribution, that an estimate is disputed.
- **`Dossier.populationConfidence`** flags every figure as recorded, inferred or
  approximate.
- **`Dossier.unsourcedClaims`** names what has _not_ been sourced, so a reader
  can see the gap instead of assuming the citations above it cover everything.
  This is the structured form of the brief's `TODO(source)` marker.

`parseCitySpec` rejects a dossier that cites nothing. Inventing a citation to
satisfy it would defeat the point; leave the claim in `unsourcedClaims`.

### Licensing (hard requirements)

- OSM-derived geometry stays in its own tileset with ODbL attribution, and never
  enters the editorial database.
- Pleiades is CC-BY — attribute in the footer and on dossier pages.
- OHM and Wikidata are CC0. Dossiers and specs are ours.

---

## 9. Determinism and testing

119 tests across 7 files. Vitest, one project per package.

| File                              | What it defends                                           |
| --------------------------------- | --------------------------------------------------------- |
| `landmark-kit/terrain.test.ts`    | the heightfield: falloff, hills, land/water predicates    |
| `landmark-kit/rng.test.ts`        | `mulberry32` is deterministic and uniform                 |
| `city-specs/placement.test.ts`    | **every landmark on land, every mooring on water**        |
| `city-specs/buildability.test.ts` | every era places all its houses, and rebuilds identically |
| `city-specs/sources.test.ts`      | every dossier cited, no orphan or duplicate sources       |
| `city-specs/era.test.ts`          | era slugs round-trip and stay unique                      |
| `web/lib/site.test.ts`            | the site URL never throws, whatever the environment       |

The placement test is the one that matters most. Terrain-dependent placement
must be validated numerically, never visually: geometry can look plausible from
one camera angle and still be standing in the sea. Porting the prototype found
exactly that — a ship moored at height 0.639 against a waterline of 0.62, inside
the terrain, from AD 1200 onward.

**Seed everything.** `Math.random` is banned in spec-driven code. If a city does
not look identical on every load, the tests cannot assert anything about it.

---

## 10. Performance, accessibility, delivery

**Budget:** ≤ 1.5 MB gzipped for a diorama route, 60 fps on a mid-range phone,
no render-loop work while the globe is on screen.

Currently: Three 184 KB gzipped and MapLibre 268 KB gzipped sit in separate
chunks — neither route loads both — against 638 KB for all chunks combined. Both
libraries are pulled in through `next/dynamic` with `ssr: false`.

**Accessibility floor:** the timeline is keyboard operable and its stops are real
links; focus is visible; `prefers-reduced-motion` disables idle camera drift, the
globe spin and the descent flight.

**CI** runs typecheck, lint, format check, test and build on every push and PR.
`pnpm check` runs the first four locally; it does not build, so run `pnpm build`
too before pushing anything that touches routing or metadata — that is where the
build has actually broken before.

`pnpm/action-setup` must not be given a `version` input: it fails outright when
pnpm is pinned both there and by `packageManager` in `package.json`.

---

## 11. Known problems

### The globe renders no landmasses — unresolved

The sphere, the palette and the city markers are correct. The basemap is empty.

Established:

- Not environmental. A pristine MapLibre map with none of our code fails
  identically, in dev and production builds, on maplibre-gl 5.6.0 and 5.24.0.
- `style.json` and `tiles.json` fetch successfully; **no `.pbf` tile is ever
  requested**; no error is raised.
- `load` and `idle` never fire with this style, so there is no natural event to
  wait on.
- The one sequence that _did_ render land: let the map load flat, then call
  `setProjection({type:'globe'})` on the live map. Reproducing that as startup
  code has so far failed — constructing in mercator does not reproduce it, which
  suggests the projection change forces a source reload that the initial load
  does not perform.
- After a deferred `setProjection`, paint properties applied with
  `setPaintProperty` appear to be lost.

Phase 2 replaces this basemap entirely, which may remove the problem. Worth an
upstream issue rather than more blind iteration.

### Gotchas that have already cost time

- **`maplibre-gl.css` loads after the app stylesheet.** Its
  `.maplibregl-map { position: relative }` has the same specificity as
  Tailwind's `.absolute` and wins on source order, dropping `inset-0` and
  collapsing the container to zero height. Always give a map container
  `h-full w-full`.
- **MapLibre measures its container once**, at construction, and never
  re-measures. Every map needs a `ResizeObserver` calling `map.resize()`.
- **`THREE.Clock` is deprecated** since r183. Use `THREE.Timer`.
- **Walls are built in world space**, unlike point landmarks. Their path is
  struck from the terrain origin, so they must not also be anchored.
- **Prettier's Tailwind plugin reorders class strings.** A scripted
  find-and-replace against a className written before formatting will silently
  miss.

---

## 12. Open decisions

Phase 2 is gated on Phase 1 being merged and deployed. Both are now true, but
these are unresolved:

1. **Tile hosting.** PMTiles on Cloudflare R2 is the plan. Not started, and it
   is entangled with §11.
2. **Historical borders.** OpenHistoricalMap layers filtered on
   `start_date`/`end_date`. Volume and licensing need checking before ingest.
3. **Database.** Postgres + PostGIS on Neon is the plan; nothing needs it yet.
   The editorial content is small, static, and currently well served by JSON in
   the repo, which is also diffable and reviewable. Introduce a database when
   there is a reason, not on schedule.
4. **State management.** `zustand` is a declared dependency but is **imported
   nowhere**. Era state is local component state plus the URL, which has been
   sufficient. Either use it or drop the dependency.
5. **Dossier sourcing at scale.** Constantinople's citations were researched and
   verified individually. That does not obviously scale to dozens of cities, and
   the standard must not slip when it gets inconvenient.
6. **Population figures.** Two of four eras have no source for their population.
   They are declared as gaps rather than quietly filled.
