import type { CitySpec, TerrainSpec } from '@antea/schema';
import type { Palette } from './palette';
import { landHeight } from './terrain';
import type { Group, Three } from './three';

/**
 * The terrain shell: a vertex-coloured heightfield plus a translucent water
 * plane. Colour bands come from the spec, so a desert city recolours without
 * touching this code.
 */
export function buildTerrainMesh(
  THREE: Three,
  spec: TerrainSpec,
  palette: Palette,
  rand: () => number,
): Group {
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(
    spec.size.width,
    spec.size.depth,
    spec.segments.x,
    spec.segments.z,
  );
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  if (!pos) throw new Error('PlaneGeometry is missing its position attribute');

  const water = new THREE.Color(palette.colour(spec.colours.water));
  const shore = new THREE.Color(palette.colour(spec.colours.shore));
  const grass = new THREE.Color(palette.colour(spec.colours.grass));
  const rock = new THREE.Color(palette.colour(spec.colours.rock));
  const scratch = new THREE.Color();
  const colours: number[] = [];

  const { bands, waterLevel } = spec;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = landHeight(spec, x, z);
    pos.setY(i, h);

    if (h < waterLevel + bands.waterEdge) {
      scratch.copy(water).offsetHSL(0, 0, (rand() - 0.5) * 0.015);
    } else if (h < waterLevel + bands.shoreTop) {
      scratch.copy(shore);
    } else if (h < bands.grassTop) {
      scratch.copy(grass).lerp(rock, (h - bands.rockLerp.from) / bands.rockLerp.over);
    } else {
      scratch.copy(rock);
    }
    colours.push(scratch.r, scratch.g, scratch.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  group.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    ),
  );

  const waterGeo = new THREE.PlaneGeometry(
    spec.size.width * 1.4,
    spec.size.depth * 1.4,
    1,
    1,
  );
  waterGeo.rotateX(-Math.PI / 2);
  const waterPlane = new THREE.Mesh(
    waterGeo,
    new THREE.MeshLambertMaterial({
      color: palette.colour(spec.colours.water),
      transparent: true,
      opacity: 0.92,
    }),
  );
  waterPlane.position.y = waterLevel;
  group.add(waterPlane);

  return group;
}

export type { CitySpec };
