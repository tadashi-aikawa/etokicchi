export interface RoomDecoration {
  assetName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface RoomDepthDecoration {
  id: RoomDepthDecorationId;
  assetName: string;
  displayName: string;
  observation: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoomDepthDecorationId = "maineCoon";

interface RoomDepthDecorationOverrideCommon {
  assetName?: string;
  width?: number;
  height?: number;
  observation?: string;
  animation?: {
    columns: number;
    frameDurationsMs: readonly number[];
  };
}

export interface AbsoluteRoomDepthDecorationOverride extends RoomDepthDecorationOverrideCommon {
  type: "absolute";
  x: number;
  y: number;
  depthY?: number;
}

export interface FurnitureRoomDepthDecorationOverride extends RoomDepthDecorationOverrideCommon {
  type: "furniture";
  furnitureId: FurnitureId;
  offset: Point;
  depthOffset?: number;
}

export type RoomDepthDecorationOverride = AbsoluteRoomDepthDecorationOverride | FurnitureRoomDepthDecorationOverride;

export const FLOOR_DECORATIONS: readonly RoomDecoration[] = [
  {
    assetName: "decor-genkan-pixel.webp",
    x: 148,
    y: 107,
    width: 60,
    height: 24,
  },
  {
    assetName: "decor-rug-back-pixel.webp",
    x: 98,
    y: 158,
    width: 64,
    height: 42,
  },
  {
    assetName: "decor-rug-front-pixel.webp",
    x: 96,
    y: 305,
    width: 84,
    height: 82,
  },
];

export const WALL_DECORATIONS: readonly RoomDecoration[] = [];

export const DEPTH_DECORATIONS: readonly RoomDepthDecoration[] = [
  {
    id: "maineCoon",
    assetName: "decor-cat-loaf-pixel.webp",
    displayName: "クーン",
    observation: "クーンちゃんが、ソファー前の絨毯で満足そうに丸くなっている。",
    x: 82,
    y: 322,
    width: 60,
    height: 48,
  },
];

export const ROOM_CLOCK = {
  assetName: "decor-wall-clock-pixel.webp",
  x: 108,
  y: 33,
  size: 19,
} as const;

export interface ClockHandAngles {
  hour: number;
  minute: number;
}

export function resolveClockHandAngles(now: Date): ClockHandAngles {
  const minutes = now.getMinutes();
  return {
    hour: (((now.getHours() % 12) + minutes / 60) * Math.PI) / 6,
    minute: (minutes * Math.PI) / 30,
  };
}
import type { FurnitureId, Point } from "./room-furniture.ts";
