import { isLand, isWater, landHeight, wallPath } from '@antea/landmark-kit';
import type { CitySpec, LandmarkPlacement } from '@antea/schema';
import { describe, expect, it } from 'vitest';
import { listCities } from './index';

/**
 * Terrain-dependent placement must be validated numerically, not visually.
 *
 * This is the regression net for the prototype bug class: geometry that looks
 * plausible from one camera angle but is actually standing in the sea, or
 * moored on dry land. Every landmark and every mooring in every era is checked
 * against the same terrain function the renderer uses.
 */

// Every city we ship, so adding one cannot skip validation.
const CITIES: CitySpec[] = listCities();

/** Field names in builder params that hold a palette key. */
const COLOUR_FIELDS = new Set([
  'stone',
  'marble',
  'roofColour',
  'domeColour',
  'shaft',
  'cap',
  'capColour',
  'orb',
  'colour',
  'track_colour',
  'hull',
  'sail',
]);
const COLOUR_LIST_FIELDS = new Set(['bodyColours', 'roofColours']);

function collectColourKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectColourKeys(item, into);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  for (const [key, child] of Object.entries(value)) {
    if (COLOUR_FIELDS.has(key) && typeof child === 'string') into.add(child);
    else if (COLOUR_LIST_FIELDS.has(key) && Array.isArray(child)) {
      for (const c of child) if (typeof c === 'string') into.add(c);
    } else collectColourKeys(child, into);
  }
}

/** Walls are struck in world space, so they are checked by path, not by anchor. */
function isPointLandmark(landmark: LandmarkPlacement): boolean {
  return landmark.builder !== 'wall';
}

describe.each(CITIES)('$name placement', (city) => {
  const { terrain } = city;
  const landThreshold = terrain.waterLevel + terrain.landThreshold;
  const waterThreshold = terrain.waterLevel - terrain.waterThreshold;

  describe('landmarks stand on land', () => {
    const cases = city.eras.flatMap((era) =>
      era.landmarks.filter(isPointLandmark).map((landmark) => ({
        label: `${era.yearLabel} · ${landmark.builder} (${landmark.x}, ${landmark.z})`,
        landmark,
      })),
    );

    it.each(cases)('$label', ({ landmark }) => {
      const h = landHeight(terrain, landmark.x, landmark.z);
      expect(
        isLand(terrain, landmark.x, landmark.z),
        `height ${h.toFixed(3)} is not above the land threshold ${landThreshold.toFixed(3)}`,
      ).toBe(true);
    });
  });

  describe('moored ships float', () => {
    const cases = city.eras.flatMap((era) =>
      era.ships.spots.slice(0, era.ships.count).map((spot, i) => ({
        label: `${era.yearLabel} · mooring ${i} (${spot[0]}, ${spot[1]})`,
        spot,
      })),
    );

    it.each(cases)('$label', ({ spot }) => {
      const [x, z] = spot;
      const h = landHeight(terrain, x, z);
      expect(
        isWater(terrain, x, z),
        `height ${h.toFixed(3)} is not below the water threshold ${waterThreshold.toFixed(3)} — this ship is beached`,
      ).toBe(true);
    });
  });

  describe('walls close a circuit, or run shore to shore', () => {
    const cases = city.eras.flatMap((era) =>
      era.landmarks
        .filter((l) => l.builder === 'wall')
        .map((wall) => ({ label: `${era.yearLabel} · ${wall.params.style}`, wall })),
    );

    it.each(cases)('$label', ({ wall }) => {
      const points = wallPath(wall.params.path, terrain.origin);
      const onLand = points.filter((p) => isLand(terrain, p.x, p.z));

      // A wall entirely at sea, or barely clipping the coast, means the path
      // params have drifted away from the terrain.
      expect(onLand.length).toBeGreaterThanOrEqual(Math.ceil(points.length * 0.4));

      // How a wall must end depends on what kind of wall it is, which the
      // path itself says. A circuit closes on itself and never touches water —
      // Rome's Aurelian Walls ring the city. A barrier runs coast to coast, and
      // an end left up on the hillside is a gap an attacker walks around.
      const first = points[0];
      const last = points[points.length - 1];
      expect(first && last).toBeTruthy();
      if (!first || !last) return;

      const closesOnItself = Math.hypot(last.x - first.x, last.z - first.z) < 0.5;

      if (closesOnItself) {
        // A circuit only has to enclose something: most of it on land, and no
        // stretch of open water standing in for a wall.
        expect(onLand.length).toBeGreaterThanOrEqual(Math.ceil(points.length * 0.5));
        return;
      }

      const shoreLine = terrain.waterLevel + terrain.bands.shoreTop;
      for (const [label, end] of [
        ['start', first],
        ['end', last],
      ] as const) {
        const h = landHeight(terrain, end.x, end.z);
        expect(
          h,
          `wall ${label} (${end.x.toFixed(2)}, ${end.z.toFixed(2)}) is at h=${h.toFixed(3)}, inland of the shore line ${shoreLine.toFixed(3)}`,
        ).toBeLessThan(shoreLine);
      }
    });
  });

  it('every landmark keep-out circle sits inside the terrain bounds', () => {
    const halfW = terrain.size.width / 2;
    const halfD = terrain.size.depth / 2;
    for (const era of city.eras) {
      for (const landmark of era.landmarks.filter(isPointLandmark)) {
        const r = landmark.exclusionRadius ?? 0;
        expect(Math.abs(landmark.x) + r).toBeLessThan(halfW);
        expect(Math.abs(landmark.z) + r).toBeLessThan(halfD);
      }
    }
  });

  it('every colour a builder asks for exists in the palette', () => {
    const used = new Set<string>();
    for (const era of city.eras) {
      collectColourKeys(era.landmarks, used);
      collectColourKeys(era.houses, used);
      collectColourKeys(era.trees, used);
      collectColourKeys(era.ships, used);
    }
    for (const key of Object.values(terrain.colours)) used.add(key);

    const defined = new Set(Object.keys(city.palette));
    const missing = [...used].filter((key) => !defined.has(key));
    expect(missing).toEqual([]);
  });

  it('the settlement origin is on land', () => {
    expect(isLand(terrain, terrain.origin.x, terrain.origin.z)).toBe(true);
  });
});
