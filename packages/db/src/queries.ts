import type { Sql } from './client';

export interface PlaceRow {
  slug: string;
  name: string;
  lng: number;
  lat: number;
  default_era_year: number;
}

export interface EraRow {
  year: number;
  year_label: string;
  name: string;
  population: string | number | null;
  population_label: string;
  ruler: string;
}

export async function listPlaces(sql: Sql): Promise<PlaceRow[]> {
  const { rows } = await sql.query<PlaceRow>(
    `SELECT slug, name, lng, lat, default_era_year FROM place ORDER BY name`,
  );
  return rows;
}

export async function listEras(sql: Sql, slug: string): Promise<EraRow[]> {
  const { rows } = await sql.query<EraRow>(
    `SELECT e.year, e.year_label, e.name,
            d.population, d.population_label, d.ruler
       FROM era e
       JOIN place p ON p.id = e.place_id
       JOIN dossier d ON d.era_id = e.id
      WHERE p.slug = $1
      ORDER BY e.year`,
    [slug],
  );
  return rows;
}

/**
 * Eras that assert a population without citing anything for it.
 *
 * The editorial question the database exists to answer: what are we saying
 * that we cannot back up?
 */
export async function unsourcedPopulations(
  sql: Sql,
): Promise<{ slug: string; year: number; subject: string }[]> {
  const { rows } = await sql.query<{ slug: string; year: number; subject: string }>(
    `SELECT p.slug, e.year, u.subject
       FROM unsourced_claim u
       JOIN era e ON e.id = u.era_id
       JOIN place p ON p.id = e.place_id
      ORDER BY p.slug, e.year`,
  );
  return rows;
}
