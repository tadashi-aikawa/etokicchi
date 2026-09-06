import { describe, expect, it } from "vitest";
import { INTEGER_SCALE_MIN_RATIO, resolveRoomViewport } from "../src/ui/viewport.ts";

describe("room viewport", () => {
  it.each([
    ["iPhone 13", { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 }, 3, 390],
    ["iPhone 14 Pro Max", { innerWidth: 430, innerHeight: 932, devicePixelRatio: 3 }, 3, 390],
    ["MacBook", { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2 }, 2, 390],
    ["FHD display", { innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1 }, 1, 390],
  ])("gives each Canvas pixel whole device pixels on %s", (_label, input, scale, cssWidth) => {
    const viewport = resolveRoomViewport(input);
    expect(viewport.integerScaled).toBe(true);
    expect(viewport.scale).toBe(scale);
    expect(viewport.cssWidth).toBeCloseTo(cssWidth, 5);
    expect(viewport.cssHeight).toBeCloseTo((cssWidth * 422) / 195, 5);
  });

  it.each([
    // 整数倍は260px。当てはめ幅375pxの69%しかないので棄却する。
    ["iPhone X", { innerWidth: 375, innerHeight: 812, devicePixelRatio: 3 }, 375],
    // 高さで決まる当てはめ幅308.2pxに対し、整数倍は195pxで63%。
    ["iPhone SE", { innerWidth: 375, innerHeight: 667, devicePixelRatio: 2 }, (667 * 195) / 422],
    // 整数倍283.6pxは上限390pxの73%。
    ["Pixel 8", { innerWidth: 393, innerHeight: 852, devicePixelRatio: 2.75 }, 390],
    // 高さで決まる当てはめ幅360.4pxに対し、整数倍は297.1pxで82%。閾値75%では採用されて左右に余白が出ていた。
    ["Pixel 7a", { innerWidth: 411, innerHeight: 780, devicePixelRatio: 2.625 }, (780 * 195) / 422],
  ])("fills the screen instead of shrinking too far on %s", (_label, input, cssWidth) => {
    const viewport = resolveRoomViewport(input);
    expect(viewport.integerScaled).toBe(false);
    expect(viewport.cssWidth).toBeCloseTo(cssWidth, 4);
    expect(viewport.cssHeight).toBeCloseTo((viewport.cssWidth * 422) / 195, 5);
  });

  it("keeps the rejected integer width below the ratio that would have accepted it", () => {
    const viewport = resolveRoomViewport({ innerWidth: 375, innerHeight: 812, devicePixelRatio: 3 });
    expect((390 * 2) / 3 / viewport.cssWidth).toBeLessThan(INTEGER_SCALE_MIN_RATIO);
  });

  it("only takes the integer size when it costs almost no width", () => {
    expect(INTEGER_SCALE_MIN_RATIO).toBeGreaterThanOrEqual(0.95);
    // 当てはめ幅が整数倍の5%以内なら整数倍、それを超えて縮むなら当てはめ幅。
    expect(resolveRoomViewport({ innerWidth: 400, innerHeight: 900, devicePixelRatio: 3 }).integerScaled).toBe(true);
    // 2.5倍では整数倍が312pxで上限390pxの80%。整数倍を諦めて上限いっぱいに当てはめる。
    expect(resolveRoomViewport({ innerWidth: 420, innerHeight: 950, devicePixelRatio: 2.5 })).toMatchObject({
      integerScaled: false,
      cssWidth: 390,
    });
  });

  it("shrinks the room to fit a viewport too small for one device pixel per Canvas pixel", () => {
    const viewport = resolveRoomViewport({ innerWidth: 200, innerHeight: 300, devicePixelRatio: 1 });
    expect(viewport.integerScaled).toBe(false);
    expect(viewport.cssWidth).toBeCloseTo((300 * 195) / 422, 5);
    expect(viewport.cssHeight).toBeCloseTo(300, 5);
  });

  it("never grows the room past 430 CSS pixels wide", () => {
    for (const devicePixelRatio of [1, 2, 3]) {
      const viewport = resolveRoomViewport({ innerWidth: 4000, innerHeight: 4000, devicePixelRatio });
      expect(viewport.cssWidth).toBeLessThanOrEqual(430);
      expect(viewport.integerScaled).toBe(true);
      expect(Number.isInteger(viewport.scale)).toBe(true);
    }
  });

  it("keeps the scale on the widest allowed room a whole number of device pixels", () => {
    expect(resolveRoomViewport({ innerWidth: 4000, innerHeight: 4000, devicePixelRatio: 3 })).toMatchObject({
      scale: 3,
      cssWidth: 390,
      integerScaled: true,
    });
  });
});
