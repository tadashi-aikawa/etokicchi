import { describe, expect, it } from "vitest";
import { getMimizouVisitFrame } from "../src/rendering/mimizou-visit.ts";

describe("Mimizou visit loop", () => {
  it("starts with Etokichi drinking tea and an absent, non-interactive visitor", () => {
    expect(getMimizouVisitFrame(1000)).toMatchObject({
      reacting: false,
      visitorInteractive: false,
      visitorVisibility: 0,
    });
  });

  it("shows Mimizou before Etokichi turns toward the window", () => {
    const appearing = getMimizouVisitFrame(2700);
    const watching = getMimizouVisitFrame(4000);

    expect(appearing.visitorVisibility).toBeCloseTo(0.5);
    expect(appearing.visitorInteractive).toBe(true);
    expect(appearing.reacting).toBe(false);
    expect(watching.visitorVisibility).toBe(1);
    expect(watching.reacting).toBe(false);
  });

  it("turns Etokichi before Mimizou slowly disappears", () => {
    const reacting = getMimizouVisitFrame(5600);
    const leaving = getMimizouVisitFrame(7700);

    expect(reacting.reacting).toBe(true);
    expect(reacting.visitorVisibility).toBe(1);
    expect(reacting.reactionHop).toBeGreaterThan(0);
    expect(leaving.reacting).toBe(true);
    expect(leaving.visitorVisibility).toBeCloseTo(0.5);
  });

  it("removes the invisible hit area and returns to tea at the cycle boundary", () => {
    expect(getMimizouVisitFrame(9000)).toMatchObject({
      reacting: true,
      visitorInteractive: false,
      visitorVisibility: 0,
    });
    expect(getMimizouVisitFrame(9800)).toMatchObject({
      reacting: false,
      visitorInteractive: false,
      visitorVisibility: 0,
    });
  });
});
