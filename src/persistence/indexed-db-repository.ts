import { createInitialState, migrateGameState } from "../game/state.ts";
import type { GameState, StateRepository } from "../game/types.ts";

const DATABASE_NAME = "etokicchi";
const DATABASE_VERSION = 1;
const STORE_NAME = "gameState";
const STATE_KEY = "current";

interface StoredState {
  key: string;
  value: GameState;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed")), {
      once: true,
    });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      {
        once: true,
      },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      {
        once: true,
      },
    );
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "key" });
    }
  });
  const database = await requestResult(request);
  database.addEventListener("versionchange", () => database.close());
  return database;
}

export class IndexedDbStateRepository implements StateRepository {
  async load(): Promise<GameState> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const completed = transactionComplete(transaction);
      const record = await requestResult(
        transaction.objectStore(STORE_NAME).get(STATE_KEY) as IDBRequest<StoredState | undefined>,
      );
      await completed;
      return migrateGameState(record?.value);
    } finally {
      database.close();
    }
  }

  async save(state: GameState): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const completed = transactionComplete(transaction);
      transaction.objectStore(STORE_NAME).put({ key: STATE_KEY, value: state } satisfies StoredState);
      await completed;
    } finally {
      database.close();
    }
  }
}

export class MemoryStateRepository implements StateRepository {
  constructor(private state: GameState = createInitialState()) {}

  async load(): Promise<GameState> {
    return structuredClone(this.state);
  }

  async save(state: GameState): Promise<void> {
    this.state = structuredClone(state);
  }
}

// 容量超過やプライベートモードでは保存も読み込みも投げる。落ちる代わりにこのタブだけの
// 保存へ降りて、遊び続けられるようにする。
export class FallbackStateRepository implements StateRepository {
  private fallback: MemoryStateRepository | undefined;
  private lastState: GameState | undefined;

  constructor(
    private readonly primary: StateRepository,
    private readonly onFallback: (error: unknown) => void,
  ) {}

  get persistent(): boolean {
    return this.fallback === undefined;
  }

  async load(): Promise<GameState> {
    if (this.fallback) return this.fallback.load();
    try {
      const state = await this.primary.load();
      this.lastState = state;
      return state;
    } catch (error) {
      return this.switchToMemory(error).load();
    }
  }

  async save(state: GameState): Promise<void> {
    if (this.fallback) return this.fallback.save(state);
    try {
      await this.primary.save(state);
      this.lastState = state;
    } catch (error) {
      await this.switchToMemory(error).save(state);
    }
  }

  private switchToMemory(error: unknown): MemoryStateRepository {
    const fallback = new MemoryStateRepository(this.lastState ?? createInitialState());
    this.fallback = fallback;
    this.onFallback(error);
    return fallback;
  }
}
