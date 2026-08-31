import { describe, expect, it } from "vitest";
import { countDiscoveries, getCollectionEntries, getCollectionImagePath, SCENE_COUNT } from "../src/game/collection.ts";
import type { DiscoveryRecord, SceneId } from "../src/game/types.ts";

describe("scene collection", () => {
  it("lists every scene as undiscovered for an empty history", () => {
    const entries = getCollectionEntries({});

    expect(entries).toHaveLength(17);
    expect(SCENE_COUNT).toBe(17);
    expect(entries.every((entry) => entry.discovery === undefined)).toBe(true);
    expect(new Set(entries.map((entry) => entry.imagePath)).size).toBe(17);
    expect(entries.every((entry) => entry.imagePath.endsWith(".webp"))).toBe(true);
    expect(getCollectionImagePath("watchingStars")).toBe("assets/collection/watching-stars.webp");
    expect(getCollectionImagePath("sleepingWithTatsuo")).toBe("assets/collection/sleeping-with-tatsuo.webp");
    expect(getCollectionImagePath("mimizouVisit")).toBe("assets/collection/mimizou-visit.webp");
    expect(countDiscoveries({})).toBe(0);
  });

  it("keeps existing discovery records and counts only known scenes", () => {
    const discovery: DiscoveryRecord = { firstSeenAt: "2026-08-30T12:00:00.000Z", seenCount: 3 };
    const discoveries: Partial<Record<SceneId, DiscoveryRecord>> = {
      littleNightSnack: discovery,
      sleeping: { firstSeenAt: "2026-08-29T16:00:00.000Z", seenCount: 1 },
    };
    const entries = getCollectionEntries(discoveries);

    expect(countDiscoveries(discoveries)).toBe(2);
    expect(entries.find((entry) => entry.scene.id === "littleNightSnack")?.discovery).toEqual(discovery);
  });
});
