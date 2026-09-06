import { SCENE_FURNITURE_ANCHORS, SCENE_ROUTES } from "../content/scene-presentations.ts";
import type { SceneId } from "../game/types.ts";
import type { ResolvedWaypoint } from "./route-definitions.ts";
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

// 経路と家具の置き直しの定義はシーン定義テーブルが持つ。ここは解決と検証だけを担う。
export { SCENE_FURNITURE_ANCHORS, SCENE_ROUTES };
export type {
  FixtureDestination,
  FurnitureDestination,
  PointDestination,
  ResolvedWaypoint,
  RouteDestination,
  RouteWaypoint,
  SceneRoute,
} from "./route-definitions.ts";

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

export function resolveSceneLayout(sceneId: SceneId, layout: RoomLayout): RoomLayout {
  const overrides = SCENE_FURNITURE_ANCHORS[sceneId];
  if (!overrides) return layout;
  const anchors = { ...layout.anchors, ...overrides };
  return { anchors, furniture: resolveFurnitureLayout(anchors), fixtures: layout.fixtures };
}

export function resolveSceneRoute(sceneId: SceneId, layout: RoomLayout): readonly ResolvedWaypoint[] {
  const sceneLayout = resolveSceneLayout(sceneId, layout);
  return SCENE_ROUTES[sceneId].waypoints.map(({ destination, ...waypoint }) => {
    const resolved =
      destination.type === "point"
        ? destination
        : destination.type === "furnitureAction"
          ? resolveFurnitureActionPoint(sceneLayout.furniture, destination.furnitureId, destination.actionPointId)
          : resolveFixtureActionPoint(sceneLayout.fixtures, destination.fixtureId, destination.actionPointId);
    return { ...waypoint, x: resolved.x, y: resolved.y };
  });
}

export function resolveSceneInitialDepthY(sceneId: SceneId, layout: RoomLayout): number {
  const firstDestination = SCENE_ROUTES[sceneId].waypoints[0]?.destination;
  if (!firstDestination) return 154;
  const sceneLayout = resolveSceneLayout(sceneId, layout);
  // 家具上で静止するキャラクターは、行動地点ではなく家具の足元を基準に重ねる。
  // これによりベッドなどのSprite内で、キャラクターが家具の背面へ隠れない。
  if (firstDestination.type === "furnitureAction") return sceneLayout.furniture[firstDestination.furnitureId].footY;
  if (firstDestination.type === "fixtureAction") {
    return resolveFixtureActionPoint(sceneLayout.fixtures, firstDestination.fixtureId, firstDestination.actionPointId)
      .y;
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
  const sceneLayout = resolveSceneLayout(sceneId, layout);
  const route = resolveSceneRoute(sceneId, sceneLayout);
  const errors: LayoutValidationError[] = [];

  for (let index = 0; index < route.length; index += 1) {
    const from = route[index];
    const to = route[(index + 1) % route.length];
    if (!from || !to || isMovementSegmentValid(from, to, sceneLayout)) continue;
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

  errors.push(...validateSceneFurnitureAnchors(layout));

  for (const sceneId of Object.keys(SCENE_ROUTES) as SceneId[]) {
    errors.push(...validateSceneRoute(sceneId, layout));
  }
  return errors;
}

function isOutsideRoom(occupancy: Aabb): boolean {
  return (
    occupancy.x < ROOM_BOUNDS.x ||
    occupancy.y < ROOM_BOUNDS.y ||
    occupancy.x + occupancy.width > ROOM_BOUNDS.x + ROOM_BOUNDS.width ||
    occupancy.y + occupancy.height > ROOM_BOUNDS.y + ROOM_BOUNDS.height
  );
}

export function validateSceneFurnitureAnchors(layout: RoomLayout): readonly LayoutValidationError[] {
  const errors: LayoutValidationError[] = [];
  for (const sceneId of Object.keys(SCENE_FURNITURE_ANCHORS) as SceneId[]) {
    const sceneLayout = resolveSceneLayout(sceneId, layout);
    for (const movedId of Object.keys(SCENE_FURNITURE_ANCHORS[sceneId] ?? {}) as FurnitureId[]) {
      const moved = sceneLayout.furniture[movedId];
      if (isOutsideRoom(moved.occupancy)) {
        errors.push({
          code: "outsideRoom",
          sceneId,
          furnitureId: movedId,
          message: `${sceneId}で置き直した${movedId}の占有領域が部屋の外へ出ています`,
        });
      }
      for (const { id } of FURNITURE_DEFINITIONS) {
        if (id === movedId || !aabbsCollide(moved.occupancy, sceneLayout.furniture[id].occupancy)) continue;
        errors.push({
          code: "furnitureOverlap",
          sceneId,
          furnitureId: movedId,
          message: `${sceneId}で置き直した${movedId}と${id}の占有領域が重なっています`,
        });
      }
      for (const { id } of FIXTURE_DEFINITIONS) {
        if (!aabbsCollide(moved.occupancy, sceneLayout.fixtures[id].occupancy)) continue;
        errors.push({
          code: "fixtureOverlap",
          sceneId,
          furnitureId: movedId,
          fixtureId: id,
          message: `${sceneId}で置き直した${movedId}と${id}の占有領域が重なっています`,
        });
      }
    }
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
