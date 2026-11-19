"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Entry {
  n: string;
  u: string;
  t: "place" | "polity";
  d?: string;
}

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function rank(q: string, e: Entry): number {
  const n = fold(e.n);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(" " + q)) return 2;
  if (n.includes(q)) return 3;
  if (e.d && fold(e.d).includes(q)) return 4;
  return -1;
}

export default function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Entry[]>([]);
  const [active, setActive] = useState(0);
  const index = useRef<Entry[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  async function ensureIndex() {
    if (index.current) return;
    try {
      const r = await fetch("/search.json");
      if (r.ok) index.current = (await r.json()) as Entry[];
    } catch {
      /* search stays silent if the index can't load */
    }
  }

  useEffect(() => {
    if (!index.current || !q.trim()) { setHits([]); setActive(0); return; }
    const fq = fold(q.trim());
    const scored: [number, Entry][] = [];
    for (const e of index.current) {
      const s = rank(fq, e);
      if (s >= 0) scored.push([s, e]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length);
    setHits(scored.slice(0, 8).map(([, e]) => e));
    setActive(0);
  }, [q]);

  useEffect(() => {
    const close = (ev: MouseEvent) => {
      if (box.current && !box.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function go(e: Entry) {
    setOpen(false);
    setQ("");
    router.push(e.u);
  }

  return (
    <div className="search" ref={box}>
      <input
        id="atlas-search"
        type="search"
        placeholder="Find a place or empire…"
        value={q}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="search-hits"
        onFocus={() => { setOpen(true); void ensureIndex(); }}
        onChange={(ev) => { setQ(ev.target.value); setOpen(true); }}
        onKeyDown={(ev) => {
          if (ev.key === "ArrowDown") { ev.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (ev.key === "ArrowUp") { ev.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (ev.key === "Enter" && hits[active]) go(hits[active]);
          if (ev.key === "Escape") { setOpen(false); (ev.target as HTMLInputElement).blur(); }
        }}
      />
      {open && hits.length > 0 && (
        <ul id="search-hits" role="listbox">
          {hits.map((e, i) => (
            <li
              key={e.u}
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(ev) => { ev.preventDefault(); go(e); }}
            >
              <span className="hit-name">{e.n}</span>
              <span className="hit-type">{e.t}</span>
              {e.d && <span className="hit-desc">{e.d}</span>}
            </li>
          ))}
          <li className="foot" role="presentation">
            <a href="/places">Index of all places →</a>
          </li>
        </ul>
      )}
    </div>
  );
}
