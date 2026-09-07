import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'prototype/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,
  {
    // The Next plugin looks for a pages/ or app/ directory to validate links against.
    settings: { next: { rootDir: 'apps/web' } },
  },
  {
    rules: {
      // `any` is allowed only with a comment saying why (CLAUDE.md conventions);
      // the rule stays on so every use has to be explicitly silenced.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Type-only import discipline is enforced by `verbatimModuleSyntax` in
  // tsconfig.base.json rather than by a type-aware lint rule, which would mean
  // wiring a full project service through the Next parser for no extra safety.
  prettier,
);
