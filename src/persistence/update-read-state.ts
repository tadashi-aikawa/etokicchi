const STORAGE_KEY = "etokicchi:last-read-update";

type ReadStorage = Pick<Storage, "getItem" | "setItem">;

/** ゲームのセーブとは分離し、保存が拒否されたときも訪問中は既読を保つ。 */
export function createUpdateReadState(getStorage: () => ReadStorage = () => window.localStorage) {
  let lastReadInMemory: string | undefined;
  return {
    isUnread(id: string): boolean {
      if (lastReadInMemory === id) return false;
      try {
        return getStorage().getItem(STORAGE_KEY) !== id;
      } catch {
        return true;
      }
    },
    markRead(id: string): void {
      lastReadInMemory = id;
      try {
        getStorage().setItem(STORAGE_KEY, id);
      } catch {
        // 保存不可でもゲームを止めない。次回訪問では再通知される。
      }
    },
  };
}

export const updateReadState = createUpdateReadState();
