import { describe, expect, it } from "vitest";
import { getScene, SCENES } from "../src/content/scenes.ts";
import type { SceneId, TimeBand, VisitView } from "../src/game/types.ts";
import {
  getLightingColorMatrix,
  getRoomPresentation,
  getRoomTint,
  resolveGuestDepthY,
} from "../src/rendering/room-presentation.ts";
import { getDepthZIndex } from "../src/rendering/room-layout.ts";

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
      kind: "legacy",
      backgroundAssetName: "room-background-kicked-blanket-pixel.webp",
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
      tintPlacement: "beforeCharacters",
      characterOrder: "companionVisitorForegroundBaseCharacter",
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

  it("keeps the legacy tint for both kicked-blanket backgrounds and darkens the neutral layered base", () => {
    expect(getRoomTint(kickedBlanketVisit())).toEqual({ color: 0x101a3b, alpha: 0.56 });
    expect(getRoomTint(kickedBlanketVisit("cover"))).toEqual({ color: 0x101a3b, alpha: 0.56 });
    expect(getRoomTint(visitFor("sleeping"))).toEqual({ color: 0x101a3b, alpha: 0.65 });
  });

  it("shows Etokichi and Tatsuo together for their sleeping scene", () => {
    expect(getRoomPresentation(sleepingWithTatsuoVisit())).toEqual({
      kind: "layered",
      baseAssetName: "room-base-daytime-pixel.webp",
      windowAssetName: "room-background-deep-night-pixel.webp",
      tint: { color: 0x101a3b, alpha: 0.65 },
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 28,
      companion: {
        assetName: "tatsuo-sleeping-pixel.png",
        height: 80,
        x: 61,
        y: 170,
        depth: "scene",
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
        x: 76,
        y: 170,
        depth: "scene",
      },
    });
  });

  it("keeps a scene-bound companion behind the base character at the same furniture depth", () => {
    const presentation = getRoomPresentation(sleepingWithTatsuoVisit());
    expect(presentation.companion).toBeDefined();
    if (!presentation.companion) throw new Error("sleeping Tatsuo is missing");
    const companionDepthY = resolveGuestDepthY(presentation.companion, 165);
    expect(getDepthZIndex(companionDepthY, 45)).toBeLessThan(getDepthZIndex(165, 50));
  });

  it("expresses lighting as source-over color blending instead of multiplicative tint", () => {
    const matrix = getLightingColorMatrix({ color: 0x1d2a50, alpha: 0.52 });
    expect(matrix).toHaveLength(20);
    expect(matrix[0]).toBeCloseTo(0.48);
    expect(matrix[4]).toBeCloseTo((0x1d / 255) * 0.52);
    expect(matrix[6]).toBeCloseTo(0.48);
    expect(matrix[9]).toBeCloseTo((0x2a / 255) * 0.52);
    expect(matrix[12]).toBeCloseTo(0.48);
    expect(matrix[14]).toBeCloseTo((0x50 / 255) * 0.52);
    expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
  });

  it("shows Etokichi sprawled on a cushion during the window nap", () => {
    expect(getRoomPresentation(visitFor("windowNap"))).toMatchObject({
      kind: "layered",
      baseAssetName: "room-base-daytime-pixel.webp",
      windowAssetName: "room-background-daytime-pixel.webp",
      sleeperAssetName: "etokichi-window-nap-star-book-pixel.png",
      sleeperHeight: 64,
      sleeperBase: {
        assetName: "etokichi-window-nap-cushion-base-pixel.png",
        height: 64,
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
  ] as const)("uses the time-specific window for %s", (sceneId, expectedAssetName) => {
    const presentation = getRoomPresentation(visitFor(sceneId));
    expect(presentation.kind).toBe("layered");
    if (presentation.kind !== "layered") throw new Error(`${sceneId} unexpectedly uses legacy rendering`);
    expect(presentation.windowAssetName).toBe(expectedAssetName);
    expect(presentation.baseAssetName).toBe("room-base-daytime-pixel.webp");
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

  it("uses layered rendering for every scene except kickedBlanket", () => {
    for (const scene of SCENES) {
      const visit = visitFor(scene.id);
      visit.assignment.band = scene.band;
      expect(getRoomPresentation(visit).kind, scene.id).toBe(scene.id === "kickedBlanket" ? "legacy" : "layered");
    }
  });

  it.each([
    ["almostAwake", { color: 0xffc578, alpha: 0.12 }],
    ["tooMuchBreakfast", { color: 0xffdc9c, alpha: 0.05 }],
    ["foundOldToy", { color: 0xfff1c6, alpha: 0 }],
    ["muddyReturn", { color: 0xc75b45, alpha: 0.18 }],
    ["packingTomorrow", { color: 0x1d2a50, alpha: 0.52 }],
    ["sleeping", { color: 0x101a3b, alpha: 0.65 }],
  ] as const)("selects the time tint for %s", (sceneId, tint) => {
    const presentation = getRoomPresentation(visitFor(sceneId));
    expect(presentation.kind).toBe("layered");
    expect(presentation.tint).toEqual(tint);
  });
});
