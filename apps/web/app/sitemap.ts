import type { MetadataRoute } from "next";
import { fileKey, snapYears } from "@antea/chrono";
import { CITIES } from "@/lib/cities";
import { POLITIES } from "@/lib/polities";
import { siteOrigin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
  ];
  for (const c of CITIES) {
    entries.push({
      url: `${base}/place/${c.slug}`,
      changeFrequency: "monthly",
      priority: c.flagship ? 0.9 : 0.7,
    });
    for (const y of snapYears(c.from, c.to))
      entries.push({
        url: `${base}/place/${c.slug}/${fileKey(y)}`,
        changeFrequency: "monthly",
        priority: c.flagship ? 0.8 : 0.5,
      });
  }
  for (const [slug, e] of Object.entries(POLITIES)) {
    entries.push({
      url: `${base}/polity/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
    for (const k of Object.keys(e.years))
      entries.push({
        url: `${base}/polity/${slug}/${k}`,
        changeFrequency: "monthly",
        priority: 0.4,
      });
  }
  return entries;
}
