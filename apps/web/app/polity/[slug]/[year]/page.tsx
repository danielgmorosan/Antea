import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { YEARS, parseYearKey, yearLabel, fileKey } from "@antea/chrono";
import { POLITIES } from "@/lib/polities";
import { siteOrigin } from "@/lib/site";
import Atlas from "@/components/Atlas";

interface Params {
  slug: string;
  year: string;
}

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return Object.entries(POLITIES).flatMap(([slug, e]) =>
    Object.keys(e.years).map((year) => ({ slug, year })),
  );
}

function resolve(params: Params) {
  const entry = POLITIES[params.slug];
  const y = parseYearKey(params.year);
  if (!entry || y === null) return null;
  const py = entry.years[params.year];
  if (!py) return null;
  return { entry, y, py };
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const p = await params;
  const r = resolve(p);
  if (!r) return {};
  const { entry, y, py } = r;
  const title = `${entry.name} in ${yearLabel(y)}`;
  const description =
    `The territory of ${entry.name} as mapped in ${yearLabel(y)}` +
    (py.s ? `, subject to ${py.s}` : "") +
    `. ${py.p < 2 ? "A coarse, research-grade boundary" : "A better-attested boundary"} — explore it on the Antea historical atlas.`;
  const url = `${siteOrigin()}/polity/${p.slug}/${fileKey(y)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} — Antea`, description, url, type: "article" },
  };
}

export default async function PolityYearPage(
  { params }: { params: Promise<Params> },
) {
  const p = await params;
  const r = resolve(p);
  if (!r) notFound();
  const { entry, y, py } = r;
  const chips = Object.keys(entry.years).map((k) => ({
    key: k,
    label: yearLabel(parseYearKey(k)!),
  }));
  return (
    <Atlas
      initialIdx={YEARS.indexOf(y)}
      initialSel={{ kind: "polity", n: entry.name, s: py.s ?? null, p: py.p }}
      focus={py.c}
      polityChips={chips}
    />
  );
}
