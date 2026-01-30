type WeekKeyParts = { year: number; week: number };

const weekKeyPattern = /^(\d{4})-(\d{2})$/;

function assertValidWeekKey(weekKey: string): WeekKeyParts {
  const match = weekKeyPattern.exec(weekKey);
  if (!match) {
    throw new Error(`Invalid week key format: ${weekKey}`);
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    throw new Error(`Invalid week key value: ${weekKey}`);
  }
  return { year, week };
}

export function parseWeekKey(weekKey: string): WeekKeyParts {
  return assertValidWeekKey(weekKey);
}

export function formatWeekKey({ year, week }: WeekKeyParts): string {
  if (!Number.isInteger(year) || !Number.isInteger(week)) {
    throw new Error("Year and week must be integers.");
  }
  if (week < 1 || week > 53) {
    throw new Error(`Week out of range: ${week}`);
  }
  return `${year}-${String(week).padStart(2, "0")}`;
}

function startOfIsoWeekOne(year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(Date.UTC(year, 0, 4 - (dayOfWeek - 1)));
  return monday;
}

export function getWeekStartDate(weekKey: string): Date {
  const { year, week } = assertValidWeekKey(weekKey);
  const weekOne = startOfIsoWeekOne(year);
  const result = new Date(weekOne);
  result.setUTCDate(weekOne.getUTCDate() + (week - 1) * 7);
  return result;
}

export function getWeekEndDate(weekKey: string): Date {
  const start = getWeekStartDate(weekKey);
  const result = new Date(start);
  result.setUTCDate(start.getUTCDate() + 6);
  return result;
}

function weekKeyFromDate(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const isoYear = utcDate.getUTCFullYear();
  const weekOne = startOfIsoWeekOne(isoYear);
  const diffDays = Math.round((utcDate.getTime() - weekOne.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return formatWeekKey({ year: isoYear, week });
}

export function addWeeks(weekKey: string, amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error("Weeks to add must be an integer.");
  }
  const start = getWeekStartDate(weekKey);
  const moved = new Date(start);
  moved.setUTCDate(start.getUTCDate() + amount * 7);
  return weekKeyFromDate(moved);
}

export function compareWeekKey(a: string, b: string): -1 | 0 | 1 {
  const first = assertValidWeekKey(a);
  const second = assertValidWeekKey(b);
  if (first.year === second.year && first.week === second.week) {
    return 0;
  }
  if (first.year < second.year || (first.year === second.year && first.week < second.week)) {
    return -1;
  }
  return 1;
}

export function rangeWeeks(startWeek: string, endWeek: string): string[] {
  if (compareWeekKey(startWeek, endWeek) === 1) {
    throw new Error(`Start week ${startWeek} is after end week ${endWeek}`);
  }
  const weeks: string[] = [];
  let current = startWeek;
  weeks.push(current);
  while (compareWeekKey(current, endWeek) === -1) {
    current = addWeeks(current, 1);
    weeks.push(current);
  }
  return weeks;
}
