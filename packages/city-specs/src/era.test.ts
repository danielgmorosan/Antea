import { describe, expect, it } from 'vitest';
import { eraHref, eraIndexBySlug, eraSlug, findEraBySlug, parseEraSlug } from './era';
import { constantinople } from './index';

describe('eraSlug', () => {
  it('writes BC years as a readable segment', () => {
    expect(eraSlug({ ...constantinople.eras[0]!, year: -667 })).toBe('667-bc');
  });

  it('writes AD years as a bare number', () => {
    expect(eraSlug({ ...constantinople.eras[0]!, year: 537 })).toBe('537');
  });

  it('round-trips every era in every shipped city', () => {
    for (const era of constantinople.eras) {
      expect(parseEraSlug(eraSlug(era))).toBe(era.year);
    }
  });

  it('produces a unique segment per era', () => {
    const slugs = constantinople.eras.map(eraSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('parseEraSlug', () => {
  it('rejects anything that is not a year', () => {
    for (const bad of ['', 'abc', '12ab', 'bc', '-537', '5.5', '537-ad', ' 537']) {
      expect(parseEraSlug(bad)).toBeNull();
    }
  });
});

describe('lookup', () => {
  it('finds an era by its slug', () => {
    expect(findEraBySlug(constantinople, '537')?.yearLabel).toBe('AD 537');
    expect(findEraBySlug(constantinople, '667-bc')?.yearLabel).toBe('667 BC');
  });

  it('returns undefined for an era the city does not have', () => {
    expect(findEraBySlug(constantinople, '1999')).toBeUndefined();
    expect(findEraBySlug(constantinople, 'nonsense')).toBeUndefined();
  });

  it('reports the index, or -1', () => {
    expect(eraIndexBySlug(constantinople, '667-bc')).toBe(0);
    expect(eraIndexBySlug(constantinople, '1999')).toBe(-1);
  });

  it('builds the canonical href', () => {
    expect(eraHref(constantinople, constantinople.eras[0]!)).toBe(
      '/city/constantinople/667-bc',
    );
  });
});
