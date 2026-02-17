const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK_ID_PATTERN = /^(\d{4})-WK-(\d{2})$/;

type ParsedWeekId = {
  year: number;
  weekNumber: number;
};

export type SUCWeekBounds = {
  monday: Date;
  sunday: Date;
};

function toUtcStartOfDay(input: Date | string | number): Date | null {
  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function getUtcMonday(date: Date): Date {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addUtcDays(date, offset);
}

function getWeekOneMonday(year: number): Date {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  return getUtcMonday(jan1);
}

function resolveWeekYear(date: Date): number {
  const year = date.getUTCFullYear();
  const nextYearWeekOne = getWeekOneMonday(year + 1);
  if (date >= nextYearWeekOne) {
    return year + 1;
  }
  const thisYearWeekOne = getWeekOneMonday(year);
  if (date < thisYearWeekOne) {
    return year - 1;
  }
  return year;
}

export function parseSUCWeekId(weekId: string): ParsedWeekId | null {
  const match = String(weekId || "").trim().toUpperCase().match(WEEK_ID_PATTERN);
  if (!match) return null;
  return {
    year: Number(match[1]),
    weekNumber: Number(match[2]),
  };
}

export function getMaxSUCWeeksInYear(year: number): number | null {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    return null;
  }
  const start = getWeekOneMonday(year);
  const nextStart = getWeekOneMonday(year + 1);
  return Math.round((nextStart.getTime() - start.getTime()) / MS_PER_DAY / 7);
}

export function isValidSUCWeekId(weekId: string): boolean {
  const parsed = parseSUCWeekId(weekId);
  if (!parsed) return false;
  const maxWeeks = getMaxSUCWeeksInYear(parsed.year);
  if (!maxWeeks) return false;
  return parsed.weekNumber >= 1 && parsed.weekNumber <= maxWeeks;
}

export function getSUCWeekId(date: Date = new Date()): string | null {
  const day = toUtcStartOfDay(date);
  if (!day) return null;
  const year = resolveWeekYear(day);
  const weekOneMonday = getWeekOneMonday(year);
  const weekNumber = Math.floor((day.getTime() - weekOneMonday.getTime()) / MS_PER_DAY / 7) + 1;
  if (weekNumber < 1) return null;
  return `${year}-WK-${String(weekNumber).padStart(2, "0")}`;
}

export function getSUCWeekBounds(weekId: string): SUCWeekBounds | null {
  const parsed = parseSUCWeekId(weekId);
  if (!parsed || !isValidSUCWeekId(weekId)) return null;

  const weekOneMonday = getWeekOneMonday(parsed.year);
  const monday = addUtcDays(weekOneMonday, (parsed.weekNumber - 1) * 7);
  const sunday = addUtcDays(monday, 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { monday, sunday };
}

function clampBoundsToWeekYear(weekId: string, bounds: SUCWeekBounds): SUCWeekBounds | null {
  const parsed = parseSUCWeekId(weekId);
  if (!parsed) return null;

  const yearStart = new Date(Date.UTC(parsed.year, 0, 1));
  const yearEnd = new Date(Date.UTC(parsed.year, 11, 31, 23, 59, 59, 999));
  const monday = bounds.monday < yearStart ? yearStart : bounds.monday;
  const sunday = bounds.sunday > yearEnd ? yearEnd : bounds.sunday;
  return { monday, sunday };
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatSUCWeekRange(weekId: string): string | null {
  const bounds = getSUCWeekBounds(weekId);
  if (!bounds) return null;
  const clamped = clampBoundsToWeekYear(weekId, bounds);
  if (!clamped) return null;

  const sameMonth =
    clamped.monday.getUTCFullYear() === clamped.sunday.getUTCFullYear() &&
    clamped.monday.getUTCMonth() === clamped.sunday.getUTCMonth();
  if (sameMonth) {
    return `${formatShortDate(clamped.monday)}-${clamped.sunday.getUTCDate()}`;
  }
  return `${formatShortDate(clamped.monday)}-${formatShortDate(clamped.sunday)}`;
}

export function formatSUCWeekLabel(weekId: string): string | null {
  const parsed = parseSUCWeekId(weekId);
  if (!parsed || !isValidSUCWeekId(weekId)) return null;
  const range = formatSUCWeekRange(weekId);
  if (!range) return null;
  return `WK-${String(parsed.weekNumber).padStart(2, "0")} - ${range}`;
}

export function getCurrentSUCWeekId(referenceDate: Date = new Date()): string | null {
  return getSUCWeekId(referenceDate);
}

export function getNextSUCWeekId(referenceDate: Date = new Date()): string | null {
  const start = toUtcStartOfDay(referenceDate);
  if (!start) return null;
  return getSUCWeekId(addUtcDays(start, 7));
}

