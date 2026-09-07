import type { CitySpec, EraSpec, Source, SourceKind } from '@antea/schema';

const CONFIDENCE_LABEL: Record<EraSpec['dossier']['populationConfidence'], string> = {
  attested: 'recorded',
  inferred: 'inferred',
  approximate: 'estimate',
};

/** How close a source stands to what it describes. Shown, never flattened. */
const KIND_LABEL: Record<SourceKind, string> = {
  contemporary: 'contemporary',
  'later-tradition': 'later tradition',
  'modern-scholarship': 'modern scholarship',
};

/** The editorial panel for one place-era pairing. */
export function Dossier({
  era,
  sources,
}: {
  era: EraSpec;
  sources: CitySpec['sources'];
}) {
  const { dossier } = era;
  const byId = new Map(sources.map((source) => [source.id, source]));
  const cited = dossier.sourceIds
    .map((id) => byId.get(id))
    .filter((source): source is Source => source !== undefined);

  return (
    <article className="dossier-panel glass absolute top-[86px] bottom-[110px] left-[26px] w-[330px] overflow-y-auto rounded-panel px-[26px] pt-6 pb-[22px]">
      <p className="dossier-year font-display text-[44px] leading-none font-medium tracking-[-0.01em]">
        {era.yearLabel}
      </p>
      <p className="mt-1.5 font-display text-[17px] font-medium text-verdigris italic">
        {era.name}
      </p>

      <dl className="my-4 flex border-t border-b border-line">
        <div className="flex-1 py-3">
          <dt className="sr-only">Population</dt>
          <dd className="font-display text-[19px] font-semibold">
            {dossier.populationLabel}
          </dd>
          <p className="text-[11px] tracking-[0.02em] text-ink-soft">
            people · {CONFIDENCE_LABEL[dossier.populationConfidence]}
          </p>
        </div>
        <div className="flex-1 border-l border-line py-3 pl-4">
          <dt className="sr-only">Ruler</dt>
          <dd className="font-display text-[19px] font-semibold">{dossier.ruler}</dd>
          <p className="text-[11px] tracking-[0.02em] text-ink-soft">ruler</p>
        </div>
      </dl>

      <p className="text-[13.5px] leading-[1.65] text-ink">{dossier.story}</p>

      <p className="mt-3.5 rounded-[14px] bg-verdigris-soft px-3.5 py-3 text-[12.5px] leading-[1.6] text-ink">
        <strong className="font-semibold text-verdigris">On the map</strong> —{' '}
        {dossier.seeing}
      </p>

      <footer className="mt-4 border-t border-line pt-3.5 text-[11px] leading-[1.6] text-ink-soft">
        <p className="font-semibold text-ink">Sources</p>
        <ul className="mt-1.5 space-y-1.5">
          {cited.map((source) => (
            <li key={source.id}>
              {source.url ? (
                <a href={source.url} rel="noreferrer" className="text-ink underline">
                  {source.citation}
                </a>
              ) : (
                <span className="text-ink">{source.citation}</span>
              )}{' '}
              <span className="text-verdigris">· {KIND_LABEL[source.kind]}</span>
              {source.note ? <span className="block">{source.note}</span> : null}
            </li>
          ))}
        </ul>

        {dossier.unsourcedClaims?.length ? (
          <p className="mt-2.5">Not yet sourced: {dossier.unsourcedClaims.join('; ')}.</p>
        ) : null}

        <p className="mt-2.5">
          The reconstruction is an artistic approximation, not a survey.
        </p>
      </footer>
    </article>
  );
}
