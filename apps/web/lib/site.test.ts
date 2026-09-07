import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from './site';

const env = (values: Record<string, string | undefined>) => values as NodeJS.ProcessEnv;

describe('resolveSiteUrl', () => {
  it('prefers an explicit site URL', () => {
    expect(
      resolveSiteUrl(
        env({ NEXT_PUBLIC_SITE_URL: 'https://antea.test', VERCEL_URL: 'x.vercel.app' }),
      ),
    ).toBe('https://antea.test');
  });

  it('treats an empty or blank value as unset', () => {
    // The production build broke on exactly this: an env var that is present
    // but empty slipped past `??` and reached `new URL('')`.
    for (const blank of ['', '   ', '\n']) {
      expect(resolveSiteUrl(env({ NEXT_PUBLIC_SITE_URL: blank }))).toBe(
        'http://localhost:3000',
      );
    }
  });

  it('falls back to the Vercel production domain, adding a protocol', () => {
    expect(
      resolveSiteUrl(
        env({
          NEXT_PUBLIC_SITE_URL: '',
          VERCEL_PROJECT_PRODUCTION_URL: 'antea.vercel.app',
        }),
      ),
    ).toBe('https://antea.vercel.app');
  });

  it('prefers the production domain over the per-deploy URL', () => {
    expect(
      resolveSiteUrl(
        env({
          VERCEL_PROJECT_PRODUCTION_URL: 'antea.vercel.app',
          VERCEL_URL: 'antea-abc123.vercel.app',
        }),
      ),
    ).toBe('https://antea.vercel.app');
  });

  it('falls back to localhost when nothing is set', () => {
    expect(resolveSiteUrl(env({}))).toBe('http://localhost:3000');
  });

  it('drops a trailing slash so paths can be concatenated', () => {
    expect(resolveSiteUrl(env({ NEXT_PUBLIC_SITE_URL: 'https://antea.test/' }))).toBe(
      'https://antea.test',
    );
  });

  it('ignores an unparseable value rather than throwing', () => {
    expect(resolveSiteUrl(env({ NEXT_PUBLIC_SITE_URL: 'http://' }))).toBe(
      'http://localhost:3000',
    );
  });

  it('always returns something new URL() accepts', () => {
    for (const value of ['', ' ', 'http://', 'antea.test', 'https://antea.test/']) {
      expect(
        () => new URL(resolveSiteUrl(env({ NEXT_PUBLIC_SITE_URL: value }))),
      ).not.toThrow();
    }
  });
});
