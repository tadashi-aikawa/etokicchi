import { describe, expect, it } from "vitest";
import {
  applyInteraction,
  createInitialState,
  migrateGameState,
  pruneOldSlots,
  resolveVisit,
} from "../src/game/state.ts";
import { addDays, makeSlotKey } from "../src/game/time.ts";
import type { GameState, SlotAssignment } from "../src/game/types.ts";

function breakfastState(): { state: GameState; assignment: SlotAssignment } {
  const state = createInitialState();
  const assignment: SlotAssignment = {
    slotKey: "2026-08-30:morning",
    localDate: "2026-08-30",
    band: "morning",
    sceneId: "tooMuchBreakfast",
    lineIndex: 0,
    detailIndex: 0,
    createdAt: "2026-08-29T21:00:00.000Z",
  };
  state.assignments[assignment.slotKey] = assignment;
  state.histories.morning.push(assignment.sceneId);
  return { state, assignment };
}

describe("visit resolution", () => {
  it("keeps the same scene and variants during a slot", () => {
    const now = new Date(2026, 7, 30, 12);
    const first = resolveVisit(now, createInitialState());
    const second = resolveVisit(now, first.state);

    expect(second.visit.assignment).toEqual(first.visit.assignment);
    expect(second.visit.line).toBe(first.visit.line);
    expect(second.visit.detail).toBe(first.visit.detail);
    expect(first.visit.discoveredNow).toBe(true);
    expect(second.visit.discoveredNow).toBe(false);
    expect(second.state.discoveries[first.visit.scene.id]?.seenCount).toBe(1);
  });

  it("never chooses the same scene three observed slots in a row", () => {
    const now = new Date(2026, 7, 30, 12);
    const baseline = resolveVisit(now, createInitialState());
    const repeated = createInitialState();
    repeated.histories.daytime = [baseline.visit.scene.id, baseline.visit.scene.id];

    const result = resolveVisit(now, repeated);
    expect(result.visit.scene.id).not.toBe(baseline.visit.scene.id);
  });

  it("records a scene discovery once per newly created slot", () => {
    const first = resolveVisit(new Date(2026, 7, 30, 6), createInitialState());
    const nextDate = new Date(2026, 7, 31, 6);
    const second = resolveVisit(nextDate, first.state);
    const expectedTotal = first.visit.scene.id === second.visit.scene.id ? 2 : 1;
    expect(second.state.discoveries[first.visit.scene.id]?.seenCount).toBe(expectedTotal);
  });

  it("uses a debug seed to redraw scene and variants without reusing the saved slot", () => {
    const now = new Date(2026, 7, 30, 6);
    const state = resolveVisit(now, createInitialState()).state;
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => {
        const result = resolveVisit(now, state, { randomSeed: `reload-${index}` });
        return `${result.visit.scene.id}:${result.visit.line}:${result.visit.detail}`;
      }),
    );

    expect(variants.size).toBeGreaterThan(1);
  });

  it("forces a locked scene for visual debugging without a discovery", () => {
    const result = resolveVisit(new Date(2026, 8, 3, 12, 20), createInitialState(), {
      randomSeed: "forced-scene",
      sceneId: "nappingOnMaineCoon",
    });

    expect(result.visit.scene.id).toBe("nappingOnMaineCoon");
    expect(result.visit.assignment.band).toBe("daytime");
  });

  it("rejects a forced scene outside its time band", () => {
    expect(() =>
      resolveVisit(new Date(2026, 8, 3, 8), createInitialState(), {
        randomSeed: "wrong-band",
        sceneId: "nappingOnMaineCoon",
      }),
    ).toThrow("nappingOnMaineCoon is registered for daytime, not morning");
  });

  it("keeps the same deep-night slot and interaction after midnight", () => {
    const beforeMidnight = new Date(2026, 8, 2, 23, 30);
    const state = createInitialState();
    state.discoveries.tatsuoWakeUp = { firstSeenAt: "2026-09-01T21:00:00.000Z", seenCount: 1 };
    const first = resolveVisit(beforeMidnight, state);
    expect(first.visit.scene.id).toBe("kickedBlanket");
    const interacted = applyInteraction(first.state, first.visit.assignment.slotKey, "cover", beforeMidnight);

    const afterMidnight = resolveVisit(new Date(2026, 8, 3, 1), interacted.state);

    expect(afterMidnight.visit.assignment).toEqual(first.visit.assignment);
    expect(afterMidnight.visit.assignment.slotKey).toBe("2026-09-02:deepNight");
    expect(afterMidnight.visit.interaction).toEqual(interacted.interaction);
    expect(afterMidnight.state.echoes).toEqual(interacted.state.echoes);
  });

  it("unlocks a stable low-frequency Mimizou companion after discovering the visit scene", () => {
    const stargazingResults = Array.from({ length: 90 }, (_, index) => {
      const now = new Date(2026, 8, index + 1, 1);
      const state = createInitialState();
      state.discoveries.mimizouVisit = { firstSeenAt: "2026-08-31T12:00:00.000Z", seenCount: 1 };
      const first = resolveVisit(now, state);
      const second = resolveVisit(now, first.state);
      expect(second.visit.mimizouPresent).toBe(first.visit.mimizouPresent);
      return first.visit.scene.id === "watchingStars" ? first.visit.mimizouPresent : undefined;
    });
    const companionResults = stargazingResults.filter((result): result is boolean => result !== undefined);

    expect(companionResults).toContain(true);
    expect(companionResults).toContain(false);

    const locked = createInitialState();
    const lockedVisit = Array.from(
      { length: 90 },
      (_, index) => resolveVisit(new Date(2026, 8, index + 1, 1), locked).visit,
    ).find((candidate) => candidate.scene.id === "watchingStars");
    expect(lockedVisit).toBeDefined();
    if (!lockedVisit) throw new Error("watchingStars was not selected");
    expect(lockedVisit.scene.id).toBe("watchingStars");
    expect(lockedVisit.mimizouPresent).toBe(false);
  });

  it("unlocks the Mimizou visit after stargazing and then unlocks the companion", () => {
    const state = createInitialState();
    state.discoveries.watchingStars = { firstSeenAt: "2026-09-02T16:00:00.000Z", seenCount: 1 };
    const visit = resolveVisit(new Date(2026, 8, 3, 21), state);
    expect(visit.visit.scene.id).toBe("mimizouVisit");

    const stargazing = Array.from({ length: 90 }, (_, index) =>
      resolveVisit(new Date(2026, 8, index + 1, 1), visit.state),
    ).find((candidate) => candidate.visit.scene.id === "watchingStars" && candidate.visit.mimizouPresent);
    expect(stargazing).toBeDefined();
    if (!stargazing) throw new Error("watchingStars was not selected");
    expect(stargazing.visit.scene.id).toBe("watchingStars");
    expect(stargazing.visit.mimizouPresent).toBe(true);
  });

  it("unlocks the early-morning farewell only after meeting Mimizou", () => {
    const now = new Date(2026, 8, 3, 6);
    const lockedState = createInitialState();
    const lockedScenes = Array.from(
      { length: 100 },
      (_, index) => resolveVisit(now, lockedState, { randomSeed: `locked-${index}` }).visit.scene.id,
    );
    expect(lockedScenes).not.toContain("mimizouFarewell");

    const unlockedState = createInitialState();
    unlockedState.discoveries.mimizouVisit = {
      firstSeenAt: "2026-09-02T12:00:00.000Z",
      seenCount: 1,
    };
    const unlockedScenes = Array.from(
      { length: 100 },
      (_, index) => resolveVisit(now, unlockedState, { randomSeed: `unlocked-${index}` }).visit.scene.id,
    );
    expect(unlockedScenes).toContain("mimizouFarewell");
  });

  it("accepts and extends a state saved before the Mimizou scene existed", () => {
    const legacyState: unknown = {
      dataVersion: 1,
      assignments: {},
      histories: {
        deepNight: ["watchingStars"],
        earlyMorning: ["morningTea"],
        daytime: ["wateringPlants"],
        evening: ["foldingLaundry"],
        night: ["readingComics"],
      },
      interactions: {},
      echoes: [],
      discoveries: {
        readingComics: { firstSeenAt: "2026-08-30T12:00:00.000Z", seenCount: 2 },
        watchingStars: { firstSeenAt: "2026-08-31T16:00:00.000Z", seenCount: 1 },
      },
    };

    const migrated = migrateGameState(legacyState);
    expect(migrated.dataVersion).toBe(2);
    expect(migrated.histories.morning).toEqual(["morningTea"]);
    expect(migrated.histories.earlyMorning).toEqual([]);
    const resolved = resolveVisit(new Date(2026, 8, 3, 21), migrated);
    expect(resolved.state.discoveries.readingComics?.seenCount).toBe(2);
    expect(resolved.visit.scene.id).toBe("mimizouVisit");
  });
});

