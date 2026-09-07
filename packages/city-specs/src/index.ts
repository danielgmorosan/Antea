import type { CitySpec } from '@antea/schema';
import constantinopleJson from './constantinople.json';
import { parseCitySpec } from './parse';

export const constantinople: CitySpec = parseCitySpec(constantinopleJson);

/** Every city we ship, keyed by slug. */
export const citySpecs: Record<string, CitySpec> = {
  [constantinople.slug]: constantinople,
};

export function getCitySpec(slug: string): CitySpec | undefined {
  return citySpecs[slug];
}

export function listCitySlugs(): string[] {
  return Object.keys(citySpecs);
}

export function listCities(): CitySpec[] {
  return Object.values(citySpecs);
}

/** Finds the era whose `year` matches, for `/city/[slug]/[year]` routes. */
export function getEra(spec: CitySpec, year: number) {
  return spec.eras.find((era) => era.year === year);
}

export { allLandmarks, parseCitySpec } from './parse';
export type { CitySpec };
