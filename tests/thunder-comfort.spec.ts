import { describe, expect, it } from "vitest";
import { getRainDropPosition, getThunderComfortFrame, RAIN_DROP_SEEDS } from "../src/rendering/thunder-comfort.ts";

describe("thunder comfort animation", () => {
  it("flashes, trembles, and then shows the reassurance", () => {
    expect(getThunderComfortFrame(900).flashAlpha).toBeCloseTo(0.42);
    expect(Math.abs(getThunderComfortFrame(1_000).trembleX)).toBeCloseTo(0.8);
    expect(getThunderComfortFrame(1_300).embraceScale).toBeGreaterThan(1);
    expect(getThunderComfortFrame(1_400).bubbleOpacity).toBe(1);
  });

  it("returns seamlessly to the start of the loop", () => {
    expect(getThunderComfortFrame(7_200)).toEqual(getThunderComfortFrame(0));
  });

  it("keeps every animated rain drop inside the window", () => {
    for (const elapsedMs of [0, 1_000, 9_000, 80_000]) {
      for (const seed of RAIN_DROP_SEEDS) {
        const position = getRainDropPosition(seed, elapsedMs);
        expect(position.x).toBeGreaterThanOrEqual(22);
        expect(position.x).toBeLessThan(78);
        expect(position.y).toBeGreaterThanOrEqual(25);
        expect(position.y).toBeLessThan(79);
      }
    }
  });
});
