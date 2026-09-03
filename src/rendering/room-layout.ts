import type { SceneId } from "../game/types.ts";
import {
  createFurnitureAnchors,
  FURNITURE_DEFINITIONS,
  type Aabb,
  type FurnitureAnchors,
  type FurnitureId,
  type FurnitureLayout,
  type Point,
  resolveFurnitureActionPoint,
  resolveFurnitureLayout,
} from "./room-furniture.ts";
import {
  DEFAULT_FIXTURE_LAYOUT,
  FIXTURE_DEFINITIONS,
  type FixtureId,
  type FixtureLayout,
  resolveFixtureActionPoint,
} from "./room-fixtures.ts";

export const ROOM_BOUNDS: Aabb = { x: 0, y: 80, width: 195, height: 267 };
export const CHARACTER_FOOT_RADIUS = 5;

export function getDepthZIndex(footY: number, tieBreak: number): number {
  return Math.round(footY * 100) + tieBreak;
}

export interface PointDestination extends Point {
  type: "point";
}

export interface FurnitureDestination {
  type: "furnitureAction";
  furnitureId: FurnitureId;
  actionPointId: string;
}

export interface FixtureDestination {
  type: "fixtureAction";
  fixtureId: FixtureId;
  actionPointId: string;
}

export type RouteDestination = PointDestination | FurnitureDestination | FixtureDestination;

export interface RouteWaypoint {
  destination: RouteDestination;
  pauseMs: number;
  action?: boolean;
  actionFacing?: "left" | "right";
  actionVariant?: number;
  actionOffsetY?: number;
  actionScale?: number;
  depthOffset?: number;
}

export interface SceneRoute {
  movement: "walking" | "nonWalking";
  waypoints: readonly RouteWaypoint[];
}

export interface ResolvedWaypoint extends Point {
  pauseMs: number;
  action?: boolean;
  actionFacing?: "left" | "right";
  actionVariant?: number;
  actionOffsetY?: number;
  actionScale?: number;
  depthOffset?: number;
}

const point = (x: number, y: number): PointDestination => ({ type: "point", x, y });
const furnitureAction = (furnitureId: FurnitureId, actionPointId: string): FurnitureDestination => ({
  type: "furnitureAction",
  furnitureId,
  actionPointId,
});
const fixtureAction = (fixtureId: FixtureId, actionPointId: string): FixtureDestination => ({
  type: "fixtureAction",
  fixtureId,
  actionPointId,
});

