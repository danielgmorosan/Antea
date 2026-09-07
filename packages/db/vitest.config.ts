import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'db',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Each test spins up its own in-process Postgres.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
