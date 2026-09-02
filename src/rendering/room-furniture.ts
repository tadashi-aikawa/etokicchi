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

export type FurnitureId = "bed" | "bookshelf" | "diningSet" | "roundStool" | "floorPlant" | "sofa" | "bedsideTable";

export interface FurnitureDefinition {
  id: FurnitureId;
  assetName: string;
  displayName: string;
  observation: string;
  anchor: Point;
  displayHeight: number;
  displayWidth?: number;
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
    displayWidth: 54,
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
    actionPoints: {
      packing: { x: 10, y: 34 },
    },
  },
  {
    id: "diningSet",
    assetName: "furniture-dining-table-chair-pixel.webp",
    displayName: "食卓",
    observation: "食卓には、今日使ったものがそのまま残っている。",
    anchor: { x: 52, y: 264 },
    displayHeight: 74,
    footY: 0,
    occupancy: { x: -32, y: -17, width: 50, height: 17 },
    clickArea: { x: -39, y: -74, width: 78, height: 74 },
    actionPoints: {
      morningTea: { x: 26, y: 9 },
      watering: { x: -12, y: -66 },
    },
  },
  {
    id: "roundStool",
    assetName: "furniture-round-stool-pixel.webp",
    displayName: "丸椅子",
    observation: "軽い丸椅子は、必要な場所へすぐ運べるようにしてある。",
    anchor: { x: 85, y: 249 },
    displayHeight: 22,
    footY: -10,
    occupancy: { x: -9, y: -5, width: 18, height: 5 },
    clickArea: { x: -10, y: -22, width: 20, height: 22 },
    actionPoints: {
      sit: { x: 0, y: -9 },
    },
  },
  {
    id: "floorPlant",
    assetName: "furniture-floor-plant-pixel.webp",
    displayName: "床の鉢植え",
    observation: "大きな葉が、窓から入る光のほうへゆっくり伸びている。",
    anchor: { x: 160, y: 342 },
    displayHeight: 66,
    footY: 0,
    occupancy: { x: -13, y: -10, width: 26, height: 10 },
    clickArea: { x: -31, y: -66, width: 62, height: 66 },
    actionPoints: {
      watering: { x: -24, y: -4 },
    },
  },
  {
    id: "sofa",
    assetName: "furniture-sofa-right-pixel.webp",
    displayName: "右向きのソファー",
    observation: "ソファーの座面には、メインクーンが丸くなっていた跡が残っている。",
    anchor: { x: 24, y: 329 },
    displayHeight: 62,
    displayWidth: 40,
    footY: 0,
    occupancy: { x: -12, y: -8, width: 24, height: 8 },
    clickArea: { x: -20, y: -62, width: 40, height: 62 },
    actionPoints: {
      sit: { x: 7, y: -22 },
    },
  },
  {
    id: "bedsideTable",
    assetName: "furniture-bedside-table-pixel.webp",
    displayName: "ベッド脇の照明台",
    observation: "照明台の柔らかな明かりが、眠る前の部屋を落ち着かせてくれる。",
    anchor: { x: 61, y: 125 },
    displayHeight: 42,
    footY: 0,
    occupancy: { x: -8, y: -5, width: 16, height: 5 },
    clickArea: { x: -13, y: -42, width: 26, height: 42 },
    actionPoints: {},
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
