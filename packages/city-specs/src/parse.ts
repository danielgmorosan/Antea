import { BUILDER_NAMES, type CitySpec, type LandmarkPlacement } from '@antea/schema';

/**
 * Validates a raw JSON city spec and narrows it to `CitySpec`.
 *
 * `resolveJsonModule` types a JSON import structurally, which cannot satisfy a
 * discriminated union like `LandmarkPlacement` (its `builder` widens to
 * `string`). Rather than cast blind, everything the type system cannot check
 * for itself is checked here at load, so the one assertion at the end is
 * backed by real assertions rather than optimism.
 */
export function parseCitySpec(raw: unknown): CitySpec {
  const spec = asRecord(raw, 'city spec');

  requireString(spec['slug'], 'slug');
  requireString(spec['name'], 'name');
  requireNumber(spec['seed'], 'seed');

  const palette = asRecord(spec['palette'], 'palette');
  const paletteKeys = new Set(Object.keys(palette));
  if (paletteKeys.size === 0) throw new Error('city spec: palette is empty');

  const terrain = asRecord(spec['terrain'], 'terrain');
  for (const key of ['waterLevel', 'landThreshold', 'waterThreshold', 'heightScale']) {
    requireNumber(terrain[key], `terrain.${key}`);
  }
  if (!Array.isArray(terrain['blobs']) || terrain['blobs'].length === 0) {
    throw new Error('city spec: terrain.blobs must have at least one blob');
  }

  const eras = spec['eras'];
  if (!Array.isArray(eras) || eras.length === 0) {
    throw new Error('city spec: eras must be a non-empty array');
  }

  const sources = spec['sources'];
  if (!Array.isArray(sources)) throw new Error('city spec: sources must be an array');
  const sourceIds = new Set(
    sources.map((s) => requireString(asRecord(s, 'source')['id'], 'source.id')),
  );

  const defaultEraYear = requireNumber(spec['defaultEraYear'], 'defaultEraYear');
  if (!eras.some((e) => asRecord(e, 'era')['year'] === defaultEraYear)) {
    throw new Error(`city spec: defaultEraYear ${defaultEraYear} does not match any era`);
  }

  let previousYear = -Infinity;
  eras.forEach((rawEra, i) => {
    const era = asRecord(rawEra, `eras[${i}]`);
    const year = requireNumber(era['year'], `eras[${i}].year`);
    if (year <= previousYear) {
      throw new Error(
        `city spec: eras[${i}].year (${year}) is not after the previous era`,
      );
    }
    previousYear = year;

    const dossier = asRecord(era['dossier'], `eras[${i}].dossier`);
    requireString(dossier['story'], `eras[${i}].dossier.story`);
    const cited = dossier['sourceIds'];
    if (!Array.isArray(cited)) {
      throw new Error(`city spec: eras[${i}].dossier.sourceIds must be an array`);
    }
    for (const id of cited) {
      if (!sourceIds.has(String(id))) {
        throw new Error(
          `city spec: eras[${i}].dossier cites unknown source "${String(id)}"`,
        );
      }
    }

    const landmarks = era['landmarks'];
    if (!Array.isArray(landmarks)) {
      throw new Error(`city spec: eras[${i}].landmarks must be an array`);
    }
    landmarks.forEach((rawLandmark, j) => {
      const landmark = asRecord(rawLandmark, `eras[${i}].landmarks[${j}]`);
      const builder = requireString(
        landmark['builder'],
        `eras[${i}].landmarks[${j}].builder`,
      );
      if (!(BUILDER_NAMES as readonly string[]).includes(builder)) {
        throw new Error(
          `city spec: eras[${i}].landmarks[${j}] names unknown builder "${builder}"`,
        );
      }
      requireNumber(landmark['x'], `eras[${i}].landmarks[${j}].x`);
      requireNumber(landmark['z'], `eras[${i}].landmarks[${j}].z`);
      asRecord(landmark['params'], `eras[${i}].landmarks[${j}].params`);
    });
  });

  // Every field the union relies on has now been checked above.
  return spec as unknown as CitySpec;
}

/** Every landmark in a spec, across all eras, tagged with the era it belongs to. */
export function allLandmarks(
  spec: CitySpec,
): { era: string; landmark: LandmarkPlacement }[] {
  return spec.eras.flatMap((era) =>
    era.landmarks.map((landmark) => ({ era: era.yearLabel, landmark })),
  );
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`city spec: ${what} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`city spec: ${what} must be a non-empty string`);
  }
  return value;
}

function requireNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`city spec: ${what} must be a finite number`);
  }
  return value;
}
