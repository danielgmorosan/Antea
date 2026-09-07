import type { TempleParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/** Column taper, held constant across temples. */
const COLUMN_RADIUS_TOP = 0.09;
const COLUMN_RADIUS_BOTTOM = 0.11;

/** A classical temple: stylobate, two colonnades, hipped roof. */
export const temple: Builder<TempleParams> = (_THREE, { params, at, ctx }) => {
  const { kit } = ctx;
  const group = kit.group();

  const base = kit.box(params.base, params.stone);
  base.position.y = params.base.h / 2 + 0.005;
  group.add(base);

  const startX = (-(params.columns - 1) * params.columnSpacing) / 2;
  for (let i = 0; i < params.columns; i += 1) {
    for (const side of [-1, 1]) {
      const column = kit.cyl(
        COLUMN_RADIUS_TOP,
        COLUMN_RADIUS_BOTTOM,
        params.columnHeight,
        params.stone,
        6,
      );
      column.position.set(
        startX + i * params.columnSpacing,
        params.base.h + params.columnHeight / 2,
        side * params.columnOffsetZ,
      );
      group.add(column);
    }
  }

  const roof = kit.cone(params.roof.radius, params.roof.height, params.roofColour, 4);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = params.roof.scaleZ;
  roof.position.y = params.roof.y;
  group.add(roof);

  return anchor(group, at, ctx);
};
