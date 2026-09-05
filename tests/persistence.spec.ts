import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/game/state.ts";
import type { GameState, StateRepository } from "../src/game/types.ts";
import { FallbackStateRepository } from "../src/persistence/indexed-db-repository.ts";

class FakeRepository implements StateRepository {
  saved: GameState[] = [];
  loadCount = 0;

  constructor(
    private readonly behavior: { failLoad?: boolean; failSave?: boolean },
    private readonly stored: GameState = createInitialState(),
  ) {}

  async load(): Promise<GameState> {
    this.loadCount += 1;
    if (this.behavior.failLoad) throw new Error("load failed");
    return structuredClone(this.stored);
  }

  async save(state: GameState): Promise<void> {
    if (this.behavior.failSave) throw new Error("save failed");
    this.saved.push(structuredClone(state));
  }
}

function stateWithDiscovery(seenCount: number): GameState {
  const state = createInitialState();
  state.discoveries.wateringPlants = { firstSeenAt: "2026-09-01T03:00:00.000Z", seenCount };
  return state;
}

describe("fallback state repository", () => {
  it("keeps saving into this tab after the primary save fails", async () => {
    const primary = new FakeRepository({ failSave: true });
    const failures: unknown[] = [];
    const repository = new FallbackStateRepository(primary, (error) => failures.push(error));

    const loaded = await repository.load();
    expect(repository.persistent).toBe(true);

    await repository.save(stateWithDiscovery(1));
    expect(repository.persistent).toBe(false);
    expect(failures).toHaveLength(1);

    await repository.save(stateWithDiscovery(2));
    expect(failures).toHaveLength(1);
    expect(primary.saved).toHaveLength(0);
    expect((await repository.load()).discoveries.wateringPlants?.seenCount).toBe(2);
    expect(loaded.discoveries.wateringPlants).toBeUndefined();
  });

  it("starts from an initial state when the primary load fails", async () => {
    const primary = new FakeRepository({ failLoad: true });
    const failures: unknown[] = [];
    const repository = new FallbackStateRepository(primary, (error) => failures.push(error));

    expect(await repository.load()).toEqual(createInitialState());
    expect(repository.persistent).toBe(false);
    expect(failures).toHaveLength(1);

    await repository.save(stateWithDiscovery(3));
    expect((await repository.load()).discoveries.wateringPlants?.seenCount).toBe(3);
    expect(primary.loadCount).toBe(1);
  });

  it("delegates to the primary repository while it works", async () => {
    const primary = new FakeRepository({}, stateWithDiscovery(4));
    const failures: unknown[] = [];
    const repository = new FallbackStateRepository(primary, (error) => failures.push(error));

    expect((await repository.load()).discoveries.wateringPlants?.seenCount).toBe(4);
    await repository.save(stateWithDiscovery(5));

    expect(primary.saved).toHaveLength(1);
    expect(primary.saved[0]?.discoveries.wateringPlants?.seenCount).toBe(5);
    expect(repository.persistent).toBe(true);
    expect(failures).toHaveLength(0);
  });
});
