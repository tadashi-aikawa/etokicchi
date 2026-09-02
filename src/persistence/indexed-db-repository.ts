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
