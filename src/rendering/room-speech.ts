/** エトキチの頭上へ出すセリフフキダシの配置計算。座標と長さの単位はすべてCSS px。 */

/** 部屋の左右端とフキダシの間に残す余白 */
const ROOM_MARGIN = 6;
/** エトキチとフキダシの間に空ける距離 */
const CHARACTER_GAP = 8;
/** しっぽの中心をフキダシの角から離す距離 */
const TAIL_INSET = 13;
/** トップバーが占める上端の高さ。ここへ食い込む場合はフキダシを横へ逃がす */
export const TOP_BAR_LIMIT = 88;
/** セリフの表示時間 */
export const SPEECH_DURATION_MS = 6_000;

export interface SpeechBubblePlacementInput {
  /** 部屋の表示領域 */
  roomWidth: number;
  roomHeight: number;
  /** エトキチの中心x */
  characterX: number;
  /** エトキチの見かけの上端y */
  characterTopY: number;
  /** エトキチの見かけの横幅 */
  characterWidth: number;
  /** 実測したフキダシの外形 */
  bubbleWidth: number;
  bubbleHeight: number;
  /** 上端の禁止領域の高さ */
  topLimit?: number;
}

export interface SpeechBubblePlacement {
  left: number;
  top: number;
  /** しっぽを付けるフキダシの辺。エトキチのいる向きを指す */
  tail: "down" | "left" | "right";
  /** フキダシの左上からしっぽ中心までの距離。`down`は横方向、それ以外は縦方向 */
  tailOffset: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function clampTail(value: number, length: number): number {
  return clamp(value, TAIL_INSET, Math.max(TAIL_INSET, length - TAIL_INSET));
}

/**
 * エトキチの頭上へフキダシを置く。左右がはみ出すときは内側へ寄せてしっぽだけを頭上へ残し、
 * 上端がトップバーへ食い込むときは、右側を優先して収まる側へ逃がす。
 */
export function resolveSpeechBubblePlacement(input: SpeechBubblePlacementInput): SpeechBubblePlacement {
  const { roomWidth, roomHeight, characterX, characterTopY, characterWidth, bubbleWidth, bubbleHeight } = input;
  const topLimit = input.topLimit ?? TOP_BAR_LIMIT;
  const minLeft = ROOM_MARGIN;
  const maxLeft = Math.max(ROOM_MARGIN, roomWidth - ROOM_MARGIN - bubbleWidth);

  const aboveTop = characterTopY - CHARACTER_GAP - bubbleHeight;
  if (aboveTop >= topLimit) {
    const left = clamp(characterX - bubbleWidth / 2, minLeft, maxLeft);
    return { left, top: aboveTop, tail: "down", tailOffset: clampTail(characterX - left, bubbleWidth) };
  }

  const halfWidth = characterWidth / 2;
  const rightEdge = characterX + halfWidth + CHARACTER_GAP;
  const leftEdge = characterX - halfWidth - CHARACTER_GAP;
  const rightSpace = roomWidth - ROOM_MARGIN - rightEdge;
  const leftSpace = leftEdge - ROOM_MARGIN;
  // 右側に収まるならそちらへ置く。両側とも足りない場合だけ、広い側へ寄せる。
  const putsRight = rightSpace >= bubbleWidth || (leftSpace < bubbleWidth && rightSpace >= leftSpace);
  const left = clamp(putsRight ? rightEdge : leftEdge - bubbleWidth, minLeft, maxLeft);
  const top = clamp(characterTopY, topLimit, Math.max(topLimit, roomHeight - ROOM_MARGIN - bubbleHeight));
  return {
    left,
    top,
    tail: putsRight ? "left" : "right",
    tailOffset: clampTail(characterTopY - top, bubbleHeight),
  };
}
