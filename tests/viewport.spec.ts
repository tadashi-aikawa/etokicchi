import { describe, expect, it } from "vitest";
import { resolveRoomViewport } from "../src/ui/viewport.ts";

describe("room viewport", () => {
  it.each([
    ["iPhone 13", { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 }, 6, 390],
    // 高さが足りない端末では幅ではなく高さで倍率が決まる。
    ["iPhone SE", { innerWidth: 375, innerHeight: 667, devicePixelRatio: 3 }, 4, 260],
    ["iPhone 14 Pro Max", { innerWidth: 430, innerHeight: 932, devicePixelRatio: 3 }, 6, 390],
    ["MacBook", { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2 }, 4, 390],
    ["FHD display", { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 }, 2, 390],
  ])("scales by whole device pixels on %s", (_label, input, scale, cssWidth) => {
    const viewport = resolveRoomViewport(input);
    expect(viewport.scale).toBe(scale);
    expect(viewport.cssWidth).toBeCloseTo(cssWidth, 5);
    expect(viewport.cssHeight).toBeCloseTo((422 * scale) / input.devicePixelRatio, 5);
  });

  it("keeps at least one device pixel per dot on a viewport that cannot fit the room", () => {
    expect(resolveRoomViewport({ innerWidth: 200, innerHeight: 300, devicePixelRatio: 1 })).toMatchObject({
      scale: 1,
      cssWidth: 195,
      cssHeight: 422,
    });
  });

  it("never grows the room past 430 CSS pixels wide", () => {
    for (const devicePixelRatio of [1, 2, 3]) {
      const viewport = resolveRoomViewport({ innerWidth: 4000, innerHeight: 4000, devicePixelRatio });
      expect(viewport.cssWidth).toBeLessThanOrEqual(430);
      expect((viewport.cssWidth * devicePixelRatio) / 195).toBe(viewport.scale);
    }
  });

  it("keeps the scale on the widest allowed room a whole number of device pixels", () => {
    expect(resolveRoomViewport({ innerWidth: 4000, innerHeight: 4000, devicePixelRatio: 3 })).toMatchObject({
      scale: 6,
      cssWidth: 390,
    });
  });
});