describe("meaningful interactions", () => {
  it("stores one choice and schedules later and next-day echoes", () => {
    const { state, assignment } = breakfastState();
    const result = applyInteraction(state, assignment.slotKey, "eatTogether", new Date(2026, 7, 30, 6, 30));

    expect(result.interaction.choiceId).toBe("eatTogether");
    expect(result.state.echoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetSlotKey: "2026-08-30:daytime", kind: "later" }),
        expect.objectContaining({ targetSlotKey: "2026-08-31:morning", kind: "nextDay" }),
      ]),
    );
    const revisited = resolveVisit(new Date(2026, 7, 30, 8, 31), result.state);
    expect(revisited.visit.interaction).toEqual(result.interaction);
  });

  it("does not replace an interaction selected for the same slot", () => {
    const { state, assignment } = breakfastState();
    const first = applyInteraction(state, assignment.slotKey, "eatTogether", new Date(2026, 7, 30, 6, 30));
    const second = applyInteraction(first.state, assignment.slotKey, "makeLunch", new Date(2026, 7, 30, 6, 31));

    expect(second.interaction.choiceId).toBe("eatTogether");
    expect(second.state.echoes).toHaveLength(2);
  });

  it("returns scheduled echoes when their target slot is visited", () => {
    const { state, assignment } = breakfastState();
    const interacted = applyInteraction(state, assignment.slotKey, "eatTogether", new Date(2026, 7, 30, 6, 30));
    const later = resolveVisit(new Date(2026, 7, 30, 12), interacted.state);

    expect(later.visit.echoes.map((echo) => echo.kind)).toContain("later");
  });
});

