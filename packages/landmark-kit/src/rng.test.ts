import { describe, expect, it } from 'vitest';
import { mulberry32, pick, range, rangeInt } from './rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    const runA = Array.from({ length: 64 }, () => a());
    const runB = Array.from({ length: 64 }, () => b());
    expect(runA).toEqual(runB);
  });

  it('diverges for different seeds', () => {
    const a = Array.from({ length: 16 }, mulberry32(1));
    const b = Array.from({ length: 16 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it('stays in [0, 1)', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 10_000; i += 1) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is roughly uniform', () => {
    const rand = mulberry32(7);
    const buckets = new Array<number>(10).fill(0);
    const draws = 100_000;
    for (let i = 0; i < draws; i += 1) {
      const bucket = Math.floor(rand() * 10);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(draws / 10 - draws / 100);
      expect(count).toBeLessThan(draws / 10 + draws / 100);
    }
  });
});

describe('helpers', () => {
  it('range stays within bounds', () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 1000; i += 1) {
      const v = range(rand, -4, 9);
      expect(v).toBeGreaterThanOrEqual(-4);
      expect(v).toBeLessThan(9);
    }
  });

  it('rangeInt covers both endpoints inclusively', () => {
    const rand = mulberry32(11);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) seen.add(rangeInt(rand, 0, 3));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('pick returns undefined only for an empty list', () => {
    const rand = mulberry32(5);
    expect(pick(rand, [])).toBeUndefined();
    expect(pick(rand, ['a'])).toBe('a');
  });
});
