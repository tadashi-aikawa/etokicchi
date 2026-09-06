import { describe, expect, it } from "vitest";
import { getScene } from "../src/content/scenes.ts";
import {
  applyInteraction,
  createInitialState,
  migrateGameState,
  pruneOldSlots,
  resolveVisit,
  sanitizeGameState,
} from "../src/game/state.ts";
import { addDays, getSlotKey, makeSlotKey } from "../src/game/time.ts";
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
    const blanketState = (): GameState => {
      const state = createInitialState();
      state.discoveries.tatsuoWakeUp = { firstSeenAt: "2026-09-01T21:00:00.000Z", seenCount: 1 };
      return state;
    };
    const beforeMidnight = Array.from({ length: 90 }, (_, index) => new Date(2026, 8, index + 1, 23, 30)).find(
      (date) => resolveVisit(date, blanketState()).visit.scene.id === "kickedBlanket",
    );
    expect(beforeMidnight).toBeDefined();
    if (!beforeMidnight) throw new Error("kickedBlanket was not selected");

    const first = resolveVisit(beforeMidnight, blanketState());
    const interacted = applyInteraction(first.state, first.visit.assignment.slotKey, "cover", beforeMidnight);
    const afterMidnight = new Date(beforeMidnight.getFullYear(), beforeMidnight.getMonth(), beforeMidnight.getDate());
    afterMidnight.setDate(afterMidnight.getDate() + 1);
    afterMidnight.setHours(1);
    const revisited = resolveVisit(afterMidnight, interacted.state);

    expect(revisited.visit.assignment).toEqual(first.visit.assignment);
    expect(revisited.visit.assignment.slotKey).toBe(getSlotKey(beforeMidnight));
    expect(revisited.visit.interaction).toEqual(interacted.interaction);
    expect(revisited.state.echoes).toEqual(interacted.state.echoes);
  });

  it("unlocks a stable low-frequency Mimizou companion after discovering the visit scene", () => {
    const unlockedState = (): GameState => {
      const state = createInitialState();
      state.discoveries.mimizouVisit = { firstSeenAt: "2026-08-31T12:00:00.000Z", seenCount: 1 };
      return state;
    };
    const stargazingResults = Array.from({ length: 90 }, (_, index) => {
      const now = new Date(2026, 8, index + 1, 1);
      const first = resolveVisit(now, unlockedState());
      const second = resolveVisit(now, first.state);
      expect(second.visit.mimizouPresent).toBe(first.visit.mimizouPresent);
      return first.visit.scene.id === "watchingStars" ? first.visit.mimizouPresent : undefined;
    });
    const companionResults = stargazingResults.filter((result): result is boolean => result !== undefined);

    expect(companionResults).toContain(true);
    expect(companionResults).toContain(false);

    const stargazingDate = Array.from({ length: 90 }, (_, index) => new Date(2026, 8, index + 1, 1)).find(
      (date) => resolveVisit(date, unlockedState()).visit.scene.id === "watchingStars",
    );
    expect(stargazingDate).toBeDefined();
    if (!stargazingDate) throw new Error("watchingStars was not selected");

    const stargazing = resolveVisit(stargazingDate, unlockedState());
    const slotKey = stargazing.visit.assignment.slotKey;
    expect(stargazing.state.assignments[slotKey]?.mimizouPresent).toBe(stargazing.visit.mimizouPresent);

    // 保存済みスロットは抽選し直さない。書き換えた値がそのまま返る。
    const flipped = structuredClone(stargazing.state);
    const flippedAssignment = flipped.assignments[slotKey];
    if (!flippedAssignment) throw new Error("the stargazing slot is missing");
    flippedAssignment.mimizouPresent = !stargazing.visit.mimizouPresent;
    expect(resolveVisit(stargazingDate, flipped).visit.mimizouPresent).toBe(!stargazing.visit.mimizouPresent);

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
    const visit = Array.from({ length: 90 }, (_, index) => resolveVisit(new Date(2026, 8, index + 1, 21), state)).find(
      (candidate) => candidate.visit.scene.id === "mimizouVisit",
    );
    expect(visit).toBeDefined();
    if (!visit) throw new Error("mimizouVisit was not selected");

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
  it("starts over when the saved value is not a current state", () => {
    expect(migrateGameState({ dataVersion: 1, assignments: {} })).toEqual(createInitialState());
    expect(migrateGameState(undefined)).toEqual(createInitialState());
  });
});

