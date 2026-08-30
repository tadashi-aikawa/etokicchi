import { describe, expect, it } from "vitest";
import { applyInteraction, createInitialState, pruneOldSlots, resolveVisit } from "../src/game/state.ts";
import { addDays, makeSlotKey } from "../src/game/time.ts";
import type { GameState, SlotAssignment } from "../src/game/types.ts";

function breakfastState(): { state: GameState; assignment: SlotAssignment } {
  const state = createInitialState();
  const assignment: SlotAssignment = {
    slotKey: "2026-08-30:earlyMorning",
    localDate: "2026-08-30",
    band: "earlyMorning",
    sceneId: "tooMuchBreakfast",
    lineIndex: 0,
    detailIndex: 0,
    createdAt: "2026-08-29T21:00:00.000Z",
  };
  state.assignments[assignment.slotKey] = assignment;
  state.histories.earlyMorning.push(assignment.sceneId);
  return { state, assignment };
}

describe("visit resolution", () => {
  it("keeps the same scene and variants during a slot", () => {
    const now = new Date(2026, 7, 30, 9);
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
    const now = new Date(2026, 7, 30, 9);
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
});

describe("meaningful interactions", () => {
  it("stores one choice and schedules later and next-day echoes", () => {
    const { state, assignment } = breakfastState();
    const result = applyInteraction(state, assignment.slotKey, "eatTogether", new Date(2026, 7, 30, 6, 30));

    expect(result.interaction.choiceId).toBe("eatTogether");
    expect(result.state.echoes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetSlotKey: "2026-08-30:daytime", kind: "later" }),
        expect.objectContaining({ targetSlotKey: "2026-08-31:earlyMorning", kind: "nextDay" }),
      ]),
    );
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
    const later = resolveVisit(new Date(2026, 7, 30, 9), interacted.state);

    expect(later.visit.echoes.map((echo) => echo.kind)).toContain("later");
  });
});

describe("state cleanup", () => {
  it("removes old slot details while preserving discovery history", () => {
    const { state, assignment } = breakfastState();
    state.discoveries.tooMuchBreakfast = { firstSeenAt: assignment.createdAt, seenCount: 3 };
    state.echoes.push({
      id: "old",
      sourceSlotKey: assignment.slotKey,
      targetSlotKey: makeSlotKey(addDays(assignment.localDate, 1), "earlyMorning"),
      text: "old",
      kind: "nextDay",
    });

    const cleaned = pruneOldSlots(state, "2026-09-30");
    expect(cleaned.assignments[assignment.slotKey]).toBeUndefined();
    expect(cleaned.echoes).toHaveLength(0);
    expect(cleaned.discoveries.tooMuchBreakfast?.seenCount).toBe(3);
  });
});
