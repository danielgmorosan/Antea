import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  YEARS, fileKey, parseYearKey, snapYears, yearLabel, nameAt, phaseAt,
} from "@antea/chrono";
import { CITIES, titleCase } from "@/lib/cities";
import { AUTO_BY_SLUG, AUTO_PLACES, autoCanonicalKey, type AutoPlace } from "@/lib/autoplaces";
import { siteOrigin } from "@/lib/site";
import Atlas from "@/components/Atlas";

interface Params {
  slug: string;
  year: string;
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  const cities = CITIES.flatMap((c) =>
    snapYears(c.from, c.to).map((y) => ({ slug: c.slug, year: fileKey(y) })),
  );
  const autos = AUTO_PLACES.map((p) => ({ slug: p.slug, year: autoCanonicalKey(p) }));
  return [...cities, ...autos];
}

type Resolved =
  | { kind: "city"; city: (typeof CITIES)[number]; y: number }
  | { kind: "auto"; place: AutoPlace; y: number };

function resolve(params: Params): Resolved | null {
  const y = parseYearKey(params.year);
  if (y === null) return null;
  const city = CITIES.find((c) => c.slug === params.slug);
  if (city) return y >= city.from && y <= city.to ? { kind: "city", city, y } : null;
  const place = AUTO_BY_SLUG.get(params.slug);
  if (place) return params.year === autoCanonicalKey(place) ? { kind: "auto", place, y } : null;
  return null;
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const p = await params;
  const r = resolve(p);
  if (!r) return {};
  const url = `${siteOrigin()}/place/${p.slug}/${p.year}`;
  if (r.kind === "city") {
    const { city, y } = r;
    const name = city.names ? nameAt(city.names, y) : titleCase(city.slug);
    const ph = city.phases ? phaseAt(city.phases, y) : null;
    const title = `${name} in ${yearLabel(y)}`;
    const description = ph
      ? `${name}, ${yearLabel(y)} — under ${ph[2]}. ${ph[3]} Explore the borders, rulers, and story on the Antea atlas.`
      : `${city.desc ?? name} Explore ${name} in ${yearLabel(y)} on the Antea atlas.`;
    return {
      title, description,
      alternates: { canonical: url },
      openGraph: { title: `${title} — Antea`, description, url, type: "article" },
    };
  }
  const { place } = r;
  const description =
    `${place.name}: ${place.desc}. Where it sits on the historical map, with sources — on the Antea atlas.`;
  return {
    title: place.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${place.name} — Antea`, description, url, type: "article" },
  };
}

export default async function PlaceYearPage(
  { params }: { params: Promise<Params> },
) {
  const r = resolve(await params);
  if (!r) notFound();
  if (r.kind === "city")
    return (
      <Atlas
        initialIdx={YEARS.indexOf(r.y)}
        initialSel={{ kind: "city", slug: r.city.slug }}
        focus={r.city.ll}
      />
    );
  const { place, y } = r;
  return (
    <Atlas
      initialIdx={YEARS.indexOf(y)}
      initialSel={{
        kind: "auto",
        place: {
          slug: place.slug, q: place.q, name: place.name, desc: place.desc,
          ...(place.kinds ? { kinds: place.kinds } : {}),
          ...(place.inception != null ? { inception: place.inception } : {}),
          ...(place.dissolved != null ? { dissolved: place.dissolved } : {}),
          ...(place.enwiki ? { enwiki: place.enwiki } : {}),
        },
      }}
      focus={place.ll}
    />
  );
}
