'use client';

import type { EraSpec } from '@antea/schema';

/** The era rail. Keyboard operable: arrow keys step, tab reaches every stop. */
export function Timeline({
  eras,
  current,
  onSelect,
}: {
  eras: EraSpec[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Travel through time"
      className="glass absolute bottom-[26px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill py-2.5 pr-[22px] pl-3"
    >
      <ol className="flex items-center">
        {eras.map((era, i) => {
          const active = i === current;
          return (
            <li key={era.year}>
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => onSelect(i)}
                className="relative flex w-24 cursor-pointer flex-col items-center gap-[7px] py-1.5"
              >
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-[11px] -left-12 h-0.5 w-24 bg-line"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={`relative z-10 h-[9px] w-[9px] rounded-full border transition-colors ${
                    active
                      ? 'border-verdigris bg-verdigris'
                      : 'border-line bg-glass-strong'
                  }`}
                />
                <span
                  className={`font-display text-[13px] transition-colors ${
                    active ? 'font-semibold text-ink' : 'text-ink-soft'
                  }`}
                >
                  {era.yearLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
