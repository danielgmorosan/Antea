import type { BasilicaDomeParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/**
 * A great domed building. Hagia Sophia as basilica, the same mass reworked as a
 * mosque, and the Suleymaniye are all this builder with different knobs.
 */
export const basilicaDome: Builder<BasilicaDomeParams> = (
  _THREE,
  { params, at, ctx },
) => {
  const { kit } = ctx;
  const group = kit.group();

  const base = kit.box(params.base, params.stone);
  base.position.y = params.base.h / 2;
  group.add(base);

  if (params.upper) {
    const upper = kit.box(params.upper, params.stone);
    upper.position.y = params.base.h + params.upper.h / 2;
    group.add(upper);
  }

  const dome = kit.dome(params.dome.radius, params.domeColour, params.dome.squash);
  dome.position.y = params.dome.y;
  group.add(dome);

  if (params.halfDomes) {
    const { count, axis, radius, squash, offset, y } = params.halfDomes;
    const sides = count === 1 ? [1] : [-1, 1];
    for (const side of sides) {
      const half = kit.dome(radius, params.domeColour, squash);
      half.position.set(
        axis === 'x' ? side * offset : 0,
        y,
        axis === 'z' ? side * offset : 0,
      );
      group.add(half);
    }
  }

  if (params.corners) {
    const { offsetX, offsetZ, ...size } = params.corners;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const buttress = kit.box(size, params.stone);
        buttress.position.set(sx * offsetX, size.h / 2, sz * offsetZ);
        group.add(buttress);
      }
    }
  }

  if (params.minarets) {
    const m = params.minarets;
    // Two minarets flank on one side; four take every corner.
    const corners: [number, number][] =
      m.count === 2
        ? [
            [-1, 1],
            [1, 1],
          ]
        : [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ];
    for (const [sx, sz] of corners) {
      const shaft = kit.cyl(m.radiusTop, m.radiusBottom, m.height, m.shaft, 6);
      shaft.position.set(sx * m.offsetX, m.height / 2, sz * m.offsetZ);
      group.add(shaft);

      const cap = kit.cone(m.capRadius, m.capHeight, m.cap, 6);
      cap.position.set(sx * m.offsetX, m.height + m.capHeight / 2, sz * m.offsetZ);
      group.add(cap);
    }
  }

  return anchor(group, at, ctx);
};
