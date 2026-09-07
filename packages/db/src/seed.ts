import type { CitySpec } from '@antea/schema';
import type { Sql } from './client';

/**
 * Loads a city spec into the editorial database.
 *
 * The specs in `@antea/city-specs` remain the editorial source of truth — they
 * are diffable and reviewable in a way table rows are not. This is the
 * queryable projection of them, and the place where the sourcing rule is
 * enforced rather than merely observed.
 *
 * Idempotent: seeding the same spec twice leaves the same rows.
 */
export async function seedCity(sql: Sql, spec: CitySpec): Promise<{ eras: number }> {
  await sql.query('BEGIN');
  try {
    for (const source of spec.sources) {
      await sql.query(
        `INSERT INTO source (id, citation, kind, url, note, licence)
         VALUES ($1, $2, $3::source_kind, $4, $5, $6::licence)
         ON CONFLICT (id) DO UPDATE SET
           citation = EXCLUDED.citation,
           kind     = EXCLUDED.kind,
           url      = EXCLUDED.url,
           note     = EXCLUDED.note,
           licence  = EXCLUDED.licence`,
        [
          source.id,
          source.citation,
          source.kind,
          source.url ?? null,
          source.note ?? null,
          source.licence ?? null,
        ],
      );
    }

    const { rows } = await sql.query<{ id: string }>(
      `INSERT INTO place (slug, name, lng, lat, default_era_year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         name             = EXCLUDED.name,
         lng              = EXCLUDED.lng,
         lat              = EXCLUDED.lat,
         default_era_year = EXCLUDED.default_era_year,
         updated_at       = now()
       RETURNING id`,
      [spec.slug, spec.name, spec.location.lng, spec.location.lat, spec.defaultEraYear],
    );
    const placeId = rows[0]?.id;
    if (!placeId) throw new Error(`failed to upsert place ${spec.slug}`);

    for (const era of spec.eras) {
      const eraRows = await sql.query<{ id: string }>(
        `INSERT INTO era (place_id, year, year_label, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (place_id, year) DO UPDATE SET
           year_label = EXCLUDED.year_label,
           name       = EXCLUDED.name
         RETURNING id`,
        [placeId, era.year, era.yearLabel, era.name],
      );
      const eraId = eraRows.rows[0]?.id;
      if (!eraId) throw new Error(`failed to upsert era ${era.year} of ${spec.slug}`);

      const d = era.dossier;
      await sql.query(
        `INSERT INTO dossier (era_id, population, population_label,
                              population_confidence, ruler, story, seeing)
         VALUES ($1, $2, $3, $4::confidence, $5, $6, $7)
         ON CONFLICT (era_id) DO UPDATE SET
           population            = EXCLUDED.population,
           population_label      = EXCLUDED.population_label,
           population_confidence = EXCLUDED.population_confidence,
           ruler                 = EXCLUDED.ruler,
           story                 = EXCLUDED.story,
           seeing                = EXCLUDED.seeing`,
        [
          eraId,
          d.population,
          d.populationLabel,
          d.populationConfidence,
          d.ruler,
          d.story,
          d.seeing,
        ],
      );

      // Re-derived rather than merged, so a citation removed from the spec is
      // removed here too.
      await sql.query('DELETE FROM dossier_source WHERE era_id = $1', [eraId]);
      for (const [position, sourceId] of d.sourceIds.entries()) {
        await sql.query(
          `INSERT INTO dossier_source (era_id, source_id, position) VALUES ($1, $2, $3)`,
          [eraId, sourceId, position],
        );
      }

      await sql.query('DELETE FROM unsourced_claim WHERE era_id = $1', [eraId]);
      for (const subject of d.unsourcedClaims ?? []) {
        await sql.query(`INSERT INTO unsourced_claim (era_id, subject) VALUES ($1, $2)`, [
          eraId,
          subject,
        ]);
      }
    }

    await sql.query('COMMIT');
    return { eras: spec.eras.length };
  } catch (error) {
    await sql.query('ROLLBACK');
    throw error;
  }
}
