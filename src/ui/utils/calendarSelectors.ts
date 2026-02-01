import calendarData from "../../data/calendar.json";
import type { TierVariant, Workout } from "../types";

export type CalendarDay = {
  block: { blockId: string; name: string; intent: string } | null;
  week: { weekId: string; index: number; startDate: string } | null;
  workout: Workout | null;
  tiers: Record<string, TierVariant> | null;
  tierSources: Record<string, string> | null;
};

export type CalendarIndex = {
  timeZone: string;
  days: Record<string, CalendarDay>;
};

const calendarIndex = calendarData as CalendarIndex;

export const DEFAULT_TIME_ZONE = calendarIndex.timeZone;
export const calendarByDate = calendarIndex.days;
