import { describe, expect, it } from "vitest";
import { SCENES, getScenesForBand } from "../src/content/scenes.ts";
import { TIME_BANDS } from "../src/game/time.ts";

describe("scene catalog", () => {
  it("contains the expected number of distinct scenes for every time band", () => {
    for (const band of TIME_BANDS) {
      const scenes = getScenesForBand(band);
      const expectedCount =
        band === "earlyMorning" ? 5 : band === "deepNight" || band === "night" || band === "evening" ? 4 : 3;
      expect(scenes).toHaveLength(expectedCount);
      expect(new Set(scenes.map((scene) => scene.id)).size).toBe(expectedCount);
    }
  });

  it("keeps scene identifiers and titles unique", () => {
    expect(new Set(SCENES.map((scene) => scene.id)).size).toBe(SCENES.length);
    expect(new Set(SCENES.map((scene) => scene.title)).size).toBe(SCENES.length);
  });

  it("references an existing scene from every discovery unlock requirement", () => {
    const sceneIds = new Set(SCENES.map((scene) => scene.id));
    for (const scene of SCENES) {
      if (scene.unlockRequirement?.kind === "sceneDiscovery") {
        expect(sceneIds.has(scene.unlockRequirement.sceneId), scene.id).toBe(true);
      }
    }
  });
});
