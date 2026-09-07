import { defaultEra, eraHref, getCitySpec, listCitySlugs } from '@antea/city-specs';
import { notFound, permanentRedirect } from 'next/navigation';

export function generateStaticParams() {
  return listCitySlugs().map((slug) => ({ slug }));
}

/**
 * Every place-era pairing has exactly one URL. A bare city path is an entry
 * point for hand-typed links, so it redirects to the canonical era rather than
 * rendering a second copy of it.
 */
export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spec = getCitySpec(slug);
  if (!spec) notFound();

  permanentRedirect(eraHref(spec, defaultEra(spec)));
}
