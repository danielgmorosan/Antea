import type { TowerParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/** A round watchtower with a conical cap — Galata, and its kin. */
export const tower: Builder<TowerParams> = (_THREE, { params, at, ctx }) => {
  const { kit } = ctx;
  const group = kit.group();

  const shaft = kit.cyl(
    params.radiusTop,
    params.radiusBottom,
    params.height,
    params.shaft,
    params.segments,
  );
  shaft.position.y = params.height / 2;
  group.add(shaft);

  const cap = kit.cone(params.capRadius, params.capHeight, params.cap, params.segments);
  cap.position.y = params.height + params.capHeight / 2;
  group.add(cap);

  return anchor(group, at, ctx);
};
