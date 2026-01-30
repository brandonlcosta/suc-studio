import type {
  Block,
  BlockMilestone,
  Challenge,
  RosterMember,
  Season,
  Week,
} from "../types/studio";

const weekKeyPattern = /^\d{4}-\d{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value: unknown, message: string): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, message);
}

function assertOptionalString(value: unknown, message: string): void {
  if (value === undefined) return;
  assert(typeof value === "string", message);
}

function assertStringArray(value: unknown, message: string): asserts value is string[] {
  assert(Array.isArray(value), message);
  value.forEach((entry, index) => {
    assert(typeof entry === "string", `${message} (index ${index})`);
  });
}

function assertWeekKey(value: unknown, message: string): asserts value is string {
  assert(typeof value === "string" && weekKeyPattern.test(value), message);
}

function assertMilestone(value: unknown, message: string): asserts value is BlockMilestone {
  assert(typeof value === "object" && value !== null, message);
  const milestone = value as BlockMilestone;
  assertWeekKey(milestone.week, `${message}.week must be YYYY-WW`);
  assert(
    milestone.type === "race" || milestone.type === "milestone",
    `${message}.type must be race or milestone`
  );
  if (milestone.label !== undefined) {
    assertOptionalString(milestone.label, `${message}.label must be a string`);
  }
}

export function assertSeasons(data: unknown): asserts data is Season[] {
  assert(Array.isArray(data), "Seasons must be an array.");
  data.forEach((item, index) => {
    assert(typeof item === "object" && item !== null, `Season[${index}] must be an object.`);
    const season = item as Season;
    assertString(season.id, `Season[${index}].id is required.`);
    assertString(season.name, `Season[${index}].name is required.`);
    assertOptionalString(season.description, `Season[${index}].description must be a string.`);
    assertWeekKey(season.startWeek, `Season[${index}].startWeek must be YYYY-WW.`);
    assertWeekKey(season.endWeek, `Season[${index}].endWeek must be YYYY-WW.`);
  });
}

export function assertBlocks(data: unknown): asserts data is Block[] {
  assert(Array.isArray(data), "Blocks must be an array.");
  data.forEach((item, index) => {
    assert(typeof item === "object" && item !== null, `Block[${index}] must be an object.`);
    const block = item as Block;
    assertString(block.id, `Block[${index}].id is required.`);
    assertString(block.seasonId, `Block[${index}].seasonId is required.`);
    assertString(block.name, `Block[${index}].name is required.`);
    assertWeekKey(block.startWeek, `Block[${index}].startWeek must be YYYY-WW.`);
    assert(
      Number.isInteger(block.lengthWeeks) && block.lengthWeeks >= 1,
      `Block[${index}].lengthWeeks must be an integer >= 1.`
    );
    assertString(block.intent, `Block[${index}].intent is required.`);
    assertStringArray(block.focusTags, `Block[${index}].focusTags must be an array.`);
    assert(Array.isArray(block.milestones), `Block[${index}].milestones must be an array.`);
    block.milestones.forEach((milestone, mIndex) => {
      assertMilestone(milestone, `Block[${index}].milestones[${mIndex}]`);
    });
  });
}

export function assertWeeks(data: unknown): asserts data is Week[] {
  assert(Array.isArray(data), "Weeks must be an array.");
  data.forEach((item, index) => {
    assert(typeof item === "object" && item !== null, `Week[${index}] must be an object.`);
    const week = item as Week;
    assertString(week.id, `Week[${index}].id is required.`);
    assertString(week.blockId, `Week[${index}].blockId is required.`);
    assertWeekKey(week.weekKey, `Week[${index}].weekKey must be YYYY-WW.`);
    assert(
      Number.isInteger(week.indexInBlock) && week.indexInBlock >= 1,
      `Week[${index}].indexInBlock must be an integer >= 1.`
    );
    assertString(week.title, `Week[${index}].title is required.`);
    assertStringArray(week.focusTags, `Week[${index}].focusTags must be an array.`);
    if (week.notes !== undefined) {
      assertOptionalString(week.notes, `Week[${index}].notes must be a string.`);
    }
  });
}

export function assertRoster(data: unknown): asserts data is RosterMember[] {
  assert(Array.isArray(data), "Roster must be an array.");
  data.forEach((item, index) => {
    assert(typeof item === "object" && item !== null, `Roster[${index}] must be an object.`);
    const member = item as RosterMember;
    assertString(member.id, `Roster[${index}].id is required.`);
    assertString(member.name, `Roster[${index}].name is required.`);
    assertString(member.email, `Roster[${index}].email is required.`);
    assert(emailPattern.test(member.email), `Roster[${index}].email is invalid.`);
    assert(
      member.status === "active" || member.status === "paused" || member.status === "alumni",
      `Roster[${index}].status is invalid.`
    );
    assert(
      member.tier === "MED" || member.tier === "LRG" || member.tier === "XL",
      `Roster[${index}].tier is invalid.`
    );
    assertString(member.joinedDate, `Roster[${index}].joinedDate is required.`);
    assert(datePattern.test(member.joinedDate), `Roster[${index}].joinedDate is invalid.`);
    assertOptionalString(
      member.trainingGoal,
      `Roster[${index}].trainingGoal must be a string.`
    );
    assertOptionalString(
      member.weeklyMileageRange,
      `Roster[${index}].weeklyMileageRange must be a string.`
    );
    assert(
      typeof member.consent === "object" && member.consent !== null,
      `Roster[${index}].consent is required.`
    );
    const consent = member.consent as RosterMember["consent"];
    ["publicName", "publicStory", "publicPhotos", "publicMetrics"].forEach((key) => {
      assert(
        typeof consent[key as keyof typeof consent] === "boolean",
        `Roster[${index}].consent.${key} must be boolean.`
      );
    });
  });
}

export function assertChallenges(data: unknown): asserts data is Challenge[] {
  assert(Array.isArray(data), "Challenges must be an array.");
  data.forEach((item, index) => {
    assert(typeof item === "object" && item !== null, `Challenge[${index}] must be an object.`);
    const challenge = item as Challenge;
    assertString(challenge.id, `Challenge[${index}].id is required.`);
    assertString(challenge.name, `Challenge[${index}].name is required.`);
    assertString(challenge.description, `Challenge[${index}].description is required.`);
    assertString(challenge.intent, `Challenge[${index}].intent is required.`);
    assert(
      challenge.startRef?.type === "week" || challenge.startRef?.type === "block",
      `Challenge[${index}].startRef.type is invalid.`
    );
    assertString(challenge.startRef.id, `Challenge[${index}].startRef.id is required.`);
    assert(
      challenge.endRef?.type === "week" || challenge.endRef?.type === "block",
      `Challenge[${index}].endRef.type is invalid.`
    );
    assertString(challenge.endRef.id, `Challenge[${index}].endRef.id is required.`);
    assertString(challenge.rules, `Challenge[${index}].rules is required.`);
    if (challenge.linkedWorkouts !== undefined) {
      assertStringArray(
        challenge.linkedWorkouts,
        `Challenge[${index}].linkedWorkouts must be an array.`
      );
    }
    if (challenge.linkedRoutes !== undefined) {
      assertStringArray(
        challenge.linkedRoutes,
        `Challenge[${index}].linkedRoutes must be an array.`
      );
    }
    assert(
      challenge.status === "active" || challenge.status === "archived",
      `Challenge[${index}].status is invalid.`
    );
  });
}
