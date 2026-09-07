import type { EraSpec } from '@antea/schema';

const CONFIDENCE_LABEL: Record<EraSpec['dossier']['populationConfidence'], string> = {
  attested: 'recorded',
  inferred: 'inferred',
  approximate: 'estimate',
};

/** The editorial panel for one place-era pairing. */
export function Dossier({ era }: { era: EraSpec }) {
  const { dossier } = era;

  return (
    <article className="glass absolute top-[86px] left-[26px] w-[330px] rounded-panel px-[26px] pt-6 pb-[22px]">
      <p className="font-display text-[44px] leading-none font-medium tracking-[-0.01em]">
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

      {dossier.sourceIds.length === 0 ? (
        <p className="mt-3.5 text-[11px] leading-[1.6] text-ink-soft">
          Artistic approximation. Sources for this dossier are not yet attached.
        </p>
      ) : null}
    </article>
  );
}