export const SCENE_ROUTES: Readonly<Record<SceneId, SceneRoute>> = {
  sleeping: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bed", "sleep"), pauseMs: 5000 }],
  },
  sleepingWithTatsuo: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bed", "sleepTogether"), pauseMs: 5000 }],
  },
  kickedBlanket: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bed", "kickedBlanket"), pauseMs: 5000 }],
  },
  watchingStars: {
    movement: "walking",
    waypoints: [
      { destination: point(42, 128), pauseMs: 4800, action: true, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(83, 184), pauseMs: 700 },
      { destination: point(68, 211), pauseMs: 650 },
      { destination: point(103, 238), pauseMs: 750 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
    ],
  },
  almostAwake: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bed", "sleep"), pauseMs: 5000 }],
  },
  morningStretch: {
    movement: "walking",
    waypoints: [
      { destination: point(42, 128), pauseMs: 4600, action: true, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(88, 184), pauseMs: 700 },
      { destination: point(102, 226), pauseMs: 700 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
    ],
  },
  planningDay: {
    movement: "walking",
    waypoints: [
      { destination: point(99, 292), pauseMs: 5200, action: true },
      { destination: point(112, 223), pauseMs: 750 },
      { destination: point(111, 190), pauseMs: 700 },
    ],
  },
  tatsuoWakeUp: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bed", "sleepTogether"), pauseMs: 5000 }],
  },
  mimizouFarewell: {
    movement: "walking",
    waypoints: [
      { destination: point(42, 128), pauseMs: 5200, action: true, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(88, 184), pauseMs: 800 },
      { destination: point(107, 224), pauseMs: 700 },
      { destination: point(44, 174), pauseMs: 0, depthOffset: 40 },
      { destination: point(44, 145), pauseMs: 0, depthOffset: 40 },
    ],
  },
  tooMuchBreakfast: {
    movement: "walking",
    waypoints: [
      { destination: point(103, 193), pauseMs: 1100 },
      { destination: fixtureAction("kitchenUnit", "fridgeFront"), pauseMs: 3000, action: true },
      { destination: point(98, 225), pauseMs: 1500 },
    ],
  },
  overslept: {
    movement: "walking",
    waypoints: [
      { destination: point(96, 220), pauseMs: 1800, action: true },
      { destination: point(123, 151), pauseMs: 650 },
      { destination: point(64, 193), pauseMs: 500 },
      { destination: point(116, 244), pauseMs: 550 },
    ],
  },
  morningTea: {
    movement: "walking",
    waypoints: [
      { destination: furnitureAction("diningSet", "morningTea"), pauseMs: 6800, action: true },
      { destination: point(105, 273), pauseMs: 0 },
      { destination: point(105, 220), pauseMs: 650 },
      { destination: point(105, 215), pauseMs: 900 },
      { destination: point(105, 252), pauseMs: 650 },
    ],
  },
  brushingMaineCoon: {
    movement: "nonWalking",
    waypoints: [{ destination: point(98, 320), pauseMs: 5000, action: true }],
  },
  foundOldToy: {
    movement: "walking",
    waypoints: [
      { destination: point(110, 224), pauseMs: 3000, action: true },
      { destination: point(110, 260), pauseMs: 1300 },
      { destination: point(111, 194), pauseMs: 1100 },
    ],
  },
  windowNap: {
    movement: "nonWalking",
    waypoints: [{ destination: point(72, 178), pauseMs: 5000 }],
  },
  nappingOnMaineCoon: {
    movement: "nonWalking",
    waypoints: [{ destination: point(98, 320), pauseMs: 5000 }],
  },
  wateringPlants: {
    movement: "walking",
    waypoints: [
      {
        destination: furnitureAction("diningSet", "watering"),
        pauseMs: 2700,
        action: true,
        actionVariant: 1,
        actionOffsetY: 14,
        actionScale: 1.18,
      },
      { destination: point(105, 235), pauseMs: 0, depthOffset: 40 },
      { destination: point(105, 279), pauseMs: 0, depthOffset: 40 },
      {
        destination: furnitureAction("floorPlant", "watering"),
        pauseMs: 2700,
        action: true,
        actionFacing: "right",
      },
      { destination: point(104, 198), pauseMs: 650 },
    ],
  },
  muddyReturn: {
    movement: "walking",
    waypoints: [
      { destination: point(138, 149), pauseMs: 3000, action: true },
      { destination: point(106, 205), pauseMs: 1200 },
      { destination: point(126, 174), pauseMs: 900 },
    ],
  },
  simmeringDinner: {
    movement: "nonWalking",
    waypoints: [
      {
        destination: fixtureAction("kitchenUnit", "stoveStool"),
        pauseMs: 5000,
        action: true,
        depthOffset: 33,
      },
    ],
  },
  foldingLaundry: {
    movement: "nonWalking",
    waypoints: [{ destination: point(98, 176), pauseMs: 5000, action: true }],
  },
  tatsuoTooComfortable: {
    movement: "nonWalking",
    waypoints: [{ destination: point(76, 271), pauseMs: 5000, action: true }],
  },
  packingTomorrow: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("bookshelf", "packing"), pauseMs: 5000, action: true }],
  },
  littleNightSnack: {
    movement: "walking",
    waypoints: [
      { destination: fixtureAction("kitchenUnit", "fridgeFront"), pauseMs: 5000, action: true },
      { destination: point(105, 183), pauseMs: 0 },
      { destination: point(126, 174), pauseMs: 600 },
      { destination: point(105, 153), pauseMs: 750 },
      { destination: point(70, 174), pauseMs: 850 },
      { destination: point(91, 205), pauseMs: 600 },
      { destination: point(117, 244), pauseMs: 800 },
      { destination: point(137, 226), pauseMs: 550 },
    ],
  },
  readingComics: {
    movement: "nonWalking",
    waypoints: [{ destination: furnitureAction("sofa", "sit"), pauseMs: 5000, action: true, depthOffset: 30 }],
  },
  mimizouVisit: {
    movement: "nonWalking",
    waypoints: [{ destination: point(60, 140), pauseMs: 5000, action: true }],
  },
};

export const WALKABLE_BOUNDS = insetAabb(ROOM_BOUNDS, CHARACTER_FOOT_RADIUS);

export interface RoomLayout {
  anchors: FurnitureAnchors;
  furniture: FurnitureLayout;
  fixtures: FixtureLayout;
}

export interface LayoutValidationError {
  code: "invalidDefinition" | "outsideRoom" | "furnitureOverlap" | "fixtureOverlap" | "invalidRoute";
  message: string;
  furnitureId?: FurnitureId;
  fixtureId?: FixtureId;
  sceneId?: SceneId;
}

