import { defaultEra, eraHref, listCities, plannedCities } from '@antea/city-specs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GlobeView } from '@/components/globe/GlobeView';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const cities = listCities().map((spec) => ({
    spec,
    href: eraHref(spec, defaultEra(spec)),
  }));

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-base">
      <GlobeView
        cities={cities.map(({ spec, href }) => ({
          name: spec.name,
          lng: spec.location.lng,
          lat: spec.location.lat,
          href,
        }))}
        planned={plannedCities}
      />

      <header className="pointer-events-none absolute top-[22px] left-[26px] flex items-baseline gap-3">
        <h1 className="font-display text-[21px] font-semibold text-ink">Antea</h1>
        <p className="hide-narrow text-[12.5px] text-ink-soft">
          the atlas of lost cities
        </p>
      </header>

      {/*
        The globe is decorative to a screen reader — the same cities are here as
        ordinary links, which is also what a crawler follows.
      */}
      <nav
        aria-label="Cities"
        className="glass absolute top-[70px] right-[22px] w-[218px] overflow-hidden rounded-panel"
      >
        <ul>
          {cities.map(({ spec, href }) => (
            <li key={spec.slug} className="border-b border-line last:border-b-0">
              <Link
                href={href}
                className="flex items-center justify-between gap-4 px-4 py-[11px] text-[13px] font-semibold text-ink no-underline"
              >
                {spec.name}
                <span className="rounded-pill bg-verdigris-soft px-2 py-[3px] text-[10.5px] font-normal text-verdigris">
                  {spec.eras.length} eras
                </span>
              </Link>
            </li>
          ))}
          {plannedCities.map((city) => (
            <li
              key={city.name}
              className="flex items-center justify-between gap-4 border-b border-line px-4 py-[11px] text-[13px] text-ink-soft last:border-b-0"
            >
              {city.name}
              <span className="text-[10.5px]">soon</span>
            </li>
          ))}
        </ul>
      </nav>

      <p className="hide-narrow glass pointer-events-none absolute bottom-[26px] left-1/2 flex -translate-x-1/2 gap-5 rounded-pill px-[18px] py-2.5 text-[12px] text-ink-soft">
        <span>drag to spin</span>
        <span>scroll to zoom</span>
        <span>pick a city to descend</span>
      </p>
    </main>
  );
}
