import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXTURE_LAYOUT,
  FIXTURE_DEFINITIONS,
  getFixtureDefinition,
  placeFixture,
  resolveFixtureActionPoint,
  resolveFixtureLayout,
} from "../src/rendering/room-fixtures.ts";

describe("room fixtures", () => {
  it("defines the integrated kitchen as a fixed fixture with independent hotspots", () => {
    expect(FIXTURE_DEFINITIONS).toHaveLength(1);
    expect(getFixtureDefinition("kitchenUnit")).toMatchObject({
      baseAssetName: "fixture-kitchen-wall-unit-pixel.webp",
      anchor: { x: 202, y: 285 },
      displayWidth: 44,
      displayHeight: 130,
      hotspots: [{ id: "fridge" }, { id: "sink" }, { id: "stove" }],
    });
  });

  it("translates occupancy, hotspots, and physical action points from the fixture anchor", () => {
    const definition = getFixtureDefinition("kitchenUnit");
    const placed = placeFixture(definition, { x: 180, y: 300 });

    expect(placed.anchor).toEqual({ x: 180, y: 300 });
    expect(placed.occupancy).toEqual({ x: 133, y: 280, width: 40, height: 20 });
    expect(placed.hotspots.map(({ id, area }) => ({ id, area }))).toEqual([
      { id: "fridge", area: { x: 136, y: 170, width: 23, height: 32 } },
      { id: "sink", area: { x: 146, y: 202, width: 23, height: 35 } },
      { id: "stove", area: { x: 151, y: 237, width: 24, height: 21 } },
    ]);
    expect(placed.actionPoints).toEqual({
      fridgeFront: { x: 97, y: 218 },
      stoveFront: { x: 97, y: 278 },
      stoveStool: { x: 136, y: 281 },
      sinkFront: { x: 97, y: 254 },
      stoveSide: { x: 127, y: 273 },
    });
  });

  it("stacks the fridge, sink, and stove hotspots seamlessly inside the drawn fixture", () => {
    const { displayHeight, hotspots } = getFixtureDefinition("kitchenUnit");
    const top = -displayHeight;

    // 素材の見た目と判定がずれると、流し台をタップして冷蔵庫の説明が出るような取り違えが起きる。
    expect(hotspots.map(({ id, area }) => ({ id, top: area.y, bottom: area.y + area.height }))).toEqual([
      { id: "fridge", top: -130, bottom: -98 },
      { id: "sink", top: -98, bottom: -63 },
      { id: "stove", top: -63, bottom: -42 },
    ]);
    for (const [index, hotspot] of hotspots.entries()) {
      expect(hotspot.area.y).toBeGreaterThanOrEqual(top);
      expect(hotspot.area.y + hotspot.area.height).toBeLessThanOrEqual(0);
      const previous = hotspots[index - 1];
      if (previous) expect(hotspot.area.y).toBe(previous.area.y + previous.area.height);
    }
  });

  it("builds the default layout and resolves each physical action point", () => {
    expect(resolveFixtureLayout()).toEqual(DEFAULT_FIXTURE_LAYOUT);
    expect(DEFAULT_FIXTURE_LAYOUT.kitchenUnit.occupancy).toEqual({
      x: 155,
      y: 265,
      width: 40,
      height: 20,
    });
    expect(resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "fridgeFront")).toEqual({
      x: 119,
      y: 203,
    });
    expect(resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "sinkFront")).toEqual({
      x: 119,
      y: 239,
    });
    expect(resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "stoveFront")).toEqual({
      x: 119,
      y: 263,
    });
    // 歩行経路から寄れる最寄り。占有領域の左端(155)へキャラクターの足半径5px分だけ余裕を残す。
    expect(resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "stoveSide")).toEqual({
      x: 149,
      y: 258,
    });
  });

  it("rejects unknown action point IDs", () => {
    expect(() => resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "missing")).toThrow(
      "Unknown fixture action point: kitchenUnit.missing",
    );
  });
});
