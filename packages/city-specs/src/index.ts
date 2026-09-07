import type { CitySpec } from '@antea/schema';
import constantinopleJson from './constantinople.json';
import romeJson from './rome.json';
import { parseCitySpec } from './parse';

export const constantinople: CitySpec = parseCitySpec(constantinopleJson);
export const rome: CitySpec = parseCitySpec(romeJson);

/** Every city we ship, keyed by slug. */
export const citySpecs: Record<string, CitySpec> = {
  [constantinople.slug]: constantinople,
  [rome.slug]: rome,
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

export {
  defaultEra,
  eraHref,
  eraIndexBySlug,
  eraSlug,
  findEraBySlug,
  parseEraSlug,
} from './era';
export { allLandmarks, parseCitySpec } from './parse';
export { plannedCities } from './planned';
export type { PlannedCity } from './planned';
export type { CitySpec };
