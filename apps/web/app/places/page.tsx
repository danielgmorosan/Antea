import type { Metadata } from "next";
import Link from "next/link";
import { CITIES, titleCase } from "@/lib/cities";
import { AUTO_PLACES } from "@/lib/autoplaces";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  title: "Index of places",
  description:
    "Every place in the Antea atlas: curated city biographies and auto-compiled entries from ancient sites to vanished capitals.",
  alternates: { canonical: `${siteOrigin()}/places` },
};

interface Row {
  slug: string;
  name: string;
  blurb: string;
  curated: boolean;
}

export default function PlacesIndex() {
  const rows: Row[] = [
    ...CITIES.map((c) => ({
      slug: c.slug,
      name: c.names?.[0]?.[1] && c.flagship ? (c.names.at(-1)?.[1] ?? titleCase(c.slug)) : titleCase(c.slug),
      blurb: (c.overview ?? c.desc ?? "").split(". ")[0],
      curated: !!c.flagship,
    })),
    ...AUTO_PLACES.map((p) => ({ slug: p.slug, name: p.name, blurb: p.desc, curated: false })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  let letter = "";
  return (
    <main className="dir">
      <header>
        <h1>Index of places</h1>
        <p>
          {rows.length} places, from curated city biographies to entries compiled
          automatically from Wikidata. <Link href="/">Back to the atlas</Link>
        </p>
      </header>
      <ul>
        {rows.map((r) => {
          const l = r.name[0].toUpperCase();
          const head = l !== letter ? (letter = l) : null;
          return (
            <li key={r.slug}>
              {head && <h2>{head}</h2>}
              <Link href={`/place/${r.slug}`}>{r.name}</Link>
              {r.curated && <span className="badge">curated</span>}
              <span className="blurb">{r.blurb}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
