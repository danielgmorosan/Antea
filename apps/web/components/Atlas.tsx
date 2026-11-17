"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { YEARS, clampIndex } from "@antea/chrono";
import { CITIES } from "@/lib/cities";
import AtlasMap from "./AtlasMap";
import TimeSlider from "./TimeSlider";
import ArticlePanel from "./ArticlePanel";
import type { Selection } from "@/lib/select";

interface Props {
  initialIdx?: number;
  initialSlug?: string;
}

export default function Atlas({ initialIdx, initialSlug }: Props) {
  const [idx, setIdx] = useState(initialIdx ?? YEARS.indexOf(1200));
  const [sel, setSel] = useState<Selection | null>(
    initialSlug ? { kind: "city", slug: initialSlug } : null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [popOpen, setPopOpen] = useState(false);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeYear = useCallback((i: number) => setIdx(clampIndex(i)), []);
  const onError = useCallback((msg: string) => {
    setErr(msg);
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setErr(null), 6000);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range") return;
      if (e.key === "ArrowLeft") setIdx((i) => clampIndex(i - 1));
      if (e.key === "ArrowRight") setIdx((i) => clampIndex(i + 1));
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const focus = initialSlug
    ? CITIES.find((c) => c.slug === initialSlug)?.ll
    : undefined;

  return (
    <>
      <AtlasMap yearIndex={idx} focus={focus} onPick={setSel} onBusy={setBusy} onError={onError} />

      <div className="brand"><h1>Antea</h1><span>the world, before</span></div>

      <button className="chip" aria-expanded={popOpen} onClick={() => setPopOpen((v) => !v)}>
        <i>≈</i> borders are approximate
      </button>
      {popOpen && (
        <div className="pop">
          <p><b>Honesty note.</b> Pre-modern polities rarely had linear borders — control faded across frontiers, and historians still argue about most lines on this map.</p>
          <p>Dashed outlines mark coarse, research-grade boundaries; solid outlines mark better-attested modern ones. Unnamed regions are peoples without fixed states, not empty land.</p>
          <p>
            Borders: <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">historical-basemaps</a> (A. Ourednik, GPL-3.0),
            work in progress — verify before citing.
          </p>
        </div>
      )}

      {err && <div id="err">{err}</div>}

      <ArticlePanel sel={sel} idx={idx} onClose={() => setSel(null)} onOpenCity={(slug) => setSel({ kind: "city", slug })} />
      <TimeSlider idx={idx} busy={busy} onChange={changeYear} />

      <div className="credit">Antea prototype · borders: historical-basemaps · articles: curated &amp; auto-compiled tiers</div>
    </>
  );
}
