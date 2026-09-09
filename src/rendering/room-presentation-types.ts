import type { FurnitureId, Point } from "./room-furniture.ts";
import type { FixtureHotspotId, FixtureId } from "./room-fixtures.ts";
import type { RoomDepthDecorationId, RoomDepthDecorationOverride } from "./room-decor.ts";

// 部屋の描画定義の型。シーン定義(content/scene-presentations.ts)と描画側の両方から読むので、
// 値と手続きを持つ room-presentation.ts から型だけを切り離してある。

export interface RoomTint {
  color: number;
  alpha: number;
}

// タップで観察できる対象。家具・キッチンの部位・キッチン本体・窓をひとつの識別子空間にまとめる。
export type ObservationTargetId = FurnitureId | FixtureHotspotId | FixtureId | "window";

export type ObservationOverrides = Partial<Record<ObservationTargetId, string>>;

interface GuestPresentationCommon {
  assetName: string;
  height: number;
  speech?: string;
  observation?: { text: string; targetName: string };
}

export interface PositionedGuestPresentation extends GuestPresentationCommon {
  x: number;
  y: number;
  depth?: "scene" | "position";
}

export interface FurnitureAttachedGuestPresentation extends GuestPresentationCommon {
  furnitureId: FurnitureId;
  actionPointId: string;
  offset?: Point;
  // 横たわる同席者は複数の座席へまたがるため、位置と前後関係を別の行動地点から解決できるようにする。
  depthActionPointId?: string;
  depthOffset?: number;
}

export type GuestPresentation = PositionedGuestPresentation | FurnitureAttachedGuestPresentation;

interface ScenePropCommon {
  assetName: string;
  height: number;
  depthOffset?: number;
  // 描画深度だけを配置位置から切り離す。家具の天板へ置いた小物を家具より手前に描くために使う。
  depthY?: number;
  // 経路のこのwaypoint(0始まり)へキャラクターが到着するまで隠す。歩行しないシーンでは無視される。
  revealAtWaypoint?: number;
}

interface AttachedScenePropCommon extends ScenePropCommon {
  offset: Point;
}

export interface FurnitureAttachedSceneProp extends AttachedScenePropCommon {
  type: "furniture";
  furnitureId: FurnitureId;
}

export interface FixtureAttachedSceneProp extends AttachedScenePropCommon {
  type: "fixture";
  fixtureId: FixtureId;
}

export interface AbsoluteSceneProp extends ScenePropCommon {
  type: "absolute";
  x: number;
  y: number;
}

export type AttachedSceneProp = FurnitureAttachedSceneProp | FixtureAttachedSceneProp | AbsoluteSceneProp;

export interface ScenePropAnchorLayout {
  furniture: Readonly<Record<FurnitureId, { anchor: Point }>>;
  fixtures: Readonly<Record<FixtureId, { anchor: Point }>>;
}

export interface CharacterBubblePresentation {
  kind: "speech" | "thought";
  text: string;
  offset: Point;
  width: number;
  height: number;
  tailSide?: "left" | "right";
}

export interface ComfortingMaineCoonPresentation {
  assetName: string;
  height: number;
  x: number;
  y: number;
  depthOffset: number;
  observation: string;
}

// 窓のタツヲは素材の上からこの割合だけを切り出して顔として出す。
// 切り出し高さ floor(素材の高さ × この値) が表示する論理高さの2倍になるよう素材を作る。
export const TATSUO_WINDOW_FACE_RATIO = 0.55;

export interface TatsuoWindowPresentation {
  assetName: string;
  height: number;
  x: number;
  y: number;
}

export interface RoomPresentationCommon {
  sleeperAssetName: string;
  sleeperHeight: number;
  sleeperRotation?: number;
  sleeperBreathing?: "smooth" | "subtle" | "alternating";
  sleeperBase?: {
    assetName: string;
    height: number;
    offset?: Point;
  };
  companion?: GuestPresentation;
  visitor?: PositionedGuestPresentation;
  furnitureAssetNames?: Partial<Record<FurnitureId, string>>;
  hiddenFurnitureIds?: readonly FurnitureId[];
  hiddenDepthDecorationIds?: readonly RoomDepthDecorationId[];
  depthDecorationOverrides?: Partial<Record<RoomDepthDecorationId, RoomDepthDecorationOverride>>;
  sceneProps?: readonly AttachedSceneProp[];
  hideCharacterShadow?: boolean;
  characterBubble?: CharacterBubblePresentation;
  comfortingMaineCoon?: ComfortingMaineCoonPresentation;
  thunderstorm?: boolean;
  tatsuoWindow?: TatsuoWindowPresentation;
  /** シーン設定として部屋の灯りをすべて消す。時間帯Tintは維持する。 */
  lightsOff?: boolean;
  observationOverrides?: ObservationOverrides;
  // 時間帯から決まる既定の照明を、このシーンだけ差し替える。
  tint?: RoomTint;
}

export interface LayeredRoomPresentation extends RoomPresentationCommon {
  kind: "layered";
  baseAssetName: "room-base-empty-daytime-pixel.webp";
  windowAssetName: string;
  tint: RoomTint;
  observationOverrides: ObservationOverrides;
  windowObservation: string;
}

export type RoomPresentation = LayeredRoomPresentation;
