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

/**
 * How close a source stands to the events it describes.
 *
 * This is surfaced in the UI rather than flattened away: a witness who was
 * there, a legend written three centuries later, and a modern population
 * estimate are all "sources", and a reader deserves to know which is which.
 */
export type SourceKind = 'contemporary' | 'later-tradition' | 'modern-scholarship';

export const SOURCE_KINDS = [
  'contemporary',
  'later-tradition',
  'modern-scholarship',
] as const satisfies readonly SourceKind[];

/** A citation. Every factual claim in a dossier points at one of these. */
export interface Source {
  id: string;
  /** Short form shown on the dossier, e.g. "Procopius, Buildings I.i". */
  citation: string;
  kind: SourceKind;
  url?: string;
  /**
   * A caveat shown with the citation — that a famous quotation is a later
   * attribution, or that an estimate is disputed. Kept short.
   */
  note?: string;
  /** Licence, where the material is not public domain or our own prose. */
  licence?: 'CC0' | 'CC-BY' | 'ODbL' | 'public-domain' | 'editorial';
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
  /**
   * Claims in this dossier that no source has been attached to yet, named so
   * a reader can see the gap instead of assuming the citations below cover
   * everything. The structured form of the brief's `TODO(source)` marker.
   */
  unsourcedClaims?: string[];
}

/* -------------------------------------------------------------------------
   Landmark builders.

   Each variant names a pure builder in `@antea/landmark-kit` and carries only
   the knobs that differ between landmarks. Interior proportions that never
   vary (column taper, roof pitch) stay as documented constants in the builder
   — the spec says *which* landmark and *where*, not how to model a cornice.
   ------------------------------------------------------------------------- */

/** Palette keys, resolved against `CitySpec.palette`. */
export type PaletteKey = string;

export interface Placed {
  /** Ground-plane position in diorama units. */
  x: number;
  z: number;
  rotationY?: number;
  /** Radius within which procedural houses and trees are not scattered. */
  exclusionRadius?: number;
}

export interface Box3 {
  w: number;
  h: number;
  d: number;
}

export interface MinaretParams {
  height: number;
  radiusTop: number;
  radiusBottom: number;
  capRadius: number;
  capHeight: number;
  shaft: PaletteKey;
  cap: PaletteKey;
}

/** A classical peripteral temple: stylobate, two colonnades, hipped roof. */
export interface TempleParams {
  base: Box3;
  /** Columns per side. */
  columns: number;
  columnSpacing: number;
  columnHeight: number;
  columnOffsetZ: number;
  roof: { radius: number; height: number; scaleZ: number; y: number };
  stone: PaletteKey;
  roofColour: PaletteKey;
}

/**
 * A great domed building — Hagia Sophia as basilica and as mosque, and the
 * Suleymaniye, are all this builder with different knobs.
 */
export interface BasilicaDomeParams {
  base: Box3;
  /** Second storey drum. Omitted for a single-mass building. */
  upper?: Box3;
  dome: { radius: number; squash: number; y: number };
  halfDomes?: {
    count: number;
    /** Which axis the half-domes flank the main dome along. */
    axis: 'x' | 'z';
    radius: number;
    squash: number;
    offset: number;
    y: number;
  };
  /** Corner buttress towers. */
  corners?: Box3 & { offsetX: number; offsetZ: number };
  /** Minarets, one per corner of the given offsets. */
  minarets?: MinaretParams & { offsetX: number; offsetZ: number; count: 2 | 4 };
  stone: PaletteKey;
  domeColour: PaletteKey;
}

/** An elliptical amphitheatre: the Colosseum and its kin. */
export interface AmphitheatreParams {
  /** Outer radius on x. `ellipseZ` squashes it into an ellipse. */
  radius: number;
  ellipseZ: number;
  height: number;
  /** Thickness of the seating ring, as a fraction of `radius`. */
  wallThickness: number;
  /** Second, lower ring inside the first, for a tiered silhouette. */
  innerHeight: number;
  segments: number;
  stone: PaletteKey;
  arena: PaletteKey;
}

/** A run of arches carrying water: piers with a channel along the top. */
export interface AqueductParams {
  /** The line the aqueduct follows, in diorama units. */
  points: { x: number; z: number }[];
  /** Distance between piers. */
  spacing: number;
  pierWidth: number;
  pierDepth: number;
  height: number;
  /** Depth of the water channel riding on top of the piers. */
  channelHeight: number;
  stone: PaletteKey;
}

export interface HippodromeParams {
  track: Box3;
  stands: Box3 & { offsetZ: number; offsetX: number };
  turn: { radius: number; height: number; scaleZ: number; x: number };
  obelisk: { width: number; height: number; x: number };
  track_colour: PaletteKey;
  stone: PaletteKey;
  marble: PaletteKey;
}

/** A free-standing honorific column with an orb or statue on top. */
export interface ColumnParams {
  height: number;
  radiusTop: number;
  radiusBottom: number;
  orbRadius: number;
  shaft: PaletteKey;
  orb: PaletteKey;
}

