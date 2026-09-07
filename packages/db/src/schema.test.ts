import { PGlite } from '@electric-sql/pglite';
import { constantinople } from '@antea/city-specs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from './client';
import { migrate } from './migrate';
import { listEras, listPlaces, unsourcedPopulations } from './queries';
import { seedCity } from './seed';

/**
 * These run against real Postgres compiled to WASM, in process — the same SQL
 * that Neon will execute, with no daemon, no container and no mock.
 *
 * PostGIS is not available in that build, so the spatial migration is skipped
 * here. That is the reason it is a separate migration: everything the
 * editorial rules depend on is exercised, and only the index is untested.
 */
let db: PGlite;
let sql: Sql;

beforeEach(async () => {
  db = new PGlite();
  sql = db as unknown as Sql;
  await migrate(sql, { spatial: false });
});

afterEach(async () => {
  await db.close();
});

describe('migrations', () => {
  it('create the editorial tables', async () => {
    const { rows } = await sql.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const tables = rows.map((r) => r.table_name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'claim',
        'dossier',
        'dossier_source',
        'era',
        'place',
        'source',
        'unsourced_claim',
      ]),
    );
  });

  it('are idempotent', async () => {
    const again = await migrate(sql, { spatial: false });
    expect(again.every((m) => m.alreadyApplied)).toBe(true);
  });

  it('record what was applied', async () => {
    const { rows } = await sql.query<{ name: string }>(
      'SELECT name FROM schema_migration ORDER BY name',
    );
    expect(rows.map((r) => r.name)).toEqual([
      '0001_editorial.sql',
      '0003_place_level_claims.sql',
    ]);
  });
});

describe('the sourcing rule', () => {
  beforeEach(async () => {
    await seedCity(sql, constantinople);
  });

  const aPlace = async () => {
    const { rows } = await sql.query<{ id: string }>('SELECT id FROM place LIMIT 1');
    return rows[0]!.id;
  };

  it('accepts a claim that cites a source', async () => {
    const placeId = await aPlace();
    await expect(
      sql.query(
        `INSERT INTO claim (place_id, subject, statement, confidence, source_id)
         VALUES ($1, 'population', 'about 450,000', 'approximate', $2)`,
        [placeId, 'mango-constantinople-population'],
      ),
    ).resolves.toBeDefined();
  });

  it('refuses a claim with no source at all', async () => {
    const placeId = await aPlace();
    // This is the rule the database exists to enforce. In JSON it is a
    // convention a reviewer has to catch; here it is unstorable.
    await expect(
      sql.query(
        `INSERT INTO claim (place_id, subject, statement, confidence, source_id)
         VALUES ($1, 'population', 'about 450,000', 'approximate', NULL)`,
        [placeId],
      ),
    ).rejects.toThrow();
  });

  it('refuses a claim citing a source that does not exist', async () => {
    const placeId = await aPlace();
    await expect(
      sql.query(
        `INSERT INTO claim (place_id, subject, statement, confidence, source_id)
         VALUES ($1, 'population', 'x', 'approximate', 'invented-source')`,
        [placeId],
      ),
    ).rejects.toThrow();
  });

  it('refuses a claim that belongs to no place', async () => {
    await expect(
      sql.query(
        `INSERT INTO claim (subject, statement, confidence, source_id)
         VALUES ('population', 'x', 'approximate', 'mango-constantinople-population')`,
      ),
    ).rejects.toThrow();
  });

  it('refuses to delete a source that is still cited', async () => {
    await expect(
      sql.query(`DELETE FROM source WHERE id = 'procopius-buildings-1-1'`),
    ).rejects.toThrow();
  });
});

describe('column constraints', () => {
  it('rejects a provenance outside the vocabulary', async () => {
    await expect(
      sql.query(
        `INSERT INTO source (id, citation, kind) VALUES ('x', 'Someone', 'hearsay')`,
      ),
    ).rejects.toThrow();
  });

  it('rejects a non-https source url', async () => {
    await expect(
      sql.query(
        `INSERT INTO source (id, citation, kind, url)
         VALUES ('x', 'Someone', 'contemporary', 'http://insecure.example')`,
      ),
    ).rejects.toThrow();
  });

  it('rejects year zero, which does not exist', async () => {
    const { rows } = await sql.query<{ id: string }>(
      `INSERT INTO place (slug, name, lng, lat, default_era_year)
       VALUES ('nowhere', 'Nowhere', 0, 0, 1) RETURNING id`,
    );
    await expect(
      sql.query(
        `INSERT INTO era (place_id, year, year_label, name) VALUES ($1, 0, 'AD 0', 'x')`,
        [rows[0]!.id],
      ),
    ).rejects.toThrow();
  });

  it('rejects coordinates off the globe', async () => {
    await expect(
      sql.query(
        `INSERT INTO place (slug, name, lng, lat, default_era_year)
         VALUES ('far', 'Far', 999, 0, 1)`,
      ),
    ).rejects.toThrow();
  });
});

describe('seeding Constantinople', () => {
  beforeEach(async () => {
    await seedCity(sql, constantinople);
  });

  it('stores the place and every era', async () => {
    const places = await listPlaces(sql);
    expect(places).toHaveLength(1);
    expect(places[0]?.slug).toBe('constantinople');

    const eras = await listEras(sql, 'constantinople');
    expect(eras.map((e) => e.year)).toEqual(constantinople.eras.map((e) => e.year));
  });

  it('keeps the eras in chronological order, BC first', async () => {
    const eras = await listEras(sql, 'constantinople');
    const years = eras.map((e) => e.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(years[0]).toBeLessThan(0);
  });

  it('stores every source the specs cite', async () => {
    const { rows } = await sql.query<{ count: string }>('SELECT count(*) FROM source');
    expect(Number(rows[0]!.count)).toBe(constantinople.sources.length);
  });

  it('links each dossier to its citations', async () => {
    const { rows } = await sql.query<{ year: number; cited: string }>(
      `SELECT e.year, count(ds.source_id) AS cited
         FROM era e LEFT JOIN dossier_source ds ON ds.era_id = e.id
        GROUP BY e.year ORDER BY e.year`,
    );
    for (const row of rows) {
      const era = constantinople.eras.find((e) => e.year === row.year);
      expect(Number(row.cited)).toBe(era?.dossier.sourceIds.length);
    }
  });

  it('surfaces what we have not sourced', async () => {
    const gaps = await unsourcedPopulations(sql);
    // 667 BC and AD 1560 assert a population with nothing behind it.
    expect(gaps.map((g) => g.year).sort((a, b) => a - b)).toEqual([-667, 1560]);
  });

  it('is idempotent', async () => {
    await seedCity(sql, constantinople);
    await seedCity(sql, constantinople);

    const counts = await sql.query<{ places: string; eras: string; sources: string }>(
      `SELECT (SELECT count(*) FROM place)  AS places,
              (SELECT count(*) FROM era)    AS eras,
              (SELECT count(*) FROM source) AS sources`,
    );
    expect(Number(counts.rows[0]!.places)).toBe(1);
    expect(Number(counts.rows[0]!.eras)).toBe(constantinople.eras.length);
    expect(Number(counts.rows[0]!.sources)).toBe(constantinople.sources.length);
  });

  it('matches the spec it was seeded from', async () => {
    const eras = await listEras(sql, 'constantinople');
    for (const era of constantinople.eras) {
      const row = eras.find((e) => e.year === era.year);
      expect(row?.ruler).toBe(era.dossier.ruler);
      expect(row?.population_label).toBe(era.dossier.populationLabel);
    }
  });
});
