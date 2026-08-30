import type { TimeBand } from "./types.ts";

export const TIME_BANDS: readonly TimeBand[] = ["deepNight", "earlyMorning", "daytime", "evening", "night"];

export const TIME_BAND_LABELS: Record<TimeBand, string> = {
  deepNight: "深夜",
  earlyMorning: "早朝",
  daytime: "昼間",
  evening: "夕方",
  night: "夜",
};

export function getTimeBand(date: Date): TimeBand {
  const hour = date.getHours();
  if (hour < 5) return "deepNight";
  if (hour < 8) return "earlyMorning";
  if (hour < 17) return "daytime";
  if (hour < 20) return "evening";
  return "night";
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function makeSlotKey(localDate: string, band: TimeBand): string {
  return `${localDate}:${band}`;
}

export function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid local date: ${localDate}`);
  }
  return formatLocalDate(new Date(year, month - 1, day + days, 12));
}

export function nextChronologicalSlot(localDate: string, band: TimeBand): { localDate: string; band: TimeBand } {
  switch (band) {
    case "deepNight":
      return { localDate, band: "earlyMorning" };
    case "earlyMorning":
      return { localDate, band: "daytime" };
    case "daytime":
      return { localDate, band: "evening" };
    case "evening":
      return { localDate, band: "night" };
    case "night":
      return { localDate: addDays(localDate, 1), band: "deepNight" };
  }
}
