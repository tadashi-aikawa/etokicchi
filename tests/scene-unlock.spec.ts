import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import { isSceneUnlocked } from "../src/game/scene-unlock.ts";

describe("scene unlocks", () => {
  it("unlocks a scene when its prerequisite scene has been discovered", () => {
    const scene = getScene("mimizouVisit");

    expect(isSceneUnlocked(scene, {})).toBe(false);
    expect(
      isSceneUnlocked(scene, {
        watchingStars: { firstSeenAt: "2026-09-02T16:00:00.000Z", seenCount: 1 },
      }),
    ).toBe(true);
  });

  it("keeps a previously discovered scene unlocked without its new prerequisite", () => {
    const scene = getScene("mimizouVisit");

    expect(
      isSceneUnlocked(scene, {
        mimizouVisit: { firstSeenAt: "2026-09-01T12:00:00.000Z", seenCount: 2 },
      }),
    ).toBe(true);
  });
});
