import type { CitySpec, EraSpec } from '@antea/schema';
import { buildLandmark, exclusionsFor } from './buildLandmark';
import { houses, ships, trees } from './builders';
import type { ShipBob } from './builders';
import { createKit } from './kit';
import type { BuildContext } from './kit';
import type { Palette } from './palette';
import { mulberry32 } from './rng';
import type { TerrainSampler } from './terrain';
import type { Group, Object3D, Three } from './three';

export interface EraScene {
  group: Group;
  /** Ships the render loop should bob. */
  bobbing: ShipBob[];
}

/**
 * Assembles one era of a city: landmarks from the spec, then procedural
 * housing, cypress and shipping.
 *
 * The RNG is seeded from the city seed and the era's year, so an era looks
 * identical on every load, in every browser, and in tests — and changing one
 * era's content never reshuffles another's.
 */
export function buildEra(
  THREE: Three,
  spec: CitySpec,
  era: EraSpec,
  palette: Palette,
  terrain: TerrainSampler,
): EraScene {
  const rand = mulberry32(spec.seed + era.year);
  const ctx: BuildContext = {
    kit: createKit(THREE, palette, terrain),
    palette,
    terrain,
    rand,
    exclusions: exclusionsFor(era.landmarks),
  };

  const group = ctx.kit.group();
  for (const landmark of era.landmarks) {
    group.add(buildLandmark(THREE, landmark, ctx));
  }

  group.add(houses(THREE, era.houses, ctx));
  group.add(trees(THREE, era.trees, era.houses.extent, ctx));

  const fleet = ships(THREE, era.ships, ctx);
  group.add(fleet.group);

  return { group, bobbing: fleet.bobbing };
}

/**
 * Frees the geometries under an object. Materials are owned by the palette and
 * shared across eras, so they are disposed with the palette, not here.
 */
export function disposeGeometries(root: Object3D): void {
  root.traverse((child) => {
    const geometry = (child as { geometry?: { dispose(): void } }).geometry;
    if (geometry) geometry.dispose();
  });
}
