import type { Box3, PaletteKey, Placed } from '@antea/schema';
import type { Palette } from './palette';
import type { TerrainSampler } from './terrain';
import type { Group, Mesh, Object3D, Three } from './three';

/**
 * The low-poly primitives every builder is assembled from — the prototype's
 * `box` / `cyl` / `cone` / `dome` / `place` helpers, bound to one diorama's
 * palette and terrain.
 */
export interface Kit {
  box(size: Box3, colour: PaletteKey): Mesh;
  cyl(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    colour: PaletteKey,
    segments?: number,
  ): Mesh;
  cone(radius: number, height: number, colour: PaletteKey, segments?: number): Mesh;
  /** A hemisphere, squashed on Y. */
  dome(radius: number, colour: PaletteKey, squash?: number): Mesh;
  /** Drops an object onto the terrain surface at (x, z). */
  place<T extends Object3D>(object: T, x: number, z: number, yOffset?: number): T;
  group(): Group;
}

export function createKit(THREE: Three, palette: Palette, terrain: TerrainSampler): Kit {
  return {
    box: (size, colour) =>
      new THREE.Mesh(
        new THREE.BoxGeometry(size.w, size.h, size.d),
        palette.material(colour),
      ),

    cyl: (radiusTop, radiusBottom, height, colour, segments = 8) =>
      new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
        palette.material(colour),
      ),

    cone: (radius, height, colour, segments = 4) =>
      new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, segments),
        palette.material(colour),
      ),

    dome: (radius, colour, squash = 0.78) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2),
        palette.material(colour),
      );
      mesh.scale.y = squash;
      return mesh;
    },

    place(object, x, z, yOffset = 0) {
      object.position.set(x, terrain.surfaceY(x, z) + yOffset, z);
      return object;
    },

    group: () => new THREE.Group(),
  };
}

/** A circle that procedural scatter must keep out of. */
export interface Exclusion {
  x: number;
  z: number;
  r: number;
}

/** Everything a builder needs beyond its own params. */
export interface BuildContext {
  kit: Kit;
  palette: Palette;
  terrain: TerrainSampler;
  /** Seeded from the city spec — never `Math.random`. */
  rand: () => number;
  /**
   * Keep-out circles collected from this era's landmark placements. The scatter
   * builders read them; nothing writes to them mid-build, so house layout does
   * not depend on the order landmarks happen to be built in.
   */
  exclusions: readonly Exclusion[];
}

/** A builder turns spec params into a Three.js group, positioned on the terrain. */
export type Builder<P> = (THREE: Three, input: BuilderInput<P>) => Group;

export interface BuilderInput<P> {
  params: P;
  at: Placed;
  ctx: BuildContext;
}

/** Applies a placement's position and rotation to a freshly built group. */
export function anchor(group: Group, at: Placed, ctx: BuildContext): Group {
  ctx.kit.place(group, at.x, at.z);
  if (at.rotationY !== undefined) group.rotation.y = at.rotationY;
  return group;
}
