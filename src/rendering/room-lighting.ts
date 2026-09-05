import type { TimeBand } from "../game/types.ts";
import type { FurnitureId, Point } from "./room-furniture.ts";
import type { RoomLayout } from "./room-layout.ts";

export interface CircleLight {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
  color: number;
  alpha: number;
}

/** 家具のアンカーからの相対位置で置く灯り。シーンごとの家具の置き直しへ自動で追随する。 */
export interface AnchoredCircleLight {
  kind: "anchoredCircle";
  anchor: FurnitureId;
  offset: Point;
  radius: number;
  color: number;
  alpha: number;
}

export interface PolygonLight {
  kind: "polygon";
  points: readonly number[];
  color: number;
  alpha: number;
}

export type RoomLight = CircleLight | AnchoredCircleLight | PolygonLight;
/** 絶対座標へ解決済みの灯り。描画側はこちらだけを扱う。 */
export type ResolvedRoomLight = CircleLight | PolygonLight;

const ceilingGlow = (alpha: number): readonly RoomLight[] => [
  { kind: "circle", x: 145, y: 43, radius: 19, color: 0xffd79b, alpha },
  {
    kind: "polygon",
    points: [137, 43, 153, 43, 169, 134, 121, 134],
    color: 0xffcf86,
    alpha: alpha * 0.42,
  },
];

// 灯りは照明台のアンカーの約20px上に載っている。既定配置(61,125)では(61,105)になる。
const bedsideGlow = (radius: number, color: number, alpha: number): AnchoredCircleLight => ({
  kind: "anchoredCircle",
  anchor: "bedsideTable",
  offset: { x: 0, y: -20 },
  radius,
  color,
  alpha,
});

export const TIME_LIGHTS: Readonly<Record<TimeBand, readonly RoomLight[]>> = {
  earlyMorning: [
    ...ceilingGlow(0.08),
    { kind: "polygon", points: [29, 76, 70, 76, 89, 270, 12, 270], color: 0xffb86a, alpha: 0.11 },
  ],
  morning: [
    ...ceilingGlow(0.11),
    { kind: "polygon", points: [25, 76, 73, 76, 101, 315, 5, 315], color: 0xffce72, alpha: 0.15 },
    { kind: "polygon", points: [39, 78, 63, 78, 78, 315, 24, 315], color: 0xffefb0, alpha: 0.08 },
  ],
  daytime: [
    ...ceilingGlow(0.13),
    { kind: "polygon", points: [22, 76, 75, 76, 105, 320, 2, 320], color: 0xffd88d, alpha: 0.18 },
    { kind: "polygon", points: [38, 78, 64, 78, 81, 320, 23, 320], color: 0xffffc6, alpha: 0.1 },
  ],
  evening: [
    ...ceilingGlow(0.16),
    { kind: "polygon", points: [31, 76, 72, 76, 110, 300, 18, 300], color: 0xff8b4f, alpha: 0.16 },
  ],
  night: [...ceilingGlow(0.2), bedsideGlow(18, 0xffbc73, 0.12)],
  deepNight: [...ceilingGlow(0.13), bedsideGlow(16, 0xffb565, 0.09)],
};

const AWAKE_NIGHT_LIGHTS: Partial<Record<TimeBand, readonly RoomLight[]>> = {
  night: [...ceilingGlow(0.28), bedsideGlow(18, 0xffbc73, 0.13)],
  deepNight: [...ceilingGlow(0.2), bedsideGlow(16, 0xffb565, 0.1)],
};

export function resolveRoomLight(light: RoomLight, layout: RoomLayout): ResolvedRoomLight {
  if (light.kind !== "anchoredCircle") return light;
  const anchor = layout.anchors[light.anchor];
  return {
    kind: "circle",
    x: anchor.x + light.offset.x,
    y: anchor.y + light.offset.y,
    radius: light.radius,
    color: light.color,
    alpha: light.alpha,
  };
}

export function getRoomLights(band: TimeBand, sleeping: boolean, layout: RoomLayout): readonly ResolvedRoomLight[] {
  const lights = sleeping ? TIME_LIGHTS[band] : (AWAKE_NIGHT_LIGHTS[band] ?? TIME_LIGHTS[band]);
  return lights.map((light) => resolveRoomLight(light, layout));
}
