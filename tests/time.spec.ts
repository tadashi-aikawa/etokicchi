import { describe, expect, it } from "vitest";
import {
  addDays,
  formatLocalDate,
  formatSlotDate,
  getSlotKey,
  getTimeBand,
  makeSlotKey,
  millisecondsUntilNextMinute,
  nextChronologicalSlot,
} from "../src/game/time.ts";

describe("time bands", () => {
  it.each([
    [5, 29, "deepNight"],
    [5, 30, "earlyMorning"],
    [7, 29, "earlyMorning"],
    [7, 30, "morning"],
    [10, 59, "morning"],
    [11, 0, "daytime"],
    [15, 29, "daytime"],
    [15, 30, "evening"],
    [18, 59, "evening"],
    [19, 0, "night"],
    [22, 59, "night"],
    [23, 0, "deepNight"],
  ] as const)("maps %i:%i to %s", (hour, minute, expected) => {
    expect(getTimeBand(new Date(2026, 7, 30, hour, minute))).toBe(expected);
  });

  it("uses local dates for slot keys", () => {
    const date = new Date(2026, 0, 2, 8);
    expect(formatLocalDate(date)).toBe("2026-01-02");
    expect(makeSlotKey(formatSlotDate(date), getTimeBand(date))).toBe("2026-01-02:morning");
  });

  it("keeps after-midnight deep night in the previous calendar slot", () => {
    expect(formatSlotDate(new Date(2026, 7, 31, 1))).toBe("2026-08-30");
    expect(formatSlotDate(new Date(2026, 7, 31, 5, 29))).toBe("2026-08-30");
    expect(formatSlotDate(new Date(2026, 7, 31, 5, 30))).toBe("2026-08-31");
  });

  it("builds a slot key using the deep-night date boundary", () => {
    expect(getSlotKey(new Date(2026, 8, 3, 1))).toBe("2026-09-02:deepNight");
    expect(getSlotKey(new Date(2026, 8, 3, 5, 30))).toBe("2026-09-03:earlyMorning");
  });

  it("calculates the delay to the next minute boundary", () => {
    expect(millisecondsUntilNextMinute(new Date(2026, 8, 3, 12, 34, 0, 0))).toBe(60_000);
    expect(millisecondsUntilNextMinute(new Date(2026, 8, 3, 12, 34, 45, 250))).toBe(14_750);
    expect(millisecondsUntilNextMinute(new Date(2026, 8, 3, 12, 34, 59, 999))).toBe(1);
  });

  it("moves deep night to the next slot date's early morning", () => {
    expect(nextChronologicalSlot("2026-08-30", "night")).toEqual({
      localDate: "2026-08-30",
      band: "deepNight",
    });
    expect(nextChronologicalSlot("2026-08-30", "deepNight")).toEqual({
      localDate: "2026-08-31",
      band: "earlyMorning",
    });
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});