export interface TowerParams {
  height: number;
  radiusTop: number;
  radiusBottom: number;
  capRadius: number;
  capHeight: number;
  segments: number;
  shaft: PaletteKey;
  cap: PaletteKey;
}

/** One explicitly placed block within a pavilion cluster. */
export interface PavilionBlock {
  size: Box3;
  x: number;
  z: number;
  rotationY?: number;
  colour: PaletteKey;
  /** Adds a low dome on top of this block. */
  dome?: { radius: number; squash: number; y: number; colour: PaletteKey };
  /** Adds a pyramidal roof on top of this block. */
  roof?: { radius: number; height: number; colour: PaletteKey };
}

/**
 * A loose group of low buildings — the Great Palace as explicit blocks, or
 * Topkapi as `scatter` pavilions drawn from the seeded RNG.
 */
export interface PavilionClusterParams {
  blocks?: PavilionBlock[];
  scatter?: {
    count: number;
    spreadX: number;
    spreadZ: number;
    size: Box3;
    /** Width is jittered up to this much above `size.w`. */
    widthJitter: number;
    rotationJitter: number;
    colour: PaletteKey;
    roof: { radius: number; height: number; colour: PaletteKey };
  };
}

/** An arc struck around a centre — a colonial palisade. */
export interface ArcWallPath {
  kind: 'arc';
  segments: number;
  /** Angular sweep, in radians, centred on `angleOffset`. */
  from: number;
  to: number;
  angleScale: number;
  angleOffset: number;
  radiusX: number;
  radiusZ: number;
  /** Centre, relative to the terrain origin. */
  offsetX: number;
}

/** A bowed north-south line — the Theodosian land walls. */
export interface SineWallPath {
  kind: 'sine';
  segments: number;
  zFrom: number;
  zTo: number;
  x: number;
  /** How far the wall bows west at its midpoint. */
  bow: number;
}

export interface WallParams {
  style: 'palisade' | 'curtain';
  path: ArcWallPath | SineWallPath;
  /** Palisade: stake dimensions. Curtain: wall segment height and thickness. */
  height: number;
  thickness: number;
  /** Curtain only: a tower every N path points. */
  towerEvery?: number;
  tower?: { size: Box3; capRadius: number; capHeight: number };
  stone: PaletteKey;
  capColour?: PaletteKey;
}

/** Procedural housing, scattered on land and outside every exclusion circle. */
export interface HousesParams {
  /**
   * How the town spreads from the terrain origin.
   *
   * `sector` sweeps in one direction, which is right for a city growing down a
   * peninsula from its point. `radial` fills a disc, which is right for one
   * that grew outward in every direction from a river crossing. Cities differ,
   * so this is spec data rather than an assumption in the builder.
   */
  shape: 'sector' | 'radial';
  count: number;
  /** Settlement radius from the terrain origin. */
  extent: number;
  /** Spread of candidate points around the origin. */
  spreadZ: number;
  extentJitter: number;
  /** Suburb across the water, e.g. Galata. */
  suburb?: { x: number; z: number; spreadX: number; spreadZ: number; share: number };
  /** Candidates west of this x are rejected — inside the land walls only. */
  cutoffX?: number;
  bodyColours: PaletteKey[];
  roofColours: [PaletteKey, PaletteKey];
  /** Share of roofs taking the first roof colour. */
  roofSplit: number;
}

export interface TreesParams {
  /** `base + extent * perExtent`, rounded. */
  base: number;
  perExtent: number;
  spreadX: number;
  spreadZ: number;
  offsetX: number;
  colour: PaletteKey;
}

export interface ShipsParams {
  /** Moorings, in order. An era uses the first `count` of them. */
  spots: [number, number][];
  count: number;
  hull: PaletteKey;
  sail: PaletteKey;
}

/** One landmark placed on the terrain, built by a `landmark-kit` builder. */
export type LandmarkPlacement = Placed &
  (
    | { builder: 'temple'; params: TempleParams }
    | { builder: 'amphitheatre'; params: AmphitheatreParams }
    | { builder: 'aqueduct'; params: AqueductParams }
    | { builder: 'basilicaDome'; params: BasilicaDomeParams }
    | { builder: 'minaret'; params: MinaretParams }
    | { builder: 'hippodrome'; params: HippodromeParams }
    | { builder: 'column'; params: ColumnParams }
    | { builder: 'tower'; params: TowerParams }
    | { builder: 'pavilionCluster'; params: PavilionClusterParams }
    | { builder: 'wall'; params: WallParams }
  );

export type BuilderName = LandmarkPlacement['builder'];

export const BUILDER_NAMES = [
  'temple',
  'amphitheatre',
  'aqueduct',
  'basilicaDome',
  'minaret',
  'hippodrome',
  'column',
  'tower',
  'pavilionCluster',
  'wall',
] as const satisfies readonly BuilderName[];

/* -------------------------------------------------------------------------
   Terrain.
   ------------------------------------------------------------------------- */

/** An elliptical patch of land, smoothstepped to 0 at its rim. */
export interface TerrainBlob {
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  /** Scales the blob's contribution, e.g. 0.9 for a lower outlying spur. */
  weight?: number;
}

