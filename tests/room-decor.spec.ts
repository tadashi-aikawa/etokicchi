import { describe, expect, it } from "vitest";
import {
  DEPTH_DECORATIONS,
  FLOOR_DECORATIONS,
  resolveClockHandAngles,
  ROOM_CLOCK,
  WALL_DECORATIONS,
} from "../src/rendering/room-decor.ts";

describe("room decorations", () => {
  it("keeps floor and wall decorations on their dedicated layers", () => {
    expect(FLOOR_DECORATIONS.map(({ assetName }) => assetName)).toEqual([
      "decor-genkan-pixel.webp",
      "decor-rug-back-pixel.webp",
      "decor-rug-front-pixel.webp",
    ]);
    expect(WALL_DECORATIONS).toEqual([]);
    expect(ROOM_CLOCK.assetName).toBe("decor-wall-clock-pixel.webp");
    expect(FLOOR_DECORATIONS[0]).toMatchObject({ x: 148, y: 107, width: 60, height: 24 });
    expect(FLOOR_DECORATIONS[2]).toMatchObject({ x: 96, y: 305, width: 84, height: 82 });
  });

  it("places a readable Maine Coon on the rug in front of the sofa", () => {
    expect(DEPTH_DECORATIONS).toEqual([
      expect.objectContaining({
        assetName: "decor-cat-loaf-pixel.webp",
        displayName: "メインクーン",
        x: 82,
        y: 322,
        width: 60,
        height: 48,
      }),
    ]);
  });

  it("points both clock hands to twelve at midnight", () => {
    expect(resolveClockHandAngles(new Date(2026, 8, 3, 0, 0))).toEqual({ hour: 0, minute: 0 });
  });

  it("moves the hour hand continuously with the minutes", () => {
    const angles = resolveClockHandAngles(new Date(2026, 8, 3, 9, 30));
    expect(angles.hour).toBeCloseTo((9.5 * Math.PI) / 6);
    expect(angles.minute).toBeCloseTo(Math.PI);
  });
});
