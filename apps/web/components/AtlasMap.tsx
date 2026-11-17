"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  YEARS, fileKey, nameAt, isVisible, colorFor,
  ringMetrics, physicalWeight, SOFT_LABEL, labelFontSize,
} from "@antea/chrono";
import { PAL, isDark } from "@/lib/palette";
import { CITIES, titleCase } from "@/lib/cities";
import type { Selection } from "@/lib/select";

interface Props {
  yearIndex: number;
  focus?: [number, number];
  onPick: (sel: Selection | null) => void;
  onBusy: (busy: boolean) => void;
  onError: (msg: string) => void;
}

interface SlimFeature {
  type: "Feature";
  properties: { n: string | null; s?: string | null; p: number; cl?: string | null; cd?: string | null };
  geometry: { type: string; coordinates: unknown };
}
interface SlimFC { type: "FeatureCollection"; features: SlimFeature[] }

function graticule() {
  const features: object[] = [];
  for (let lon = -180; lon <= 180; lon += 20)
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[lon, -85], [lon, 85]] } });
  for (let lat = -80; lat <= 80; lat += 20)
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[-180, lat], [180, lat]] } });
  return { type: "FeatureCollection", features };
}

export default function AtlasMap({ yearIndex, focus, onPick, onBusy, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const cacheRef = useRef<Record<string, SlimFC>>({});
  const seqRef = useRef(0);
  const hovRef = useRef<number | string | null>(null);
  const cityMarkersRef = useRef<{ c: (typeof CITIES)[number]; m: Marker; el: HTMLElement; on: boolean }[]>([]);
  const lblMarkersRef = useRef<Marker[]>([]);
  const yearIndexRef = useRef(yearIndex);
  const cbRef = useRef({ onPick, onBusy, onError });
  cbRef.current = { onPick, onBusy, onError };
  yearIndexRef.current = yearIndex;

  /* init once */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8, sources: {},
          layers: [{ id: "bg", type: "background", paint: { "background-color": PAL[isDark() ? "dark" : "light"].ocean } }],
        },
        center: focus ?? [24, 34], zoom: focus ? 4.2 : 2.6, minZoom: 1.1, maxZoom: 8,
        attributionControl: false, dragRotate: false, pitchWithRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      map.on("load", () => {
        const p = PAL[isDark() ? "dark" : "light"];
        map.addSource("grat", { type: "geojson", data: graticule() as never });
        map.addSource("borders", { type: "geojson", data: { type: "FeatureCollection", features: [] }, generateId: true });
        const hov = ["boolean", ["feature-state", "hover"], false] as never;
        map.addLayer({ id: "grat", type: "line", source: "grat", paint: { "line-color": p.grat, "line-width": 1 } });
        map.addLayer({ id: "terra", type: "fill", source: "borders", filter: ["!", ["to-boolean", ["get", "n"]]], paint: { "fill-color": p.terra, "fill-opacity": 1 } });
        map.addLayer({ id: "terra-line", type: "line", source: "borders", filter: ["!", ["to-boolean", ["get", "n"]]], paint: { "line-color": p.terraLine, "line-width": 0.6 } });
        map.addLayer({ id: "pol", type: "fill", source: "borders", filter: ["to-boolean", ["get", "n"]], paint: { "fill-color": ["get", isDark() ? "cd" : "cl"] as never, "fill-opacity": ["case", hov, 0.96, 0.8] as never } });
        map.addLayer({ id: "pol-coarse", type: "line", source: "borders", filter: ["all", ["to-boolean", ["get", "n"]], ["<", ["get", "p"], 2]], paint: { "line-color": p.line, "line-width": ["case", hov, 1.8, 0.8] as never, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "pol-fine", type: "line", source: "borders", filter: ["all", ["to-boolean", ["get", "n"]], [">=", ["get", "p"], 2]], paint: { "line-color": p.line, "line-width": ["case", hov, 1.8, 0.9] as never } });

        /* city markers */
        for (const c of CITIES) {
          const wrap = document.createElement("div");
          const el = document.createElement("button");
          el.className = "mk" + (c.flagship ? " fl" : "");
          el.innerHTML = "<i></i><span></span>";
          el.addEventListener("click", (ev) => { ev.stopPropagation(); cbRef.current.onPick({ kind: "city", slug: c.slug }); });
          wrap.appendChild(el);
          const m = new maplibregl.Marker({ element: wrap, anchor: "left" }).setLngLat(c.ll);
          cityMarkersRef.current.push({ c, m, el, on: false });
        }

        const setHover = (id: number | string | null) => {
          if (hovRef.current !== null) map.setFeatureState({ source: "borders", id: hovRef.current }, { hover: false });
          hovRef.current = id;
          if (id !== null) map.setFeatureState({ source: "borders", id }, { hover: true });
        };

        map.on("mousemove", (e) => {
          const tip = tipRef.current!;
          const fs = map.queryRenderedFeatures(e.point, { layers: ["pol", "terra"] });
          if (!fs.length) { tip.style.display = "none"; map.getCanvas().style.cursor = ""; setHover(null); return; }
          const f = fs.find((x) => x.layer.id === "pol") ?? fs[0];
          setHover(f.layer.id === "pol" ? (f.id as number) : null);
          const pr = f.properties as { n?: string; s?: string; p?: number };
          tip.innerHTML = pr.n
            ? `<b>${esc(pr.n)}</b>${pr.s ? `<div class="sub">subject to ${esc(pr.s)}</div>` : ""}<div class="sub">${(pr.p ?? 1) < 2 ? "coarse boundary" : "better-attested boundary"}</div>`
            : `<b>Peoples without fixed states</b><div class="sub">no overarching polity recorded here</div>`;
          tip.style.display = "block";
          tip.style.left = Math.min(window.innerWidth - 260, e.originalEvent.clientX + 14) + "px";
          tip.style.top = e.originalEvent.clientY + 14 + "px";
          map.getCanvas().style.cursor = "pointer";
        });
        map.getCanvas().addEventListener("mouseleave", () => { tipRef.current!.style.display = "none"; setHover(null); });
        map.on("click", (e) => {
          const fs = map.queryRenderedFeatures(e.point, { layers: ["pol", "terra"] });
          if (!fs.length) { cbRef.current.onPick(null); return; }
          const f = fs.find((x) => x.layer.id === "pol") ?? fs[0];
          const pr = f.properties as { n?: string; s?: string; p?: number };
          cbRef.current.onPick(pr.n ? { kind: "polity", n: pr.n, s: pr.s ?? null, p: pr.p ?? 1 } : { kind: "terra" });
        });

        readyRef.current = true;
        void loadYear(yearIndexRef.current);
      });

      /* theme switching */
      const applyTheme = () => {
        if (!map.getLayer("pol")) return;
        const p = PAL[isDark() ? "dark" : "light"];
        map.setPaintProperty("bg", "background-color", p.ocean);
        map.setPaintProperty("grat", "line-color", p.grat);
        map.setPaintProperty("terra", "fill-color", p.terra);
        map.setPaintProperty("terra-line", "line-color", p.terraLine);
        map.setPaintProperty("pol", "fill-color", ["get", isDark() ? "cd" : "cl"] as never);
        map.setPaintProperty("pol-coarse", "line-color", p.line);
        map.setPaintProperty("pol-fine", "line-color", p.line);
      };
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", applyTheme);
      const mo = new MutationObserver(applyTheme);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    })();

    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchYear(y: number): Promise<SlimFC> {
    const k = fileKey(y);
    const hit = cacheRef.current[k];
    if (hit) return hit;
    const r = await fetch(`/data/${k}.json`);
    if (!r.ok) throw new Error("fetch");
    const d = (await r.json()) as SlimFC;
    for (const f of d.features) {
      const n = f.properties.n ?? null;
      f.properties.cl = n ? colorFor(n, PAL.light) : null;
      f.properties.cd = n ? colorFor(n, PAL.dark) : null;
    }
    cacheRef.current[k] = d;
    return d;
  }

  function syncCityMarkers(y: number) {
    const map = mapRef.current!;
    for (const r of cityMarkersRef.current) {
      const vis = isVisible(r.c.from, r.c.to, y);
      if (vis && !r.on) { r.m.addTo(map); r.on = true; }
      if (!vis && r.on) { r.m.remove(); r.on = false; }
      if (vis) r.el.querySelector("span")!.textContent =
        r.c.names ? nameAt(r.c.names, y) : titleCase(r.c.slug);
    }
  }

  async function syncLabels(d: SlimFC) {
    const maplibregl = (await import("maplibre-gl")).default;
    const map = mapRef.current!;
    for (const m of lblMarkersRef.current) m.remove();
    lblMarkersRef.current = [];
    const best: Record<string, { phys: number; c: [number, number] }> = {};
    for (const f of d.features) {
      const n = f.properties.n;
      if (!n) continue;
      const g = f.geometry;
      const polys = (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []) as number[][][][] | number[][][];
      for (const poly of polys as number[][][][]) {
        const ring = (g.type === "Polygon" ? (poly as unknown as number[][]) : poly[0]) as [number, number][];
        const m = ringMetrics(ring);
        const phys = physicalWeight(m.area, m.c[1]);
        if (!best[n] || phys > best[n].phys) best[n] = { phys, c: m.c };
      }
    }
    const top = Object.entries(best).filter(([, v]) => v.phys > 3.5)
      .sort((a, b) => b[1].phys - a[1].phys).slice(0, 26);
    for (const [n, v] of top) {
      const el = document.createElement("div");
      const soft = SOFT_LABEL.test(n);
      el.className = "plbl" + (soft ? " soft" : "");
      el.textContent = n.replace(/\s*\(.*\)\s*$/, "");
      el.style.fontSize = labelFontSize(v.phys, el.textContent, soft) + "px";
      lblMarkersRef.current.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(v.c).addTo(map));
    }
  }

  async function loadYear(idx: number) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const y = YEARS[idx];
    const seq = ++seqRef.current;
    cbRef.current.onBusy(true);
    try {
      const d = await fetchYear(y);
      if (seq !== seqRef.current) return;
      if (hovRef.current !== null) { map.setFeatureState({ source: "borders", id: hovRef.current }, { hover: false }); hovRef.current = null; }
      (map.getSource("borders") as GeoJSONSource).setData(d as never);
      void syncLabels(d);
      syncCityMarkers(y);
    } catch {
      if (seq === seqRef.current) cbRef.current.onError(`Couldn't load the borders for ${y < 0 ? -y + " BC" : y + " AD"}.`);
    }
    if (seq === seqRef.current) cbRef.current.onBusy(false);
  }

  /* react to year changes */
  useEffect(() => { void loadYear(yearIndex); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [yearIndex]);

  return (
    <>
      <div id="map" ref={containerRef} />
      <div className="tex" />
      <div className="vig" />
      <div id="tip" ref={tipRef} />
    </>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]!);
}
