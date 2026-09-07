/**
 * Landmark kit — pure builders that turn a city spec into Three.js objects.
 *
 * Three.js is injected into every builder rather than imported, so the
 * placement maths can be unit-tested with no WebGL context and this package
 * carries no hard runtime dependency on Three.
 *
 * Ported from `prototype/antea-globe.html`.
 */
export { mulberry32, pick, range, rangeInt } from './rng';

export {
  blob,
  createTerrainSampler,
  isLand,
  isWater,
  landHeight,
  landMask,
  surfaceY,
} from './terrain';
export type { TerrainSampler } from './terrain';

export { createPalette } from './palette';
export type { Palette } from './palette';

export { anchor, createKit } from './kit';
export type { Builder, BuilderInput, BuildContext, Exclusion, Kit } from './kit';

export { buildLandmark, exclusionsFor } from './buildLandmark';
export { buildEra, disposeGeometries } from './buildEra';
export type { EraScene } from './buildEra';
export { buildTerrainMesh } from './terrainMesh';

export * from './builders';
export type { Three } from './three';
