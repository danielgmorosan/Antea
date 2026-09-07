import {
  eraHref,
  eraIndexBySlug,
  eraSlug,
  findEraBySlug,
  getCitySpec,
  listCities,
} from '@antea/city-specs';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CityView } from '@/components/diorama/CityView';

type Params = Promise<{ slug: string; year: string }>;

export function generateStaticParams() {
  return listCities().flatMap((spec) =>
    spec.eras.map((era) => ({ slug: spec.slug, year: eraSlug(era) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug, year } = await params;
  const spec = getCitySpec(slug);
  const era = spec && findEraBySlug(spec, year);
  if (!spec || !era) return {};

  const title = `${era.name}, ${era.yearLabel}`;
  const description = `${spec.name} in ${era.yearLabel}: ${era.dossier.populationLabel} people under ${era.dossier.ruler}. ${era.dossier.story.split('. ')[0]}.`;
  const canonical = eraHref(spec, era);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: `${title} · Antea`,
      description,
      url: canonical,
      siteName: 'Antea',
    },
    twitter: { card: 'summary_large_image', title, description },
    other: {
      // Surfaced for the timeline and for anyone scraping the era range.
      'antea:city': spec.name,
      'antea:year': String(era.year),
    },
  };
}

export default async function EraPage({ params }: { params: Params }) {
  const { slug, year } = await params;
  const spec = getCitySpec(slug);
  if (!spec) notFound();

  const index = eraIndexBySlug(spec, year);
  if (index < 0) notFound();

  return <CityView spec={spec} initialEra={index} />;
}
