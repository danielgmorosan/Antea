import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Sql } from './client';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** A migration that needs PostGIS, which not every target has. */
const SPATIAL = '0002_spatial.sql';

export interface MigrateOptions {
  /**
   * Apply the PostGIS migration. Defaults to true. Tests run against Postgres
   * compiled to WASM, which has no PostGIS, and set this false.
   */
  spatial?: boolean;
  directory?: string;
}

export interface AppliedMigration {
  name: string;
  alreadyApplied: boolean;
}

/**
 * Applies every pending migration in filename order, inside one transaction
 * each, recording what ran. Re-running is a no-op.
 */
export async function migrate(
  sql: Sql,
  options: MigrateOptions = {},
): Promise<AppliedMigration[]> {
  const { spatial = true, directory = MIGRATIONS_DIR } = options;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      name        text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(directory))
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => spatial || f !== SPATIAL)
    .sort();

  const { rows } = await sql.query<{ name: string }>('SELECT name FROM schema_migration');
  const applied = new Set(rows.map((r) => r.name));

  const result: AppliedMigration[] = [];
  for (const name of files) {
    if (applied.has(name)) {
      result.push({ name, alreadyApplied: true });
      continue;
    }
    const text = await readFile(join(directory, name), 'utf8');
    // Each migration is its own transaction: a failure leaves the schema at
    // the last good migration rather than half-applied.
    await sql.query('BEGIN');
    try {
      // Migration files hold several statements, so prefer the multi-statement
      // entry point where the driver has one.
      if (sql.exec) await sql.exec(text);
      else await sql.query(text);
      await sql.query('INSERT INTO schema_migration (name) VALUES ($1)', [name]);
      await sql.query('COMMIT');
    } catch (error) {
      await sql.query('ROLLBACK');
      throw new Error(`migration ${name} failed: ${(error as Error).message}`, {
        cause: error,
      });
    }
    result.push({ name, alreadyApplied: false });
  }
  return result;
}
