import type { AmphitheatreParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/**
 * An elliptical amphitheatre.
 *
 * Built from open-ended cylinders, which give a hollow ring directly — no
 * boolean geometry, and the silhouette that actually identifies the building
 * is the ring and the arena floor inside it.
 */
export const amphitheatre: Builder<AmphitheatreParams> = (THREE, { params, at, ctx }) => {
  const { kit, palette } = ctx;
  const group = kit.group();

  const ring = (radius: number, height: number, colour: string) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, params.segments, 1, true),
      palette.material(colour),
    );
    // Two-sided: the inside of the ring faces the camera across the arena.
    (mesh.material as { side?: number }).side = THREE.DoubleSide;
    mesh.scale.z = params.ellipseZ;
    mesh.position.y = height / 2;
    return mesh;
  };

  const inner = params.radius * (1 - params.wallThickness);

  group.add(ring(params.radius, params.height, params.stone));
  group.add(ring(inner, params.innerHeight, params.stone));

  // The arena floor, sitting just above the ground so it reads as a surface.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(inner, params.segments),
    palette.material(params.arena),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.y = params.ellipseZ;
  floor.position.y = 0.05;
  group.add(floor);

  return anchor(group, at, ctx);
};
