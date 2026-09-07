'use client';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Placeholder basemap. Phase 2 replaces this with our own PMTiles on R2 —
 * until then we borrow the MapLibre demo tiles and repaint them.
 */
const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

const HOME = { center: [24, 28] as [number, number], zoom: 1.7 };
/** Degrees of longitude per idle step, and how long each step eases for. */
const SPIN_DEGREES = 0.09;
const SPIN_MS = 130;

export interface GlobeCity {
  name: string;
  lng: number;
  lat: number;
  /** Where descending lands. Absent for a city still on the roadmap. */
  href?: string;
}

export function WorldGlobe({ cities }: { cities: GlobeCity[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [descending, setDescending] = useState(false);
  /** The globe never loaded — offline, or the tile host is down. */
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: DEMO_STYLE,
        center: HOME.center,
        zoom: HOME.zoom,
        attributionControl: { compact: true },
      });
    } catch {
      // Deferred: setting state synchronously inside an effect body would
      // cascade a second render before this one has committed.
      queueMicrotask(() => setUnavailable(true));
      return;
    }

    let spinning = !reduced;
    let disposed = false;

    const stopSpin = () => {
      spinning = false;
    };
    const spinStep = () => {
      if (!spinning || disposed) return;
      const c = map.getCenter();
      c.lng += SPIN_DEGREES;
      map.easeTo({ center: c, duration: SPIN_MS, easing: (t) => t });
    };

    map.on('error', () => {
      if (!map.loaded()) setUnavailable(true);
    });

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // Older renderers fall back to the flat projection, which is fine.
      }

      // Repaint the demo style into the Antea palette. Demo styles change, so
      // every layer is attempted independently.
      for (const layer of map.getStyle().layers ?? []) {
        try {
          if (layer.type === 'background') {
            map.setPaintProperty(layer.id, 'background-color', '#c3d5d3');
          } else if (layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', '#ded8c8');
            map.setPaintProperty(layer.id, 'fill-outline-color', '#b9b3a2');
          } else if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', '#9aa59e');
            map.setPaintProperty(layer.id, 'line-width', 0.6);
          } else if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        } catch {
          // This layer is not in the style any more. Leave it.
        }
      }
    });

    const markers: maplibregl.Marker[] = [];
    for (const city of cities) {
      const el = document.createElement(city.href ? 'a' : 'span');
      el.className = city.href ? 'globe-marker' : 'globe-marker is-planned';
      el.innerHTML = `<span class="dot"></span>${city.name}${city.href ? '' : ' · soon'}`;

      if (city.href && el instanceof HTMLAnchorElement) {
        el.href = city.href;
        el.addEventListener('click', (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          stopSpin();

          const descend = () => {
            setDescending(true);
            // Let the crossfade cover the swap from map to canvas.
            window.setTimeout(() => router.push(city.href!), reduced ? 0 : 420);
          };

          if (reduced) {
            descend();
            return;
          }
          map.flyTo({
            center: [city.lng, city.lat],
            zoom: 6.1,
            speed: 0.85,
            curve: 1.55,
            essential: true,
          });
          map.once('moveend', descend);
        });
      }

      markers.push(
        new maplibregl.Marker({ element: el, anchor: 'left', offset: [10, 0] })
          .setLngLat([city.lng, city.lat])
          .addTo(map),
      );
    }

    map.on('moveend', spinStep);
    for (const event of ['mousedown', 'touchstart', 'wheel'] as const) {
      map.getCanvas().addEventListener(event, stopSpin, { passive: true });
    }
    spinStep();

    return () => {
      disposed = true;
      for (const marker of markers) marker.remove();
      map.remove();
    };
  }, [cities, router]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />

      {unavailable ? (
        <p className="glass absolute top-1/2 left-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-panel px-6 py-5 text-center text-sm text-ink-soft">
          The globe could not load. The city links below still work.
        </p>
      ) : null}

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-base transition-opacity duration-500 ${
          descending ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export default WorldGlobe;
