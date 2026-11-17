/** Site origin for metadata and the sitemap. Must tolerate an empty env var
 *  (the old build once broke production on exactly that). */
export function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://antea.world";
}
