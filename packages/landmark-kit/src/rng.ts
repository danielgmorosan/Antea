/**
 * Seeded PRNG. Every random draw in a diorama runs through this, seeded from
 * the city spec, so a city looks identical on every load and in tests.
 *
 * mulberry32 — 32-bit state, uniform in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform draw in [min, max). */
export function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Uniform integer in [min, max]. */
export function rangeInt(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1));
}

/** Picks one item. Returns `undefined` only for an empty list. */
export function pick<T>(rand: () => number, items: readonly T[]): T | undefined {
  return items[Math.floor(rand() * items.length)];
}
