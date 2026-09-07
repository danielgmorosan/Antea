import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Next 16 otherwise writes its own AGENTS.md/CLAUDE.md into apps/web;
  // the brief at the repo root is the single source of truth.
  agentRules: false,
  // Workspace packages ship TypeScript source; Next compiles them with the app.
  transpilePackages: ['@antea/schema', '@antea/city-specs', '@antea/landmark-kit'],
};

export default config;
