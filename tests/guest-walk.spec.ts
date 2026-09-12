import { describe, expect, it } from "vitest";
import { getGuestWalkFrame, type GuestWalk } from "../src/rendering/guest-walk.ts";
import { SCENE_PRESENTATIONS } from "../src/content/scene-presentations.ts";
import { DEFAULT_ROOM_LAYOUT, isMovementSegmentValid } from "../src/rendering/room-layout.ts";
import { getScene } from "../src/content/scenes.ts";
import { isSceneUnlocked } from "../src/game/scene-unlock.ts";

const walk: GuestWalk = {
  speed: 10,
  waypoints: [
    { x: 0, y: 0, pauseMs: 1000, facing: "down" },
    { x: 10, y: 0, pauseMs: 500, facing: "up" },
  ],
};

describe("walking companion", () => {
  it("holds a neutral foot pose during pauses and faces the next movement", () => {
    expect(getGuestWalkFrame(walk, 500)).toMatchObject({ x: 0, y: 0, column: 1, walking: false });
    expect(getGuestWalkFrame(walk, 1500)).toMatchObject({ x: 5, y: 0, direction: "right", walking: true });
    expect(getGuestWalkFrame(walk, 2000)).toMatchObject({ x: 10, direction: "up", column: 1, walking: false });
    expect(getGuestWalkFrame(walk, 3000)).toMatchObject({ x: 5, direction: "left", walking: true });
  });

  it("alternates both feet through neutral and closes the loop without teleporting", () => {
    expect([1000, 1160, 1320, 1480].map((time) => getGuestWalkFrame(walk, time).column)).toEqual([0, 1, 2, 1]);
    expect(getGuestWalkFrame(walk, 3499).x).toBeCloseTo(0.01);
    expect(getGuestWalkFrame(walk, 3500)).toEqual(getGuestWalkFrame(walk, 0));
    expect(getGuestWalkFrame(walk, 350000 + 1500)).toEqual(getGuestWalkFrame(walk, 1500));
  });

  it("keeps every leg of the stroll on clear floor, including the return leg", () => {
    const room = SCENE_PRESENTATIONS.mimizouNightStroll.room;
    if (typeof room === "function" || !room.companion || !("walk" in room.companion) || !room.companion.walk) {
      throw new Error("散歩の定義がありません");
    }
    const points = room.companion.walk.waypoints;
    for (const [index, from] of points.entries()) {
      const to = points[(index + 1) % points.length];
      if (!to) throw new Error("散歩の行き先がありません");
      expect(isMovementSegmentValid(from, to, DEFAULT_ROOM_LAYOUT)).toBe(true);
    }
    const scene = getScene("mimizouNightStroll");
    expect(scene.band).toBe("night");
    expect(isSceneUnlocked(scene, {})).toBe(false);
    expect(isSceneUnlocked(scene, { mimizouVisit: { firstSeenAt: "2026-09-12T20:00:00", seenCount: 1 } })).toBe(true);
  });
});
