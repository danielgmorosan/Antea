'use client';

import type { CitySpec } from '@antea/schema';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Dossier } from './Dossier';
import { Timeline } from './Timeline';

// Three.js is pulled in only on this route, and only in the browser.
const Diorama = dynamic(() => import('./Diorama').then((m) => m.Diorama), {
  ssr: false,
});

export function CityView({
  spec,
  initialEra = 0,
}: {
  spec: CitySpec;
  initialEra?: number;
}) {
  const [eraIndex, setEraIndex] = useState(initialEra);
  const era = spec.eras[eraIndex];

  const step = useCallback(
    (delta: number) =>
      setEraIndex((i) => Math.min(spec.eras.length - 1, Math.max(0, i + delta))),
    [spec.eras.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  if (!era) return null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-base">
      <Diorama
        spec={spec}
        eraIndex={eraIndex}
        className="absolute inset-0 h-full w-full"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 38%, transparent 55%, rgba(34,48,47,.10) 100%)',
        }}
      />

      <header className="absolute top-[22px] left-[26px] flex items-baseline gap-3">
        <h1 className="font-display text-[21px] font-semibold text-ink">Antea</h1>
        <span className="text-[12.5px] text-ink-soft">{spec.name}</span>
      </header>

      <Dossier era={era} />
      <Timeline eras={spec.eras} current={eraIndex} onSelect={setEraIndex} />
    </main>
  );
}

export default CityView;
