import { SOURCE_KINDS, type CitySpec } from '@antea/schema';
import { describe, expect, it } from 'vitest';
import { constantinople } from './index';
import { parseCitySpec } from './parse';

/**
 * Editorial integrity.
 *
 * The brief is explicit that dossier prose is editorial content with no
 * invented facts, and that every claim points at a source. These are the
 * checks that keep that true as cities are added.
 */
const CITIES: CitySpec[] = [constantinople];

describe.each(CITIES)('$name sources', (city) => {
  const ids = new Set(city.sources.map((s) => s.id));

  it('defines at least one source', () => {
    expect(city.sources.length).toBeGreaterThan(0);
  });

  it('gives every source a unique id, a citation and a provenance', () => {
    expect(ids.size).toBe(city.sources.length);
    for (const source of city.sources) {
      expect(source.citation.length).toBeGreaterThan(0);
      expect(SOURCE_KINDS).toContain(source.kind);
    }
  });

  it.each(city.eras.map((era) => ({ label: era.yearLabel, era })))(
    '$label cites at least one source, and every id resolves',
    ({ era }) => {
      expect(era.dossier.sourceIds.length).toBeGreaterThan(0);
      for (const id of era.dossier.sourceIds) expect(ids).toContain(id);
    },
  );

  it('cites every source it defines', () => {
    const cited = new Set(city.eras.flatMap((era) => era.dossier.sourceIds));
    const orphans = [...ids].filter((id) => !cited.has(id));
    expect(orphans).toEqual([]);
  });

  it('only links to https sources', () => {
    for (const source of city.sources) {
      if (source.url) expect(source.url.startsWith('https://')).toBe(true);
    }
  });

  it('carries no placeholder prose', () => {
    for (const era of city.eras) {
      const prose = `${era.dossier.story} ${era.dossier.seeing}`;
      expect(prose.toLowerCase()).not.toContain('lorem ipsum');
      expect(prose).not.toContain('TODO');
    }
  });

  it('names any claim it has not sourced instead of hiding it', () => {
    for (const era of city.eras) {
      for (const claim of era.dossier.unsourcedClaims ?? []) {
        expect(claim.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('parseCitySpec source validation', () => {
  const base = () => JSON.parse(JSON.stringify(constantinople)) as CitySpec;

  it('rejects a dossier that cites nothing', () => {
    const spec = base();
    spec.eras[0]!.dossier.sourceIds = [];
    expect(() => parseCitySpec(spec)).toThrow(/cites no sources/);
  });

  it('rejects a citation that resolves to nothing', () => {
    const spec = base();
    spec.eras[0]!.dossier.sourceIds = ['no-such-source'];
    expect(() => parseCitySpec(spec)).toThrow(/unknown source/);
  });

  it('rejects an unknown provenance', () => {
    const spec = base();
    // Deliberately invalid: the point is that parse rejects it at load.
    (spec.sources[0] as { kind: string }).kind = 'hearsay';
    expect(() => parseCitySpec(spec)).toThrow(/unknown kind/);
  });

  it('rejects duplicate source ids', () => {
    const spec = base();
    spec.sources.push({ ...spec.sources[0]! });
    expect(() => parseCitySpec(spec)).toThrow(/duplicate source ids/);
  });
});
