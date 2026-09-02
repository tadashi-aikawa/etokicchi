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

    expect(entries).toHaveLength(23);
    expect(SCENE_COUNT).toBe(23);
    expect(entries.every((entry) => entry.discovery === undefined)).toBe(true);
    expect(entries.filter((entry) => entry.status === "available")).toHaveLength(22);
    expect(entries.filter((entry) => entry.status === "locked").map((entry) => entry.scene.id)).toEqual([
      "mimizouFarewell",
    ]);
    expect(new Set(entries.map((entry) => entry.imagePath)).size).toBe(23);
    expect(entries.every((entry) => entry.imagePath.endsWith(".webp"))).toBe(true);
    expect(getCollectionImagePath("watchingStars")).toBe("assets/collection/watching-stars.webp");
    expect(getCollectionImagePath("sleepingWithTatsuo")).toBe("assets/collection/sleeping-with-tatsuo.webp");
    expect(getCollectionImagePath("mimizouVisit")).toBe("assets/collection/mimizou-visit.webp");
    expect(getCollectionImagePath("tatsuoTooComfortable")).toBe("assets/collection/tatsuo-too-comfortable.webp");
    expect(countDiscoveries({})).toBe(0);
  });

  it("distinguishes an available unseen scene from a condition-locked scene", () => {
    const lockedEntries = getCollectionEntries({});
    expect(lockedEntries.find((entry) => entry.scene.id === "morningStretch")?.status).toBe("available");
    expect(lockedEntries.find((entry) => entry.scene.id === "mimizouFarewell")?.status).toBe("locked");

    const unlockedEntries = getCollectionEntries({
      mimizouVisit: { firstSeenAt: "2026-09-02T12:00:00.000Z", seenCount: 1 },
    });
    expect(unlockedEntries.find((entry) => entry.scene.id === "mimizouFarewell")?.status).toBe("available");
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
