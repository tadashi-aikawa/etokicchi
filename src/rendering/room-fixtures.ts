import type { Aabb, Point } from "./room-furniture.ts";

export type FixtureId = "kitchenUnit";
export type FixturePartId = "fridgeDoor" | "stove";
export type FixturePartLayer = "fixture" | "floorDepth";

export interface FixturePartStateDefinition {
  id: string;
  assetName?: string;
}

export interface FixturePartDefinition {
  id: FixturePartId;
  defaultStateId: string;
  offset: Point;
  displayHeight: number;
  layer: FixturePartLayer;
  depthOffset?: number;
  states: readonly FixturePartStateDefinition[];
}

export interface FixtureHotspot {
  id: string;
  displayName: string;
  observation: string;
  area: Aabb;
  partId?: FixturePartId;
}

export interface FixtureDefinition {
  id: FixtureId;
  baseAssetName: string;
  displayName: string;
  observation: string;
  anchor: Point;
  displayHeight: number;
  displayWidth?: number;
  occupancy: Aabb;
  hotspots: readonly FixtureHotspot[];
  actionPoints: Readonly<Record<string, Point>>;
  parts: readonly FixturePartDefinition[];
}

export interface PlacedFixture extends Omit<FixtureDefinition, "anchor" | "occupancy" | "hotspots" | "actionPoints"> {
  anchor: Point;
  occupancy: Aabb;
  hotspots: readonly FixtureHotspot[];
  actionPoints: Readonly<Record<string, Point>>;
}

export type FixtureLayout = Readonly<Record<FixtureId, PlacedFixture>>;

export const FIXTURE_DEFINITIONS = [
  {
    id: "kitchenUnit",
    baseAssetName: "fixture-kitchen-wall-unit-pixel.webp",
    displayName: "キッチン",
    observation: "キッチンには、冷蔵庫と今日使う道具が一続きに並んでいる。",
    anchor: { x: 202, y: 285 },
    displayHeight: 130,
    displayWidth: 44,
    occupancy: { x: -47, y: -20, width: 40, height: 20 },
    hotspots: [
      {
        id: "fridge",
        displayName: "冷蔵庫",
        observation: "冷蔵庫には、エトキチが選んだ小さな食材がきれいに並んでいる。",
        area: { x: -44, y: -130, width: 23, height: 60 },
        partId: "fridgeDoor",
      },
      {
        id: "sink",
        displayName: "流し台",
        observation: "流し台には、今日使った道具がきれいに並んでいる。",
        area: { x: -34, y: -71, width: 23, height: 31 },
      },
      {
        id: "stove",
        displayName: "コンロ",
        observation: "コンロは、次の料理を始めるのを静かに待っている。",
        area: { x: -29, y: -42, width: 24, height: 28 },
        partId: "stove",
      },
    ],
    actionPoints: {
      fridgeFront: { x: -83, y: -82 },
      stoveFront: { x: -83, y: -22 },
      stoveStool: { x: -44, y: -19 },
      sinkFront: { x: -83, y: -46 },
    },
    parts: [
      {
        id: "fridgeDoor",
        defaultStateId: "closed",
        offset: { x: -6, y: -108 },
        displayHeight: 58,
        layer: "floorDepth",
        depthOffset: 10,
        states: [
          { id: "closed" },
          {
            id: "open",
            assetName: "fixture-kitchen-unit-fridge-door-open-pixel.webp",
          },
        ],
      },
      {
        id: "stove",
        defaultStateId: "off",
        offset: { x: 0, y: -32 },
        displayHeight: 24,
        layer: "fixture",
        states: [{ id: "off" }, { id: "on", assetName: "fixture-kitchen-unit-stove-on-pixel.webp" }],
      },
    ],
  },
] as const satisfies readonly FixtureDefinition[];

const fixtureDefinitionById = new Map<FixtureId, FixtureDefinition>(
  FIXTURE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

function translateAabb(aabb: Aabb, dx: number, dy: number): Aabb {
  return {
    x: aabb.x + dx,
    y: aabb.y + dy,
    width: aabb.width,
    height: aabb.height,
  };
}

export function getFixtureDefinition(id: FixtureId): FixtureDefinition {
  const definition = fixtureDefinitionById.get(id);
  if (!definition) throw new Error(`Unknown fixture: ${id}`);
  return definition;
}

export function getFixturePartDefinition(fixture: FixtureDefinition, partId: FixturePartId): FixturePartDefinition {
  const part = fixture.parts.find(({ id }) => id === partId);
  if (!part) throw new Error(`Unknown fixture part: ${fixture.id}.${partId}`);
  return part;
}

export function placeFixture(definition: FixtureDefinition, anchor: Point = definition.anchor): PlacedFixture {
  const dx = anchor.x;
  const dy = anchor.y;
  return {
    ...definition,
    anchor: { ...anchor },
    occupancy: translateAabb(definition.occupancy, dx, dy),
    hotspots: definition.hotspots.map((hotspot) => ({
      ...hotspot,
      area: translateAabb(hotspot.area, dx, dy),
    })),
    actionPoints: Object.fromEntries(
      Object.entries(definition.actionPoints).map(([id, point]) => [id, translatePoint(point, dx, dy)]),
    ),
  };
}

export function resolveFixtureLayout(): FixtureLayout {
  return Object.fromEntries(
    FIXTURE_DEFINITIONS.map((definition) => [definition.id, placeFixture(definition)]),
  ) as Record<FixtureId, PlacedFixture>;
}

export const DEFAULT_FIXTURE_LAYOUT = resolveFixtureLayout();

export function resolveFixtureActionPoint(layout: FixtureLayout, fixtureId: FixtureId, actionPointId: string): Point {
  const point = layout[fixtureId].actionPoints[actionPointId];
  if (!point) throw new Error(`Unknown fixture action point: ${fixtureId}.${actionPointId}`);
  return point;
}

export function resolveFixturePartState(
  fixtureId: FixtureId,
  partId: FixturePartId,
  stateId: string,
): FixturePartStateDefinition {
  const fixture = getFixtureDefinition(fixtureId);
  const part = getFixturePartDefinition(fixture, partId);
  const state = part.states.find(({ id }) => id === stateId);
  if (!state) throw new Error(`Unknown fixture part state: ${fixtureId}.${partId}.${stateId}`);
  return state;
}
