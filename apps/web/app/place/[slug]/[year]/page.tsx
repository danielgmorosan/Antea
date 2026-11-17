import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  YEARS, fileKey, parseYearKey, snapYears, yearLabel, nameAt, phaseAt,
} from "@antea/chrono";
import { CITIES, titleCase } from "@/lib/cities";
import { siteOrigin } from "@/lib/site";
import Atlas from "@/components/Atlas";

interface Params {
  slug: string;
  year: string;
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return CITIES.flatMap((c) =>
    snapYears(c.from, c.to).map((y) => ({ slug: c.slug, year: fileKey(y) })),
  );
}

function resolve(params: Params) {
  const city = CITIES.find((c) => c.slug === params.slug);
  const y = parseYearKey(params.year);
  if (!city || y === null || y < city.from || y > city.to) return null;
  return { city, y };
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const r = resolve(await params);
  if (!r) return {};
  const { city, y } = r;
  const name = city.names ? nameAt(city.names, y) : titleCase(city.slug);
  const ph = city.phases ? phaseAt(city.phases, y) : null;
  const title = `${name} in ${yearLabel(y)}`;
  const description = ph
    ? `${name}, ${yearLabel(y)} — under ${ph[2]}. ${ph[3]} Explore the borders, rulers, and story on the Antea atlas.`
    : `${city.desc ?? name} Explore ${name} in ${yearLabel(y)} on the Antea atlas.`;
  const url = `${siteOrigin()}/place/${city.slug}/${fileKey(y)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} — Antea`, description, url, type: "article" },
  };
}

export default async function PlaceYearPage(
  { params }: { params: Promise<Params> },
) {
  const r = resolve(await params);
  if (!r) notFound();
  const { city, y } = r;
  return <Atlas initialIdx={YEARS.indexOf(y)} initialSlug={city.slug} />;
}
