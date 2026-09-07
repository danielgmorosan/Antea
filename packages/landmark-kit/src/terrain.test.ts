import type { TerrainSpec } from '@antea/schema';
import { describe, expect, it } from 'vitest';
import {
  blob,
  createTerrainSampler,
  isLand,
  isWater,
  landHeight,
  landMask,
  surfaceY,
} from './terrain';

/** A deliberately simple island: one blob, one hill, no noise. */
const flat: TerrainSpec = {
  size: { width: 40, depth: 40 },
  segments: { x: 16, z: 16 },
  blobs: [{ cx: 0, cz: 0, rx: 10, rz: 10 }],
  hills: [{ cx: 0, cz: 0, height: 1, spread: 10, maskMode: 'linear' }],
  heightScale: 2,
  noise: {
    primary: { amplitude: 0, fx: 1, fz: 1 },
    secondary: { amplitude: 0, fx: 1, fz: 1 },
    maskInfluence: 1,
  },
  waterLevel: 0.5,
  landThreshold: 0.2,
  waterThreshold: 0.1,
  bands: {
    waterEdge: -0.1,
    shoreTop: 0.3,
    grassTop: 2,
    rockLerp: { from: 0.5, over: 2 },
  },
  origin: { x: 0, z: 0 },
  colours: { water: 'water', shore: 'shore', grass: 'grass', rock: 'rock' },
};

describe('blob', () => {
  it('is 1 at the centre and 0 at the rim', () => {
    expect(blob(0, 0, 0, 0, 5, 5)).toBeCloseTo(1);
    expect(blob(5, 0, 0, 0, 5, 5)).toBeCloseTo(0);
    expect(blob(50, 50, 0, 0, 5, 5)).toBe(0);
  });

  it('falls off monotonically', () => {
    let previous = Infinity;
    for (let d = 0; d <= 5; d += 0.5) {
      const v = blob(d, 0, 0, 0, 5, 5);
      expect(v).toBeLessThanOrEqual(previous);
      previous = v;
    }
  });

  it('respects an elliptical radius', () => {
    // Half a radius out on each axis should give the same falloff.
    expect(blob(5, 0, 0, 0, 10, 2)).toBeCloseTo(blob(0, 1, 0, 0, 10, 2));
  });
});

describe('landMask', () => {
  it('unions blobs by taking the strongest', () => {
    const twoIslands: TerrainSpec = {
      ...flat,
      blobs: [
        { cx: -10, cz: 0, rx: 5, rz: 5 },
        { cx: 10, cz: 0, rx: 5, rz: 5 },
      ],
    };
    expect(landMask(twoIslands, -10, 0)).toBeCloseTo(1);
    expect(landMask(twoIslands, 10, 0)).toBeCloseTo(1);
    expect(landMask(twoIslands, 0, 0)).toBe(0);
  });

  it('applies a blob weight', () => {
    const weighted: TerrainSpec = {
      ...flat,
      blobs: [{ cx: 0, cz: 0, rx: 10, rz: 10, weight: 0.5 }],
    };
    expect(landMask(weighted, 0, 0)).toBeCloseTo(0.5);
  });
});

describe('landHeight', () => {
  it('is zero off the landmask', () => {
    expect(landHeight(flat, 100, 100)).toBe(0);
  });

  it('adds the hill on top of the mask', () => {
    // mask 1 * heightScale 2, plus hill height 1 at its centre.
    expect(landHeight(flat, 0, 0)).toBeCloseTo(3);
  });

  it('never returns a negative height', () => {
    for (let x = -30; x <= 30; x += 1.5) {
      for (let z = -30; z <= 30; z += 1.5) {
        expect(landHeight(flat, x, z)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic', () => {
    const a = landHeight(flat, 3.3, -1.7);
    const b = landHeight(flat, 3.3, -1.7);
    expect(a).toBe(b);
  });

  it('applies sqrt hills more strongly near the shore than linear ones', () => {
    const point = { x: 8, z: 0 };
    const linear = landHeight(flat, point.x, point.z);
    const sqrt = landHeight(
      { ...flat, hills: [{ ...flat.hills[0]!, maskMode: 'sqrt' }] },
      point.x,
      point.z,
    );
    expect(sqrt).toBeGreaterThan(linear);
  });
});

describe('land and water predicates', () => {
  it('are mutually exclusive', () => {
    for (let x = -20; x <= 20; x += 0.5) {
      const land = isLand(flat, x, 0);
      const water = isWater(flat, x, 0);
      expect(land && water).toBe(false);
    }
  });

  it('leaves a shore band that is neither open water nor buildable', () => {
    const shorePoints: number[] = [];
    for (let x = -20; x <= 20; x += 0.1) {
      if (!isLand(flat, x, 0) && !isWater(flat, x, 0)) shorePoints.push(x);
    }
    expect(shorePoints.length).toBeGreaterThan(0);
  });

  it('calls the island centre land and the open sea water', () => {
    expect(isLand(flat, 0, 0)).toBe(true);
    expect(isWater(flat, 0, 0)).toBe(false);
    expect(isWater(flat, 100, 100)).toBe(true);
    expect(isLand(flat, 100, 100)).toBe(false);
  });
});

describe('surfaceY', () => {
  it('clamps to the waterline at sea', () => {
    expect(surfaceY(flat, 100, 100)).toBe(flat.waterLevel);
  });

  it('follows the ground on land', () => {
    expect(surfaceY(flat, 0, 0)).toBeCloseTo(landHeight(flat, 0, 0));
  });

  it('is never below the waterline', () => {
    for (let x = -30; x <= 30; x += 1.5) {
      expect(surfaceY(flat, x, 0)).toBeGreaterThanOrEqual(flat.waterLevel);
    }
  });
});

describe('createTerrainSampler', () => {
  it('binds a spec and matches the free functions', () => {
    const sampler = createTerrainSampler(flat);
    expect(sampler.height(2, 2)).toBe(landHeight(flat, 2, 2));
    expect(sampler.isLand(2, 2)).toBe(isLand(flat, 2, 2));
    expect(sampler.isWater(50, 50)).toBe(isWater(flat, 50, 50));
    expect(sampler.surfaceY(2, 2)).toBe(surfaceY(flat, 2, 2));
    expect(sampler.waterLevel).toBe(flat.waterLevel);
    expect(sampler.origin).toEqual(flat.origin);
  });
});
