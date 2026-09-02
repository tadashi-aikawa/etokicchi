import { describe, expect, it } from "vitest";
import { TIME_BANDS } from "../src/game/time.ts";
import { getRoomLights, TIME_LIGHTS } from "../src/rendering/room-lighting.ts";

describe("room time lighting", () => {
  it("defines an independent light composition for every time band", () => {
    expect(Object.keys(TIME_LIGHTS)).toEqual(TIME_BANDS);
    for (const band of TIME_BANDS) expect(TIME_LIGHTS[band].length).toBeGreaterThan(0);
  });

  it("restores a floor-shaped sunlight beam during daytime", () => {
    expect(TIME_LIGHTS.daytime).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "polygon", color: 0xffd88d, alpha: 0.18 })]),
    );
  });

  it("keeps the bedside light local at night", () => {
    expect(TIME_LIGHTS.night).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "circle", x: 61, y: 105, radius: 18 })]),
    );
  });

  it("brightens the ceiling light while Etokichi is active at night", () => {
    expect(getRoomLights("night", false)[0]).toMatchObject({ kind: "circle", x: 145, y: 43, alpha: 0.28 });
    expect(getRoomLights("deepNight", false)[0]).toMatchObject({ kind: "circle", x: 145, y: 43, alpha: 0.2 });
    expect(getRoomLights("deepNight", true)).toBe(TIME_LIGHTS.deepNight);
  });
});
