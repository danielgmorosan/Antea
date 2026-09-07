import type { FilterSpecification, StyleSpecification } from 'maplibre-gl';

/**
 * OpenHistoricalMap as the globe's basemap.
 *
 * OHM runs a public Martin tile server whose tilesets are one layer each. We
 * assemble our own style from them rather than borrowing a ready-made one, so
 * the globe is painted in the Antea palette and its boundaries can be filtered
 * to a year.
 *
 * Licensing: OHM content is dedicated to the public domain under CC0, and
 * attribution is encouraged rather than required — we attribute anyway.
 * Individual elements may carry their own `license` tag, and `land_polygons`
 * is derived from OpenStreetMap, which is ODbL. Both are credited.
 */
export const OHM_TILE_BASE = 'https://vtiles.openhistoricalmap.org';

export const OHM_ATTRIBUTION =
  '<a href="https://www.openhistoricalmap.org/" target="_blank" rel="noreferrer">OpenHistoricalMap</a> (CC0) · land from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (ODbL)';

/** Globe palette. The diorama's colours live in the city spec; these are the map's. */
export const GLOBE_COLOURS = {
  sea: '#c3d5d3',
  land: '#ded8c8',
  water: '#b8cfcd',
  coast: '#b9b3a2',
  border: '#8d9a92',
  borderDisputed: '#a8a08c',
} as const;

/**
 * OHM carries dates twice: `start_date`/`end_date` as written, and
 * `start_decdate`/`end_decdate` as decimal years. Only the decimal pair can be
 * compared numerically in a style filter, so that is what we use.
 *
 * A feature with no start is treated as having always existed, and one with no
 * end as still existing — which is how OHM models open-ended facts.
 */
const ALWAYS_EXISTED = -1e6;
const STILL_EXISTS = 1e6;

/** Features whose lifespan covers `year`. Negative years are BC. */
export function boundaryFilter(year: number): FilterSpecification {
  return [
    'all',
    ['<=', ['coalesce', ['get', 'start_decdate'], ALWAYS_EXISTED], year],
    ['>=', ['coalesce', ['get', 'end_decdate'], STILL_EXISTS], year],
  ] as unknown as FilterSpecification;
}

function vectorSource(tileset: string) {
  return {
    type: 'vector' as const,
    tiles: [`${OHM_TILE_BASE}/${tileset}/{z}/{x}/{y}`],
    minzoom: 0,
    maxzoom: 12,
    attribution: OHM_ATTRIBUTION,
  };
}

/**
 * The globe style, painted for one year.
 *
 * Built as a complete style object rather than fetched and mutated: switching
 * projection or repainting while a style is mid-load leaves MapLibre's vector
 * sources unloaded (see docs/architecture.md §11).
 */
export function buildGlobeStyle(year: number): StyleSpecification {
  return {
    version: 8,
    // MapLibre requires a glyph endpoint before it will lay out any label.
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      'ohm-land': vectorSource('land_polygons'),
      'ohm-water': vectorSource('water_areas'),
      'ohm-boundaries': vectorSource('boundaries'),
    },
    layers: [
      {
        id: 'sea',
        type: 'background',
        paint: { 'background-color': GLOBE_COLOURS.sea },
      },
      {
        id: 'land',
        type: 'fill',
        source: 'ohm-land',
        'source-layer': 'land_polygons',
        paint: {
          'fill-color': GLOBE_COLOURS.land,
          'fill-outline-color': GLOBE_COLOURS.coast,
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'ohm-water',
        'source-layer': 'water_areas',
        filter: boundaryFilter(year),
        paint: { 'fill-color': GLOBE_COLOURS.water },
      },
      {
        id: 'boundaries',
        type: 'line',
        source: 'ohm-boundaries',
        'source-layer': 'boundaries',
        filter: boundaryFilter(year),
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': GLOBE_COLOURS.border,
          // Thicker for the higher-order borders, so empires read at a glance.
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            ['case', ['<=', ['coalesce', ['get', 'admin_level'], 10], 2], 0.8, 0.3],
            6,
            ['case', ['<=', ['coalesce', ['get', 'admin_level'], 10], 2], 1.6, 0.7],
          ],
          'line-opacity': 0.85,
        },
      },
    ],
  } as unknown as StyleSpecification;
}

/** Layers whose filter has to be rewritten when the year changes. */
export const TIME_FILTERED_LAYERS = ['water', 'boundaries'] as const;
