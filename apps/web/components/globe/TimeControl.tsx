'use client';

import { formatYear, GLOBE_YEAR_RANGE } from '@/lib/ohm';

/**
 * The globe's time control. Dragging it refilters the boundary layers, so the
 * borders on the globe belong to the year shown.
 *
 * A range input rather than a custom widget: it is keyboard operable for free,
 * announces itself to a screen reader, and arrow keys step a year at a time.
 */
export function TimeControl({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  return (
    <div className="glass absolute bottom-[26px] left-1/2 flex w-[min(560px,calc(100vw-48px))] -translate-x-1/2 items-center gap-4 rounded-pill px-[22px] py-3">
      <label htmlFor="globe-year" className="sr-only">
        Year shown on the globe
      </label>
      <output
        htmlFor="globe-year"
        className="w-[104px] shrink-0 font-display text-[19px] font-semibold text-ink tabular-nums"
      >
        {formatYear(year)}
      </output>
      <input
        id="globe-year"
        type="range"
        min={GLOBE_YEAR_RANGE.min}
        max={GLOBE_YEAR_RANGE.max}
        step={1}
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={formatYear(year)}
        className="year-slider h-1 w-full grow"
      />
    </div>
  );
}
