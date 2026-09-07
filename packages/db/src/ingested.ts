import type { Sql } from './client';

/**
 * An artifact emitted by the Python pipeline and committed to the repository.
 *
 * Ingested facts go through review as a diff before they reach the database,
 * the same as editorial ones — which matters because the site will attribute
 * them to a source.
 */
export interface IngestedArtifact {
  place: string;
  gazetteer: string;
  source: {
    id: string;
    citation: string;
    kind: string;
    url: string;
    licence: string;
    note?: string;
  };
  claims: {
    subject: string;
    statement: string;
    confidence: string;
    startYear: number | null;
    endYear: number | null;
  }[];
}

/**
 * Loads one ingest artifact.
 *
 * Claims from this source for this place are re-derived rather than merged, so
 * a fact the gazetteer has retracted disappears here too.
 */
export async function loadIngested(
  sql: Sql,
  artifact: IngestedArtifact,
): Promise<{ claims: number }> {
  await sql.query('BEGIN');
  try {
    const { rows } = await sql.query<{ id: string }>(
      'SELECT id FROM place WHERE slug = $1',
      [artifact.place],
    );
    const placeId = rows[0]?.id;
    if (!placeId) {
      throw new Error(
        `cannot load ${artifact.gazetteer} artifact: no place "${artifact.place}". ` +
          'Seed the city specs first.',
      );
    }

    const s = artifact.source;
    await sql.query(
      `INSERT INTO source (id, citation, kind, url, note, licence)
       VALUES ($1, $2, $3::source_kind, $4, $5, $6::licence)
       ON CONFLICT (id) DO UPDATE SET
         citation = EXCLUDED.citation,
         kind     = EXCLUDED.kind,
         url      = EXCLUDED.url,
         note     = EXCLUDED.note,
         licence  = EXCLUDED.licence`,
      [s.id, s.citation, s.kind, s.url, s.note ?? null, s.licence],
    );

    await sql.query('DELETE FROM claim WHERE place_id = $1 AND source_id = $2', [
      placeId,
      s.id,
    ]);

    for (const claim of artifact.claims) {
      await sql.query(
        `INSERT INTO claim
           (place_id, era_id, subject, statement, confidence, source_id,
            start_year, end_year)
         VALUES ($1, NULL, $2, $3, $4::confidence, $5, $6, $7)`,
        [
          placeId,
          claim.subject,
          claim.statement,
          claim.confidence,
          s.id,
          claim.startYear,
          claim.endYear,
        ],
      );
    }

    await sql.query('COMMIT');
    return { claims: artifact.claims.length };
  } catch (error) {
    await sql.query('ROLLBACK');
    throw error;
  }
}

/** Names recorded for a place, earliest first — the name history. */
export async function nameHistory(
  sql: Sql,
  slug: string,
): Promise<{ statement: string; confidence: string; start_year: number | null }[]> {
  const { rows } = await sql.query<{
    statement: string;
    confidence: string;
    start_year: number | null;
  }>(
    `SELECT c.statement, c.confidence::text AS confidence, c.start_year
       FROM claim c
       JOIN place p ON p.id = c.place_id
      WHERE p.slug = $1 AND c.subject = 'name'
      ORDER BY c.start_year NULLS LAST, c.statement`,
    [slug],
  );
  return rows;
}
