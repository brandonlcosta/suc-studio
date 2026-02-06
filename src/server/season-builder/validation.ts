import type {
  BlockInstance,
  DayAssignment,
  DayKey,
  WeekDays,
  IntensityLabel,
  Season,
  SeasonMarker,
  SeasonStatus,
  WeekFocus,
  WeekInstance,
} from "./types.js";

const INTENSITY_LABELS: IntensityLabel[] = [
  "low",
  "low-med",
  "med",
  "med-high",
  "high",
  "very-high",
];

const WEEK_FOCUS_LABELS: WeekFocus[] = [
  "base",
  "deload",
  "speed",
  "hill-power",
  "mileage",
  "ultra",
  "heat",
  "taper",
  null,
];

const SEASON_STATUSES: SeasonStatus[] = ["draft", "published"];
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDenseArray(value: unknown, path: string): asserts value is unknown[] {
  assert(Array.isArray(value), `${path} must be an array.`);
  for (let i = 0; i < value.length; i += 1) {
    assert(i in value, `${path}[${i}] must not be empty.`);
  }
}

function assertNonEmptyString(value: unknown, path: string): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be a non-empty string.`);
}

function assertIntensityLabel(value: unknown, path: string): asserts value is IntensityLabel {
  assert(INTENSITY_LABELS.includes(value as IntensityLabel), `${path} must be a valid intensity label.`);
}

function assertWeekFocus(value: unknown, path: string): asserts value is WeekFocus {
  const isValid = WEEK_FOCUS_LABELS.includes(value as WeekFocus);
  assert(isValid, `${path} must be a valid focus label or null.`);
}

function assertDayAssignment(value: unknown, path: string): asserts value is DayAssignment {
  assert(typeof value === "object" && value !== null, `${path} must be an object.`);
  const assignment = value as DayAssignment;
  if (assignment.workoutId !== undefined) {
    assertNonEmptyString(assignment.workoutId, `${path}.workoutId`);
  }
  if (assignment.notes !== undefined) {
    assert(typeof assignment.notes === "string", `${path}.notes must be a string.`);
  }
}

function assertWeekDays(value: unknown, path: string): asserts value is WeekDays {
  assert(typeof value === "object" && value !== null, `${path} must be an object.`);
  const days = value as WeekDays;
  for (const key of DAY_KEYS) {
    assert(key in days, `${path}.${key} is required when days is provided.`);
    assertDayAssignment(days[key], `${path}.${key}`);
  }
}

function assertWeekInstance(value: unknown, path: string): asserts value is WeekInstance {
  assert(typeof value === "object" && value !== null, `${path} must be an object.`);
  const week = value as WeekInstance;
  assertNonEmptyString(week.weekId, `${path}.weekId`);
  assertWeekFocus(week.focus, `${path}.focus`);
  assertIntensityLabel(week.stress, `${path}.stress`);
  assertIntensityLabel(week.volume, `${path}.volume`);
  assertIntensityLabel(week.intensity, `${path}.intensity`);
  if (week.days !== undefined) {
    assertWeekDays(week.days, `${path}.days`);
  }
}

function assertBlockInstance(value: unknown, path: string): asserts value is BlockInstance {
  assert(typeof value === "object" && value !== null, `${path} must be an object.`);
  const block = value as BlockInstance;
  assertNonEmptyString(block.blockId, `${path}.blockId`);
  assertNonEmptyString(block.name, `${path}.name`);
  assertDenseArray(block.tags, `${path}.tags`);
  for (let i = 0; i < block.tags.length; i += 1) {
    assertNonEmptyString(block.tags[i], `${path}.tags[${i}]`);
  }
  assertDenseArray(block.weeks, `${path}.weeks`);
  assert(block.weeks.length >= 1, `${path}.weeks must contain at least one week.`);
  for (let i = 0; i < block.weeks.length; i += 1) {
    assertWeekInstance(block.weeks[i], `${path}.weeks[${i}]`);
  }
  if (block.raceAnchorId !== undefined) {
    assertNonEmptyString(block.raceAnchorId, `${path}.raceAnchorId`);
  }
}

function assertSeasonMarker(value: unknown, path: string): asserts value is SeasonMarker {
  assert(typeof value === "object" && value !== null, `${path} must be an object.`);
  const marker = value as SeasonMarker;
  assertNonEmptyString(marker.markerId, `${path}.markerId`);
  assertNonEmptyString(marker.label, `${path}.label`);
  assert(Number.isInteger(marker.weekIndex) && marker.weekIndex >= 0, `${path}.weekIndex must be a non-negative integer.`);
}

export function assertSeason(value: unknown): asserts value is Season {
  assert(typeof value === "object" && value !== null, "Season must be an object.");
  const season = value as Season;
  assertNonEmptyString(season.seasonId, "season.seasonId");
  assert(SEASON_STATUSES.includes(season.status), "season.status must be draft or published.");
  if (season.startDate !== undefined && season.startDate !== null) {
    assertNonEmptyString(season.startDate, "season.startDate");
  }
  assertDenseArray(season.blocks, "season.blocks");
  assert(season.blocks.length >= 1, "season.blocks must contain at least one block.");
  for (let i = 0; i < season.blocks.length; i += 1) {
    assertBlockInstance(season.blocks[i], `season.blocks[${i}]`);
  }
  assertDenseArray(season.seasonMarkers, "season.seasonMarkers");
  for (let i = 0; i < season.seasonMarkers.length; i += 1) {
    assertSeasonMarker(season.seasonMarkers[i], `season.seasonMarkers[${i}]`);
  }
}

export function assertSeasonForSave(
  value: unknown,
  expectedStatus?: SeasonStatus
): asserts value is Season {
  assertSeason(value);
  const season = value as Season;
  if (expectedStatus) {
    assert(
      season.status === expectedStatus,
      `season.status must be ${expectedStatus} when saving.`
    );
  }
}
