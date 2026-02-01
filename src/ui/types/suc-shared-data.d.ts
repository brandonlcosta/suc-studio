declare module "../../../../suc-shared-data/src/selectors/calendar.mjs" {
  export const DEFAULT_TIME_ZONE: string;
  export function createCalendarSelectors(
    data: unknown,
    options?: { timeZone?: string; validate?: boolean }
  ): {
    resolveActiveSeason: (date: Date) => unknown | null;
    resolveWeekForDate: (season: unknown, date: Date) => { week: unknown; index: number } | null;
    resolveWorkoutOfDay: (date: Date) => unknown | null;
  };
}