export interface AcceptedRoomLayout {
  accepted: true;
  layout: RoomLayout;
}

export interface RejectedRoomLayout {
  accepted: false;
  layout?: RoomLayout;
  errors: readonly LayoutValidationError[];
}

export type RoomLayoutAdoption = AcceptedRoomLayout | RejectedRoomLayout;

export function insetAabb(aabb: Aabb, amount: number): Aabb {
  return {
    x: aabb.x + amount,
    y: aabb.y + amount,
    width: aabb.width - amount * 2,
    height: aabb.height - amount * 2,
  };
}

export function expandAabb(aabb: Aabb, amount: number): Aabb {
  return {
    x: aabb.x - amount,
    y: aabb.y - amount,
    width: aabb.width + amount * 2,
    height: aabb.height + amount * 2,
  };
}

export function containsPoint(aabb: Aabb, candidate: Point): boolean {
  return (
    candidate.x >= aabb.x &&
    candidate.x <= aabb.x + aabb.width &&
    candidate.y >= aabb.y &&
    candidate.y <= aabb.y + aabb.height
  );
}

export function aabbsCollide(first: Aabb, second: Aabb): boolean {
  return !(
    first.x + first.width < second.x ||
    second.x + second.width < first.x ||
    first.y + first.height < second.y ||
    second.y + second.height < first.y
  );
}

export function segmentIntersectsAabb(from: Point, to: Point, aabb: Aabb): boolean {
  let minimum = 0;
  let maximum = 1;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const clip = (origin: number, delta: number, lower: number, upper: number): boolean => {
    if (delta === 0) return origin >= lower && origin <= upper;
    const first = (lower - origin) / delta;
    const second = (upper - origin) / delta;
    const entry = Math.min(first, second);
    const exit = Math.max(first, second);
    minimum = Math.max(minimum, entry);
    maximum = Math.min(maximum, exit);
    return minimum <= maximum;
  };

  return clip(from.x, dx, aabb.x, aabb.x + aabb.width) && clip(from.y, dy, aabb.y, aabb.y + aabb.height);
}

export function resolveSceneRoute(sceneId: SceneId, layout: RoomLayout): readonly ResolvedWaypoint[] {
  return SCENE_ROUTES[sceneId].waypoints.map(({ destination, ...waypoint }) => {
    const resolved =
      destination.type === "point"
        ? destination
        : destination.type === "furnitureAction"
          ? resolveFurnitureActionPoint(layout.furniture, destination.furnitureId, destination.actionPointId)
          : resolveFixtureActionPoint(layout.fixtures, destination.fixtureId, destination.actionPointId);
    return { ...waypoint, x: resolved.x, y: resolved.y };
  });
}

export function resolveSceneInitialDepthY(sceneId: SceneId, layout: RoomLayout): number {
  const firstDestination = SCENE_ROUTES[sceneId].waypoints[0]?.destination;
  if (!firstDestination) return 154;
  // 家具上で静止するキャラクターは、行動地点ではなく家具の足元を基準に重ねる。
  // これによりベッドなどのSprite内で、キャラクターが家具の背面へ隠れない。
  if (firstDestination.type === "furnitureAction") return layout.furniture[firstDestination.furnitureId].footY;
  if (firstDestination.type === "fixtureAction") {
    return resolveFixtureActionPoint(layout.fixtures, firstDestination.fixtureId, firstDestination.actionPointId).y;
  }
  return firstDestination.y;
}

export function isMovementSegmentValid(from: Point, to: Point, layout: RoomLayout): boolean {
  if (!containsPoint(WALKABLE_BOUNDS, from) || !containsPoint(WALKABLE_BOUNDS, to)) return false;
  const avoidsFurniture = FURNITURE_DEFINITIONS.every(
    ({ id }) => !segmentIntersectsAabb(from, to, expandAabb(layout.furniture[id].occupancy, CHARACTER_FOOT_RADIUS)),
  );
  return (
    avoidsFurniture &&
    FIXTURE_DEFINITIONS.every(
      ({ id }) => !segmentIntersectsAabb(from, to, expandAabb(layout.fixtures[id].occupancy, CHARACTER_FOOT_RADIUS)),
    )
  );
}

export function validateSceneRoute(sceneId: SceneId, layout: RoomLayout): readonly LayoutValidationError[] {
  const routeDefinition = SCENE_ROUTES[sceneId];
  if (routeDefinition.movement === "nonWalking") return [];
  const route = resolveSceneRoute(sceneId, layout);
  const errors: LayoutValidationError[] = [];

  for (let index = 0; index < route.length; index += 1) {
    const from = route[index];
    const to = route[(index + 1) % route.length];
    if (!from || !to || isMovementSegmentValid(from, to, layout)) continue;
    errors.push({
      code: "invalidRoute",
      sceneId,
      message: `${sceneId}の経路区間${index}が歩行可能範囲または家具と衝突します`,
    });
  }
  return errors;
}

