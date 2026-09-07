import { eraHref, listCities } from '@antea/city-specs';
import type { MetadataRoute } from 'next';

/** Every place-era pairing is a crawlable URL, so every one of them is listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    ...listCities().flatMap((spec) =>
      spec.eras.map((era) => ({
        url: `${base}${eraHref(spec, era)}`,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    ),
  ];
}
