import { describe, expect, it } from "vitest";
import { SCENES, getScenesForBand } from "../src/content/scenes.ts";
import { TIME_BANDS } from "../src/game/time.ts";

describe("scene catalog", () => {
  it("contains three distinct scenes for every time band", () => {
    for (const band of TIME_BANDS) {
      const scenes = getScenesForBand(band);
      expect(scenes).toHaveLength(3);
      expect(new Set(scenes.map((scene) => scene.id)).size).toBe(3);
    }
  });

  it("keeps scene identifiers and titles unique", () => {
    expect(new Set(SCENES.map((scene) => scene.id)).size).toBe(SCENES.length);
    expect(new Set(SCENES.map((scene) => scene.title)).size).toBe(SCENES.length);
  });
});
