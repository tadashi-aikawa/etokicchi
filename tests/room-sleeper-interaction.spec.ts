import { type Application, type FederatedPointerEvent, Texture } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { createSleeper, createSleeperBase } from "../src/rendering/room-character.ts";
import type { RoomCallbacks } from "../src/rendering/room-types.ts";

describe("sleeper interaction", () => {
  it("shows the pillow character's thought when its sprite is tapped", () => {
    const onThought = vi.fn();
    const base = createSleeperBase(
      Texture.WHITE,
      { x: 88, y: 340, pauseMs: 5000 },
      340,
      { assetName: "maine-coon-pillow-pixel.webp", height: 32, thought: "眠いの。" },
      onThought,
    );

    expect(base.eventMode).toBe("static");
    base.emit("pointertap", {} as FederatedPointerEvent);
    expect(onThought).toHaveBeenCalledWith("眠いの。", base);
  });

  it("limits the sleeper tap area so the pillow sprite behind it can receive taps", () => {
    const callbacks: RoomCallbacks = {
      onObservation: vi.fn(),
      onCharacterTap: vi.fn(),
      onThought: vi.fn(),
    };
    const sleeper = createSleeper(
      {} as Application,
      Texture.WHITE,
      { x: 88, y: 340, pauseMs: 5000 },
      340,
      72,
      callbacks,
      "none",
      0,
      { x: -48, y: -102, width: 96, height: 78 },
    );

    expect(sleeper.hitArea?.contains(0, -80)).toBe(true);
    expect(sleeper.hitArea?.contains(60, -120)).toBe(false);
    sleeper.emit("pointertap", {} as FederatedPointerEvent);
    expect(callbacks.onCharacterTap).toHaveBeenCalledOnce();
  });
});
