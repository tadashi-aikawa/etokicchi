import { describe, expect, it } from "vitest";
import { hashString, indexFromSeed } from "../src/game/random.ts";

describe("seeded random", () => {
  it("returns the same value for the same seed", () => {
    expect(hashString("2026-09-06:daytime:scene")).toBe(hashString("2026-09-06:daytime:scene"));
    expect(indexFromSeed("2026-09-06:daytime:scene", 7)).toBe(indexFromSeed("2026-09-06:daytime:scene", 7));
    expect(hashString("2026-09-06:daytime:scene")).not.toBe(hashString("2026-09-07:daytime:scene"));
  });

  it("spreads consecutive seeds evenly across the buckets", () => {
    const counts = new Array<number>(4).fill(0);
    for (let index = 0; index < 1000; index += 1) {
      const bucket = indexFromSeed(`2026-09-06:${index}:scene`, counts.length);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }

    for (const count of counts) {
      expect(count).toBeGreaterThan(150);
      expect(count).toBeLessThan(350);
    }
    expect(counts.reduce((total, count) => total + count, 0)).toBe(1000);
  });

  it("rejects an empty collection", () => {
    expect(() => indexFromSeed("seed", 0)).toThrow("Cannot pick from an empty collection");
  });
});
