/**
 * The narrow slice of a Postgres driver this package needs.
 *
 * Both `pg.Pool` (Neon, production) and PGlite (in-process Postgres, tests)
 * satisfy it, so migrations, seeding and queries are written once and run
 * against either without a mock in sight.
 */
export interface Sql {
  query<Row = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: Row[] }>;
  /**
   * Runs a script that may contain several statements.
   *
   * `query` uses the extended protocol on some drivers, which accepts exactly
   * one statement — so migration files need this. node-postgres runs
   * multi-statement text through `query` happily and may omit it; PGlite
   * provides `exec`.
   */
  exec?(text: string): Promise<unknown>;
}

/** Connection string for the editorial database. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env['DATABASE_URL']?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Point it at the Neon editorial database, or ' +
        'use a PGlite instance in tests.',
    );
  }
  return url;
}
