import type { CitySpec, EraSpec } from '@antea/schema';

/**
 * URL segment for an era.
 *
 * Every place-era pairing is a crawlable URL, so the segment has to read well
 * and survive being typed by hand: `667-bc`, not `-667`.
 */
export function eraSlug(era: EraSpec): string {
  return era.year < 0 ? `${-era.year}-bc` : String(era.year);
}

/** Parses an era segment back to a year. Returns null if it is not one. */
export function parseEraSlug(slug: string): number | null {
  const bc = /^(\d+)-bc$/.exec(slug);
  if (bc?.[1]) return -Number(bc[1]);
  if (/^\d+$/.test(slug)) return Number(slug);
  return null;
}

export function findEraBySlug(spec: CitySpec, slug: string): EraSpec | undefined {
  const year = parseEraSlug(slug);
  if (year === null) return undefined;
  return spec.eras.find((era) => era.year === year);
}

export function eraIndexBySlug(spec: CitySpec, slug: string): number {
  const year = parseEraSlug(slug);
  if (year === null) return -1;
  return spec.eras.findIndex((era) => era.year === year);
}

/** The canonical path for one place-era pairing. */
export function eraHref(spec: CitySpec, era: EraSpec): string {
  return `/city/${spec.slug}/${eraSlug(era)}`;
}

/** The era a visitor lands on when they open the city without naming one. */
export function defaultEra(spec: CitySpec): EraSpec {
  const era = spec.eras.find((e) => e.year === spec.defaultEraYear);
  if (!era) {
    throw new Error(`${spec.slug}: defaultEraYear ${spec.defaultEraYear} matches no era`);
  }
  return era;
}
