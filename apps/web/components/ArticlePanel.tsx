"use client";

import { YEARS, yearLabel, nameAt, phaseAt, activeTimelineYear, isVisible } from "@antea/chrono";
import { CITIES, titleCase, type City } from "@/lib/cities";
import type { Selection } from "@/lib/select";

export interface YearChip {
  key: string;
  label: string;
}

interface Props {
  sel: Selection | null;
  idx: number;
  polityChips?: YearChip[];
  onClose: () => void;
  onOpenCity: (slug: string) => void;
}

export default function ArticlePanel({ sel, idx, polityChips, onClose, onOpenCity }: Props) {
  const y = YEARS[idx];
  return (
    <aside className={"panel" + (sel ? " open" : "")} aria-live="polite">
      {sel && (
        <>
          <div className="panel-head">
            <Head sel={sel} y={y} />
            <button className="close" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="panel-body">
            <Body sel={sel} y={y} onOpenCity={onOpenCity} />
            {sel.kind === "polity" && polityChips && polityChips.length > 1 && (
              <>
                <h3>On the map in</h3>
                <div className="rel">
                  {polityChips.map((ch) => (
                    <a key={ch.key} className="chip-link" href={ch.key}>{ch.label}</a>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function Head({ sel, y }: { sel: Selection; y: number }) {
  if (sel.kind === "city") {
    const c = CITIES.find((x) => x.slug === sel.slug)!;
    const name = c.names ? nameAt(c.names, y) : titleCase(c.slug);
    const ph = c.phases ? phaseAt(c.phases, y) : null;
    return (
      <div className="head-main">
        <div className="crumb">
          World › {c.flagship && ph ? <b>{ph[2]}</b> : null} › {name}
        </div>
        <h2>{name}</h2>
        <span className={"tier" + (c.flagship ? "" : " stub")}>
          {c.flagship ? "curated article" : "auto-compiled stub"}
        </span>
      </div>
    );
  }
  if (sel.kind === "polity")
    return (
      <div className="head-main">
        <div className="crumb">World › <b>{sel.n}</b></div>
        <h2>{sel.n}</h2>
        <span className="tier stub">auto-compiled stub</span>
      </div>
    );
  return (
    <div className="head-main">
      <div className="crumb">World</div>
      <h2>Peoples without fixed states</h2>
      <span className="tier stub">about this region</span>
    </div>
  );
}

function Body({ sel, y, onOpenCity }: { sel: Selection; y: number; onOpenCity: (s: string) => void }) {
  if (sel.kind === "city") {
    const c = CITIES.find((x) => x.slug === sel.slug)!;
    return c.flagship ? <Flagship c={c} y={y} onOpenCity={onOpenCity} /> : <Stub c={c} y={y} onOpenCity={onOpenCity} />;
  }
  if (sel.kind === "polity")
    return (
      <>
        <div className="facts">
          <div><b>{yearLabel(y)}</b><i>as mapped in</i></div>
          <div><b>{sel.p < 2 ? "coarse" : "better attested"}</b><i>border precision</i></div>
        </div>
        {sel.s && (
          <p>Recorded as subject to <b>{sel.s}</b> in this snapshot — tribute, vassalage, or suzerainty rather than full independence.</p>
        )}
        <p>
          This polity&apos;s boundary comes straight from the historical-basemaps dataset for this year.
          In the full product, this panel becomes a sourced dossier: dynasty and rulers in {yearLabel(y)},
          capital, religion, conflicts under way, and the places inside its borders.
        </p>
        <div className="note">Frontier honesty: a dashed edge means historians sketch this border rather than know it. Claims here should always carry their sources.</div>
      </>
    );
  return (
    <>
      <p>Unnamed regions on this map aren&apos;t empty — they were home to societies that avoided or didn&apos;t need overarching states: bands, tribes, confederacies, and peoples whose borders were seasonal rather than drawn.</p>
      <p>For most of the past 5,000 years this was most of the inhabited world. Treating it as blank space is one of the oldest distortions in historical mapping, and one this atlas refuses to repeat.</p>
      <div className="note">In the full product these regions carry their own dossiers — archaeology, language families, and ways of life — with the same sourcing standards as the empires.</div>
    </>
  );
}

function Flagship({ c, y, onOpenCity }: { c: City; y: number; onOpenCity: (s: string) => void }) {
  const ph = phaseAt(c.phases!, y);
  const act = activeTimelineYear(c.timeline!, y);
  return (
    <>
      <div className="facts">
        <div><b>{ph ? ph[2] : "—"}</b><i>under the rule of · {yearLabel(y)}</i></div>
      </div>
      {ph && <p>{ph[3]}</p>}
      <h3>Overview</h3>
      <p>{c.overview}</p>
      <h3>Timeline</h3>
      <ul className="tl">
        {c.timeline!.map(([ty, txt]) => (
          <li key={ty} className={ty <= y ? (ty === act ? "on" : "past") : ""}>
            <span className="y">{ty < 0 ? `${-ty} BC` : ty}</span>
            <span>{txt}</span>
          </li>
        ))}
      </ul>
      <h3>Sources</h3>
      <p className="src">{c.sources!.map((s, i) => <span key={i}>{s}<br /></span>)}</p>
      <Related slug={c.slug} y={y} onOpenCity={onOpenCity} />
    </>
  );
}

function Stub({ c, y, onOpenCity }: { c: City; y: number; onOpenCity: (s: string) => void }) {
  return (
    <>
      <div className="facts">
        <div><b>{c.from < 0 ? `${-c.from} BC` : `AD ${c.from}`}</b><i>first flourishing</i></div>
        <div><b>{c.to > 2050 ? "today" : c.to < 0 ? `${-c.to} BC` : `AD ${c.to}`}</b><i>decline or continuity</i></div>
      </div>
      <p>{c.desc}</p>
      <div className="note">
        In the full product this page is compiled automatically from Wikidata, Pleiades and
        OpenHistoricalMap, with every claim cited — then promoted to a curated article as editors
        review it. The three verdigris-dot cities show the curated tier.
      </div>
      <Related slug={c.slug} y={y} onOpenCity={onOpenCity} />
    </>
  );
}

function Related({ slug, y, onOpenCity }: { slug: string; y: number; onOpenCity: (s: string) => void }) {
  const rel = CITIES.filter((x) => x.slug !== slug && isVisible(x.from, x.to, y)).slice(0, 4);
  if (!rel.length) return null;
  return (
    <>
      <h3>Related places</h3>
      <div className="rel">
        {rel.map((x) => (
          <button key={x.slug} onClick={() => onOpenCity(x.slug)}>
            {x.names ? nameAt(x.names, y) : titleCase(x.slug)}
          </button>
        ))}
      </div>
    </>
  );
}
