import type { LandmarkPlacement } from '@antea/schema';
import {
  amphitheatre,
  aqueduct,
  basilicaDome,
  column,
  hippodrome,
  minaret,
  pavilionCluster,
  temple,
  tower,
  wall,
} from './builders';
import type { BuildContext, Exclusion } from './kit';
import type { Group, Three } from './three';

/**
 * Dispatches a spec placement to its builder. The switch is exhaustive over
 * `LandmarkPlacement`, so adding a builder to the schema fails to compile here
 * until it is wired up.
 */
export function buildLandmark(
  THREE: Three,
  placement: LandmarkPlacement,
  ctx: BuildContext,
): Group {
  const at = placement;
  switch (placement.builder) {
    case 'temple':
      return temple(THREE, { params: placement.params, at, ctx });
    case 'amphitheatre':
      return amphitheatre(THREE, { params: placement.params, at, ctx });
    case 'aqueduct':
      return aqueduct(THREE, { params: placement.params, at, ctx });
    case 'basilicaDome':
      return basilicaDome(THREE, { params: placement.params, at, ctx });
    case 'minaret':
      return minaret(THREE, { params: placement.params, at, ctx });
    case 'hippodrome':
      return hippodrome(THREE, { params: placement.params, at, ctx });
    case 'column':
      return column(THREE, { params: placement.params, at, ctx });
    case 'tower':
      return tower(THREE, { params: placement.params, at, ctx });
    case 'pavilionCluster':
      return pavilionCluster(THREE, { params: placement.params, at, ctx });
    case 'wall':
      return wall(THREE, { params: placement.params, at, ctx });
  }
}

/**
 * Keep-out circles for an era, read off the spec rather than accumulated by the
 * builders — so house layout does not depend on landmark build order.
 */
export function exclusionsFor(placements: readonly LandmarkPlacement[]): Exclusion[] {
  const out: Exclusion[] = [];
  for (const p of placements) {
    if (p.exclusionRadius !== undefined)
      out.push({ x: p.x, z: p.z, r: p.exclusionRadius });
  }
  return out;
}
