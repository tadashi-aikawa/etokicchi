import type { TimeBand } from "../game/types.ts";

export interface CircleLight {
  kind: "circle";
  x: number;
  y: number;
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

export type RoomLight = CircleLight | PolygonLight;

const ceilingGlow = (alpha: number): readonly RoomLight[] => [
  { kind: "circle", x: 145, y: 43, radius: 19, color: 0xffd79b, alpha },
  {
    kind: "polygon",
    points: [137, 43, 153, 43, 169, 134, 121, 134],
    color: 0xffcf86,
    alpha: alpha * 0.42,
  },
];

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
  night: [...ceilingGlow(0.2), { kind: "circle", x: 61, y: 105, radius: 18, color: 0xffbc73, alpha: 0.12 }],
  deepNight: [...ceilingGlow(0.13), { kind: "circle", x: 61, y: 105, radius: 16, color: 0xffb565, alpha: 0.09 }],
};

const AWAKE_NIGHT_LIGHTS: Partial<Record<TimeBand, readonly RoomLight[]>> = {
  night: [...ceilingGlow(0.28), { kind: "circle", x: 61, y: 105, radius: 18, color: 0xffbc73, alpha: 0.13 }],
  deepNight: [...ceilingGlow(0.2), { kind: "circle", x: 61, y: 105, radius: 16, color: 0xffb565, alpha: 0.1 }],
};

export function getRoomLights(band: TimeBand, sleeping: boolean): readonly RoomLight[] {
  return sleeping ? TIME_LIGHTS[band] : (AWAKE_NIGHT_LIGHTS[band] ?? TIME_LIGHTS[band]);
}