export function validateRoomLayout(layout: RoomLayout): readonly LayoutValidationError[] {
  const errors: LayoutValidationError[] = [];
  const ids = new Set<FurnitureId>();

  for (const definition of FURNITURE_DEFINITIONS) {
    if (
      ids.has(definition.id) ||
      definition.displayHeight <= 0 ||
      definition.occupancy.width <= 0 ||
      definition.occupancy.height <= 0
    ) {
      errors.push({
        code: "invalidDefinition",
        furnitureId: definition.id,
        message: `${definition.id}の家具定義が不正です`,
      });
    }
    ids.add(definition.id);
    const occupancy = layout.furniture[definition.id].occupancy;
    if (
      occupancy.x < ROOM_BOUNDS.x ||
      occupancy.y < ROOM_BOUNDS.y ||
      occupancy.x + occupancy.width > ROOM_BOUNDS.x + ROOM_BOUNDS.width ||
      occupancy.y + occupancy.height > ROOM_BOUNDS.y + ROOM_BOUNDS.height
    ) {
      errors.push({
        code: "outsideRoom",
        furnitureId: definition.id,
        message: `${definition.id}の占有領域が部屋の外へ出ています`,
      });
    }
  }

  for (let firstIndex = 0; firstIndex < FURNITURE_DEFINITIONS.length; firstIndex += 1) {
    const first = FURNITURE_DEFINITIONS[firstIndex];
    if (!first) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < FURNITURE_DEFINITIONS.length; secondIndex += 1) {
      const second = FURNITURE_DEFINITIONS[secondIndex];
      if (!second || !aabbsCollide(layout.furniture[first.id].occupancy, layout.furniture[second.id].occupancy))
        continue;
      errors.push({
        code: "furnitureOverlap",
        furnitureId: first.id,
        message: `${first.id}と${second.id}の占有領域が重なっています`,
      });
    }
  }

  for (const definition of FIXTURE_DEFINITIONS) {
    const occupancy = layout.fixtures[definition.id].occupancy;
    if (
      occupancy.x < ROOM_BOUNDS.x ||
      occupancy.y < ROOM_BOUNDS.y ||
      occupancy.x + occupancy.width > ROOM_BOUNDS.x + ROOM_BOUNDS.width ||
      occupancy.y + occupancy.height > ROOM_BOUNDS.y + ROOM_BOUNDS.height
    ) {
      errors.push({
        code: "outsideRoom",
        fixtureId: definition.id,
        message: `${definition.id}の占有領域が部屋の外へ出ています`,
      });
    }
    for (const furniture of FURNITURE_DEFINITIONS) {
      if (!aabbsCollide(occupancy, layout.furniture[furniture.id].occupancy)) continue;
      errors.push({
        code: "fixtureOverlap",
        furnitureId: furniture.id,
        fixtureId: definition.id,
        message: `${definition.id}と${furniture.id}の占有領域が重なっています`,
      });
    }
  }

  for (const sceneId of Object.keys(SCENE_ROUTES) as SceneId[]) {
    errors.push(...validateSceneRoute(sceneId, layout));
  }
  return errors;
}

export function tryCreateRoomLayout(anchors: FurnitureAnchors): RoomLayoutAdoption {
  const layout = { anchors, furniture: resolveFurnitureLayout(anchors), fixtures: DEFAULT_FIXTURE_LAYOUT };
  const errors = validateRoomLayout(layout);
  return errors.length === 0 ? { accepted: true, layout } : { accepted: false, errors };
}

export function tryAdoptFurnitureAnchors(
  current: RoomLayout,
  candidateAnchors: FurnitureAnchors,
): AcceptedRoomLayout | (RejectedRoomLayout & { layout: RoomLayout }) {
  const candidate = tryCreateRoomLayout(candidateAnchors);
  return candidate.accepted ? candidate : { ...candidate, layout: current };
}

const defaultLayoutResult = tryCreateRoomLayout(createFurnitureAnchors());
if (!defaultLayoutResult.accepted) {
  throw new Error(`初期家具配置が不正です: ${defaultLayoutResult.errors.map(({ message }) => message).join("、")}`);
}

export const DEFAULT_ROOM_LAYOUT = defaultLayoutResult.layout;
