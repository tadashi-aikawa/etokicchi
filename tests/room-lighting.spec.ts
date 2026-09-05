import { describe, expect, it } from "vitest";
import { TIME_BANDS } from "../src/game/time.ts";
import { DEFAULT_ROOM_LAYOUT, resolveSceneLayout } from "../src/rendering/room-layout.ts";
import { getRoomLights, TIME_LIGHTS } from "../src/rendering/room-lighting.ts";

const starsLayout = resolveSceneLayout("watchingStars", DEFAULT_ROOM_LAYOUT);

describe("room time lighting", () => {
  it("defines an independent light composition for every time band", () => {
    expect(Object.keys(TIME_LIGHTS)).toEqual(TIME_BANDS);
    for (const band of TIME_BANDS) expect(TIME_LIGHTS[band].length).toBeGreaterThan(0);
  });

  it("restores a floor-shaped sunlight beam during daytime", () => {
    expect(getRoomLights("daytime", true, DEFAULT_ROOM_LAYOUT)).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "polygon", color: 0xffd88d, alpha: 0.18 })]),
    );
  });

  it("keeps the bedside light local at night", () => {
    for (const sleeping of [true, false]) {
      expect(getRoomLights("night", sleeping, DEFAULT_ROOM_LAYOUT)).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: "circle", x: 61, y: 105, radius: 18 })]),
      );
      expect(getRoomLights("deepNight", sleeping, DEFAULT_ROOM_LAYOUT)).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: "circle", x: 61, y: 105, radius: 16 })]),
      );
    }
  });

  it("follows the bedside table when a scene moves it", () => {
    expect(starsLayout.anchors.bedsideTable).toEqual({ x: 24, y: 180 });
    for (const sleeping of [true, false]) {
      expect(getRoomLights("night", sleeping, starsLayout)).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: "circle", x: 24, y: 160, radius: 18 })]),
      );
      expect(getRoomLights("deepNight", sleeping, starsLayout)).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: "circle", x: 24, y: 160, radius: 16 })]),
      );
    }
  });

  it("leaves the ceiling glow fixed to the room regardless of the scene layout", () => {
    expect(getRoomLights("night", true, starsLayout)[0]).toMatchObject({ kind: "circle", x: 145, y: 43 });
  });

  it("brightens the ceiling light while Etokichi is active at night", () => {
    expect(getRoomLights("night", false, DEFAULT_ROOM_LAYOUT)[0]).toMatchObject({
      kind: "circle",
      x: 145,
      y: 43,
      alpha: 0.28,
    });
    expect(getRoomLights("deepNight", false, DEFAULT_ROOM_LAYOUT)[0]).toMatchObject({
      kind: "circle",
      x: 145,
      y: 43,
      alpha: 0.2,
    });
    expect(getRoomLights("deepNight", true, DEFAULT_ROOM_LAYOUT)).toEqual(
      TIME_LIGHTS.deepNight.map((light) =>
        light.kind === "anchoredCircle"
          ? expect.objectContaining({ kind: "circle", alpha: light.alpha })
          : expect.objectContaining({ kind: light.kind, alpha: light.alpha }),
      ),
    );
  });
});
