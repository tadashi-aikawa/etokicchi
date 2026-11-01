import { describe, expect, it } from "vitest";
import { HALLOWEEN_SCENES } from "../src/content/halloween.ts";
import { getEventScene, getScenesForBand } from "../src/content/scenes.ts";
import { getCollectionEntries } from "../src/game/collection.ts";
import { applyInteraction, createInitialState, migrateGameState, resolveVisit } from "../src/game/state.ts";
import { TIME_BANDS } from "../src/game/time.ts";

describe("2026 Halloween event", () => {
  const slots = [
    ["2026-10-31T05:30:00", "halloweenGarland"],
    ["2026-10-31T07:30:00", "halloweenWitchCat"],
    ["2026-10-31T11:00:00", "halloweenPumpkinPup"],
    ["2026-10-31T15:30:00", "halloweenPumpkinSkewer"],
    ["2026-10-31T19:00:00", "halloweenCandyOwl"],
    ["2026-10-31T23:00:00", "halloweenGentleGhost"],
  ] as const;

  it.each(slots)("always shows the assigned event at %s without prerequisites", (time, sceneId) => {
    const now = new Date(time);
    const first = resolveVisit(now, createInitialState());
    expect(first.visit.scene.id).toBe(sceneId);
    expect(first.visit.discoveredNow).toBe(true);
    const reload = resolveVisit(now, first.state);
    expect(reload.visit.assignment).toEqual(first.visit.assignment);
    expect(reload.visit.discoveredNow).toBe(false);
    expect(reload.state.discoveries[sceneId]?.seenCount).toBe(1);
    expect(resolveVisit(now, createInitialState(), { randomSeed: "another-visitor" }).visit.scene.id).toBe(sceneId);
  });

  it.each([
    "2026-10-31T00:00:00",
    "2026-10-31T05:29:59",
    "2026-11-08T00:00:00",
    "2026-11-08T05:29:59",
    "2026-11-08T05:30:00",
    "2026-11-08T23:00:00",
    "2025-11-03T12:00:00",
    "2027-11-03T12:00:00",
    "2027-10-31T12:00:00",
  ])("uses the normal lottery outside the one-off event at %s", (time) => {
    expect(resolveVisit(new Date(time), createInitialState()).visit.scene.eventDate).toBeUndefined();
  });

  it("keeps the same deep-night scene and encounter across midnight until 5:30", () => {
    const first = resolveVisit(new Date("2026-10-31T23:00:00"), createInitialState());
    for (const time of ["2026-11-01T00:00:00", "2026-11-01T05:29:59"]) {
      const next = resolveVisit(new Date(time), first.state);
      expect(next.visit.assignment).toEqual(first.visit.assignment);
      expect(next.state.discoveries.halloweenGentleGhost?.seenCount).toBe(1);
    }
    const after = resolveVisit(new Date("2026-11-01T05:30:00"), first.state);
    expect(after.visit.assignment.slotKey).toBe("2026-11-01:earlyMorning");
    expect(after.state.discoveries.halloweenGentleGhost).toEqual(first.state.discoveries.halloweenGentleGhost);
  });

  it("replaces a saved normal assignment and its interaction while keeping discoveries and unrelated echoes", () => {
    const now = new Date("2026-10-31T08:00:00");
    const old = resolveVisit(now, createInitialState(), { sceneId: "tooMuchBreakfast" });
    const interacted = applyInteraction(old.state, old.visit.assignment.slotKey, "eatTogether", now).state;
    interacted.echoes.push({
      id: "unrelated",
      sourceSlotKey: "2026-10-30:night",
      targetSlotKey: "2026-10-31:morning",
      text: "前夜からの反応",
      kind: "later",
    });
    const result = resolveVisit(now, migrateGameState(interacted));
    expect(result.visit.scene.id).toBe("halloweenWitchCat");
    expect(result.visit.interaction).toBeUndefined();
    expect(result.state.echoes.map((echo) => echo.id)).toEqual(["unrelated"]);
    expect(result.state.discoveries.tooMuchBreakfast).toEqual(old.state.discoveries.tooMuchBreakfast);
    expect(resolveVisit(now, result.state).state.discoveries.halloweenWitchCat?.seenCount).toBe(1);
    expect(interacted.interactions[old.visit.assignment.slotKey]).toBeDefined();
  });

  it("allows explicit debug previews of regular and seasonal scenes", () => {
    expect(
      resolveVisit(new Date("2026-10-31T08:00:00"), createInitialState(), { sceneId: "morningTea" }).visit.scene.id,
    ).toBe("morningTea");
    expect(
      resolveVisit(new Date("2026-09-01T08:00:00"), createInitialState(), { sceneId: "halloweenWitchCat" }).visit.scene
        .id,
    ).toBe("halloweenWitchCat");
  });

  it("never adds an event scene to the ordinary lottery", () => {
    expect(HALLOWEEN_SCENES).toHaveLength(6);
    expect(HALLOWEEN_SCENES.map((scene) => scene.band)).toEqual(TIME_BANDS);
    for (const band of TIME_BANDS) {
      expect(getScenesForBand(band).every((scene) => !scene.eventDate)).toBe(true);
    }
  });

  it("marks unseen event entries unavailable outside the event while retaining the discovered art", () => {
    const before = getCollectionEntries({}, new Date("2026-10-31T05:29:59"));
    expect(before.filter((entry) => entry.status === "unavailable")).toHaveLength(6);
    const during = getCollectionEntries({}, new Date("2026-10-31T05:30:00"));
    expect(during.filter((entry) => entry.scene.eventDate).every((entry) => entry.status === "available")).toBe(true);
    const discoveries = { halloweenGentleGhost: { firstSeenAt: "2026-10-31T14:00:00Z", seenCount: 1 } };
    const after = getCollectionEntries(discoveries, new Date("2026-11-08T00:00:00"));
    expect(after.find((entry) => entry.scene.id === "halloweenGentleGhost")).toMatchObject({
      status: "discovered",
      discovery: discoveries.halloweenGentleGhost,
    });
    expect(after.filter((entry) => entry.status === "unavailable")).toHaveLength(5);
  });

  it("marks earlier slots ended during the event and retains a single completed achievement", () => {
    const entries = getCollectionEntries({}, new Date("2026-10-31T20:00:00"));
    expect(entries.filter((entry) => entry.status === "ended").map((entry) => entry.scene.band)).toEqual([
      "earlyMorning",
      "morning",
      "daytime",
      "evening",
    ]);
    expect(
      entries.filter((entry) => entry.scene.eventDate && entry.status === "available").map((entry) => entry.scene.band),
    ).toEqual(["night", "deepNight"]);
    const afterMidnight = getCollectionEntries({}, new Date("2026-11-01T00:30:00"));
    expect(afterMidnight.filter((entry) => entry.status === "ended")).toHaveLength(0);
    expect(afterMidnight.find((entry) => entry.scene.id === "halloweenGentleGhost")?.status).toBe("available");
    const discovered = getCollectionEntries(
      { halloweenWitchCat: { firstSeenAt: "2026-10-30T23:00:00Z", seenCount: 1 } },
      new Date("2026-11-02T12:00:00"),
    );
    expect(discovered.find((entry) => entry.scene.id === "halloweenWitchCat")).toMatchObject({
      status: "discovered",
      achievement: { level: 1, totalLevels: 1, nextThreshold: undefined },
    });
    expect(discovered.reduce((total, entry) => total + entry.achievement.totalLevels, 0)).toBe(342);
  });

  it.each(slots)("draws the assigned recovery event with a 25 percent chance for %s", (time, sceneId) => {
    for (let day = 1; day <= 7; day += 1) {
      const now = new Date(`2026-11-0${day}${time.slice(10)}`);
      let wins = 0;
      for (let index = 0; index < 512; index += 1) {
        const result = resolveVisit(now, createInitialState(), { randomSeed: `visitor-${index}` });
        if (result.visit.scene.eventDate) {
          wins += 1;
          expect(result.visit.scene.id).toBe(sceneId);
        }
      }
      expect(wins / 512).toBeGreaterThan(0.19);
      expect(wins / 512).toBeLessThan(0.31);
    }
  });

  it("keeps both winning and losing recovery results stable across reloads", () => {
    const outcomes = new Set<boolean>();
    for (let day = 1; day <= 7; day += 1) {
      for (const [time] of slots) {
        const now = new Date(`2026-11-0${day}${time.slice(10)}`);
        const first = resolveVisit(now, createInitialState());
        const reload = resolveVisit(now, migrateGameState(first.state));
        outcomes.add(Boolean(first.visit.scene.eventDate));
        expect(reload.visit.assignment).toEqual(first.visit.assignment);
        expect(reload.state.discoveries).toEqual(first.state.discoveries);
      }
    }
    expect(outcomes.size).toBe(2);
  });

  it.each(slots)("offers every time band at least once in the real recovery schedule for %s", (time, sceneId) => {
    const wins = Array.from({ length: 6 }, (_, index) => new Date(`2026-11-0${index + 2}${time.slice(10)}`))
      .map((now) => resolveVisit(now, createInitialState()))
      .filter((result) => result.visit.scene.id === sceneId);
    expect(wins.length).toBeGreaterThan(0);
  });

  it("replaces a saved normal recovery assignment only on a winning slot", () => {
    for (let day = 1; day <= 7; day += 1) {
      const now = new Date(`2026-11-0${day}T08:00:00`);
      const old = resolveVisit(now, createInitialState(), { sceneId: "tooMuchBreakfast" });
      const interacted = applyInteraction(old.state, old.visit.assignment.slotKey, "eatTogether", now).state;
      const result = resolveVisit(now, migrateGameState(interacted));
      expect(result.state.discoveries.tooMuchBreakfast).toEqual(old.state.discoveries.tooMuchBreakfast);
      if (getEventScene(now)) {
        expect(result.visit.scene.id).toBe("halloweenWitchCat");
        expect(result.visit.interaction).toBeUndefined();
        expect(result.state.echoes).toEqual([]);
      } else {
        expect(result.visit.assignment).toEqual(old.visit.assignment);
        expect(result.visit.interaction).toEqual(interacted.interactions[old.visit.assignment.slotKey]);
        expect(result.state.echoes).toEqual(interacted.echoes);
      }
      const reload = resolveVisit(now, result.state);
      expect(reload.state.discoveries).toEqual(result.state.discoveries);
    }
  });

  it("ends an already saved Halloween deep-night scene at midnight on November 8", () => {
    const first = resolveVisit(new Date("2026-11-07T23:59:59"), createInitialState(), {
      sceneId: "halloweenGentleGhost",
    });
    const end = resolveVisit(new Date("2026-11-08T00:00:00"), migrateGameState(first.state));
    expect(end.visit.assignment.slotKey).toBe(first.visit.assignment.slotKey);
    expect(end.visit.scene.eventDate).toBeUndefined();
    expect(end.state.discoveries.halloweenGentleGhost).toEqual(first.state.discoveries.halloweenGentleGhost);
    const reload = resolveVisit(new Date("2026-11-08T05:29:59"), end.state);
    expect(reload.visit.assignment).toEqual(end.visit.assignment);
    expect(reload.state.discoveries).toEqual(end.state.discoveries);
  });

  it("keeps all unseen recovery events available until the final calendar day ends", () => {
    for (const time of ["2026-11-01T00:00:00", "2026-11-03T20:00:00", "2026-11-07T23:59:59"]) {
      const entries = getCollectionEntries({}, new Date(time)).filter((entry) => entry.scene.eventDate);
      expect(entries).toHaveLength(6);
      expect(entries.every((entry) => entry.status === "available")).toBe(true);
    }
    expect(getEventScene(new Date("2026-11-08T00:00:00"), "any-visitor")).toBeUndefined();
  });
});