describe("state migration", () => {
  it("moves legacy morning and deep-night slots without breaking echo chronology", () => {
    const legacyState: unknown = {
      dataVersion: 1,
      assignments: {
        "2026-09-02:deepNight": {
          slotKey: "2026-09-02:deepNight",
          localDate: "2026-09-02",
          band: "deepNight",
          sceneId: "sleeping",
          lineIndex: 0,
          detailIndex: 0,
          createdAt: "2026-09-01T16:00:00.000Z",
        },
        "2026-09-02:earlyMorning": {
          slotKey: "2026-09-02:earlyMorning",
          localDate: "2026-09-02",
          band: "earlyMorning",
          sceneId: "tooMuchBreakfast",
          lineIndex: 0,
          detailIndex: 0,
          createdAt: "2026-09-01T21:00:00.000Z",
        },
      },
      histories: {
        deepNight: ["sleeping"],
        earlyMorning: ["tooMuchBreakfast"],
        daytime: [],
        evening: [],
        night: ["packingTomorrow"],
      },
      interactions: {
        "2026-09-02:earlyMorning": {
          slotKey: "2026-09-02:earlyMorning",
          choiceId: "eatTogether",
          immediate: "朝食を食べた",
          selectedAt: "2026-09-01T21:10:00.000Z",
        },
      },
      echoes: [
        {
          id: "2026-09-02:deepNight:cover:later",
          sourceSlotKey: "2026-09-02:deepNight",
          targetSlotKey: "2026-09-02:earlyMorning",
          text: "deep later",
          kind: "later",
        },
        {
          id: "2026-09-02:deepNight:cover:nextDay",
          sourceSlotKey: "2026-09-02:deepNight",
          targetSlotKey: "2026-09-03:deepNight",
          text: "deep next",
          kind: "nextDay",
        },
        {
          id: "2026-09-01:night:checkTogether:later",
          sourceSlotKey: "2026-09-01:night",
          targetSlotKey: "2026-09-02:deepNight",
          text: "night later",
          kind: "later",
        },
        {
          id: "2026-09-02:earlyMorning:eatTogether:nextDay",
          sourceSlotKey: "2026-09-02:earlyMorning",
          targetSlotKey: "2026-09-03:earlyMorning",
          text: "morning next",
          kind: "nextDay",
        },
      ],
      discoveries: {
        sleeping: { firstSeenAt: "2026-09-01T16:00:00.000Z", seenCount: 1 },
      },
    };

    const migrated = migrateGameState(legacyState);

    expect(migrated.assignments["2026-09-01:deepNight"]).toMatchObject({
      slotKey: "2026-09-01:deepNight",
      localDate: "2026-09-01",
      band: "deepNight",
    });
    expect(migrated.assignments["2026-09-02:morning"]).toMatchObject({
      slotKey: "2026-09-02:morning",
      band: "morning",
    });
    expect(migrated.interactions["2026-09-02:morning"]?.slotKey).toBe("2026-09-02:morning");
    expect(migrated.echoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "2026-09-01:deepNight:cover:later",
          sourceSlotKey: "2026-09-01:deepNight",
          targetSlotKey: "2026-09-02:earlyMorning",
        }),
        expect.objectContaining({
          sourceSlotKey: "2026-09-01:deepNight",
          targetSlotKey: "2026-09-02:deepNight",
          kind: "nextDay",
        }),
        expect.objectContaining({
          sourceSlotKey: "2026-09-01:night",
          targetSlotKey: "2026-09-01:deepNight",
          kind: "later",
        }),
        expect.objectContaining({
          sourceSlotKey: "2026-09-02:morning",
          targetSlotKey: "2026-09-03:morning",
          kind: "nextDay",
        }),
      ]),
    );
    expect(migrated.discoveries.sleeping?.seenCount).toBe(1);
  });
});

describe("state cleanup", () => {
  it("removes old slot details while preserving discovery history", () => {
    const { state, assignment } = breakfastState();
    state.discoveries.tooMuchBreakfast = { firstSeenAt: assignment.createdAt, seenCount: 3 };
    state.echoes.push({
      id: "old",
      sourceSlotKey: assignment.slotKey,
      targetSlotKey: makeSlotKey(addDays(assignment.localDate, 1), "morning"),
      text: "old",
      kind: "nextDay",
    });

    const cleaned = pruneOldSlots(state, "2026-09-30");
    expect(cleaned.assignments[assignment.slotKey]).toBeUndefined();
    expect(cleaned.echoes).toHaveLength(0);
    expect(cleaned.discoveries.tooMuchBreakfast?.seenCount).toBe(3);
  });
});
