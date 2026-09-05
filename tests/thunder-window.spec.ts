import { describe, expect, it } from "vitest";
import { getThunderWindowFrame } from "../src/rendering/thunder-window.ts";

describe("thunder window animation", () => {
  it("emits two short flashes while Etokichi keeps sleeping", () => {
    expect(getThunderWindowFrame(0)).toEqual({ flashAlpha: 0, tatsuoVisibility: 0 });
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

  it("loops after the flashes and window appearance", () => {
    expect(getThunderWindowFrame(9_000)).toEqual(getThunderWindowFrame(0));
  });
});
