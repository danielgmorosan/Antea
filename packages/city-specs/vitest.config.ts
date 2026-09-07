import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'city-specs',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
