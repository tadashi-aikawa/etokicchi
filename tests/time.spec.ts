import { describe, expect, it } from "vitest";
import { addDays, formatLocalDate, getTimeBand, makeSlotKey, nextChronologicalSlot } from "../src/game/time.ts";

describe("time bands", () => {
  it.each([
    [0, "deepNight"],
    [4, "deepNight"],
    [5, "earlyMorning"],
    [7, "earlyMorning"],
    [8, "daytime"],
    [16, "daytime"],
    [17, "evening"],
    [19, "evening"],
    [20, "night"],
    [23, "night"],
  ] as const)("maps hour %i to %s", (hour, expected) => {
    expect(getTimeBand(new Date(2026, 7, 30, hour))).toBe(expected);
  });

  it("uses local dates for slot keys", () => {
    const date = new Date(2026, 0, 2, 6);
    expect(formatLocalDate(date)).toBe("2026-01-02");
    expect(makeSlotKey(formatLocalDate(date), getTimeBand(date))).toBe("2026-01-02:earlyMorning");
  });

  it("moves night to the next calendar day", () => {
    expect(nextChronologicalSlot("2026-08-30", "night")).toEqual({
      localDate: "2026-08-31",
      band: "deepNight",
    });
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});
