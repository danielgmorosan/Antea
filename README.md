# Antea

An atlas of lost cities — scrub through 5,000 years of borders and open
sourced articles for the places that rose and vanished.

**Antea** (Latin: *before*) is an interactive atlas of the world through
time: a modern Encarta built on a map. Drag the timeline and watch empires
bloom and dissolve; click any polity, city, or unnamed region for an
article. Reconstructions and borders are honest approximations with their
precision shown, never false certainty.

## Layout

```
apps/web          Next.js app — the atlas (map, time slider, article panel)
packages/chrono   Pure time/geometry logic, unit-tested (no DOM, no network)
prototype/        Standalone HTML prototypes (v1–v2 dioramas are parked;
                  v3 is the atlas this app is ported from)
docs/             Architecture and CLAUDE.md
```

## Develop

```
pnpm install
pnpm test      # vitest on packages/chrono
pnpm dev       # atlas on http://localhost:3000
pnpm build
```

Border data (3000 BC – AD 2000) lives in `apps/web/public/data/`, simplified
from [historical-basemaps](https://github.com/aourednik/historical-basemaps)
(A. Ourednik, GPL-3.0, research-grade — verify before citing). Regenerate
with `scripts/build-borders.py` against a clone of that repository.

## Honesty rules

Dashed borders are coarse scholarship, not knowledge. Unnamed regions are
peoples without fixed states, not empty land. Every factual claim in the
database must reference a source. See `docs/CLAUDE.md`.