/** A gaussian bump added on top of the landmask — an acropolis, a city hill. */
export interface TerrainHill {
  cx: number;
  cz: number;
  height: number;
  /** Gaussian denominator; larger spreads the hill wider. */
  spread: number;
  /**
   * How the hill is tied to the landmask. `sqrt` lets a hill keep its height
   * closer to the shoreline; `linear` sinks it away with the mask.
   */
  maskMode: 'linear' | 'sqrt';
}

/**
 * A watercourse cut through the land: a river valley.
 *
 * The blob model can only add land, which is enough for a peninsula but not
 * for an inland city on a river. A channel is subtracted after the hills, so
 * the Tiber can be cut through the seven hills of Rome.
 */
export interface TerrainChannel {
  /** Polyline the channel follows, in diorama units. */
  points: { x: number; z: number }[];
  /** Half-width of the valley. Beyond this the channel has no effect. */
  width: number;
  /** How far the ground is lowered at the centre line. */
  depth: number;
}

/** Height thresholds the terrain is coloured by. */
export interface TerrainBands {
  /** Below `waterLevel + waterEdge`, paint water. */
  waterEdge: number;
  /** Below `waterLevel + shoreTop`, paint shore. */
  shoreTop: number;
  /** Below this absolute height, paint grass lerped toward rock. */
  grassTop: number;
  /** Grass-to-rock ramp: `(h - from) / over`. */
  rockLerp: { from: number; over: number };
}

/** Deterministic terrain: same params in, same heightfield out. */
export interface TerrainSpec {
  size: { width: number; depth: number };
  segments: { x: number; z: number };
  /** Elliptical land blobs unioned into the landmask. */
  blobs: TerrainBlob[];
  hills: TerrainHill[];
  /** Watercourses cut through the land after the hills are raised. */
  channels?: TerrainChannel[];
  /** Height per unit of landmask. */
  heightScale: number;
  noise: {
    primary: { amplitude: number; fx: number; fz: number };
    secondary: { amplitude: number; fx: number; fz: number };
    /** Fades noise out over water: `min(1, mask * maskInfluence)`. */
    maskInfluence: number;
  };
  waterLevel: number;
  /** Height above `waterLevel` at which ground counts as buildable land. */
  landThreshold: number;
  /** Depth below `waterLevel` at which a hull floats clear of the shore. */
  waterThreshold: number;
  bands: TerrainBands;
  /** The point the settlement grows out from, e.g. the Seraglio point. */
  origin: { x: number; z: number };
  /** Terrain surface colours, resolved against `CitySpec.palette`. */
  colours: { water: PaletteKey; shore: PaletteKey; grass: PaletteKey; rock: PaletteKey };
}

export interface EraSpec {
  /** URL segment and sort key. Negative for BC, e.g. -667. */
  year: number;
  /** Display form, e.g. "667 BC" / "AD 537". */
  yearLabel: string;
  /** The city's name in this era, e.g. "Byzantion, the colony". */
  name: string;
  dossier: Dossier;
  /** Hand-placed landmarks for this era. */
  landmarks: LandmarkPlacement[];
  /** Procedural fill: housing, cypress, shipping. */
  houses: HousesParams;
  trees: TreesParams;
  ships: ShipsParams;
}

/**
 * Where the camera starts and how far it may roam.
 *
 * Per city, not global: Constantinople is a peninsula read along its length,
 * Rome a river plain read across it, and a target hardcoded at the origin
 * frames one of them well and the other badly.
 */
export interface CameraSpec {
  /** What the camera looks at, in diorama units. */
  target: { x: number; y: number; z: number };
  /** Opening distance, and the range the wheel may travel. */
  radius: number;
  minRadius: number;
  maxRadius: number;
  /** Opening angles: `theta` around, `phi` down from the pole. */
  theta: number;
  phi: number;
  /** How far the target may be panned. */
  panX: [number, number];
  panZ: [number, number];
}

export interface CitySpec {
  /** URL slug, e.g. "constantinople". */
  slug: string;
  /** Present-day display name. */
  name: string;
  /** Globe marker position (WGS84). */
  location: { lng: number; lat: number };
  /**
   * Identifiers in external gazetteers, used by the ingest pipeline to fetch
   * sourced facts about this place. Absent where no match exists.
   */
  externalIds?: {
    /** Pleiades place id, e.g. "520998". CC-BY: attribution required. */
    pleiades?: string;
    /** Wikidata Q-id, e.g. "Q16869". CC0. */
    wikidata?: string;
  };
  /** 3D palette lives here, not in components. */
  palette: Record<string, string>;
  /** Seeds every `mulberry32` draw so a city looks identical on every load. */
  seed: number;
  terrain: TerrainSpec;
  camera: CameraSpec;
  eras: EraSpec[];
  /**
   * The era a visitor lands on when they open the city without naming one.
   * Explicit rather than "the biggest era", so editorial can choose the era
   * that introduces the place best.
   */
  defaultEraYear: number;
  sources: Source[];
}
