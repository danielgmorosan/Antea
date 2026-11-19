import { redirect, notFound } from "next/navigation";
import { fileKey, nearestIndex, snapYears, YEARS } from "@antea/chrono";
import { CITIES } from "@/lib/cities";
import { AUTO_BY_SLUG, AUTO_PLACES, autoCanonicalKey } from "@/lib/autoplaces";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return [
    ...CITIES.map((c) => ({ slug: c.slug })),
    ...AUTO_PLACES.map((p) => ({ slug: p.slug })),
  ];
}

/** A city's canonical year: its flagship peak when set, else the midpoint of its lifespan. */
const PEAK: Record<string, number> = {
  constantinople: 1200,
  rome: 100,
  mystras: 1400,
};

export default async function PlacePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auto = AUTO_BY_SLUG.get(slug);
  if (auto) redirect(`/place/${slug}/${autoCanonicalKey(auto)}`);
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) notFound();
  const valid = snapYears(city.from, city.to);
  if (!valid.length) notFound();
  const wanted = PEAK[slug] ?? (city.from + city.to) / 2;
  const snapped = YEARS[nearestIndex(wanted)];
  const y = valid.includes(snapped) ? snapped : valid[Math.floor(valid.length / 2)];
  redirect(`/place/${slug}/${fileKey(y)}`);
}
