import * as sharedCalendar from "../../../../suc-shared-data/src/selectors/calendar.mjs";

export type CalendarSelectors = {
  resolveActiveSeason: (date: Date) => unknown | null;
  resolveWeekForDate: (season: unknown, date: Date) => { week: unknown; index: number } | null;
  resolveWorkoutOfDay: (date: Date) => unknown | null;
};

export const DEFAULT_TIME_ZONE = sharedCalendar.DEFAULT_TIME_ZONE as string;

export const createCalendarSelectors = sharedCalendar.createCalendarSelectors as (
  data: unknown,
  options?: { timeZone?: string; validate?: boolean }
) => CalendarSelectors;
