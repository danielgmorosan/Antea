import type { PaletteKey } from '@antea/schema';
import type { Material, Three } from './three';

/**
 * Resolves palette keys from the city spec to colours, and caches one flat-shaded
 * material per colour — the prototype's `mat()`, made per-diorama instead of global
 * so two cities on screen never share a material.
 */
export interface Palette {
  colour(key: PaletteKey): number;
  material(key: PaletteKey): Material;
  dispose(): void;
}

export function createPalette(THREE: Three, colours: Record<string, string>): Palette {
  const materials = new Map<string, Material>();

  function colour(key: PaletteKey): number {
    const hex = colours[key];
    if (hex === undefined) {
      throw new Error(
        `Unknown palette key "${key}". City spec palette defines: ${Object.keys(colours).join(', ')}`,
      );
    }
    return new THREE.Color(hex).getHex();
  }

  return {
    colour,
    material(key) {
      const existing = materials.get(key);
      if (existing) return existing;
      const created = new THREE.MeshLambertMaterial({
        color: colour(key),
        flatShading: true,
      });
      materials.set(key, created);
      return created;
    },
    dispose() {
      for (const m of materials.values()) m.dispose();
      materials.clear();
    },
  };
}
