import raw from "./polities.json";

export interface PolityYear {
  c: [number, number];
  w: number;
  p: number;
  s?: string;
}
export interface PolityEntry {
  name: string;
  years: Record<string, PolityYear>;
}

/** Build-time index from scripts/build-polity-index.mjs. Server-side only —
 *  never import from a client component (≈400 KB). */
export const POLITIES = raw as unknown as Record<string, PolityEntry>;

/** The year key where a polity's mapped territory peaks. */
export function peakYearKey(e: PolityEntry): string {
  let best: string | null = null;
  for (const [k, y] of Object.entries(e.years))
    if (best === null || y.w > e.years[best].w) best = k;
  return best!;
}
