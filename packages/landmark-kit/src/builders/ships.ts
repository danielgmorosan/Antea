import type { ShipsParams } from '@antea/schema';
import type { BuildContext } from '../kit';
import type { Group, Object3D, Three } from '../three';

/** Per-ship bob state, read by the diorama's render loop. */
export interface ShipBob {
  object: Object3D;
  phase: number;
}

export interface ShipsResult {
  group: Group;
  bobbing: ShipBob[];
}

/** Moored shipping, riding at the waterline. */
export function ships(THREE: Three, params: ShipsParams, ctx: BuildContext): ShipsResult {
  const { kit, terrain, rand } = ctx;
  const group = kit.group();
  const bobbing: ShipBob[] = [];

  const used = params.spots.slice(0, params.count);
  for (const spot of used) {
    const [x, z] = spot;
    const hull = kit.group();

    const body = kit.box({ w: 0.85, h: 0.22, d: 0.3 }, params.hull);
    body.position.y = 0.1;
    hull.add(body);

    const mast = kit.cyl(0.02, 0.02, 0.7, params.hull, 4);
    mast.position.y = 0.55;
    hull.add(mast);

    const sail = kit.cone(0.22, 0.5, params.sail, 3);
    sail.position.set(0.05, 0.6, 0);
    sail.rotation.z = -0.12;
    hull.add(sail);

    hull.position.set(x, terrain.waterLevel, z);
    hull.rotation.y = rand() * Math.PI * 2;
    group.add(hull);
    bobbing.push({ object: hull, phase: rand() * Math.PI * 2 });
  }

  void THREE;
  return { group, bobbing };
}
