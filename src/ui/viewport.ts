import { ASSET_PIXEL_RATIO, ROOM_HEIGHT, ROOM_WIDTH } from "../rendering/scene-assets.ts";

// Canvasは論理195×422を描画解像度2で持つので、実ピクセルは390×844になる。
// このCanvasピクセルが端末ピクセルの整数倍に乗らないと、拡大後のドットの太さが列ごとに変わる。
export const ROOM_LOGICAL_WIDTH = ROOM_WIDTH;
export const ROOM_LOGICAL_HEIGHT = ROOM_HEIGHT;
const CANVAS_WIDTH = ROOM_LOGICAL_WIDTH * ASSET_PIXEL_RATIO;
const CANVAS_HEIGHT = ROOM_LOGICAL_HEIGHT * ASSET_PIXEL_RATIO;
// Canvasの実ピクセル幅と同じ値にしておくと、広い画面では倍率1〜3の整数倍がそのまま上限に乗る。
const MAX_CSS_WIDTH = CANVAS_WIDTH;

/**
 * 整数倍を選んだ結果の幅が、画面へ当てはめた幅のこの割合を下回るなら整数倍を諦める。
 * ドットの太さが揃わないより、部屋が小さくなるほうを避ける。
 * 2.625倍や2.75倍のAndroidでは整数倍が当てはめ幅の8割前後になり、閾値75%では
 * 左右に余白が出て縦長に見えたため、ほぼ損がないときだけ整数倍を採る。
 */
export const INTEGER_SCALE_MIN_RATIO = 0.95;

export interface RoomViewportInput {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
}

export interface RoomViewport {
  /** Canvasの1ピクセルへ割り当てる端末ピクセル数。`integerScaled`がfalseなら非整数になる。 */
  scale: number;
  cssWidth: number;
  cssHeight: number;
  /** Canvasピクセルが端末ピクセルの整数倍へ乗っているか。 */
  integerScaled: boolean;
}

export function resolveRoomViewport(input: RoomViewportInput): RoomViewport {
  const ratio = input.devicePixelRatio > 0 ? input.devicePixelRatio : 1;
  const innerWidth = Math.max(input.innerWidth, 0);
  const innerHeight = Math.max(input.innerHeight, 0);

  // 画面へそのまま当てはめた幅。整数倍を諦めたときはこれをそのまま使う。
  const fitCssWidth = Math.min(innerWidth, (innerHeight * ROOM_LOGICAL_WIDTH) / ROOM_LOGICAL_HEIGHT, MAX_CSS_WIDTH);

  const fitDeviceScale = Math.floor(
    Math.min((innerWidth * ratio) / CANVAS_WIDTH, (innerHeight * ratio) / CANVAS_HEIGHT),
  );
  const maxDeviceScale = Math.floor((MAX_CSS_WIDTH * ratio) / CANVAS_WIDTH);
  const deviceScale = Math.min(fitDeviceScale, maxDeviceScale);
  const integerCssWidth = (CANVAS_WIDTH * deviceScale) / ratio;

  const integerScaled = deviceScale >= 1 && integerCssWidth >= fitCssWidth * INTEGER_SCALE_MIN_RATIO;
  const cssWidth = integerScaled ? integerCssWidth : fitCssWidth;
  return {
    scale: (cssWidth * ratio) / CANVAS_WIDTH,
    cssWidth,
    cssHeight: (cssWidth * ROOM_LOGICAL_HEIGHT) / ROOM_LOGICAL_WIDTH,
    integerScaled,
  };
}
