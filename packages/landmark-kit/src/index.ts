/**
 * Landmark kit — pure builders that turn a city spec into Three.js objects.
 *
 * Every builder is a pure function `(THREE, spec) => Group | InstancedMesh`:
 * THREE is injected rather than imported so this package stays free of a
 * hard Three.js dependency and the placement maths stays unit-testable.
 *
 * Phase 1 task 2 ports `terrain.ts` and `builders/` out of
 * `prototype/palimpsest-globe.html` into here.
 */
export { mulberry32, pick, range, rangeInt } from './rng';
