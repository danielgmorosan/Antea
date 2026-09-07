'use client';

import { eraHref, eraIndexBySlug } from '@antea/city-specs';
import type { CitySpec } from '@antea/schema';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dossier } from './Dossier';
import { Timeline } from './Timeline';

// Three.js is pulled in only on this route, and only in the browser.
const Diorama = dynamic(() => import('./Diorama').then((m) => m.Diorama), { ssr: false });

export function CityView({
  spec,
  initialEra = 0,
}: {
  spec: CitySpec;
  initialEra?: number;
}) {
  const [eraIndex, setEraIndex] = useState(initialEra);
  const era = spec.eras[eraIndex];

  const stops = useMemo(
    () => spec.eras.map((e) => ({ era: e, href: eraHref(spec, e) })),
    [spec],
  );

  /**
   * Era changes rewrite the URL rather than navigating. Every place-era is a
   * real, statically generated page for crawlers and cold loads, but moving
   * between them in the browser must not tear down the WebGL scene and rebuild
   * the terrain.
   */
  const goTo = useCallback(
    (index: number) => {
      const target = spec.eras[index];
      if (!target || index === eraIndex) return;
      setEraIndex(index);
      window.history.pushState(null, '', eraHref(spec, target));
    },
    [spec, eraIndex],
  );

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(spec.eras.length - 1, Math.max(0, eraIndex + delta));
      goTo(next);
    },
    [spec.eras.length, eraIndex, goTo],
  );

  // Back and forward move through eras, since that is what the URL encodes.
  useEffect(() => {
    const onPopState = () => {
      const segment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
      const index = eraIndexBySlug(spec, segment);
      if (index >= 0) setEraIndex(index);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [spec]);

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
        <Link
          href="/"
          className="font-display text-[21px] font-semibold text-ink no-underline"
        >
          Antea
        </Link>
        <span className="text-[12.5px] text-ink-soft">{spec.name}</span>
      </header>

      <Link
        href="/"
        className="glass absolute top-[18px] right-[22px] rounded-pill px-[18px] py-2.5 text-[13.5px] font-medium text-ink no-underline"
      >
        ← Back to the globe
      </Link>

      <Dossier era={era} />
      <Timeline stops={stops} current={eraIndex} onSelect={goTo} />

      {/* Crawlers and no-JS visitors get the era prose without the canvas. */}
      <noscript>
        <p className="absolute bottom-4 left-6 text-sm text-ink">
          {era.name}, {era.yearLabel}. {era.dossier.story}
        </p>
      </noscript>
    </main>
  );
}

export default CityView;
