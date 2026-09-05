import { describe, expect, it } from "vitest";
import { getThunderWindowFrame } from "../src/rendering/thunder-window.ts";

describe("thunder window animation", () => {
  it("wakes Etokichi before two short flashes", () => {
    expect(getThunderWindowFrame(0).pose).toBe("sleeping");
    expect(getThunderWindowFrame(1_250).pose).toBe("awake");
    expect(getThunderWindowFrame(2_050).flashAlpha).toBeCloseTo(0.3);
    expect(getThunderWindowFrame(2_600).flashAlpha).toBeCloseTo(0.34);
    expect(getThunderWindowFrame(2_300).flashAlpha).toBe(0);
  });

  it("shows Tatsuo only during the long third flash", () => {
    expect(getThunderWindowFrame(3_390).flashAlpha).toBe(0.5);
    expect(getThunderWindowFrame(3_500).tatsuoVisibility).toBe(1);
    expect(getThunderWindowFrame(2_600).tatsuoVisibility).toBe(0);
    expect(getThunderWindowFrame(4_100).tatsuoVisibility).toBe(0);
  });

  it("startles, hides, sleeps again, and loops", () => {
    expect(getThunderWindowFrame(4_180).pose).toBe("startled");
    expect(Math.abs(getThunderWindowFrame(4_300).trembleX)).toBeCloseTo(0.8);
    expect(getThunderWindowFrame(5_800).pose).toBe("awake");
    expect(getThunderWindowFrame(7_300).pose).toBe("hidden");
    expect(getThunderWindowFrame(8_100).pose).toBe("sleeping");
    expect(getThunderWindowFrame(9_000)).toEqual(getThunderWindowFrame(0));
  });
});
