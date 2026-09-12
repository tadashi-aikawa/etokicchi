import type { ColorMatrix } from "pixi.js";
import {
  resolveScenePresentationRoom,
  SCENE_DEPTH_DECORATION_THOUGHTS,
  SCENE_OBSERVATION_OVERRIDES,
} from "../content/scene-presentations.ts";
import type { SceneId, TimeBand, VisitView } from "../game/types.ts";
import { type FurnitureLayout, type Point, resolveFurnitureActionPoint } from "./room-furniture.ts";
import type {
  AttachedSceneProp,
  DepthDecorationThoughts,
  GuestPresentation,
  LayeredRoomPresentation,
  ObservationOverrides,
  RoomPresentation,
  RoomPresentationCommon,
  RoomTint,
  ScenePropAnchorLayout,
} from "./room-presentation-types.ts";

// 型は room-presentation-types.ts から直接読む。窓のタツヲの切り出し比だけは表示定義と一緒に引きたいので通す。
export { TATSUO_WINDOW_FACE_RATIO } from "./room-presentation-types.ts";

const TIME_WINDOW_ASSET_NAMES: Record<TimeBand, string> = {
  earlyMorning: "room-background-early-morning-pixel.webp",
  morning: "room-background-morning-pixel.webp",
  daytime: "room-background-daytime-pixel.webp",
  evening: "room-background-evening-pixel.webp",
  night: "room-background-night-pixel.webp",
  deepNight: "room-background-deep-night-pixel.webp",
};

export const WINDOW_OBSERVATIONS: Record<TimeBand, string> = {
  earlyMorning: "空が白み始めて、街はまだ静かだ。",
  morning: "朝の光が窓いっぱいに差し込んでいる。",
  daytime: "昼の空が高く、遠くの洗濯物が風に揺れている。",
  evening: "夕焼けが街の輪郭をオレンジに染めている。",
  night: "街の明かりがぽつぽつと灯り始めている。",
  deepNight: "街は眠り、窓には小さな星がいくつか見える。",
};

export function resolveScenePropPosition(prop: AttachedSceneProp, layout: ScenePropAnchorLayout): Point {
  if (prop.type === "absolute") return { x: prop.x, y: prop.y };
  const anchor =
    prop.type === "furniture" ? layout.furniture[prop.furnitureId].anchor : layout.fixtures[prop.fixtureId].anchor;
  return { x: anchor.x + prop.offset.x, y: anchor.y + prop.offset.y };
}

export function resolveScenePropDepthY(prop: AttachedSceneProp, position: Point): number {
  return prop.depthY ?? position.y;
}

export function isScenePropInitiallyVisible(prop: AttachedSceneProp): boolean {
  return prop.revealAtWaypoint === undefined;
}

export function resolveGuestPosition(guest: GuestPresentation, furniture: FurnitureLayout): Point {
  if ("furnitureId" in guest) {
    const anchor = resolveFurnitureActionPoint(furniture, guest.furnitureId, guest.actionPointId);
    return {
      x: anchor.x + (guest.offset?.x ?? 0),
      y: anchor.y + (guest.offset?.y ?? 0),
    };
  }
  return { x: guest.x, y: guest.y };
}

export function resolveGuestDepthY(guest: GuestPresentation, sceneDepthY: number, furniture?: FurnitureLayout): number {
  if ("furnitureId" in guest) {
    if (!furniture) throw new Error("家具へ追随する同席者の描画深度には家具配置が必要です");
    const actionPointId = guest.depthActionPointId ?? guest.actionPointId;
    return resolveFurnitureActionPoint(furniture, guest.furnitureId, actionPointId).y + (guest.depthOffset ?? 0);
  }
  return guest.depth === "scene" ? sceneDepthY : guest.y;
}

export function getLightingColorMatrix({ color, alpha }: RoomTint): ColorMatrix {
  const retained = 1 - alpha;
  return [
    retained,
    0,
    0,
    0,
    ((color >> 16) & 0xff) * (alpha / 255),
    0,
    retained,
    0,
    0,
    ((color >> 8) & 0xff) * (alpha / 255),
    0,
    0,
    retained,
    0,
    (color & 0xff) * (alpha / 255),
    0,
    0,
    0,
    1,
    0,
  ];
}

// フィルタを掛けられない図形の色を、getLightingColorMatrixと同じ式で時間帯の照明へ寄せる。
export function applyTintToColor(color: number, { color: tintColor, alpha }: RoomTint): number {
  if (alpha === 0) return color;
  const retained = 1 - alpha;
  const blend = (shift: number): number => {
    const source = (color >> shift) & 0xff;
    const target = (tintColor >> shift) & 0xff;
    const mixed = Math.round(retained * source + alpha * target);
    return Math.min(255, Math.max(0, mixed));
  };
  return (blend(16) << 16) | (blend(8) << 8) | blend(0);
}

const TIME_TINTS: Record<TimeBand, RoomTint> = {
  // The layered room starts from a time-neutral base, so these values carry the
  // room lighting that used to be baked into each full-background asset.
  earlyMorning: { color: 0xffc578, alpha: 0.12 },
  morning: { color: 0xffdc9c, alpha: 0.05 },
  daytime: { color: 0xfff1c6, alpha: 0 },
  evening: { color: 0xc75b45, alpha: 0.18 },
  night: { color: 0x1d2a50, alpha: 0.52 },
  deepNight: { color: 0x101a3b, alpha: 0.65 },
};

const AWAKE_NIGHT_TINTS: Partial<Record<TimeBand, RoomTint>> = {
  night: { color: 0x1d2a50, alpha: 0.42 },
  deepNight: { color: 0x101a3b, alpha: 0.52 },
};

const BED_SIDE_ACTION_SCENES = new Set<SceneId>(["morningStretch", "mimizouFarewell"]);

export function getRoomTint(visit: VisitView): RoomTint {
  if (visit.scene.characterPose !== "sleep") {
    const awakeTint = AWAKE_NIGHT_TINTS[visit.assignment.band];
    if (awakeTint) return awakeTint;
  }
  return TIME_TINTS[visit.assignment.band];
}

function layeredPresentation(visit: VisitView, character: RoomPresentationCommon): LayeredRoomPresentation {
  const furnitureAssetNames = BED_SIDE_ACTION_SCENES.has(visit.scene.id)
    ? { bed: "furniture-bed-bare-pixel.webp", ...character.furnitureAssetNames }
    : character.furnitureAssetNames;
  const observationOverrides: ObservationOverrides = {
    ...SCENE_OBSERVATION_OVERRIDES[visit.scene.id],
    ...character.observationOverrides,
  };
  const depthDecorationThoughts: DepthDecorationThoughts = {
    ...SCENE_DEPTH_DECORATION_THOUGHTS[visit.scene.id],
    ...character.depthDecorationThoughts,
  };
  return {
    kind: "layered",
    baseAssetName: "room-base-empty-daytime-pixel.webp",
    windowAssetName: TIME_WINDOW_ASSET_NAMES[visit.assignment.band],
    ...character,
    tint: character.tint ?? getRoomTint(visit),
    furnitureAssetNames,
    observationOverrides,
    depthDecorationThoughts,
    windowObservation: observationOverrides.window ?? WINDOW_OBSERVATIONS[visit.assignment.band],
  };
}

export function getRoomPresentation(visit: VisitView): RoomPresentation {
  return layeredPresentation(visit, resolveScenePresentationRoom(visit));
}
