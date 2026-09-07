import type { PavilionBlock, PavilionClusterParams } from '@antea/schema';
import type { Builder, BuildContext } from '../kit';
import { anchor } from '../kit';
import { range } from '../rng';
import type { Group } from '../three';

function addBlock(group: Group, block: PavilionBlock, ctx: BuildContext): void {
  const { kit } = ctx;

  const body = kit.box(block.size, block.colour);
  body.position.set(block.x, block.size.h / 2, block.z);
  if (block.rotationY !== undefined) body.rotation.y = block.rotationY;
  group.add(body);

  if (block.dome) {
    const dome = kit.dome(block.dome.radius, block.dome.colour, block.dome.squash);
    dome.position.set(block.x, block.dome.y, block.z);
    group.add(dome);
  }

  if (block.roof) {
    const roof = kit.cone(block.roof.radius, block.roof.height, block.roof.colour, 4);
    roof.rotation.y = (block.rotationY ?? 0) + Math.PI / 4;
    roof.position.set(block.x, block.size.h + block.roof.height / 2, block.z);
    group.add(roof);
  }
}

/**
 * A loose group of low buildings — the Great Palace as explicit blocks, or
 * Topkapi's kiosks drawn from the seeded RNG.
 */
export const pavilionCluster: Builder<PavilionClusterParams> = (
  _THREE,
  { params, at, ctx },
) => {
  const group = ctx.kit.group();

  for (const block of params.blocks ?? []) addBlock(group, block, ctx);

  if (params.scatter) {
    const s = params.scatter;
    for (let i = 0; i < s.count; i += 1) {
      addBlock(
        group,
        {
          size: { ...s.size, w: s.size.w + ctx.rand() * s.widthJitter },
          x: range(ctx.rand, -s.spreadX / 2, s.spreadX / 2),
          z: range(ctx.rand, -s.spreadZ / 2, s.spreadZ / 2),
          rotationY: ctx.rand() * s.rotationJitter,
          colour: s.colour,
          roof: s.roof,
        },
        ctx,
      );
    }
  }

  return anchor(group, at, ctx);
};
