import { describe, expect, it } from "vitest";
import { hashString, indexFromSeed } from "../src/game/random.ts";
import { formatLocalDate, makeSlotKey } from "../src/game/time.ts";

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

  it("decorrelates the seeds derived from one slot key", () => {
    // 同じslotKeyから派生した2つの抽選が同時に0を引く割合は、独立なら1/16。
    // 攪拌を外すと下位ビットが相関し、この同時成立がほとんど起きなくなる。
    const days = 2000;
    let simultaneous = 0;
    for (let index = 0; index < days; index += 1) {
      const slotKey = makeSlotKey(formatLocalDate(new Date(2026, 0, 1 + index)), "deepNight");
      if (indexFromSeed(`${slotKey}:scene`, 4) === 0 && indexFromSeed(`${slotKey}:mimizou-companion`, 4) === 0) {
        simultaneous += 1;
      }
    }

    expect(simultaneous).toBeGreaterThan(60);
    expect(simultaneous).toBeLessThan(190);
  });

  it("rejects an empty collection", () => {
    expect(() => indexFromSeed("seed", 0)).toThrow("Cannot pick from an empty collection");
  });
});
