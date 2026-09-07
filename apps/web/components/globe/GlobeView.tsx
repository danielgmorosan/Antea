'use client';

import type { PlannedCity } from '@antea/city-specs';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { GlobeCity } from './WorldGlobe';

// MapLibre is pulled in only on this route, and only in the browser.
const WorldGlobe = dynamic(() => import('./WorldGlobe').then((m) => m.WorldGlobe), {
  ssr: false,
});

export function GlobeView({
  cities,
  planned,
}: {
  cities: GlobeCity[];
  planned: PlannedCity[];
}) {
  const markers = useMemo<GlobeCity[]>(() => [...cities, ...planned], [cities, planned]);
  return <WorldGlobe cities={markers} year={2026} />;
}

export default GlobeView;
