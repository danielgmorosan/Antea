import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.ts',
      {
        test: {
          name: 'web',
          root: './apps/web',
          environment: 'node',
          include: ['**/*.test.ts', '**/*.test.tsx'],
        },
      },
    ],
  },
});
