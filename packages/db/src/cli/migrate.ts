/**
 * Applies migrations, and optionally seeds, against the database named by
 * DATABASE_URL.
 *
 *   pnpm --filter @antea/db migrate
 *   pnpm --filter @antea/db migrate --seed
 *
 * Neon requires TLS; node-postgres reads `sslmode` from the connection string.
 */
import { citySpecs } from '@antea/city-specs';
import pg from 'pg';
import { databaseUrl } from '../client';
import type { Sql } from '../client';
import { migrate } from '../migrate';
import { seedCity } from '../seed';

async function main(): Promise<void> {
  const shouldSeed = process.argv.includes('--seed');
  const pool = new pg.Pool({ connectionString: databaseUrl() });
  const sql = pool as unknown as Sql;

  try {
    const applied = await migrate(sql);
    for (const m of applied) {
      console.log(
        `${m.alreadyApplied ? 'already applied' : 'applied       '}  ${m.name}`,
      );
    }

    if (shouldSeed) {
      for (const spec of Object.values(citySpecs)) {
        const { eras } = await seedCity(sql, spec);
        console.log(`seeded          ${spec.slug} (${eras} eras)`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
