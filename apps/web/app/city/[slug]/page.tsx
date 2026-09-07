import { getCitySpec, listCitySlugs } from '@antea/city-specs';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CityView } from '@/components/diorama/CityView';

export function generateStaticParams() {
  return listCitySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spec = getCitySpec(slug);
  if (!spec) return {};

  const first = spec.eras[0];
  const last = spec.eras[spec.eras.length - 1];
  return {
    title: spec.name,
    description: `${spec.name} across ${spec.eras.length} eras, ${first?.yearLabel} to ${last?.yearLabel}.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spec = getCitySpec(slug);
  if (!spec) notFound();

  return <CityView spec={spec} initialEra={1} />;
}
