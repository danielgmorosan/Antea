import type { MinaretParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/** A slender tapering shaft with a conical cap. */
export const minaret: Builder<MinaretParams> = (_THREE, { params, at, ctx }) => {
  const { kit } = ctx;
  const group = kit.group();

  const shaft = kit.cyl(
    params.radiusTop,
    params.radiusBottom,
    params.height,
    params.shaft,
    6,
  );
  shaft.position.y = params.height / 2;
  group.add(shaft);

  const cap = kit.cone(params.capRadius, params.capHeight, params.cap, 6);
  cap.position.y = params.height + params.capHeight / 2;
  group.add(cap);

  return anchor(group, at, ctx);
};
