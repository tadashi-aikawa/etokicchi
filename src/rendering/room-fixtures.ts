import type { Aabb, Point } from "./room-furniture.ts";

export type FixtureId = "kitchenUnit";
export type FixtureHotspotId = "fridge" | "sink" | "stove";

export interface FixtureHotspot {
  id: FixtureHotspotId;
  displayName: string;
  observation: string;
  area: Aabb;
}

export interface FixtureDefinition {
  id: FixtureId;
  baseAssetName: string;
  displayName: string;
  observation: string;
  anchor: Point;
  displayHeight: number;
  // 素材のピクセル寸法のちょうど半分にする。拡大率が正確に0.5になる。
  displayWidth: number;
  occupancy: Aabb;
  hotspots: readonly FixtureHotspot[];
  actionPoints: Readonly<Record<string, Point>>;
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
        // 素材(192x600)の実測: 冷蔵庫は texY 0..148。displayHeight 130 換算で上端から32px分。
        area: { x: -44, y: -130, width: 23, height: 32 },
      },
      {
        id: "sink",
        displayName: "流し台",
        observation: "流し台には、今日使った道具がきれいに並んでいる。",
        // 実測: 天板の上端 texY 148 からコンロ天板の上端 texY 308 まで。
        area: { x: -34, y: -98, width: 23, height: 35 },
      },
      {
        id: "stove",
        displayName: "コンロ",
        observation: "コンロは、次の料理を始めるのを静かに待っている。",
        // 実測: コンロ天板 texY 308..377 と、その下の天板前縁 texY 377..408 まで。
        area: { x: -29, y: -63, width: 24, height: 21 },
      },
    ],
    actionPoints: {
      fridgeFront: { x: -83, y: -82 },
      stoveFront: { x: -83, y: -22 },
      stoveStool: { x: -44, y: -19 },
      sinkFront: { x: -83, y: -46 },
      // 歩いてコンロへ寄る経路用。占有領域(x -47..-7)の左外側ぎりぎりに置き、
      // 通路線のstoveFrontより天板寄りへ立たせる。stoveStoolは占有領域の内側なので
      // 静止シーンでしか使えない。
      stoveSide: { x: -53, y: -27 },
    },
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
