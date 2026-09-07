import { listCitySlugs } from '@antea/city-specs';

/**
 * Scaffold placeholder. Phase 1 task 4 replaces this with the MapLibre globe
 * ported from `prototype/antea-globe.html`.
 */
export default function HomePage() {
  const slugs = listCitySlugs();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-20">
      <header className="flex items-baseline gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">Antea</h1>
        <p className="text-sm text-ink-soft">the atlas of lost cities</p>
      </header>

      <div className="glass rounded-panel px-7 py-6">
        <p className="text-sm leading-relaxed text-ink">
          Scaffold is up. The globe lands here once the prototype is extracted into{' '}
          <code className="text-verdigris">@antea/landmark-kit</code> and{' '}
          <code className="text-verdigris">@antea/city-specs</code>.
        </p>
        <p className="mt-4 text-xs text-ink-soft">
          {slugs.length === 0
            ? 'No city specs loaded yet — Phase 1, task 2.'
            : `${slugs.length} city spec(s) loaded: ${slugs.join(', ')}.`}
        </p>
      </div>
    </main>
  );
}
