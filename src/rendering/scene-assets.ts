// pixi.jsを読み込まずに素材名と素材の粒度を参照できるよう、描画側から切り出している。

/**
 * 素材のピクセル寸法と表示する論理寸法の比。
 * Canvasの描画解像度もこの値で、全素材のSpriteの拡大率が正確に 1/ASSET_PIXEL_RATIO になる。
 */
export const ASSET_PIXEL_RATIO = 2;

/** 部屋の論理座標。Canvasはこの大きさで描く。 */
export const ROOM_WIDTH = 195;
export const ROOM_HEIGHT = 422;
/** 部屋の内側(背景と窓)の高さ。この下は部屋の外の帯になる。 */
export const ROOM_BACKGROUND_HEIGHT = 347;

/** 歩行シートの1コマ。3列×4行(下・左・右・上)で、足元はコマ下端から2px上に揃えてある。 */
export const WALK_FRAME_WIDTH = 48;
export const WALK_FRAME_HEIGHT = 52;
export const WALK_FRAME_COLUMNS = 3;
export const WALK_FRAME_ROWS = 4;

/** 行動アニメーションの1コマ。正方形で3コマ並ぶ。 */
export const ACTION_FRAME_WIDTH = 60;
export const ACTION_FRAME_HEIGHT = 60;
export const ACTION_FRAME_COLUMNS = 3;

/**
 * 行動アニメーションの素材名と行数。定義はシーン定義テーブルが持ち、ここは素材の粒度と並べて引けるようにする。
 * 行数は向きを変えて2度使うシーンだけ2になる。
 */
export {
  SCENE_ACTION_ASSET_NAMES as ACTION_ASSET_NAMES,
  SCENE_ACTION_ROW_COUNTS as ACTION_ROW_COUNTS,
} from "../content/scene-presentations.ts";

export const WALK_ASSET_NAME = "etokichi-walk-pixel-v2.webp";
