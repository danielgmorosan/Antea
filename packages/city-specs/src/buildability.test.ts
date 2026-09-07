import {
  buildEra,
  createPalette,
  createTerrainSampler,
  type EraScene,
} from '@antea/landmark-kit';
import type { CitySpec } from '@antea/schema';
import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { listCities } from './index';

/**
 * Every era must actually build, and build the same way every time.
 *
 * The scatter builders place by rejection sampling against the terrain, so a
 * spec whose extent or keep-out circles drift can silently starve the sampler
 * and thin the city out. That failure is invisible in a screenshot taken
 * mid-transition, so it is asserted here on instance counts instead.
 */

// Every city we ship, so adding one cannot skip validation.
const CITIES: CitySpec[] = listCities();

function build(spec: CitySpec, eraIndex: number): EraScene {
  const era = spec.eras[eraIndex];
  if (!era) throw new Error(`no era at index ${eraIndex}`);
  return buildEra(
    THREE,
    spec,
    era,
    createPalette(THREE, spec.palette),
    createTerrainSampler(spec.terrain),
  );
}

interface Counts {
  houseBodies: number;
  roofs: number;
  trees: number;
}

function count(scene: EraScene): Counts {
  const counts: Counts = { houseBodies: 0, roofs: 0, trees: 0 };
  scene.group.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    const geometry = object.geometry;
    if (geometry instanceof THREE.BoxGeometry) counts.houseBodies += object.count;
    else if (geometry instanceof THREE.ConeGeometry) {
      // House roofs are square pyramids; cypress are five-sided.
      if (geometry.parameters.radialSegments === 4) counts.roofs += object.count;
      else counts.trees += object.count;
    }
  });
  return counts;
}

/** Every instance matrix in the scene, flattened, for comparing two builds. */
function matrices(scene: EraScene): number[] {
  const out: number[] = [];
  scene.group.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) {
      out.push(object.count, ...object.instanceMatrix.array.slice(0, object.count * 16));
    }
  });
  return out;
}

describe.each(CITIES)('$name builds', (city) => {
  const scenes: EraScene[] = [];

  beforeAll(() => {
    city.eras.forEach((_, i) => scenes.push(build(city, i)));
  });

  it.each(city.eras.map((era, i) => ({ label: era.yearLabel, era, i })))(
    '$label places every house it asks for',
    ({ era, i }) => {
      const counts = count(scenes[i]!);
      expect(counts.houseBodies).toBe(era.houses.count);
      expect(counts.roofs).toBe(era.houses.count);
    },
  );

  it.each(city.eras.map((era, i) => ({ label: era.yearLabel, era, i })))(
    '$label plants most of the cypress it asks for',
    ({ era, i }) => {
      const wanted = Math.round(era.trees.base + era.houses.extent * era.trees.perExtent);
      // Trees compete with the town for open ground, so some rejection is
      // expected — but a collapse means the sampler is starving.
      expect(count(scenes[i]!).trees).toBeGreaterThan(wanted * 0.5);
    },
  );

  it.each(city.eras.map((era, i) => ({ label: era.yearLabel, i })))(
    '$label moors every ship',
    ({ i }) => {
      const era = city.eras[i]!;
      expect(scenes[i]!.bobbing.length).toBe(era.ships.count);
    },
  );

  it('builds an identical city on every run', () => {
    const first = matrices(build(city, 0));
    const second = matrices(build(city, 0));
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it('gives each era its own layout', () => {
    const a = matrices(build(city, 1));
    const b = matrices(build(city, 2));
    expect(a).not.toEqual(b);
  });
});
