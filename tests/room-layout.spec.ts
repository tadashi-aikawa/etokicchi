import { describe, expect, it } from "vitest";
import type { SceneId } from "../src/game/types.ts";
import {
  createFurnitureAnchors,
  FURNITURE_DEFINITIONS,
  getFurnitureDefinition,
  placeFurniture,
  resolveFurnitureActionPoint,
  resolveFurnitureSpriteHitArea,
} from "../src/rendering/room-furniture.ts";
import {
  CHARACTER_FOOT_RADIUS,
  DEFAULT_ROOM_LAYOUT,
  expandAabb,
  getDepthZIndex,
  isMovementSegmentValid,
  resolveSceneInitialDepthY,
  resolveSceneRoute,
  SCENE_ROUTES,
  segmentIntersectsAabb,
  tryAdoptFurnitureAnchors,
  tryCreateRoomLayout,
  validateRoomLayout,
  validateSceneRoute,
  WALKABLE_BOUNDS,
} from "../src/rendering/room-layout.ts";

describe("furniture definitions", () => {
  it("centralizes seven stable, valid movable furniture definitions", () => {
    expect(FURNITURE_DEFINITIONS).toHaveLength(7);
    expect(FURNITURE_DEFINITIONS.map(({ id }) => id)).toEqual([
      "bed",
      "bookshelf",
      "diningSet",
      "roundStool",
      "floorPlant",
      "sofa",
      "bedsideTable",
    ]);
    expect(new Set(FURNITURE_DEFINITIONS.map(({ assetName }) => assetName)).size).toBe(7);
    for (const definition of FURNITURE_DEFINITIONS) {
      expect(definition.assetName).toMatch(/^furniture-.+-pixel\.webp$/);
      expect(definition.displayHeight).toBeGreaterThan(0);
      if (definition.displayWidth) expect(definition.displayWidth).toBeGreaterThan(0);
      expect(definition.occupancy.width).toBeGreaterThan(0);
      expect(definition.occupancy.height).toBeGreaterThan(0);
      expect(definition.clickArea.width).toBeGreaterThan(0);
      expect(definition.clickArea.height).toBeGreaterThan(0);
      expect(definition.clickArea.x).toBeLessThanOrEqual(0);
      expect(definition.clickArea.x + definition.clickArea.width).toBeGreaterThanOrEqual(0);
      expect(definition.clickArea.y).toBeLessThanOrEqual(0);
      expect(definition.clickArea.y + definition.clickArea.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("translates the anchor, footY, occupancy, click area, and action points by the same delta", () => {
    const definition = getFurnitureDefinition("diningSet");
    const original = placeFurniture(definition);
    const moved = placeFurniture(definition, { x: definition.anchor.x + 13, y: definition.anchor.y - 7 });

    expect(moved.anchor).toEqual({ x: original.anchor.x + 13, y: original.anchor.y - 7 });
    expect(moved.footY).toBe(original.footY - 7);
    expect(moved.occupancy).toEqual({
      ...original.occupancy,
      x: original.occupancy.x + 13,
      y: original.occupancy.y - 7,
    });
    expect(moved.clickArea).toEqual({
      ...original.clickArea,
      x: original.clickArea.x + 13,
      y: original.clickArea.y - 7,
    });
    expect(moved.actionPoints.morningTea).toEqual({
      x: (original.actionPoints.morningTea?.x ?? 0) + 13,
      y: (original.actionPoints.morningTea?.y ?? 0) - 7,
    });
  });

  it("converts click regions to the Sprite local coordinates around its bottom-center anchor", () => {
    const bed = getFurnitureDefinition("bed");
    expect(bed).toMatchObject({ displayWidth: 54, displayHeight: 80 });
    expect(resolveFurnitureSpriteHitArea(bed, 160)).toEqual({ x: -54, y: -160, width: 108, height: 160 });
  });

  it("uses the hotel-style bedside table", () => {
    expect(getFurnitureDefinition("bedsideTable")).toMatchObject({
      assetName: "furniture-bedside-table-pixel.webp",
      displayName: "ベッド脇の照明台",
    });
  });

  it("uses a right-facing sofa along the left wall", () => {
    expect(getFurnitureDefinition("sofa")).toMatchObject({
      assetName: "furniture-sofa-right-two-seat-pixel.webp",
      displayName: "右向きの二人掛けソファー",
      displayWidth: 40,
      displayHeight: 80,
      actionPoints: { sit: { x: 7, y: -22 }, sitRear: { x: 7, y: -52 } },
    });
  });

  it("separates the backless stool from the dining table and front chair", () => {
    expect(getFurnitureDefinition("diningSet").assetName).toBe("furniture-dining-table-chair-pixel.webp");
    expect(getFurnitureDefinition("roundStool")).toMatchObject({
      assetName: "furniture-round-stool-pixel.webp",
      anchor: { x: 85, y: 249 },
      displayHeight: 22,
      footY: -10,
    });
  });
});

describe("room collision geometry", () => {
  it("shrinks the walking range by the character foot radius", () => {
    expect(CHARACTER_FOOT_RADIUS).toBe(5);
    expect(WALKABLE_BOUNDS).toEqual({ x: 5, y: 85, width: 185, height: 257 });
  });

  it("calculates the Minkowski sum against a circular foot as an expanded AABB", () => {
    expect(expandAabb({ x: 10, y: 20, width: 30, height: 40 }, 5)).toEqual({
      x: 5,
      y: 15,
      width: 40,
      height: 50,
    });
  });

  it("treats edge and corner contact as a segment collision", () => {
    const obstacle = { x: 10, y: 10, width: 10, height: 10 };
    expect(segmentIntersectsAabb({ x: 0, y: 10 }, { x: 10, y: 10 }, obstacle)).toBe(true);
    expect(segmentIntersectsAabb({ x: 0, y: 20 }, { x: 30, y: 20 }, obstacle)).toBe(true);
    expect(segmentIntersectsAabb({ x: 0, y: 21 }, { x: 30, y: 21 }, obstacle)).toBe(false);
    expect(segmentIntersectsAabb({ x: 15, y: 0 }, { x: 15, y: 30 }, obstacle)).toBe(true);
  });

  it("uses foot-aware geometry for a runtime movement segment", () => {
    const bed = DEFAULT_ROOM_LAYOUT.furniture.bed.occupancy;
    expect(
      isMovementSegmentValid(
        { x: bed.x + bed.width + 6, y: bed.y },
        { x: bed.x + bed.width + 6, y: bed.y + bed.height },
        DEFAULT_ROOM_LAYOUT,
      ),
    ).toBe(true);
    expect(
      isMovementSegmentValid(
        { x: bed.x + bed.width + 5, y: bed.y },
        { x: bed.x + bed.width + 5, y: bed.y + bed.height },
        DEFAULT_ROOM_LAYOUT,
      ),
    ).toBe(false);
  });
});

describe("room layout adoption and scene routes", () => {
  it("accepts the default layout and every walking scene route", () => {
    expect(validateRoomLayout(DEFAULT_ROOM_LAYOUT)).toEqual([]);
    for (const sceneId of Object.keys(SCENE_ROUTES) as SceneId[]) {
      expect(validateSceneRoute(sceneId, DEFAULT_ROOM_LAYOUT), sceneId).toEqual([]);
    }
  });

  it("rejects an invalid candidate and keeps the previous valid layout", () => {
    const anchors = createFurnitureAnchors({ bed: { x: 103, y: 111 } });
    const result = tryAdoptFurnitureAnchors(DEFAULT_ROOM_LAYOUT, anchors);

    expect(result.accepted).toBe(false);
    expect(result.layout).toBe(DEFAULT_ROOM_LAYOUT);
    if (result.accepted) throw new Error("invalid layout was accepted");
    expect(result.errors.some(({ code }) => code === "furnitureOverlap" || code === "invalidRoute")).toBe(true);
    expect(tryCreateRoomLayout(anchors).accepted).toBe(false);
  });

  it("rejects a non-overlapping furniture move that blocks an activity route", () => {
    const anchors = createFurnitureAnchors({ floorPlant: { x: 104, y: 210 } });
    const result = tryCreateRoomLayout(anchors);
    expect(result.accepted).toBe(false);
    if (result.accepted) throw new Error("route-blocking layout was accepted");
    expect(result.errors.some(({ code }) => code === "invalidRoute")).toBe(true);
    expect(result.errors.some(({ code }) => code === "furnitureOverlap")).toBe(false);
  });

  it("resolves table, watering, and bed destinations through furniture action IDs", () => {
    const wateringRoute = resolveSceneRoute("wateringPlants", DEFAULT_ROOM_LAYOUT);
    const routes = {
      morningTea: resolveSceneRoute("morningTea", DEFAULT_ROOM_LAYOUT)[0],
      watering: [wateringRoute[0], wateringRoute[3]],
      sleeping: resolveSceneRoute("sleeping", DEFAULT_ROOM_LAYOUT)[0],
    };
    expect(routes.morningTea).toMatchObject({ x: 78, y: 273 });
    expect(routes.watering).toMatchObject([
      { x: 40, y: 198, actionScale: 1.18 },
      { x: 136, y: 338 },
    ]);
    expect(wateringRoute.slice(1, 3)).toMatchObject([
      { x: 105, y: 235, depthOffset: 40 },
      { x: 105, y: 279, depthOffset: 40 },
    ]);
    expect(routes.sleeping).toMatchObject({ x: 29, y: 124 });
    expect(resolveSceneInitialDepthY("sleeping", DEFAULT_ROOM_LAYOUT)).toBe(DEFAULT_ROOM_LAYOUT.furniture.bed.footY);
    expect(resolveSceneInitialDepthY("windowNap", DEFAULT_ROOM_LAYOUT)).toBe(178);
  });

  it("moves furniture-dependent destinations with an adopted layout", () => {
    const movedAnchors = createFurnitureAnchors({ diningSet: { x: 47, y: 264 } });
    const candidate = tryCreateRoomLayout(movedAnchors);
    expect(candidate.accepted).toBe(true);
    if (!candidate.accepted) throw new Error(candidate.errors.map(({ message }) => message).join(", "));

    expect(resolveFurnitureActionPoint(candidate.layout.furniture, "diningSet", "morningTea")).toEqual({
      x: 73,
      y: 273,
    });
    expect(resolveSceneRoute("morningTea", candidate.layout)[0]).toMatchObject({ x: 73, y: 273 });
  });

  it("marks every scene without walking segments explicitly as nonWalking", () => {
    const expected = [
      "sleeping",
      "sleepingWithTatsuo",
      "kickedBlanket",
      "almostAwake",
      "tatsuoWakeUp",
      "brushingMaineCoon",
      "windowNap",
      "nappingOnMaineCoon",
      "simmeringDinner",
      "foldingLaundry",
      "tatsuoTooComfortable",
      "packingTomorrow",
      "readingComics",
      "mimizouVisit",
    ];
    expect(
      Object.entries(SCENE_ROUTES)
        .filter(([, route]) => route.movement === "nonWalking")
        .map(([sceneId]) => sceneId),
    ).toEqual(expected);
  });

  it("uses footY first and a stable tie-break second for depth", () => {
    expect(getDepthZIndex(200, 3)).toBeLessThan(getDepthZIndex(201, 0));
    expect(getDepthZIndex(200, 3)).toBeLessThan(getDepthZIndex(200, 4));
  });

  it.each(["watchingStars", "morningStretch", "mimizouFarewell"] as const)(
    "places the %s action pose in front of the bed and window",
    (sceneId) => {
      expect(resolveSceneRoute(sceneId, DEFAULT_ROOM_LAYOUT)[0]).toMatchObject({ depthOffset: 40 });
    },
  );

  it("folds laundry without walking in the open space near the bed", () => {
    expect(resolveSceneRoute("foldingLaundry", DEFAULT_ROOM_LAYOUT)).toEqual([
      expect.objectContaining({ x: 98, y: 176, action: true }),
    ]);
  });

  it("places both Koon scenes on the front rug without walking", () => {
    expect(resolveSceneRoute("brushingMaineCoon", DEFAULT_ROOM_LAYOUT)).toEqual([
      expect.objectContaining({ x: 70, y: 320, action: true }),
    ]);
    expect(resolveSceneRoute("nappingOnMaineCoon", DEFAULT_ROOM_LAYOUT)).toEqual([
      expect.objectContaining({ x: 98, y: 320 }),
    ]);
  });

  it("shows Etokichi worrying beside Tatsuo's occupied sofa without walking", () => {
    expect(resolveSceneRoute("tatsuoTooComfortable", DEFAULT_ROOM_LAYOUT)).toEqual([
      expect.objectContaining({ x: 76, y: 271, action: true }),
    ]);
  });

  it("simmers dinner from the moved dining stool without walking", () => {
    expect(resolveSceneRoute("simmeringDinner", DEFAULT_ROOM_LAYOUT)).toEqual([
      expect.objectContaining({ x: 158, y: 266, action: true, depthOffset: 33 }),
    ]);
  });

  it("keeps the seated comic-reading pose in front of the sofa", () => {
    expect(resolveSceneRoute("readingComics", DEFAULT_ROOM_LAYOUT)[0]).toMatchObject({
      x: 31,
      y: 318,
      action: true,
      depthOffset: 30,
    });
  });

  it("prepares tomorrow's luggage in front of the bookshelf beside the entrance", () => {
    expect(resolveSceneRoute("packingTomorrow", DEFAULT_ROOM_LAYOUT)[0]).toMatchObject({
      x: 113,
      y: 145,
      action: true,
    });
  });
});
