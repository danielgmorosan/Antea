'use client';

import type { EraSpec } from '@antea/schema';

export interface TimelineStop {
  era: EraSpec;
  href: string;
}

/**
 * The era rail. Every stop is a real link to that place-era URL, so it is
 * crawlable and middle-clickable; the click is intercepted for a smooth swap.
 */
export function Timeline({
  stops,
  current,
  onSelect,
}: {
  stops: TimelineStop[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Travel through time"
      className="timeline-rail glass absolute bottom-[26px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill py-2.5 pr-[22px] pl-3"
    >
      <ol className="flex items-center">
        {stops.map(({ era, href }, i) => {
          const active = i === current;
          return (
            <li key={era.year}>
              <a
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  // Let the browser handle new-tab and download intents.
                  if (
                    e.metaKey ||
                    e.ctrlKey ||
                    e.shiftKey ||
                    e.altKey ||
                    e.button !== 0
                  ) {
                    return;
                  }
                  e.preventDefault();
                  onSelect(i);
                }}
                className="timeline-stop relative flex w-24 flex-col items-center gap-[7px] py-1.5 no-underline"
              >
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className="timeline-rule absolute top-[11px] -left-12 h-0.5 w-24 bg-line"
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
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