describe("state sanitization", () => {
  function retiredSceneState(): GameState {
    return {
      dataVersion: 2,
      assignments: {
        "2026-09-01:morning": {
          slotKey: "2026-09-01:morning",
          localDate: "2026-09-01",
          band: "morning",
          sceneId: "retiredScene",
          lineIndex: 0,
          detailIndex: 0,
          createdAt: "2026-08-31T21:00:00.000Z",
        },
        "2026-09-01:daytime": {
          slotKey: "2026-09-01:daytime",
          localDate: "2026-09-01",
          band: "daytime",
          sceneId: "wateringPlants",
          lineIndex: 0,
          detailIndex: 0,
          createdAt: "2026-09-01T03:00:00.000Z",
        },
      },
      histories: {
        earlyMorning: [],
        morning: ["retiredScene", "tooMuchBreakfast"],
        daytime: ["wateringPlants"],
        evening: [],
        night: [],
        deepNight: [],
      },
      interactions: {
        "2026-09-01:morning": {
          slotKey: "2026-09-01:morning",
          choiceId: "eatTogether",
          immediate: "いっしょに食べた",
          selectedAt: "2026-08-31T21:10:00.000Z",
        },
      },
      echoes: [
        {
          id: "2026-09-01:morning:eatTogether:later",
          sourceSlotKey: "2026-09-01:morning",
          targetSlotKey: "2026-09-01:daytime",
          text: "退役したシーンの余韻",
          kind: "later",
        },
        {
          id: "2026-09-01:daytime:water:later",
          sourceSlotKey: "2026-09-01:daytime",
          targetSlotKey: "2026-09-01:evening",
          text: "水やりの余韻",
          kind: "later",
        },
      ],
      discoveries: {
        wateringPlants: { firstSeenAt: "2026-09-01T03:00:00.000Z", seenCount: 2 },
        retiredScene: { firstSeenAt: "2026-08-31T21:00:00.000Z", seenCount: 5 },
      },
    } as unknown as GameState;
  }

  it("drops slots whose scene no longer exists together with their interaction and echoes", () => {
    const sanitized = sanitizeGameState(retiredSceneState());

    expect(sanitized.assignments["2026-09-01:morning"]).toBeUndefined();
    expect(sanitized.interactions["2026-09-01:morning"]).toBeUndefined();
    expect(sanitized.echoes.map((echo) => echo.id)).toEqual(["2026-09-01:daytime:water:later"]);
    expect(sanitized.assignments["2026-09-01:daytime"]).toBeDefined();
  });

  it("wraps line and detail indexes that fell outside the current content", () => {
    const state = retiredSceneState();
    const assignment = state.assignments["2026-09-01:daytime"];
    if (!assignment) throw new Error("the daytime slot is missing");
    assignment.lineIndex = 12;
    assignment.detailIndex = -3;

    const scene = getScene("wateringPlants");
    const sanitized = sanitizeGameState(state);

    expect(sanitized.assignments["2026-09-01:daytime"]).toMatchObject({
      sceneId: "wateringPlants",
      lineIndex: 12 % scene.lines.length,
      detailIndex: ((-3 % scene.details.length) + scene.details.length) % scene.details.length,
    });
  });

  it("removes unknown scenes from the histories and the discoveries", () => {
    const sanitized = sanitizeGameState(retiredSceneState());

    expect(sanitized.histories.morning).toEqual(["tooMuchBreakfast"]);
    expect(sanitized.discoveries.wateringPlants?.seenCount).toBe(2);
    expect(Object.keys(sanitized.discoveries)).toEqual(["wateringPlants"]);
  });

  it("trims a long saved history down to the entries the draw still reads", () => {
    const state = createInitialState();
    state.histories.morning = ["morningTea", "tooMuchBreakfast", "overslept", "morningTea", "planningDay"];

    expect(sanitizeGameState(state).histories.morning).toEqual(["morningTea", "planningDay"]);
  });

  it("keeps only the last two entries of a band history while playing", () => {
    let state = createInitialState();
    for (const day of [1, 2, 3, 4]) {
      state = resolveVisit(new Date(2026, 8, day, 12), state).state;
    }

    expect(state.histories.daytime).toHaveLength(2);
  });

  it("leaves a consistent saved state untouched", () => {
    const resolved = resolveVisit(new Date(2026, 8, 1, 12), createInitialState());
    const interacted = pruneOldSlots(resolved.state, "2026-09-01");

    expect(sanitizeGameState(interacted)).toEqual(interacted);
    expect(migrateGameState(interacted)).toEqual(interacted);
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
