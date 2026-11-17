"use client";

import { YEARS, formatYear, eraOf } from "@antea/chrono";

interface Props {
  idx: number;
  busy: boolean;
  onChange: (idx: number) => void;
}

const TICKS = [-3000, -1000, -1, 500, 1000, 1500, 2000];

export default function TimeSlider({ idx, busy, onChange }: Props) {
  const y = YEARS[idx];
  return (
    <div className="time">
      <button className="step" aria-label="Earlier" onClick={() => onChange(idx - 1)}>‹</button>
      <div className="yr-read">
        <b>{formatYear(y)}</b>
        <span>{eraOf(y)}</span>
      </div>
      <div className="rail">
        <input
          type="range" min={0} max={YEARS.length - 1} step={1} value={idx}
          aria-label="Year"
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="ticks">
          {TICKS.map((t) => {
            const i = YEARS.indexOf(t);
            if (i < 0) return null;
            return (
              <span key={t} style={{ left: `${(i / (YEARS.length - 1)) * 100}%` }}>
                {t < 0 ? (t === -1 ? "1 BC" : `${-t} BC`) : t}
              </span>
            );
          })}
        </div>
        {busy && <span id="busy">loading…</span>}
      </div>
      <button className="step" aria-label="Later" onClick={() => onChange(idx + 1)}>›</button>
    </div>
  );
}
