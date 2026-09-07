/**
 * The contract every city spec is written against.
 *
 * Phase 1 skeleton: the shapes here are lifted from what
 * `prototype/antea-globe.html` actually needs to render Constantinople.
 * Task 2 of Phase 1 fills `packages/city-specs/constantinople.json` against it
 * and moves the prototype's hand-placed meshes into `landmarks`.
 */

/** How sure we are about a claim. Surfaced in the UI — never hidden. */
export type Confidence = 'attested' | 'inferred' | 'approximate';

/** A citation. Every factual claim in a dossier points at one of these. */
export interface Source {
  id: string;
  /** Short form shown in the dossier footer, e.g. "Procopius, Buildings I.i". */
  citation: string;
  url?: string;
  /** Licence of the underlying data, where it is not our own editorial prose. */
  licence?: 'CC0' | 'CC-BY' | 'ODbL' | 'editorial';
}

/** The editorial panel for one place-era pairing. */
export interface Dossier {
  /** Population estimate. `null` where we genuinely do not know. */
  population: number | null;
  populationLabel: string;
  populationConfidence: Confidence;
  ruler: string;
  /** Editorial prose. Never lorem ipsum, never invented. */
  story: string;
  /** "What you are looking at" — ties the prose to the diorama. */
  seeing: string;
  sourceIds: string[];
}

/** One landmark placed on the terrain, built by a `landmark-kit` builder. */
export interface LandmarkPlacement {
  /** Builder name in `@antea/landmark-kit`, e.g. "basilicaDome". */
  builder: string;
  /** Ground-plane position in diorama units. */
  x: number;
  z: number;
  rotationY?: number;
  /** Radius within which procedural houses are not scattered. */
  exclusionRadius?: number;
  /** Builder-specific knobs (dome colour, minaret count, ...). */
  params?: Record<string, number | string | boolean>;
}

/** Deterministic terrain: same params in, same heightfield out. */
export interface TerrainSpec {
  /** Elliptical land blobs unioned into the landmask. */
  blobs: { cx: number; cz: number; rx: number; rz: number; weight?: number }[];
  waterLevel: number;
  /** Above this height above water, ground counts as buildable land. */
  landThreshold: number;
  size: { width: number; depth: number };
  segments: { x: number; z: number };
  noise: { amplitude: number; frequency: number };
}

export interface EraSpec {
  /** URL segment and sort key. Negative for BC, e.g. -667. */
  year: number;
  /** Display form, e.g. "667 BC" / "AD 537". */
  yearLabel: string;
  /** The city's name in this era, e.g. "Byzantion, the colony". */
  name: string;
  dossier: Dossier;
  /** Procedural settlement extent and density. */
  extent: number;
  houses: number;
  ships: number;
  landmarks: LandmarkPlacement[];
}

export interface CitySpec {
  /** URL slug, e.g. "constantinople". */
  slug: string;
  /** Present-day display name. */
  name: string;
  /** Globe marker position (WGS84). */
  location: { lng: number; lat: number };
  /** 3D palette lives here, not in components. */
  palette: Record<string, string>;
  /** Seeds every `mulberry32` draw so a city looks identical on every load. */
  seed: number;
  terrain: TerrainSpec;
  eras: EraSpec[];
  sources: Source[];
}
