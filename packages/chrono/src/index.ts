/**
 * @antea/chrono — pure, unit-tested time & geometry logic for the atlas.
 * Nothing in here may touch the DOM, MapLibre, or the network.
 */

/** Border snapshot years available in the dataset (negative = BC). */
export const YEARS: readonly number[] = [
  -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
  1492, 1500, 1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914,
  1920, 1938, 1945, 1960, 1994, 2000,
];

export const formatYear = (y: number): string => (y < 0 ? String(-y) : String(y));
export const eraOf = (y: number): "BC" | "AD" => (y < 0 ? "BC" : "AD");
export const yearLabel = (y: number): string => `${formatYear(y)} ${eraOf(y)}`;

/** Data file key for a snapshot year: -500 → "bc500", 1200 → "1200". */
export const fileKey = (y: number): string => (y < 0 ? `bc${-y}` : String(y));

export const clampIndex = (i: number): number =>
  Math.max(0, Math.min(YEARS.length - 1, Math.round(i)));

/** Inverse of fileKey: "bc500" → -500, "1200" → 1200, null if malformed or not a snapshot year. */
export function parseYearKey(key: string): number | null {
  const m = /^(bc)?(\d{1,4})$/.exec(key);
  if (!m) return null;
  const y = m[1] ? -Number(m[2]) : Number(m[2]);
  return YEARS.includes(y) ? y : null;
}

/** Snapshot years in which a place with lifespan [from, to] exists. */
export const snapYears = (from: number, to: number): number[] =>
  YEARS.filter((y) => y >= from && y <= to);

/** Index of the snapshot year nearest to y (ties go earlier). */
export function nearestIndex(y: number): number {
  let best = 0;
  for (let i = 1; i < YEARS.length; i++)
    if (Math.abs(YEARS[i] - y) < Math.abs(YEARS[best] - y)) best = i;
  return best;
}

/** [fromYear, name] pairs, ascending; the latest pair ≤ y wins. */
export type NameByYear = readonly (readonly [number, string])[];
export function nameAt(names: NameByYear, y: number): string {
  let n = names[0][1];
  for (const [from, nm] of names) if (y >= from) n = nm;
  return n;
}

/** [from, to, polity, blurb]; half-open [from, to). */
export type Phase = readonly [number, number, string, string];
export function phaseAt(phases: readonly Phase[], y: number): Phase | null {
  for (const ph of phases) if (y >= ph[0] && y < ph[1]) return ph;
  return y < phases[0][0] ? null : phases[phases.length - 1];
}

/** Latest timeline year ≤ y (the entry to highlight), or null. */
export function activeTimelineYear(
  timeline: readonly (readonly [number, string])[],
  y: number,
): number | null {
  let best: number | null = null;
  for (const [ty] of timeline) if (ty <= y) best = ty;
  return best;
}

export const isVisible = (from: number, to: number, y: number): boolean =>
  y >= from && y <= to;

/* ---------------- deterministic polity colors ---------------- */

export function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return Math.round((h * 137.508) % 360);
}

export interface PalettePart {
  sat: number;
  lum: number;
}
export function colorFor(name: string, p: PalettePart): string {
  const h = hueOf(name);
  const j = ((h >> 2) % 13) - 6; // per-polity lightness jitter
  return `hsl(${h} ${p.sat}% ${Math.max(18, Math.min(86, p.lum + j))}%)`;
}

/* ---------------- label geometry ---------------- */

export type Ring = readonly (readonly [number, number])[];

/** Planar shoelace area + centroid of a closed GeoJSON ring. */
export function ringMetrics(r: Ring): { area: number; c: [number, number] } {
  let a = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const cr = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    a += cr;
    cx += (r[i][0] + r[i + 1][0]) * cr;
    cy += (r[i][1] + r[i + 1][1]) * cr;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { area: 0, c: [r[0][0], r[0][1]] };
  return { area: Math.abs(a), c: [cx / (6 * a), cy / (6 * a)] };
}

/** Latitude-corrected "physical" area weight for label ranking. */
export const physicalWeight = (area: number, latDeg: number): number =>
  area * Math.max(0.2, Math.cos((latDeg * Math.PI) / 180));

/** Names rendered in the quiet italic style: peoples, not states. */
export const SOFT_LABEL =
  /hunter|gather|peoples?|tribes?|nomad|farmer|pastoral|cultures?/i;

export function labelFontSize(phys: number, text: string, soft: boolean): number {
  let fs = Math.max(10, Math.min(20, 7.5 + Math.sqrt(phys) * 0.85));
  if (soft) fs = Math.max(9.5, fs * 0.68);
  if (text.length > 22) fs = Math.min(fs, 12.5);
  return fs;
}
