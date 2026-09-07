# Antea

The atlas of lost cities. Spin the globe, descend into low-poly 3D reconstructions of
historical cities, and travel through the eras that shaped them.

## Layout

```
apps/web              Next.js (App Router) — globe, dioramas, dossier pages
packages/schema       The CitySpec contract every city is written against
packages/city-specs   Editorial city data (eras, landmarks, terrain, dossiers)
packages/landmark-kit Pure Three.js builders: terrain + parametric landmarks
prototype/            Self-contained HTML prototypes, kept for reference
docs/                 Architecture reference
```

## Getting started

```bash
pnpm install
pnpm dev          # apps/web on :3000
pnpm test         # vitest across all workspaces
pnpm typecheck
pnpm lint
pnpm build
pnpm check        # typecheck + lint + format:check + test
```

Requires Node >= 20.9 and pnpm 9.

## Where things stand

Phase 1, task 1 (scaffold) is done. Task 2 — extracting
`prototype/palimpsest-globe.html` into `landmark-kit` and `city-specs` — is next.
See `CLAUDE.md` for the full brief and phase order.
