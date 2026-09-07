'use client';

import type { PlannedCity } from '@antea/city-specs';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { TimeControl } from './TimeControl';
import type { GlobeCity } from './WorldGlobe';

// MapLibre is pulled in only on this route, and only in the browser.
const WorldGlobe = dynamic(() => import('./WorldGlobe').then((m) => m.WorldGlobe), {
  ssr: false,
});

/** Where the globe opens. The present is the most legible starting point. */
const INITIAL_YEAR = 2026;

export function GlobeView({
  cities,
  planned,
}: {
  cities: GlobeCity[];
  planned: PlannedCity[];
}) {
  const [year, setYear] = useState(INITIAL_YEAR);
  const markers = useMemo<GlobeCity[]>(() => [...cities, ...planned], [cities, planned]);

  return (
    <>
      <WorldGlobe cities={markers} year={year} />
      <TimeControl year={year} onChange={setYear} />
    </>
  );
}

export default GlobeView;
