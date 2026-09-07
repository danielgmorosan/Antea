import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { constantinople } from '@antea/city-specs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from './client';
import type { IngestedArtifact } from './ingested';
import { loadIngested, nameHistory } from './ingested';
import { migrate } from './migrate';
import { seedCity } from './seed';

const ARTIFACT = new URL(
  '../../city-specs/src/ingested/constantinople.pleiades.json',
  import.meta.url,
);

let db: PGlite;
let sql: Sql;
let artifact: IngestedArtifact;

beforeEach(async () => {
  db = new PGlite();
  sql = db as unknown as Sql;
  await migrate(sql, { spatial: false });
  await seedCity(sql, constantinople);
  artifact = JSON.parse(await readFile(ARTIFACT, 'utf8')) as IngestedArtifact;
});

afterEach(async () => {
  await db.close();
});

describe('loading an ingest artifact', () => {
  it('stores every claim against the place', async () => {
    const { claims } = await loadIngested(sql, artifact);
    expect(claims).toBe(artifact.claims.length);

    const history = await nameHistory(sql, 'constantinople');
    expect(history).toHaveLength(artifact.claims.length);
  });

  it('reads as a name history, earliest first', async () => {
    await loadIngested(sql, artifact);
    const history = await nameHistory(sql, 'constantinople');
    const years = history.map((h) => h.start_year).filter((y): y is number => y !== null);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(history.some((h) => h.statement.includes('Constantinopolis'))).toBe(true);
  });

  it('pins no ingested name to a single era', async () => {
    // Gazetteer ranges are coarser than our eras; claiming otherwise would be
    // sourced and false.
    await loadIngested(sql, artifact);
    const { rows } = await sql.query<{ count: string }>(
      'SELECT count(*) FROM claim WHERE era_id IS NOT NULL',
    );
    expect(Number(rows[0]!.count)).toBe(0);
  });

  it('carries the licence that obliges attribution', async () => {
    await loadIngested(sql, artifact);
    const { rows } = await sql.query<{ licence: string }>(
      `SELECT licence::text AS licence FROM source WHERE id = $1`,
      [artifact.source.id],
    );
    // Pleiades is CC-BY. The obligation has to survive the round trip.
    expect(rows[0]?.licence).toBe('CC-BY');
  });

  it('is idempotent, and retracts what the gazetteer drops', async () => {
    await loadIngested(sql, artifact);
    await loadIngested(sql, artifact);
    let history = await nameHistory(sql, 'constantinople');
    expect(history).toHaveLength(artifact.claims.length);

    const trimmed = { ...artifact, claims: artifact.claims.slice(0, 3) };
    await loadIngested(sql, trimmed);
    history = await nameHistory(sql, 'constantinople');
    expect(history).toHaveLength(3);
  });

  it('still refuses a claim with no source', async () => {
    await loadIngested(sql, artifact);
    const { rows } = await sql.query<{ id: string }>(
      `SELECT id FROM place WHERE slug = 'constantinople'`,
    );
    await expect(
      sql.query(
        `INSERT INTO claim (place_id, subject, statement, confidence, source_id)
         VALUES ($1, 'name', 'Known as Somewhere.', 'attested', NULL)`,
        [rows[0]!.id],
      ),
    ).rejects.toThrow();
  });

  it('rejects a span that runs backwards', async () => {
    const { rows } = await sql.query<{ id: string }>(
      `SELECT id FROM place WHERE slug = 'constantinople'`,
    );
    await loadIngested(sql, artifact);
    await expect(
      sql.query(
        `INSERT INTO claim (place_id, subject, statement, confidence, source_id,
                            start_year, end_year)
         VALUES ($1, 'name', 'Backwards.', 'attested', $2, 900, 500)`,
        [rows[0]!.id, artifact.source.id],
      ),
    ).rejects.toThrow();
  });

  it('refuses an artifact for a place that has not been seeded', async () => {
    await expect(loadIngested(sql, { ...artifact, place: 'atlantis' })).rejects.toThrow(
      /no place "atlantis"/,
    );
  });
});
