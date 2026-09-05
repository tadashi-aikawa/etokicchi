import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_THRESHOLDS,
  countDiscoveries,
  getCollectionEntries,
  getCollectionImagePath,
  getSceneAchievement,
  SCENE_COUNT,
} from "../src/game/collection.ts";
import type { DiscoveryRecord, SceneId } from "../src/game/types.ts";

describe("scene collection", () => {
  it("lists every scene as undiscovered for an empty history", () => {
    const entries = getCollectionEntries({});

    expect(entries).toHaveLength(27);
    expect(SCENE_COUNT).toBe(27);
    expect(entries.every((entry) => entry.discovery === undefined)).toBe(true);
    expect(entries.filter((entry) => entry.status === "available")).toHaveLength(20);
    expect(entries.filter((entry) => entry.status === "locked").map((entry) => entry.scene.id)).toEqual([
      "sleepingWithTatsuo",
      "morningStretch",
      "tatsuoWakeUp",
      "mimizouFarewell",
      "nappingOnMaineCoon",
      "tatsuoTooComfortable",
      "mimizouVisit",
    ]);
    expect(new Set(entries.map((entry) => entry.imagePath)).size).toBe(27);
    expect(entries.every((entry) => entry.imagePath.endsWith(".webp"))).toBe(true);
    expect(getCollectionImagePath("watchingStars")).toBe("assets/collection/watching-stars.webp");
    expect(getCollectionImagePath("sleepingWithTatsuo")).toBe("assets/collection/sleeping-with-tatsuo.webp");
    expect(getCollectionImagePath("tatsuoAtWindow")).toBe("assets/collection/tatsuo-at-window.webp");
    expect(getCollectionImagePath("mimizouVisit")).toBe("assets/collection/mimizou-visit.webp");
    expect(getCollectionImagePath("tatsuoTooComfortable")).toBe("assets/collection/tatsuo-too-comfortable.webp");
    expect(getCollectionImagePath("comfortingMaineCoon")).toBe("assets/collection/comforting-maine-coon.webp");
    expect(countDiscoveries({})).toBe(0);
  });

  it("distinguishes an available unseen scene from a condition-locked scene", () => {
    const lockedEntries = getCollectionEntries({});
    expect(lockedEntries.find((entry) => entry.scene.id === "planningDay")?.status).toBe("available");
    expect(lockedEntries.find((entry) => entry.scene.id === "morningStretch")?.status).toBe("locked");
    expect(lockedEntries.find((entry) => entry.scene.id === "mimizouFarewell")?.status).toBe("locked");
    expect(lockedEntries.find((entry) => entry.scene.id === "nappingOnMaineCoon")?.status).toBe("locked");

    const unlockedEntries = getCollectionEntries({
      mimizouVisit: { firstSeenAt: "2026-09-02T12:00:00.000Z", seenCount: 1 },
    });
    expect(unlockedEntries.find((entry) => entry.scene.id === "mimizouFarewell")?.status).toBe("available");
  });

  it("unlocks the added scenes after discovering their prerequisites", () => {
    const entries = getCollectionEntries({
      almostAwake: { firstSeenAt: "2026-09-01T21:00:00.000Z", seenCount: 1 },
      brushingMaineCoon: { firstSeenAt: "2026-09-04T00:00:00.000Z", seenCount: 1 },
      tatsuoAtWindow: { firstSeenAt: "2026-09-02T01:00:00.000Z", seenCount: 1 },
      tatsuoWakeUp: { firstSeenAt: "2026-09-02T21:00:00.000Z", seenCount: 1 },
      tatsuoTooComfortable: { firstSeenAt: "2026-09-03T09:00:00.000Z", seenCount: 1 },
      watchingStars: { firstSeenAt: "2026-09-02T16:00:00.000Z", seenCount: 1 },
    });

    expect(entries.find((entry) => entry.scene.id === "morningStretch")?.status).toBe("available");
    expect(entries.find((entry) => entry.scene.id === "nappingOnMaineCoon")?.status).toBe("available");
    expect(entries.find((entry) => entry.scene.id === "sleepingWithTatsuo")?.status).toBe("available");
    expect(entries.find((entry) => entry.scene.id === "tatsuoAtWindow")?.status).toBe("discovered");
    expect(entries.find((entry) => entry.scene.id === "tatsuoTooComfortable")?.status).toBe("discovered");
    expect(entries.find((entry) => entry.scene.id === "mimizouVisit")?.status).toBe("available");
  });

  it("shows the remaining Tatsuo unlock chain and decreases it after each discovery", () => {
    const initial = getCollectionEntries({});
    expect(initial.find((entry) => entry.scene.id === "tatsuoAtWindow")).toMatchObject({
      status: "available",
      remainingUnlockSteps: 0,
    });
    expect(initial.find((entry) => entry.scene.id === "tatsuoWakeUp")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 1,
    });
    expect(initial.find((entry) => entry.scene.id === "tatsuoTooComfortable")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 2,
    });
    expect(initial.find((entry) => entry.scene.id === "sleepingWithTatsuo")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 3,
    });

    const afterWindow = getCollectionEntries({
      tatsuoAtWindow: { firstSeenAt: "2026-09-05T01:00:00.000Z", seenCount: 1 },
    });
    expect(afterWindow.find((entry) => entry.scene.id === "tatsuoWakeUp")).toMatchObject({
      status: "available",
      remainingUnlockSteps: 0,
    });
    expect(afterWindow.find((entry) => entry.scene.id === "tatsuoTooComfortable")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 1,
    });
    expect(afterWindow.find((entry) => entry.scene.id === "sleepingWithTatsuo")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 2,
    });

    const afterWakeUp = getCollectionEntries({
      tatsuoAtWindow: { firstSeenAt: "2026-09-05T01:00:00.000Z", seenCount: 1 },
      tatsuoWakeUp: { firstSeenAt: "2026-09-05T06:00:00.000Z", seenCount: 1 },
    });
    expect(afterWakeUp.find((entry) => entry.scene.id === "tatsuoTooComfortable")).toMatchObject({
      status: "available",
      remainingUnlockSteps: 0,
    });
    expect(afterWakeUp.find((entry) => entry.scene.id === "sleepingWithTatsuo")).toMatchObject({
      status: "locked",
      remainingUnlockSteps: 1,
    });

    const afterSofa = getCollectionEntries({
      tatsuoAtWindow: { firstSeenAt: "2026-09-05T01:00:00.000Z", seenCount: 1 },
      tatsuoWakeUp: { firstSeenAt: "2026-09-05T06:00:00.000Z", seenCount: 1 },
      tatsuoTooComfortable: { firstSeenAt: "2026-09-05T18:00:00.000Z", seenCount: 1 },
    });
    expect(afterSofa.find((entry) => entry.scene.id === "sleepingWithTatsuo")).toMatchObject({
      status: "available",
      remainingUnlockSteps: 0,
    });
  });

  it("advances achievement levels at the configured encounter milestones", () => {
    expect(ACHIEVEMENT_THRESHOLDS).toEqual([1, 2, 3, 5, 10, 25, 50, 100]);
    expect(getSceneAchievement(0)).toEqual({ level: 0, totalLevels: 8, nextThreshold: 1 });
    expect(getSceneAchievement(4)).toEqual({ level: 3, totalLevels: 8, nextThreshold: 5 });
    expect(getSceneAchievement(100)).toEqual({ level: 8, totalLevels: 8, nextThreshold: undefined });
    expect(getSceneAchievement(137)).toEqual({ level: 8, totalLevels: 8, nextThreshold: undefined });
  });

  it("keeps existing discovery records and counts only known scenes", () => {
    const discovery: DiscoveryRecord = { firstSeenAt: "2026-08-30T12:00:00.000Z", seenCount: 3 };
    const discoveries: Partial<Record<SceneId, DiscoveryRecord>> = {
      littleNightSnack: discovery,
      sleeping: { firstSeenAt: "2026-08-29T16:00:00.000Z", seenCount: 1 },
    };
    const entries = getCollectionEntries(discoveries);

    expect(countDiscoveries(discoveries)).toBe(2);
    expect(entries.find((entry) => entry.scene.id === "littleNightSnack")).toMatchObject({
      discovery,
      status: "discovered",
      achievement: { level: 3, totalLevels: 8, nextThreshold: 5 },
    });
  });
});
