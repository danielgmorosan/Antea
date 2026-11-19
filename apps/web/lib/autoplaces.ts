import raw from "./places-auto.json";
import { YEARS, fileKey, nearestIndex } from "@antea/chrono";

/** A Wikidata-enriched place from pipeline/enrich-wikidata.mjs.
 *  Server-side import only — keep it out of client bundles. */
export interface AutoPlace {
  slug: string;
  q: string;              // Wikidata QID
  name: string;
  ll: [number, number];
  desc: string;           // English description (the quality gate)
  kinds?: string[];       // instance-of labels
  inception?: number;
  dissolved?: number;
  hbSince?: number;
  hbUntil?: number;
  enwiki?: string;
}

export const AUTO_PLACES = raw as unknown as AutoPlace[];
export const AUTO_BY_SLUG = new Map(AUTO_PLACES.map((p) => [p.slug, p]));

export function autoYearSpan(p: AutoPlace): { from: number | null; to: number | null } {
  return {
    from: p.inception ?? p.hbSince ?? null,
    to: p.dissolved ?? p.hbUntil ?? null,
  };
}

/** Canonical snapshot year: midpoint of the known span, a single known
 *  date, or 1 BC for undated (mostly ancient) sites. */
export function autoCanonicalKey(p: AutoPlace): string {
  const { from, to } = autoYearSpan(p);
  const wanted =
    from !== null && to !== null ? (from + to) / 2
    : from !== null ? from
    : to !== null ? to
    : -1;
  return fileKey(YEARS[nearestIndex(wanted)]);
}
