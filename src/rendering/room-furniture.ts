export interface Point {
  x: number;
  y: number;
}

export interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FurnitureId = "bed" | "bookshelf" | "diningSet" | "floorPlant" | "fridge" | "lowCabinet" | "sideShelf";

export interface FurnitureDefinition {
  id: FurnitureId;
  assetName: string;
  displayName: string;
  observation: string;
  anchor: Point;
  displayHeight: number;
  footY: number;
  occupancy: Aabb;
  clickArea: Aabb;
  actionPoints: Readonly<Record<string, Point>>;
}

export interface PlacedFurniture extends FurnitureDefinition {
  anchor: Point;
  footY: number;
  occupancy: Aabb;
  clickArea: Aabb;
  actionPoints: Readonly<Record<string, Point>>;
}

export type FurnitureAnchors = Readonly<Record<FurnitureId, Point>>;
export type FurnitureLayout = Readonly<Record<FurnitureId, PlacedFurniture>>;

export const FURNITURE_DEFINITIONS: readonly FurnitureDefinition[] = [
  {
    id: "bed",
    assetName: "furniture-bed-pixel.webp",
    displayName: "ベッド",
    observation: "枕は少しへこんでいて、毎晩ここで眠っていることが分かる。",
    anchor: { x: 28, y: 165 },
    displayHeight: 80,
    footY: 0,
    occupancy: { x: -25, y: -21, width: 31, height: 21 },
    clickArea: { x: -27, y: -80, width: 54, height: 80 },
    actionPoints: {
      sleep: { x: 1, y: -41 },
      sleepTogether: { x: 0, y: -39 },
      kickedBlanket: { x: 3, y: -9 },
    },
  },
  {
    id: "bookshelf",
    assetName: "furniture-bookshelf-pixel.webp",
    displayName: "本棚",
    observation: "棚には、どこで見つけたのか分からない宝物が少しずつ増えている。",
    anchor: { x: 103, y: 111 },
    displayHeight: 67,
    footY: 0,
    occupancy: { x: -16, y: -7, width: 32, height: 7 },
    clickArea: { x: -24, y: -67, width: 48, height: 67 },
    actionPoints: {},
  },
  {
    id: "diningSet",
    assetName: "furniture-dining-set-pixel.webp",
    displayName: "食卓",
    observation: "食卓には、今日使ったものがそのまま残っている。",
    anchor: { x: 46, y: 264 },
    displayHeight: 65,
    footY: 0,
    occupancy: { x: -29, y: -15, width: 45, height: 15 },
    clickArea: { x: -34, y: -65, width: 68, height: 65 },
    actionPoints: {
      morningTea: { x: 22, y: 8 },
      reading: { x: 17, y: -22 },
      watering: { x: -9, y: -59 },
    },
  },
  {
    id: "floorPlant",
    assetName: "furniture-floor-plant-pixel.webp",
    displayName: "床の鉢植え",
    observation: "大きな葉が、窓から入る光のほうへゆっくり伸びている。",
    anchor: { x: 163, y: 320 },
    displayHeight: 50,
    footY: 0,
    occupancy: { x: -10, y: -8, width: 20, height: 8 },
    clickArea: { x: -24, y: -50, width: 48, height: 50 },
    actionPoints: {
      watering: { x: -20, y: 5 },
    },
  },
  {
    id: "fridge",
    assetName: "furniture-fridge-pixel.webp",
    displayName: "冷蔵庫",
    observation: "冷蔵庫には、エトキチが選んだ小さな食材がきれいに並んでいる。",
    anchor: { x: 159, y: 188 },
    displayHeight: 61,
    footY: 0,
    occupancy: { x: -12, y: -7, width: 24, height: 7 },
    clickArea: { x: -19, y: -61, width: 38, height: 61 },
    actionPoints: {
      breakfast: { x: -27, y: 2 },
      simmering: { x: -26, y: 14 },
      nightSnack: { x: -27, y: 14 },
    },
  },
  {
    id: "lowCabinet",
    assetName: "furniture-low-cabinet-pixel.webp",
    displayName: "低い棚",
    observation: "低い棚の上には、小さな鉢と読みかけの本が置かれている。",
    anchor: { x: 14, y: 329 },
    displayHeight: 55,
    footY: 0,
    occupancy: { x: -11, y: -7, width: 22, height: 7 },
    clickArea: { x: -16, y: -55, width: 32, height: 55 },
    actionPoints: {},
  },
  {
    id: "sideShelf",
    assetName: "furniture-side-shelf-pixel.webp",
    displayName: "台所の棚",
    observation: "台所の棚には、エトキチが選んだ小さな食器が並んでいる。",
    anchor: { x: 176, y: 134 },
    displayHeight: 67,
    footY: 0,
    occupancy: { x: -9, y: -6, width: 18, height: 6 },
    clickArea: { x: -18, y: -67, width: 36, height: 67 },
    actionPoints: {
      watering: { x: -21, y: -23 },
    },
  },
] as const;

const furnitureDefinitionById = new Map(FURNITURE_DEFINITIONS.map((definition) => [definition.id, definition]));

function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

function translateAabb(aabb: Aabb, dx: number, dy: number): Aabb {
  return { x: aabb.x + dx, y: aabb.y + dy, width: aabb.width, height: aabb.height };
}

export function getFurnitureDefinition(id: FurnitureId): FurnitureDefinition {
  const definition = furnitureDefinitionById.get(id);
  if (!definition) throw new Error(`Unknown furniture: ${id}`);
  return definition;
}

export function placeFurniture(definition: FurnitureDefinition, anchor: Point = definition.anchor): PlacedFurniture {
  return {
    ...definition,
    anchor: { ...anchor },
    footY: anchor.y + definition.footY,
    occupancy: translateAabb(definition.occupancy, anchor.x, anchor.y),
    clickArea: translateAabb(definition.clickArea, anchor.x, anchor.y),
    actionPoints: Object.fromEntries(
      Object.entries(definition.actionPoints).map(([id, point]) => [id, translatePoint(point, anchor.x, anchor.y)]),
    ),
  };
}

export function createFurnitureAnchors(overrides: Partial<FurnitureAnchors> = {}): FurnitureAnchors {
  return Object.fromEntries(
    FURNITURE_DEFINITIONS.map((definition) => [definition.id, overrides[definition.id] ?? { ...definition.anchor }]),
  ) as Record<FurnitureId, Point>;
}

export function resolveFurnitureLayout(anchors: FurnitureAnchors): FurnitureLayout {
  return Object.fromEntries(
    FURNITURE_DEFINITIONS.map((definition) => [definition.id, placeFurniture(definition, anchors[definition.id])]),
  ) as Record<FurnitureId, PlacedFurniture>;
}

export function resolveFurnitureActionPoint(
  layout: FurnitureLayout,
  furnitureId: FurnitureId,
  actionPointId: string,
): Point {
  const point = layout[furnitureId].actionPoints[actionPointId];
  if (!point) throw new Error(`Unknown action point: ${furnitureId}.${actionPointId}`);
  return point;
}

export function resolveFurnitureSpriteHitArea(definition: FurnitureDefinition, textureHeight: number): Aabb {
  const scale = definition.displayHeight / textureHeight;
  return {
    x: definition.clickArea.x / scale,
    y: definition.clickArea.y / scale,
    width: definition.clickArea.width / scale,
    height: definition.clickArea.height / scale,
  };
}
