import type { TimeBand } from "./types.ts";

export const TIME_BANDS: readonly TimeBand[] = ["earlyMorning", "morning", "daytime", "evening", "night", "deepNight"];

export const TIME_BAND_LABELS: Record<TimeBand, string> = {
  earlyMorning: "早朝",
  morning: "朝",
  daytime: "昼",
  evening: "夕方",
  night: "夜",
  deepNight: "深夜",
};

export function getTimeBand(date: Date): TimeBand {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 5 * 60 + 30) return "deepNight";
  if (minutes < 7 * 60 + 30) return "earlyMorning";
  if (minutes < 11 * 60) return "morning";
  if (minutes < 15 * 60 + 30) return "daytime";
  if (minutes < 19 * 60) return "evening";
  if (minutes < 23 * 60) return "night";
  return "deepNight";
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

export function formatSlotDate(date: Date): string {
  const localDate = formatLocalDate(date);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes < 5 * 60 + 30 ? addDays(localDate, -1) : localDate;
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
    case "earlyMorning":
      return { localDate, band: "morning" };
    case "morning":
      return { localDate, band: "daytime" };
    case "daytime":
      return { localDate, band: "evening" };
    case "evening":
      return { localDate, band: "night" };
    case "night":
      return { localDate, band: "deepNight" };
    case "deepNight":
      return { localDate: addDays(localDate, 1), band: "earlyMorning" };
  }
}
