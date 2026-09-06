import { describe, expect, it } from "vitest";
import {
  WINDOW_FRAME,
  WINDOW_GLASS,
  WINDOW_GLASS_PANES,
  WINDOW_MULLION,
  WINDOW_SILL,
} from "../src/rendering/window-geometry.ts";

describe("window geometry", () => {
  it("keeps the glass inside the window frame", () => {
    expect(WINDOW_GLASS.x).toBeGreaterThanOrEqual(WINDOW_FRAME.x);
    expect(WINDOW_GLASS.y).toBeGreaterThanOrEqual(WINDOW_FRAME.y);
    expect(WINDOW_GLASS.x + WINDOW_GLASS.width).toBeLessThanOrEqual(WINDOW_FRAME.x + WINDOW_FRAME.width);
    expect(WINDOW_GLASS.y + WINDOW_GLASS.height).toBeLessThanOrEqual(WINDOW_FRAME.y + WINDOW_FRAME.height);
  });

  it("splits the glass into two panes that span it from edge to edge", () => {
    const [left, right] = WINDOW_GLASS_PANES;
    if (!left || !right) throw new Error("窓ガラスは左右2枚で定義する");

    expect(left.x).toBe(WINDOW_GLASS.x);
    expect(right.x + right.width).toBe(WINDOW_GLASS.x + WINDOW_GLASS.width);
    expect(left.x + left.width).toBeLessThan(right.x);
  });

  it("derives the foreground mullion and sill from the frame and the panes", () => {
    expect(WINDOW_MULLION).toEqual({ x: 49, y: 29, width: 2, height: 49 });
    expect(WINDOW_SILL).toEqual({ x: 22, y: 77, width: 56, height: 2 });
  });
});
