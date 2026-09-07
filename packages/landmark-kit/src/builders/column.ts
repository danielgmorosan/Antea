import type { ColumnParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/** A free-standing honorific column carrying an orb. */
export const column: Builder<ColumnParams> = (THREE, { params, at, ctx }) => {
  const { kit, palette } = ctx;
  const group = kit.group();

  const shaft = kit.cyl(
    params.radiusTop,
    params.radiusBottom,
    params.height,
    params.shaft,
    8,
  );
  shaft.position.y = params.height / 2;
  group.add(shaft);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(params.orbRadius, 6, 5),
    palette.material(params.orb),
  );
  orb.position.y = params.height + params.orbRadius;
  group.add(orb);

  return anchor(group, at, ctx);
};
