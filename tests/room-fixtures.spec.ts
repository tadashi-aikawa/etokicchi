import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXTURE_LAYOUT,
  FIXTURE_DEFINITIONS,
  getFixtureDefinition,
  getFixturePartDefinition,
  placeFixture,
  resolveFixtureActionPoint,
  resolveFixtureLayout,
  resolveFixturePartState,
} from "../src/rendering/room-fixtures.ts";

describe("room fixtures", () => {
  it("defines the integrated kitchen as a fixed fixture with independent hotspots", () => {
    expect(FIXTURE_DEFINITIONS).toHaveLength(1);
    expect(getFixtureDefinition("kitchenUnit")).toMatchObject({
      baseAssetName: "fixture-kitchen-wall-unit-pixel.webp",
      anchor: { x: 202, y: 285 },
      displayWidth: 44,
      displayHeight: 130,
      hotspots: [{ id: "fridge", partId: "fridgeDoor" }, { id: "sink" }, { id: "stove", partId: "stove" }],
    });
  });

  it("translates occupancy, hotspots, and physical action points from the fixture anchor", () => {
    const definition = getFixtureDefinition("kitchenUnit");
    const placed = placeFixture(definition, { x: 180, y: 300 });

    expect(placed.anchor).toEqual({ x: 180, y: 300 });
    expect(placed.occupancy).toEqual({ x: 133, y: 280, width: 40, height: 20 });
    expect(placed.hotspots.map(({ id, area }) => ({ id, area }))).toEqual([
      { id: "fridge", area: { x: 136, y: 170, width: 23, height: 60 } },
      { id: "sink", area: { x: 146, y: 229, width: 23, height: 31 } },
      { id: "stove", area: { x: 151, y: 258, width: 24, height: 28 } },
    ]);
    expect(placed.actionPoints).toEqual({
      fridgeFront: { x: 97, y: 218 },
      stoveFront: { x: 97, y: 278 },
      stoveStool: { x: 136, y: 281 },
      sinkFront: { x: 97, y: 254 },
    });
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
  });

  it("keeps replaceable refrigerator and stove parts on their intended layers", () => {
    const fixture = getFixtureDefinition("kitchenUnit");
    expect(getFixturePartDefinition(fixture, "fridgeDoor")).toMatchObject({
      defaultStateId: "closed",
      layer: "floorDepth",
      depthOffset: 10,
      states: [{ id: "closed" }, { id: "open", assetName: "fixture-kitchen-unit-fridge-door-open-pixel.webp" }],
    });
    expect(getFixturePartDefinition(fixture, "stove")).toMatchObject({
      defaultStateId: "off",
      layer: "fixture",
      states: [{ id: "off" }, { id: "on", assetName: "fixture-kitchen-unit-stove-on-pixel.webp" }],
    });
  });

  it("resolves part states and rejects unknown action or state IDs", () => {
    expect(resolveFixturePartState("kitchenUnit", "fridgeDoor", "closed")).toEqual({ id: "closed" });
    expect(resolveFixturePartState("kitchenUnit", "fridgeDoor", "open")).toEqual({
      id: "open",
      assetName: "fixture-kitchen-unit-fridge-door-open-pixel.webp",
    });
    expect(resolveFixturePartState("kitchenUnit", "stove", "on")).toEqual({
      id: "on",
      assetName: "fixture-kitchen-unit-stove-on-pixel.webp",
    });
    expect(() => resolveFixtureActionPoint(DEFAULT_FIXTURE_LAYOUT, "kitchenUnit", "missing")).toThrow(
      "Unknown fixture action point: kitchenUnit.missing",
    );
    expect(() => resolveFixturePartState("kitchenUnit", "stove", "missing")).toThrow(
      "Unknown fixture part state: kitchenUnit.stove.missing",
    );
  });
});
