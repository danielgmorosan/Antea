import type { CitySpec } from '@antea/schema';

/**
 * Every city we ship, keyed by slug.
 *
 * Phase 1 task 2 adds `constantinople.json` here, carrying the prototype's era
 * copy and landmark placements byte-for-byte.
 */
export const citySpecs: Record<string, CitySpec> = {};

export function getCitySpec(slug: string): CitySpec | undefined {
  return citySpecs[slug];
}

export function listCitySlugs(): string[] {
  return Object.keys(citySpecs);
}

export type { CitySpec };
