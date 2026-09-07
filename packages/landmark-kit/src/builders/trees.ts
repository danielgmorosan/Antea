import type { TreesParams } from '@antea/schema';
import type { BuildContext } from '../kit';
import { range } from '../rng';
import type { InstancedMesh, Three } from '../three';

const GUARD_FACTOR = 30;

/** Cypress, scattered on open land outside the landmark keep-outs. */
export function trees(
  THREE: Three,
  params: TreesParams,
  extent: number,
  ctx: BuildContext,
): InstancedMesh {
  const { palette, terrain, rand } = ctx;

  const geo = new THREE.ConeGeometry(0.32, 1.25, 5);
  geo.translate(0, 0.62, 0);

  const wanted = Math.round(params.base + extent * params.perExtent);
  const mesh = new THREE.InstancedMesh(geo, palette.material(params.colour), wanted);
  const dummy = new THREE.Object3D();
  const origin = terrain.origin;

  let placed = 0;
  let guard = 0;
  while (placed < wanted && guard < wanted * GUARD_FACTOR) {
    guard += 1;
    const x = origin.x - rand() * params.spreadX + params.offsetX;
    const z = origin.z + range(rand, -0.5, 0.5) * params.spreadZ;

    if (!terrain.isLand(x, z)) continue;
    let skip = false;
    for (const e of ctx.exclusions) {
      if (Math.hypot(x - e.x, z - e.z) < e.r) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    const s = range(rand, 0.7, 1.5);
    dummy.position.set(x, terrain.surfaceY(x, z), z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(s, s * range(rand, 0.9, 1.4), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }

  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
