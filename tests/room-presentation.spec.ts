import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import type { SceneId, TimeBand, VisitView } from "../src/game/types.ts";
import { getRoomPresentation, getRoomTint } from "../src/rendering/room-presentation.ts";

function kickedBlanketVisit(choiceId?: string): VisitView {
  const slotKey = "2026-08-31:deepNight";
  return {
    assignment: {
      slotKey,
      localDate: "2026-08-31",
      band: "deepNight",
      sceneId: "kickedBlanket",
      lineIndex: 0,
      detailIndex: 0,
      createdAt: "2026-08-30T15:20:00.000Z",
    },
    scene: getScene("kickedBlanket"),
    line: "むにゃ……",
    detail: "布団が床に落ちている",
    echoes: [],
    interaction: choiceId
      ? {
          slotKey,
          choiceId,
          immediate: "エトキチへ布団を掛けた。",
          selectedAt: "2026-08-30T15:21:00.000Z",
        }
      : undefined,
    discoveredNow: false,
  };
}

function sleepingWithTatsuoVisit(): VisitView {
  const slotKey = "2026-08-31:deepNight";
  return {
    assignment: {
      slotKey,
      localDate: "2026-08-31",
      band: "deepNight",
      sceneId: "sleepingWithTatsuo",
      lineIndex: 0,
      detailIndex: 0,
      createdAt: "2026-08-30T15:20:00.000Z",
    },
    scene: getScene("sleepingWithTatsuo"),
    line: "むにゃ……タツヲ、あったかい……",
    detail: "大きな手がベッドの縁にそっと添えられている",
    echoes: [],
    discoveredNow: false,
  };
}

function visitFor(sceneId: SceneId, mimizouPresent = false): VisitView {
  const bandByScene: Partial<Record<SceneId, TimeBand>> = {
    watchingStars: "deepNight",
    mimizouVisit: "night",
    almostAwake: "earlyMorning",
    tatsuoWakeUp: "earlyMorning",
    mimizouFarewell: "earlyMorning",
    tooMuchBreakfast: "morning",
    foundOldToy: "daytime",
    muddyReturn: "evening",
    packingTomorrow: "night",
    sleeping: "deepNight",
  };
  const band = bandByScene[sceneId] ?? "daytime";
  const slotKey = `2026-09-01:${band}`;
  return {
    assignment: {
      slotKey,
      localDate: "2026-09-01",
      band,
      sceneId,
      lineIndex: 0,
      detailIndex: 0,
      createdAt: "2026-08-31T15:20:00.000Z",
    },
    scene: getScene(sceneId),
    line: "テスト用の台詞",
    detail: "テスト用の詳細",
    echoes: [],
    discoveredNow: false,
    mimizouPresent,
  };
}

describe("room presentation", () => {
  it("shows the kicked blanket on the floor before interacting", () => {
    expect(getRoomPresentation(kickedBlanketVisit())).toMatchObject({
      backgroundAssetName: "room-background-kicked-blanket-pixel.webp",
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
    });
  });

  it("moves the blanket onto Etokichi after choosing cover", () => {
    expect(getRoomPresentation(kickedBlanketVisit("cover"))).toMatchObject({
      backgroundAssetName: "room-background-covered-pixel.webp",
      sleeperAssetName: "etokichi-sleep-covered-pixel.png",
    });
  });

  it("does not change the room for other choices", () => {
    expect(getRoomPresentation(kickedBlanketVisit("warmRoom"))).toMatchObject({
      backgroundAssetName: "room-background-kicked-blanket-pixel.webp",
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
    });
  });

  it("keeps the stronger deep-night tint for both kicked-blanket backgrounds", () => {
    expect(getRoomTint(kickedBlanketVisit())).toEqual({ color: 0x101a3b, alpha: 0.56 });
    expect(getRoomTint(kickedBlanketVisit("cover"))).toEqual({ color: 0x101a3b, alpha: 0.56 });
    expect(getRoomTint(visitFor("sleeping"))).toEqual({ color: 0x101a3b, alpha: 0.15 });
  });

  it("shows Etokichi and Tatsuo together for their sleeping scene", () => {
    expect(getRoomPresentation(sleepingWithTatsuoVisit())).toEqual({
      backgroundAssetName: "room-background-deep-night-pixel.webp",
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-sleeping-pixel.png",
        height: 80,
        x: 61,
        y: 170,
      },
    });
  });

  it("configures Mimizou to peek through the window during the visit scene", () => {
    expect(getRoomPresentation(visitFor("mimizouVisit"))).toMatchObject({
      visitor: {
        assetName: "mimizou-pixel.png",
        height: 40,
        x: 49,
        y: 60,
      },
    });
  });

  it("keeps Etokichi tucked in while almost awake", () => {
    expect(getRoomPresentation(visitFor("almostAwake"))).toMatchObject({
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
    });
  });

  it("shows awake Tatsuo beside Etokichi in the wake-up scene", () => {
    expect(getRoomPresentation(visitFor("tatsuoWakeUp"))).toMatchObject({
      companion: {
        assetName: "tatsuo-awake-pixel-v2.png",
        height: 80,
        x: 61,
        y: 170,
      },
    });
  });

  it("shows Mimizou at the window in the farewell scene", () => {
    expect(getRoomPresentation(visitFor("mimizouFarewell"))).toMatchObject({
      visitor: {
        assetName: "mimizou-pixel.png",
        height: 40,
        x: 49,
        y: 60,
      },
    });
  });

  it.each([
    ["almostAwake", "room-background-early-morning-pixel.webp"],
    ["tooMuchBreakfast", "room-background-morning-pixel.webp"],
    ["foundOldToy", "room-background-daytime-pixel.webp"],
    ["muddyReturn", "room-background-evening-pixel.webp"],
    ["packingTomorrow", "room-background-night-pixel.webp"],
    ["sleeping", "room-background-deep-night-pixel.webp"],
  ] as const)("uses the time-specific background for %s", (sceneId, expectedAssetName) => {
    expect(getRoomPresentation(visitFor(sceneId)).backgroundAssetName).toBe(expectedAssetName);
  });

  it("shows Mimizou beside Etokichi for the unlocked stargazing variant", () => {
    expect(getRoomPresentation(visitFor("watchingStars", true))).toMatchObject({
      companion: {
        assetName: "mimizou-pixel.png",
        height: 34,
        x: 84,
        y: 128,
      },
    });
    expect(getRoomPresentation(visitFor("watchingStars", false)).companion).toBeUndefined();
  });
});
