export interface UpdateEntry {
  /** 公開する更新ごとに一意。公開後は変更しない。 */
  id: string;
  date: string;
  changes: readonly string[];
  /** シーン名や内容は持たせず、追加数だけを画面へ渡す。 */
  addedScenes?: number;
}

/** 新しい更新を先頭に追加する。日付は変更をまとめた日。 */
export const UPDATES: readonly UpdateEntry[] = [
  {
    id: "2026-09-10-3",
    date: "2026-09-10",
    changes: ["部屋のタイトル表示を外し、図鑑と更新履歴のボタンを上端へ移動しました。"],
  },
  {
    id: "2026-09-10-2",
    date: "2026-09-10",
    changes: ["図鑑の時間帯を切り替えるときに、横へスライドするアニメーションを追加しました。"],
  },
  {
    id: "2026-09-10-1",
    date: "2026-09-10",
    changes: [
      "図鑑を開くと、現在の時間帯が選ばれるようになりました。",
      "図鑑を左右にスワイプして、時間帯を切り替えられるようになりました。",
      "更新履歴を追加しました。新しい更新は部屋の「更新履歴」でお知らせします。",
    ],
  },
  {
    id: "2026-09-09-1",
    date: "2026-09-09",
    changes: [
      "長いセリフが吹き出しの途中で省略される問題を修正しました。",
      "一部のキャラクターのイラスト、大きさ、重なり方を調整しました。",
      "一部のキャラクターをタップしたときの反応と、吹き出しの位置を改善しました。",
    ],
  },
];

export function getUpdateMessages(entry: UpdateEntry): readonly string[] {
  return entry.addedScenes ? [`シーンを${entry.addedScenes}件追加しました。`, ...entry.changes] : entry.changes;
}
