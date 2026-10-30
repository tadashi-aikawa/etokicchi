import { describe, expect, it } from "vitest";
import { getHalloweenGhostFrame, HALLOWEEN_GHOST_QUILT_DEPTH_Y } from "../src/rendering/halloween-ghost.ts";
import {
  DEFAULT_ROOM_LAYOUT,
  getDepthZIndex,
  isMovementSegmentValid,
  resolveSceneRoute,
} from "../src/rendering/room-layout.ts";

const route = resolveSceneRoute("halloweenGentleGhost", DEFAULT_ROOM_LAYOUT);

describe("Tatsuo's ghost prank", () => {
  it("stays hidden until Etokichi reaches the bed and has a curious pause", () => {
    const samples = Array.from({ length: 2400 }, (_, index) => getHalloweenGhostFrame(index * 10, route));
    const curious = samples.findIndex((frame) => frame.phase === "curious");
    const surprise = samples.findIndex((frame) => frame.phase === "surprise");
    expect(curious).toBeGreaterThan(100);
    expect(surprise - curious).toBe(160);
    expect(samples.slice(0, surprise).every((frame) => frame.guestFrame === 0)).toBe(true);
    const close = samples[surprise];
    expect(close?.x).toBeCloseTo(82, 0);
    expect(close?.y).toBeCloseTo(158, 0);
    expect(close?.guestFrame).toBe(1);
    expect(close?.reaction).toBe(1);
  });

  it("synchronizes the burst, recoil, relief, and return without leaving the walkable floor", () => {
    let previous = getHalloweenGhostFrame(0, route);
    let highestJump = 0;
    const phases = new Set<string>();
    for (let time = 0; time < 50_000; time += 10) {
      const frame = getHalloweenGhostFrame(time, route);
      phases.add(frame.phase);
      expect(isMovementSegmentValid(previous, frame, DEFAULT_ROOM_LAYOUT), `at ${time}ms`).toBe(true);
      expect(Math.hypot(frame.x - previous.x, frame.y - previous.y)).toBeLessThan(1);
      expect(getDepthZIndex(frame.depthY, 50)).toBeGreaterThan(getDepthZIndex(HALLOWEEN_GHOST_QUILT_DEPTH_Y, 20));
      if (frame.phase === "surprise") {
        expect(frame.guestFrame).toBe(1);
        expect(frame.reaction).toBe(1);
      }
      if (frame.phase === "relief") {
        expect(frame.guestFrame).toBe(2);
        expect(frame.reaction).toBe(2);
      }
      highestJump = Math.max(highestJump, frame.jump);
      previous = frame;
    }
    expect(phases).toEqual(new Set(["approach", "curious", "surprise", "relief", "return", "reset"]));
    expect(highestJump).toBeGreaterThan(12);
  });
});
