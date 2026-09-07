/**
 * The absolute origin the site is served from, used for canonical URLs, Open
 * Graph tags and the sitemap.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this to the custom domain.
 *   2. Vercel's own domain, so a deploy is correct before the domain is set.
 *   3. localhost, for development.
 *
 * An unset variable and one set to the empty string have to behave the same
 * here: `??` only falls back on null and undefined, so an empty value reached
 * `new URL('')` and broke the production build at module evaluation.
 */
export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [
    env['NEXT_PUBLIC_SITE_URL'],
    env['VERCEL_PROJECT_PRODUCTION_URL'],
    env['VERCEL_URL'],
  ];

  for (const candidate of candidates) {
    const normalised = normalise(candidate);
    if (normalised) return normalised;
  }
  return 'http://localhost:3000';
}

/**
 * Trims, adds a protocol if the value is a bare host (Vercel supplies these
 * without one) and drops any trailing slash so callers can concatenate paths.
 * Returns null for anything blank or unparseable rather than throwing — a bad
 * environment variable should not take down the build.
 */
function normalise(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}
