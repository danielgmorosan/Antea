import { describe, expect, it } from 'vitest';
import {
  boundaryFilter,
  buildGlobeStyle,
  OHM_ATTRIBUTION,
  TIME_FILTERED_LAYERS,
} from './ohm';

/**
 * A tiny evaluator for the handful of expression operators the boundary filter
 * uses. It exists so the filter's *meaning* is tested, not just its shape — a
 * structural assertion would happily pass a filter with the comparison
 * inverted, which is exactly the mistake worth catching.
 */
type Feature = Record<string, number | undefined>;

function evaluate(expr: unknown, feature: Feature): unknown {
  if (!Array.isArray(expr)) return expr;
  const [op, ...args] = expr as [string, ...unknown[]];

  switch (op) {
    case 'all':
      return args.every((a) => evaluate(a, feature) === true);
    case 'get':
      return feature[evaluate(args[0], feature) as string];
    case 'coalesce': {
      for (const a of args) {
        const v = evaluate(a, feature);
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    }
    case '<=':
      return (
        (evaluate(args[0], feature) as number) <= (evaluate(args[1], feature) as number)
      );
    case '>=':
      return (
        (evaluate(args[0], feature) as number) >= (evaluate(args[1], feature) as number)
      );
    default:
      throw new Error(`evaluator does not implement "${op}"`);
  }
}

const visible = (feature: Feature, year: number) =>
  evaluate(boundaryFilter(year), feature) === true;

describe('boundaryFilter', () => {
  it('shows a polity during its lifespan and hides it outside', () => {
    // The Latin Empire of Constantinople, 1204-1261.
    const latinEmpire = { start_decdate: 1204, end_decdate: 1261 };
    expect(visible(latinEmpire, 1204)).toBe(true);
    expect(visible(latinEmpire, 1230)).toBe(true);
    expect(visible(latinEmpire, 1261)).toBe(true);
    expect(visible(latinEmpire, 1203)).toBe(false);
    expect(visible(latinEmpire, 1262)).toBe(false);
  });

  it('includes both endpoints', () => {
    const f = { start_decdate: 500, end_decdate: 600 };
    expect(visible(f, 500)).toBe(true);
    expect(visible(f, 600)).toBe(true);
  });

  it('treats a missing start as having always existed', () => {
    const f = { end_decdate: 1453 };
    expect(visible(f, -3000)).toBe(true);
    expect(visible(f, 1453)).toBe(true);
    expect(visible(f, 1454)).toBe(false);
  });

  it('treats a missing end as still existing', () => {
    const f = { start_decdate: 1923 };
    expect(visible(f, 1922)).toBe(false);
    expect(visible(f, 2026)).toBe(true);
  });

  it('shows a feature with no dates at all in every year', () => {
    for (const year of [-667, 537, 1200, 1560, 2026]) {
      expect(visible({}, year)).toBe(true);
    }
  });

  it('handles BC years, which are negative', () => {
    // Byzantion is founded c. 667 BC.
    const byzantion = { start_decdate: -667, end_decdate: 330 };
    expect(visible(byzantion, -700)).toBe(false);
    expect(visible(byzantion, -667)).toBe(true);
    expect(visible(byzantion, -100)).toBe(true);
    expect(visible(byzantion, 331)).toBe(false);
  });

  it('separates two polities on the same ground in different centuries', () => {
    const byzantine = { start_decdate: 330, end_decdate: 1453 };
    const ottoman = { start_decdate: 1453, end_decdate: 1922 };
    expect(visible(byzantine, 537)).toBe(true);
    expect(visible(ottoman, 537)).toBe(false);
    expect(visible(byzantine, 1560)).toBe(false);
    expect(visible(ottoman, 1560)).toBe(true);
  });
});

describe('buildGlobeStyle', () => {
  const style = buildGlobeStyle(1560);

  it('is a version 8 style with glyphs, which labels require', () => {
    expect(style.version).toBe(8);
    expect(style.glyphs).toBeTruthy();
  });

  it('points every source at OHM and credits it', () => {
    const sources = Object.values(style.sources) as {
      tiles?: string[];
      attribution?: string;
    }[];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.tiles?.[0]).toContain('openhistoricalmap.org');
      expect(source.attribution).toBe(OHM_ATTRIBUTION);
    }
  });

  it('credits OpenStreetMap too, since the land is ODbL-derived', () => {
    expect(OHM_ATTRIBUTION).toContain('OpenStreetMap');
    expect(OHM_ATTRIBUTION).toContain('ODbL');
    expect(OHM_ATTRIBUTION).toContain('CC0');
  });

  it('gives every vector layer a source-layer', () => {
    for (const layer of style.layers) {
      if (layer.type === 'background') continue;
      expect(layer).toHaveProperty('source-layer');
    }
  });

  it('carries the year into exactly the time-filtered layers', () => {
    const filtered = style.layers
      .filter((l) => 'filter' in l && l.filter !== undefined)
      .map((l) => l.id);
    expect(filtered.sort()).toEqual([...TIME_FILTERED_LAYERS].sort());
  });

  it('builds a different filter for a different year', () => {
    expect(JSON.stringify(boundaryFilter(537))).not.toBe(
      JSON.stringify(boundaryFilter(1560)),
    );
  });
});
