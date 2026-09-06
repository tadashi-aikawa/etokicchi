import { describe, expect, it } from "vitest";
import { getScene, SCENES } from "../src/content/scenes.ts";
import type { SceneId, TimeBand, VisitView } from "../src/game/types.ts";
import { TIME_BANDS } from "../src/game/time.ts";
import { FIXTURE_DEFINITIONS } from "../src/rendering/room-fixtures.ts";
import {
  createFurnitureAnchors,
  FURNITURE_DEFINITIONS,
  resolveFurnitureActionPoint,
  resolveFurnitureLayout,
} from "../src/rendering/room-furniture.ts";
import { DEFAULT_ROOM_LAYOUT, getDepthZIndex, resolveSceneRoute } from "../src/rendering/room-layout.ts";
import {
  applyTintToColor,
  getLightingColorMatrix,
  getRoomPresentation,
  getRoomTint,
  isScenePropInitiallyVisible,
  resolveGuestDepthY,
  resolveGuestPosition,
  resolveScenePropDepthY,
  resolveScenePropPosition,
  WINDOW_OBSERVATIONS,
} from "../src/rendering/room-presentation.ts";

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
    tatsuoTooComfortable: "evening",
    comfortingMaineCoon: "evening",
    tatsuoAtWindow: "deepNight",
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
      kind: "layered",
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
      furnitureAssetNames: {
        bed: "furniture-bed-bare-pixel.webp",
      },
      sceneProps: [
        {
          assetName: "scene-blanket-floor-pixel.webp",
          furnitureId: "bed",
          offset: { x: 10, y: 27 },
        },
      ],
    });
  });

  it("moves the blanket onto Etokichi after choosing cover", () => {
    expect(getRoomPresentation(kickedBlanketVisit("cover"))).toMatchObject({
      kind: "layered",
      sleeperAssetName: "etokichi-sleep-covered-pixel.png",
      furnitureAssetNames: {
        bed: "furniture-bed-bare-pixel.webp",
      },
      sceneProps: undefined,
    });
  });

  it("does not change the room for other choices", () => {
    expect(getRoomPresentation(kickedBlanketVisit("warmRoom"))).toMatchObject({
      sleeperAssetName: "etokichi-sleep-kicked-pixel.png",
      sceneProps: [{ assetName: "scene-blanket-floor-pixel.webp" }],
    });
  });

  it("uses the same deep-night lighting for the kicked-blanket scene and the other layered scenes", () => {
    expect(getRoomTint(kickedBlanketVisit())).toEqual({ color: 0x101a3b, alpha: 0.65 });
    expect(getRoomTint(kickedBlanketVisit("cover"))).toEqual({ color: 0x101a3b, alpha: 0.65 });
    expect(getRoomTint(visitFor("sleeping"))).toEqual({ color: 0x101a3b, alpha: 0.65 });
  });

  it("shows Etokichi and Tatsuo together for their sleeping scene", () => {
    expect(getRoomPresentation(sleepingWithTatsuoVisit())).toEqual({
      kind: "layered",
      baseAssetName: "room-base-empty-daytime-pixel.webp",
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
      observationOverrides: {
        bed: "タツヲの大きな手が、ベッドの縁にそっと添えられている。",
        bedsideTable: "枕元の水は、タツヲが持ってきてくれたものかもしれない。",
        sofa: "タツヲにはソファーより、エトキチのそばのほうが落ち着くらしい。",
      },
      windowObservation: "街は眠り、窓には小さな星がいくつか見える。",
    });
  });

  it("configures the rainy deep-night window encounter with Tatsuo", () => {
    expect(getRoomPresentation(visitFor("tatsuoAtWindow"))).toMatchObject({
      tint: { color: 0x101a3b, alpha: 0.72 },
      sleeperAssetName: "etokichi-sleep-tucked-pixel.png",
      sleeperHeight: 30,
      hiddenDepthDecorationIds: ["maineCoon"],
      thunderstorm: true,
      tatsuoWindow: {
        assetName: "tatsuo-awake-pixel.png",
        height: 44,
        x: 69,
        y: 25,
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

  it("moves the dining stool beside the fixed kitchen for simmering", () => {
    expect(getRoomPresentation(visitFor("simmeringDinner"))).toMatchObject({
      hideCharacterShadow: true,
      hiddenFurnitureIds: ["roundStool"],
      characterBubble: {
        kind: "thought",
        text: "♪",
        offset: { x: -19, y: -69 },
        width: 28,
        height: 22,
      },
      sceneProps: [
        {
          type: "fixture",
          assetName: "scene-simmering-pot-pixel.webp",
          height: 24,
          fixtureId: "kitchenUnit",
          offset: { x: -18, y: -54 },
          depthOffset: -10,
        },
        {
          type: "fixture",
          assetName: "furniture-round-stool-pixel.webp",
          height: 34,
          fixtureId: "kitchenUnit",
          offset: { x: -44, y: 1 },
          depthOffset: 0,
        },
      ],
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

  it("blends a plain color with the same formula the lighting matrix uses", () => {
    const tint = { color: 0x1d2a50, alpha: 0.52 };
    const blended = applyTintToColor(0x8b5331, tint);
    const expectChannel = (source: number, target: number): number => Math.round(0.48 * source + 0.52 * target);
    expect((blended >> 16) & 0xff).toBe(expectChannel(0x8b, 0x1d));
    expect((blended >> 8) & 0xff).toBe(expectChannel(0x53, 0x2a));
    expect(blended & 0xff).toBe(expectChannel(0x31, 0x50));
  });

  it("keeps a color untouched when the time band has no lighting", () => {
    expect(applyTintToColor(0x8b5331, { color: 0xffffff, alpha: 0 })).toBe(0x8b5331);
  });

  it("reaches the tint color when the lighting fully covers the source", () => {
    expect(applyTintToColor(0x8b5331, { color: 0x1d2a50, alpha: 1 })).toBe(0x1d2a50);
  });

  it("shows Etokichi sprawled on a cushion during the window nap", () => {
    expect(getRoomPresentation(visitFor("windowNap"))).toMatchObject({
      kind: "layered",
      baseAssetName: "room-base-empty-daytime-pixel.webp",
      windowAssetName: "room-background-daytime-pixel.webp",
      sleeperAssetName: "etokichi-window-nap-star-book-pixel.png",
      sleeperHeight: 72,
      sleeperBreathing: "subtle",
      sleeperBase: {
        assetName: "etokichi-window-nap-cushion-base-pixel.png",
        height: 72,
      },
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 66,
          y: 300,
          depthY: 300,
        },
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
    expect(presentation.baseAssetName).toBe("room-base-empty-daytime-pixel.webp");
  });

  it("shows Mimizou beside Etokichi for the unlocked stargazing variant", () => {
    expect(getRoomPresentation(visitFor("watchingStars", true))).toMatchObject({
      companion: {
        assetName: "mimizou-pixel.png",
        height: 34,
        x: 100,
        y: 126,
      },
    });
    expect(getRoomPresentation(visitFor("watchingStars", false)).companion).toBeUndefined();
  });

  it("keeps Mimizou clear of Etokichi's new spot under the window", () => {
    const presentation = getRoomPresentation(visitFor("watchingStars", true));
    if (!presentation.companion) throw new Error("stargazing Mimizou is missing");
    const stargazingSpot = resolveSceneRoute("watchingStars", DEFAULT_ROOM_LAYOUT)[0];
    if (!stargazingSpot) throw new Error("stargazing waypoint is missing");
    const position = resolveGuestPosition(presentation.companion, DEFAULT_ROOM_LAYOUT.furniture);
    expect(position.x - stargazingSpot.x).toBeGreaterThanOrEqual(26);
    // 本棚の足元より手前へ置き、棚のスプライトへ隠れないようにする。
    expect(getDepthZIndex(resolveGuestDepthY(presentation.companion, stargazingSpot.y), 45)).toBeGreaterThan(
      getDepthZIndex(DEFAULT_ROOM_LAYOUT.furniture.bookshelf.footY, 6),
    );
  });

  it("restores the duvet on the bed now that stargazing happens under the window", () => {
    expect(getRoomPresentation(visitFor("watchingStars")).furnitureAssetNames?.bed).toBeUndefined();
  });

  it("moves the Maine Coon onto the bed while Etokichi reads on the sofa", () => {
    expect(getRoomPresentation(visitFor("readingComics"))).toMatchObject({
      depthDecorationOverrides: {
        maineCoon: {
          type: "furniture",
          furnitureId: "bed",
          offset: { x: -3, y: -18 },
          width: 54,
          height: 43,
          depthOffset: 1,
          observation: "クーンちゃんが、ベッドの上で満足そうに丸くなっている。",
        },
      },
    });
  });

  it("lets Koon stretch along the sofa while Etokichi folds laundry", () => {
    expect(getRoomPresentation(visitFor("foldingLaundry"))).toMatchObject({
      depthDecorationOverrides: {
        maineCoon: {
          type: "furniture",
          furnitureId: "sofa",
          assetName: "decor-cat-sofa-curled-compact-pixel.webp",
          offset: { x: 8, y: -14 },
          width: 60,
          height: 75,
          depthOffset: 1,
        },
      },
    });
  });

  it("anchors reclining Tatsuo across both sofa seats and draws him in front", () => {
    const presentation = getRoomPresentation(visitFor("tatsuoTooComfortable"));
    expect(presentation.companion).toMatchObject({
      assetName: "tatsuo-too-comfortable-pixel.png",
      height: 88,
      furnitureId: "sofa",
      actionPointId: "sitRear",
      offset: { x: -2, y: 34 },
      depthActionPointId: "sit",
      depthOffset: 30,
    });
    if (!presentation.companion) throw new Error("reclining Tatsuo is missing");
    expect(resolveGuestPosition(presentation.companion, DEFAULT_ROOM_LAYOUT.furniture)).toEqual({ x: 29, y: 322 });
    expect(resolveGuestDepthY(presentation.companion, 271, DEFAULT_ROOM_LAYOUT.furniture)).toBe(348);

    const movedFurniture = resolveFurnitureLayout(createFurnitureAnchors({ sofa: { x: 29, y: 330 } }));
    expect(resolveGuestPosition(presentation.companion, movedFurniture)).toEqual({ x: 34, y: 312 });
    expect(resolveGuestDepthY(presentation.companion, 271, movedFurniture)).toBe(338);
  });

  it("lets Koon blink at Etokichi during the secret night snack", () => {
    expect(getRoomPresentation(visitFor("littleNightSnack"))).toMatchObject({
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          assetName: "decor-cat-loaf-blink-pixel.webp",
          x: 83,
          y: 286,
          depthY: 286,
          width: 60,
          height: 48,
          animation: {
            columns: 4,
            frameDurationsMs: [2600, 80, 110, 80],
          },
        },
      },
    });
  });

  it("shows the reassuring embrace during the rainy thunder scene", () => {
    const presentation = getRoomPresentation(visitFor("comfortingMaineCoon"));
    expect(presentation).toMatchObject({
      tint: { color: 0x364963, alpha: 0.32 },
      hiddenDepthDecorationIds: ["maineCoon"],
      thunderstorm: true,
      comfortingMaineCoon: {
        assetName: "etokichi-comforting-maine-coon-pixel.webp",
        height: 52,
        x: 96,
        y: 326,
      },
    });
    expect(presentation.characterBubble).toBeUndefined();
  });

  it("keeps Koon in a separate stationary layer during brushing", () => {
    expect(getRoomPresentation(visitFor("brushingMaineCoon"))).toMatchObject({
      depthDecorationOverrides: {
        maineCoon: {
          type: "absolute",
          x: 108,
          y: 322,
          depthY: 320,
          width: 68,
          height: 54,
        },
      },
    });
  });

  it("uses the combined sleeping asset without rendering the room's default Koon twice", () => {
    expect(getRoomPresentation(visitFor("nappingOnMaineCoon"))).toMatchObject({
      sleeperAssetName: "etokichi-napping-on-maine-coon-pixel.webp",
      sleeperHeight: 56,
      sleeperBreathing: "alternating",
      hiddenDepthDecorationIds: ["maineCoon"],
    });
  });

  it("uses layered rendering for every scene", () => {
    for (const scene of SCENES) {
      const visit = visitFor(scene.id);
      visit.assignment.band = scene.band;
      expect(getRoomPresentation(visit).kind, scene.id).toBe("layered");
    }
  });

  it.each(["morningStretch", "mimizouFarewell"] as const)(
    "removes the front duvet while %s is active beside the bed",
    (sceneId) => {
      expect(getRoomPresentation(visitFor(sceneId)).furnitureAssetNames).toMatchObject({
        bed: "furniture-bed-bare-pixel.webp",
      });
    },
  );

  it.each([
    ["almostAwake", { color: 0xffc578, alpha: 0.12 }],
    ["tooMuchBreakfast", { color: 0xffdc9c, alpha: 0.05 }],
    ["foundOldToy", { color: 0xfff1c6, alpha: 0 }],
    ["muddyReturn", { color: 0xc75b45, alpha: 0.18 }],
    ["packingTomorrow", { color: 0x1d2a50, alpha: 0.42 }],
    ["watchingStars", { color: 0x101a3b, alpha: 0.52 }],
    ["sleeping", { color: 0x101a3b, alpha: 0.65 }],
  ] as const)("selects the time tint for %s", (sceneId, tint) => {
    const presentation = getRoomPresentation(visitFor(sceneId));
    expect(presentation.kind).toBe("layered");
    expect(presentation.tint).toEqual(tint);
  });
});

describe("scene props", () => {
  const propsFor = (sceneId: SceneId) => getRoomPresentation(visitFor(sceneId)).sceneProps ?? [];
  const bundledAssetNames = new Set(
    Object.keys(import.meta.glob("../public/assets/*")).map((path) => path.slice(path.lastIndexOf("/") + 1)),
  );

  it("uses asset files that exist under public/assets", () => {
    const assetNames = SCENES.flatMap((scene) => propsFor(scene.id).map(({ assetName }) => assetName));
    expect(assetNames).toEqual(
      expect.arrayContaining([
        "scene-breakfast-dishes-pixel.webp",
        "scene-mud-footprints-pixel.webp",
        "scene-laundry-basket-pixel.webp",
        "scene-toy-box-pixel.webp",
      ]),
    );
    for (const assetName of assetNames) {
      expect(bundledAssetNames, assetName).toContain(assetName);
    }
  });

  it("swaps in furniture variants that exist under public/assets", () => {
    const overrides = SCENES.flatMap((scene) =>
      Object.values(getRoomPresentation(visitFor(scene.id)).furnitureAssetNames ?? {}),
    );
    expect(overrides).toEqual(
      expect.arrayContaining(["furniture-bed-bare-pixel.webp", "furniture-dining-table-chair-bare-pixel.webp"]),
    );
    for (const assetName of overrides) {
      expect(bundledAssetNames, assetName).toContain(assetName);
    }
  });

  it("lays the breakfast dishes on the dining table in front of the table itself", () => {
    const [dishes] = propsFor("tooMuchBreakfast");
    if (!dishes) throw new Error("breakfast dishes are missing");
    expect(dishes).toMatchObject({
      type: "furniture",
      assetName: "scene-breakfast-dishes-pixel.webp",
      furnitureId: "diningSet",
      height: 22,
    });
    // 鉢とマグの無い天板へ差し替えて、6皿ぶんの場所を空ける。
    expect(getRoomPresentation(visitFor("tooMuchBreakfast")).furnitureAssetNames).toMatchObject({
      diningSet: "furniture-dining-table-chair-bare-pixel.webp",
    });

    const position = resolveScenePropPosition(dishes, DEFAULT_ROOM_LAYOUT);
    expect(position).toEqual({ x: 48, y: 223 });
    // 天板の高さに置きつつ、深度だけ食卓の足元より手前へずらす。
    expect(resolveScenePropDepthY(dishes, position)).toBeGreaterThan(DEFAULT_ROOM_LAYOUT.furniture.diningSet.footY);
    expect(getDepthZIndex(resolveScenePropDepthY(dishes, position), 20)).toBeGreaterThan(
      getDepthZIndex(DEFAULT_ROOM_LAYOUT.furniture.diningSet.footY, 6),
    );
  });

  it("reveals the breakfast dishes only once Etokichi reaches the dining chair", () => {
    const [dishes] = propsFor("tooMuchBreakfast");
    if (!dishes) throw new Error("breakfast dishes are missing");
    expect(isScenePropInitiallyVisible(dishes)).toBe(false);

    const route = resolveSceneRoute("tooMuchBreakfast", DEFAULT_ROOM_LAYOUT);
    const chair = route[dishes.revealAtWaypoint ?? -1];
    expect(chair).toMatchObject(resolveFurnitureActionPoint(DEFAULT_ROOM_LAYOUT.furniture, "diningSet", "morningTea"));
  });

  it("follows the dining table when its anchor moves", () => {
    const [dishes] = propsFor("tooMuchBreakfast");
    if (!dishes) throw new Error("breakfast dishes are missing");
    const moved = {
      ...DEFAULT_ROOM_LAYOUT,
      furniture: resolveFurnitureLayout(createFurnitureAnchors({ diningSet: { x: 47, y: 264 } })),
    };
    expect(resolveScenePropPosition(dishes, moved)).toEqual({ x: 43, y: 223 });
  });

  it("keeps every other prop visible from the first frame", () => {
    for (const sceneId of ["muddyReturn", "foldingLaundry", "foundOldToy", "simmeringDinner"] as const) {
      for (const prop of propsFor(sceneId)) {
        expect(isScenePropInitiallyVisible(prop), sceneId).toBe(true);
      }
    }
  });

  it("places absolute props at their room coordinates regardless of the furniture layout", () => {
    const moved = {
      ...DEFAULT_ROOM_LAYOUT,
      furniture: resolveFurnitureLayout(createFurnitureAnchors({ diningSet: { x: 47, y: 264 } })),
    };
    for (const sceneId of ["muddyReturn", "foldingLaundry", "foundOldToy"] as const) {
      const [prop] = propsFor(sceneId);
      if (!prop || prop.type !== "absolute") throw new Error(`${sceneId} has no absolute prop`);
      expect(resolveScenePropPosition(prop, DEFAULT_ROOM_LAYOUT), sceneId).toEqual({ x: prop.x, y: prop.y });
      expect(resolveScenePropPosition(prop, moved), sceneId).toEqual({ x: prop.x, y: prop.y });
    }
  });

  it("draws the muddy footprints above the entrance mat but behind every furniture piece", () => {
    const [footprints] = propsFor("muddyReturn");
    if (!footprints || footprints.type !== "absolute") throw new Error("muddy footprints are missing");
    expect(footprints).toMatchObject({ assetName: "scene-mud-footprints-pixel.webp", height: 17, x: 162, y: 148 });

    const depth = getDepthZIndex(resolveScenePropDepthY(footprints, footprints), 20);
    for (const { id } of FURNITURE_DEFINITIONS) {
      expect(depth, id).toBeLessThan(getDepthZIndex(DEFAULT_ROOM_LAYOUT.furniture[id].footY, 0));
    }
  });

  it("piles the laundry basket in front of Etokichi and keeps the toy box behind her", () => {
    const [basket] = propsFor("foldingLaundry");
    const [toyBox] = propsFor("foundOldToy");
    if (!basket || !toyBox) throw new Error("folding or toy props are missing");
    expect(basket).toMatchObject({ assetName: "scene-laundry-basket-pixel.webp", height: 33 });
    expect(toyBox).toMatchObject({ assetName: "scene-toy-box-pixel.webp", height: 22 });

    const foldingSpot = resolveSceneRoute("foldingLaundry", DEFAULT_ROOM_LAYOUT)[0];
    const toySpot = resolveSceneRoute("foundOldToy", DEFAULT_ROOM_LAYOUT)[0];
    if (!foldingSpot || !toySpot) throw new Error("action spots are missing");
    // かごはたたんでいる手の先。エトキチより手前へ描く。
    expect(resolveScenePropPosition(basket, DEFAULT_ROOM_LAYOUT).y).toBeGreaterThan(foldingSpot.y);
    expect(resolveScenePropDepthY(basket, resolveScenePropPosition(basket, DEFAULT_ROOM_LAYOUT))).toBeGreaterThan(
      foldingSpot.y,
    );
    expect(resolveScenePropPosition(toyBox, DEFAULT_ROOM_LAYOUT).x).toBeLessThan(toySpot.x);
    expect(resolveScenePropDepthY(toyBox, resolveScenePropPosition(toyBox, DEFAULT_ROOM_LAYOUT))).toBeLessThan(
      toySpot.y,
    );
  });

  it("keeps the simmering props attached to the kitchen unit", () => {
    const [pot] = propsFor("simmeringDinner");
    if (!pot || pot.type !== "fixture") throw new Error("simmering pot is missing");
    expect(resolveScenePropPosition(pot, DEFAULT_ROOM_LAYOUT)).toEqual({ x: 184, y: 231 });
    expect(resolveScenePropDepthY(pot, { x: 184, y: 231 })).toBe(231);
  });
});

describe("scene observations", () => {
  const observationTargetIds = new Set<string>([
    ...FURNITURE_DEFINITIONS.map(({ id }) => id),
    ...FIXTURE_DEFINITIONS.flatMap(({ id, hotspots }) => [id, ...hotspots.map((hotspot) => hotspot.id)]),
    "window",
  ]);

  it("overrides only tappable targets in every scene", () => {
    for (const scene of SCENES) {
      const visit = visitFor(scene.id);
      visit.assignment.band = scene.band;
      const overrides = getRoomPresentation(visit).observationOverrides;
      expect(Object.keys(overrides).length, scene.id).toBeGreaterThan(0);
      for (const [targetId, text] of Object.entries(overrides)) {
        expect(observationTargetIds, `${scene.id}.${targetId}`).toContain(targetId);
        expect(text, `${scene.id}.${targetId}`).toMatch(/。$/);
      }
    }
  });

  it("has a default window observation for every time band", () => {
    for (const band of TIME_BANDS) {
      expect(WINDOW_OBSERVATIONS[band], band).toBeTruthy();
    }
    expect(Object.keys(WINDOW_OBSERVATIONS)).toHaveLength(TIME_BANDS.length);
  });

  it("falls back to the time band window observation when the scene does not override it", () => {
    const presentation = getRoomPresentation(visitFor("foundOldToy"));
    expect(presentation.observationOverrides.window).toBeUndefined();
    expect(presentation.windowObservation).toBe(WINDOW_OBSERVATIONS.daytime);
  });

  it("prefers the scene window observation over the time band default", () => {
    const presentation = getRoomPresentation(visitFor("mimizouVisit"));
    expect(presentation.windowObservation).toBe("窓ガラスの向こうで、大きな目がゆっくり瞬いた。");
    expect(presentation.windowObservation).not.toBe(WINDOW_OBSERVATIONS.night);
  });

  it("rewrites the bed observation once the blanket is put back", () => {
    expect(getRoomPresentation(kickedBlanketVisit()).observationOverrides.bed).toBe(
      "布団は足元から床へずり落ち、エトキチは大の字で眠っている。",
    );
    expect(getRoomPresentation(kickedBlanketVisit("cover")).observationOverrides.bed).toBe(
      "そっと掛け直した布団の中で、エトキチは安心した寝顔になっている。",
    );
  });

  it("keeps the other kicked-blanket observations regardless of the choice", () => {
    for (const choiceId of [undefined, "cover"]) {
      expect(getRoomPresentation(kickedBlanketVisit(choiceId)).observationOverrides).toMatchObject({
        window: "窓が少しだけ開いていて、冷たい夜風が入ってくる。",
        bedsideTable: "照明台の上には、まだ半分残った水のコップがある。",
      });
    }
  });
});
