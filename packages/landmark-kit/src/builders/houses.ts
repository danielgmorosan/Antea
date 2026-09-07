import type { HousesParams } from '@antea/schema';
import type { BuildContext } from '../kit';
import { range } from '../rng';
import type { Group, Three } from '../three';

/** Rejection sampling gives up after this many tries per requested house. */
const GUARD_FACTOR = 40;

function blocked(ctx: BuildContext, x: number, z: number): boolean {
  for (const e of ctx.exclusions) {
    if (Math.hypot(x - e.x, z - e.z) < e.r) return true;
  }
  return false;
}

/**
 * The procedural town: instanced boxes with pyramidal roofs, rejection-sampled
 * onto land inside the era's extent and outside every landmark's keep-out circle.
 *
 * Returns a group of InstancedMeshes — one per body colour, two for roofs.
 */
export function houses(THREE: Three, params: HousesParams, ctx: BuildContext): Group {
  const { kit, palette, terrain, rand } = ctx;
  const group = kit.group();

  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  bodyGeo.translate(0, 0.5, 0);
  const roofGeo = new THREE.ConeGeometry(0.78, 0.55, 4);
  roofGeo.translate(0, 0.27, 0);

  const bodies = params.bodyColours.map(
    (colour) => new THREE.InstancedMesh(bodyGeo, palette.material(colour), params.count),
  );
  const roofs = params.roofColours.map(
    (colour) => new THREE.InstancedMesh(roofGeo, palette.material(colour), params.count),
  );

  const bodyCounts = new Array<number>(bodies.length).fill(0);
  const roofCounts = new Array<number>(roofs.length).fill(0);
  const dummy = new THREE.Object3D();
  const origin = terrain.origin;

  let placed = 0;
  let guard = 0;
  while (placed < params.count && guard < params.count * GUARD_FACTOR) {
    guard += 1;

    const inSuburb = params.suburb !== undefined && rand() < params.suburb.share;
    let x: number;
    let z: number;

    if (inSuburb && params.suburb) {
      x = params.suburb.x + range(rand, -0.5, 0.5) * params.suburb.spreadX;
      z = params.suburb.z + range(rand, -0.5, 0.5) * params.suburb.spreadZ;
    } else if (params.shape === 'radial') {
      // sqrt keeps the sample uniform over the disc rather than crowding the
      // centre, so the outskirts are as dense as the middle.
      const angle = rand() * Math.PI * 2;
      const radius = Math.sqrt(rand()) * params.extent;
      x = origin.x + Math.cos(angle) * radius;
      z = origin.z + Math.sin(angle) * radius;
    } else {
      x = origin.x - rand() * (params.extent + 6);
      z = origin.z + range(rand, -0.5, 0.5) * params.spreadZ;
    }

    if (!terrain.isLand(x, z)) continue;

    if (!inSuburb) {
      const d = Math.hypot(x - origin.x, z - origin.z);
      if (d > params.extent + rand() * params.extentJitter) continue;
      if (params.cutoffX !== undefined && x < params.cutoffX) continue;
    }

    if (blocked(ctx, x, z)) continue;

    const footprint = range(rand, 0.42, 0.92);
    const height = range(rand, 0.35, 0.9);
    const rotation = rand() * Math.PI;
    const y = terrain.surfaceY(x, z);

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(footprint, height, footprint * range(rand, 0.8, 1.2));
    dummy.updateMatrix();
    const bodyIndex = Math.floor(rand() * bodies.length);
    const body = bodies[bodyIndex];
    if (body) {
      const next = bodyCounts[bodyIndex] ?? 0;
      body.setMatrixAt(next, dummy.matrix);
      bodyCounts[bodyIndex] = next + 1;
    }

    dummy.position.y = y + height;
    dummy.scale.set(footprint * 1.12, range(rand, 0.5, 0.85), footprint * 1.12);
    dummy.rotation.y = rotation + Math.PI / 4;
    dummy.updateMatrix();
    const roofIndex = rand() < params.roofSplit ? 0 : 1;
    const roof = roofs[roofIndex];
    if (roof) {
      const next = roofCounts[roofIndex] ?? 0;
      roof.setMatrixAt(next, dummy.matrix);
      roofCounts[roofIndex] = next + 1;
    }

    placed += 1;
  }

  // Instance count must be set after the matrices are filled, and the buffer
  // flagged, or nothing renders.
  bodies.forEach((mesh, i) => {
    mesh.count = bodyCounts[i] ?? 0;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  roofs.forEach((mesh, i) => {
    mesh.count = roofCounts[i] ?? 0;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  return group;
}
