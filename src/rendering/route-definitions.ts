import type { FurnitureId, Point } from "./room-furniture.ts";
import type { FixtureId } from "./room-fixtures.ts";

// シーンの経路を書くための型とヘルパー。
// シーン定義(content/scene-presentations.ts)と経路解決(room-layout.ts)の両方から読むので、
// 家具・固定設備の型だけに依存させ、import循環が起きないようにしている。

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

export const point = (x: number, y: number): PointDestination => ({ type: "point", x, y });

export const furnitureAction = (furnitureId: FurnitureId, actionPointId: string): FurnitureDestination => ({
  type: "furnitureAction",
  furnitureId,
  actionPointId,
});

export const fixtureAction = (fixtureId: FixtureId, actionPointId: string): FixtureDestination => ({
  type: "fixtureAction",
  fixtureId,
  actionPointId,
});
