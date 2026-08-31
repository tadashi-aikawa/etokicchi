import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import type { VisitView } from "../src/game/types.ts";
import { getRoomPresentation } from "../src/rendering/room-presentation.ts";

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

  it("shows Etokichi and Tatsuo together for their sleeping scene", () => {
    expect(getRoomPresentation(sleepingWithTatsuoVisit())).toEqual({
      backgroundAssetName: "room-background-pixel.webp",
      sleeperAssetName: "etokichi-sleeping-with-tatsuo-pixel.png",
      sleeperHeight: 80,
    });
  });
});
