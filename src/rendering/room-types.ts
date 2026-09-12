import type { Container } from "pixi.js";

/** 部屋の描画から画面側へ返す通知。観察文の表示・エトキチのタップ・思考のフキダシを渡す。 */
export interface RoomCallbacks {
  onObservation: (text: string, targetName: string) => void;
  onCharacterTap: () => void;
  /** 対象の頭上へ、思っていることのフキダシを出す */
  onThought: (text: string, target: Container) => void;
}

/** 画面側が渡す通知。思考のフキダシは部屋の内側で組み立てるので、外からは渡さない。 */
export type RoomHostCallbacks = Omit<RoomCallbacks, "onThought">;
