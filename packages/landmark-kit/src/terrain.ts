import type { TerrainSpec } from '@antea/schema';

/**
 * The terrain heightfield. Pure maths, no Three.js — this is the function every
 * placement in a city spec is validated against, so it has to be callable from
 * a test with nothing else booted.
 *
 * Ported from the `landMask` / `landH` / `onLand` / `groundY` block of
 * `prototype/antea-globe.html`, with the constants that were inline there
 * (peninsula ellipses, hill positions, noise frequencies) lifted into the spec.
 */

/** Smoothstep-falloff elliptical blob, 1 at the centre and 0 at the rim. */
export function blob(
  x: number,
  z: number,
  cx: number,
  cz: number,
  rx: number,
  rz: number,
): number {
  const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
  const t = 1 - Math.min(1, d);
  return t * t * (3 - 2 * t);
}

/** Union of the spec's land blobs: 0 offshore, 1 at the heart of the landmass. */
export function landMask(spec: TerrainSpec, x: number, z: number): number {
  let mask = 0;
  for (const b of spec.blobs) {
    mask = Math.max(mask, blob(x, z, b.cx, b.cz, b.rx, b.rz) * (b.weight ?? 1));
  }
  return mask;
}

/** Ground height above the datum. 0 well offshore. */
export function landHeight(spec: TerrainSpec, x: number, z: number): number {
  const mask = landMask(spec, x, z);
  if (mask <= 0) return 0;

  const { primary, secondary, maskInfluence } = spec.noise;
  const noise =
    Math.sin(x * primary.fx) * Math.cos(z * primary.fz) * primary.amplitude +
    Math.sin(x * secondary.fx + z * secondary.fz) * secondary.amplitude;

  let h = mask * spec.heightScale + noise * Math.min(1, mask * maskInfluence);

  for (const hill of spec.hills) {
    const falloff = Math.exp(-((x - hill.cx) ** 2 + (z - hill.cz) ** 2) / hill.spread);
    const weight = hill.maskMode === 'sqrt' ? Math.sqrt(mask) : mask;
    h += hill.height * falloff * weight;
  }

  return Math.max(0, h);
}

/** True where the ground is high enough above the waterline to build on. */
export function isLand(spec: TerrainSpec, x: number, z: number): boolean {
  return landHeight(spec, x, z) > spec.waterLevel + spec.landThreshold;
}

/** True where a hull would float: below the waterline by a clear margin. */
export function isWater(spec: TerrainSpec, x: number, z: number): boolean {
  return landHeight(spec, x, z) < spec.waterLevel - spec.waterThreshold;
}

/** The surface something sits on — ground where there is land, water otherwise. */
export function surfaceY(spec: TerrainSpec, x: number, z: number): number {
  return Math.max(spec.waterLevel, landHeight(spec, x, z));
}

/** Sampler bound to one spec, so builders do not each carry the spec around. */
export interface TerrainSampler {
  height(x: number, z: number): number;
  isLand(x: number, z: number): boolean;
  isWater(x: number, z: number): boolean;
  surfaceY(x: number, z: number): number;
  readonly waterLevel: number;
  /** The point the settlement grows out from. */
  readonly origin: { x: number; z: number };
}

export function createTerrainSampler(spec: TerrainSpec): TerrainSampler {
  return {
    height: (x, z) => landHeight(spec, x, z),
    isLand: (x, z) => isLand(spec, x, z),
    isWater: (x, z) => isWater(spec, x, z),
    surfaceY: (x, z) => surfaceY(spec, x, z),
    waterLevel: spec.waterLevel,
    origin: spec.origin,
  };
}
