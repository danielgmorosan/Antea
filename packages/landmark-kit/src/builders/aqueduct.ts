import type { AqueductParams } from '@antea/schema';
import type { Builder } from '../kit';

/**
 * A run of arches carrying water.
 *
 * Piers are stepped along the path at a fixed spacing and the channel rides on
 * top, so an aqueduct follows the ground rather than sitting at one height —
 * which is what makes it read as engineering across a valley.
 *
 * Like walls, this is built in world space and is not anchored: its path is
 * absolute, so the placement's x/z are unused.
 */
export const aqueduct: Builder<AqueductParams> = (_THREE, { params, ctx }) => {
  const { kit, terrain } = ctx;
  const group = kit.group();
  const points = params.points;
  if (points.length < 2) return group;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;

    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const angle = -Math.atan2(b.z - a.z, b.x - a.x);
    const piers = Math.max(1, Math.round(length / params.spacing));

    for (let p = 0; p <= piers; p += 1) {
      const t = p / piers;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (!terrain.isLand(x, z)) continue;

      const pier = kit.box(
        { w: params.pierWidth, h: params.height, d: params.pierDepth },
        params.stone,
      );
      pier.rotation.y = angle;
      group.add(kit.place(pier, x, z, params.height / 2));
    }

    // One channel per segment, riding above the piers.
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    if (!terrain.isLand(mx, mz)) continue;
    const channel = kit.box(
      { w: length, h: params.channelHeight, d: params.pierDepth * 1.2 },
      params.stone,
    );
    channel.rotation.y = angle;
    group.add(kit.place(channel, mx, mz, params.height + params.channelHeight / 2));
  }

  return group;
};
