import type { HippodromeParams } from '@antea/schema';
import type { Builder } from '../kit';
import { anchor } from '../kit';

/** A racing circuit: spina, flanking stands, one turn, a standing obelisk. */
export const hippodrome: Builder<HippodromeParams> = (_THREE, { params, at, ctx }) => {
  const { kit } = ctx;
  const group = kit.group();

  const track = kit.box(params.track, params.track_colour);
  track.position.y = params.track.h / 2;
  group.add(track);

  const { offsetZ, offsetX, ...standSize } = params.stands;
  for (const side of [-1, 1]) {
    const stand = kit.box(standSize, params.stone);
    stand.position.set(offsetX, params.track.h + standSize.h / 2, side * offsetZ);
    group.add(stand);
  }

  const turn = kit.cyl(
    params.turn.radius,
    params.turn.radius,
    params.turn.height,
    params.stone,
    10,
  );
  turn.scale.z = params.turn.scaleZ;
  turn.position.set(params.turn.x, params.track.h + params.turn.height / 2, 0);
  group.add(turn);

  const shaftHeight = params.obelisk.height;
  const obelisk = kit.box(
    { w: params.obelisk.width, h: shaftHeight, d: params.obelisk.width },
    params.marble,
  );
  obelisk.position.set(params.obelisk.x, params.track.h + shaftHeight / 2, 0);
  group.add(obelisk);

  const tip = kit.cone(params.obelisk.width * 0.875, shaftHeight * 0.2, params.marble, 4);
  tip.position.set(params.obelisk.x, params.track.h + shaftHeight + shaftHeight * 0.1, 0);
  group.add(tip);

  return anchor(group, at, ctx);
};
