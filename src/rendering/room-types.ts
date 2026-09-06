/** 部屋の描画から画面側へ返す通知。観察文の表示とエトキチのタップだけを渡す。 */
export interface RoomCallbacks {
  onObservation: (text: string, targetName: string) => void;
  onCharacterTap: () => void;
}
