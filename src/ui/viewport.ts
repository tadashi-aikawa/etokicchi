// Canvasは195×422のドット絵をCSSで拡大して見せる。倍率が非整数だと拡大後のドットの太さが
// 列ごとに変わるため、端末ピクセル単位で整数倍になる大きさへ丸める。
export const ROOM_LOGICAL_WIDTH = 195;
export const ROOM_LOGICAL_HEIGHT = 422;
const MAX_CSS_WIDTH = 430;

export interface RoomViewportInput {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
}

export interface RoomViewport {
  scale: number;
  cssWidth: number;
  cssHeight: number;
}

export function resolveRoomViewport(input: RoomViewportInput): RoomViewport {
  const ratio = input.devicePixelRatio > 0 ? input.devicePixelRatio : 1;
  const deviceWidth = Math.max(input.innerWidth, 0) * ratio;
  const deviceHeight = Math.max(input.innerHeight, 0) * ratio;
  const fitScale = Math.floor(Math.min(deviceWidth / ROOM_LOGICAL_WIDTH, deviceHeight / ROOM_LOGICAL_HEIGHT));
  const maxScale = Math.floor((MAX_CSS_WIDTH * ratio) / ROOM_LOGICAL_WIDTH);
  const scale = Math.max(1, Math.min(fitScale, maxScale));
  return {
    scale,
    cssWidth: (ROOM_LOGICAL_WIDTH * scale) / ratio,
    cssHeight: (ROOM_LOGICAL_HEIGHT * scale) / ratio,
  };
}
