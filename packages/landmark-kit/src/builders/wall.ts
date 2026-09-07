import type { ArcWallPath, SineWallPath, WallParams } from '@antea/schema';
import type { Builder } from '../kit';

export interface PathPoint {
  x: number;
  z: number;
}

/**
 * The points a wall is struck through, before any land test. Pure, so a spec's
 * wall can be validated against the terrain without building geometry.
 */
export function wallPath(
  path: ArcWallPath | SineWallPath,
  origin: { x: number; z: number },
): PathPoint[] {
  const points: PathPoint[] = [];

  if (path.kind === 'arc') {
    for (let i = 0; i <= path.segments; i += 1) {
      const a = path.from + (i / path.segments) * (path.to - path.from);
      points.push({
        x:
          origin.x -
          path.radiusX * Math.cos(a * path.angleScale + path.angleOffset) +
          path.offsetX,
        z: origin.z + path.radiusZ * Math.sin(a),
      });
    }
    return points;
  }

  for (let i = 0; i <= path.segments; i += 1) {
    const t = i / path.segments;
    points.push({
      x: path.x - Math.sin(t * Math.PI) * path.bow,
      z: path.zFrom + t * (path.zTo - path.zFrom),
    });
  }
  return points;
}

/**
 * A defensive line. `palisade` drives a stake at every point on land;
 * `curtain` runs masonry between consecutive land points and raises a tower
 * periodically. A run that crosses water is broken, not bridged.
 *
 * Unlike the point landmarks, a wall is built directly in world space — its
 * path is struck from the terrain origin — so the placement's x/z are unused
 * and the group is never anchored.
 */
export const wall: Builder<WallParams> = (_THREE, { params, ctx }) => {
  const { kit, terrain } = ctx;
  const group = kit.group();
  const points = wallPath(params.path, terrain.origin);

  if (params.style === 'palisade') {
    for (const p of points) {
      if (!terrain.isLand(p.x, p.z)) continue;
      const stake = kit.cyl(
        params.thickness * 0.78,
        params.thickness,
        params.height,
        params.stone,
        5,
      );
      group.add(kit.place(stake, p.x, p.z, params.height / 2));
    }
    return group;
  }

  let previous: PathPoint | null = null;
  points.forEach((p, i) => {
    if (!terrain.isLand(p.x, p.z)) {
      previous = null;
      return;
    }

    if (previous) {
      const mx = (previous.x + p.x) / 2;
      const mz = (previous.z + p.z) / 2;
      const length = Math.hypot(p.x - previous.x, p.z - previous.z);
      const segment = kit.box(
        { w: length + 0.12, h: params.height, d: params.thickness },
        params.stone,
      );
      segment.position.set(mx, terrain.surfaceY(mx, mz) + params.height / 2, mz);
      segment.rotation.y = -Math.atan2(p.z - previous.z, p.x - previous.x);
      group.add(segment);
    }

    const tower = params.tower;
    if (tower && params.towerEvery && i % params.towerEvery === 0) {
      const shaft = kit.box(tower.size, params.stone);
      group.add(kit.place(shaft, p.x, p.z, tower.size.h / 2));

      const cap = kit.cone(
        tower.capRadius,
        tower.capHeight,
        params.capColour ?? params.stone,
        4,
      );
      cap.rotation.y = Math.PI / 4;
      group.add(kit.place(cap, p.x, p.z, tower.size.h + tower.capHeight / 2));
    }

    previous = p;
  });

  return group;
};
