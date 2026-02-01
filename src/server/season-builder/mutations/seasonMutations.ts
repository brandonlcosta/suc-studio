import { randomUUID } from "crypto";
import type { BlockInstance, Season, SeasonMarker, WeekInstance } from "../types.js";
import { assertSeason } from "../validation.js";

function cloneWeekWithNewId(week: WeekInstance): WeekInstance {
  return {
    ...week,
    weekId: randomUUID(),
  };
}

function cloneBlockTemplate(block?: BlockInstance): BlockInstance {
  if (!block) {
    return {
      blockId: randomUUID(),
      name: "Blank Block",
      tags: [],
      weeks: [
        {
          weekId: randomUUID(),
          focus: null,
          stress: "low",
          volume: "low",
          intensity: "low",
        },
      ],
    };
  }

  return {
    ...block,
    blockId: randomUUID(),
    tags: [...block.tags],
    weeks: block.weeks.map(cloneWeekWithNewId),
  };
}

function cloneSeasonWithBlocks(season: Season, blocks: BlockInstance[]): Season {
  return {
    ...season,
    blocks,
  };
}

function requireBlockIndex(season: Season, blockId: string): number {
  const index = season.blocks.findIndex((block) => block.blockId === blockId);
  if (index === -1) {
    throw new Error(`Block not found: ${blockId}`);
  }
  return index;
}

function requireWeekIndex(block: BlockInstance, weekId: string): number {
  const index = block.weeks.findIndex((week) => week.weekId === weekId);
  if (index === -1) {
    throw new Error(`Week not found: ${weekId}`);
  }
  return index;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export function addBlockAfter(
  season: Season,
  targetBlockId: string,
  blockTemplate?: BlockInstance
): Season {
  const index = requireBlockIndex(season, targetBlockId);
  const newBlock = cloneBlockTemplate(blockTemplate);
  const blocks = [...season.blocks];
  blocks.splice(index + 1, 0, newBlock);
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function removeBlock(season: Season, blockId: string): Season {
  const index = requireBlockIndex(season, blockId);
  const blocks = [...season.blocks];
  blocks.splice(index, 1, cloneBlockTemplate());
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function moveBlock(season: Season, blockId: string, newIndex: number): Season {
  if (!Number.isInteger(newIndex)) {
    throw new Error("newIndex must be an integer.");
  }

  const currentIndex = requireBlockIndex(season, blockId);
  const blocks = [...season.blocks];
  const [block] = blocks.splice(currentIndex, 1);

  if (newIndex < 0 || newIndex > blocks.length) {
    throw new Error("newIndex out of range.");
  }

  blocks.splice(newIndex, 0, block);
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function updateBlock(
  season: Season,
  blockId: string,
  partialUpdate: Partial<Pick<BlockInstance, "name" | "tags" | "raceAnchorId">>
): Season {
  const blockIndex = requireBlockIndex(season, blockId);
  const target = season.blocks[blockIndex];

  if (partialUpdate.name !== undefined) {
    assertNonEmptyString(partialUpdate.name, "block.name");
  }

  const updatedBlock: BlockInstance = {
    ...target,
    ...partialUpdate,
  };

  const blocks = [...season.blocks];
  blocks[blockIndex] = updatedBlock;
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function addWeekToBlock(
  season: Season,
  blockId: string,
  position?: number
): Season {
  const blockIndex = requireBlockIndex(season, blockId);
  const target = season.blocks[blockIndex];
  const weeks = [...target.weeks];
  const insertAt = position === undefined ? weeks.length : position;

  if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > weeks.length) {
    throw new Error("position out of range.");
  }

  const newWeek: WeekInstance = {
    weekId: randomUUID(),
    focus: null,
    stress: "low",
    volume: "low",
    intensity: "low",
  };

  weeks.splice(insertAt, 0, newWeek);

  const updatedBlock: BlockInstance = {
    ...target,
    weeks,
  };

  const blocks = [...season.blocks];
  blocks[blockIndex] = updatedBlock;
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function removeWeekFromBlock(
  season: Season,
  blockId: string,
  weekId: string
): Season {
  const blockIndex = requireBlockIndex(season, blockId);
  const target = season.blocks[blockIndex];
  if (target.weeks.length <= 1) {
    throw new Error("Cannot remove the last week from a block.");
  }

  const weekIndex = requireWeekIndex(target, weekId);
  const weeks = [...target.weeks];
  weeks.splice(weekIndex, 1);

  const updatedBlock: BlockInstance = {
    ...target,
    weeks,
  };

  const blocks = [...season.blocks];
  blocks[blockIndex] = updatedBlock;
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function updateWeek(
  season: Season,
  blockId: string,
  weekId: string,
  partialUpdate: Partial<WeekInstance>
): Season {
  const blockIndex = requireBlockIndex(season, blockId);
  const target = season.blocks[blockIndex];
  const weekIndex = requireWeekIndex(target, weekId);
  const updatedWeek: WeekInstance = {
    ...target.weeks[weekIndex],
    ...partialUpdate,
  };

  const weeks = [...target.weeks];
  weeks[weekIndex] = updatedWeek;

  const updatedBlock: BlockInstance = {
    ...target,
    weeks,
  };

  const blocks = [...season.blocks];
  blocks[blockIndex] = updatedBlock;
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function extendBlock(season: Season, blockId: string, count = 1): Season {
  assertPositiveInteger(count, "count");
  let nextSeason = season;
  for (let i = 0; i < count; i += 1) {
    nextSeason = addWeekToBlock(nextSeason, blockId);
  }
  return nextSeason;
}

export function shrinkBlock(season: Season, blockId: string, count = 1): Season {
  assertPositiveInteger(count, "count");
  const blockIndex = requireBlockIndex(season, blockId);
  const target = season.blocks[blockIndex];
  if (target.weeks.length - count < 1) {
    throw new Error("Cannot shrink block below one week.");
  }

  const weeks = target.weeks.slice(0, target.weeks.length - count);
  const updatedBlock: BlockInstance = {
    ...target,
    weeks,
  };

  const blocks = [...season.blocks];
  blocks[blockIndex] = updatedBlock;
  const nextSeason = cloneSeasonWithBlocks(season, blocks);
  assertSeason(nextSeason);
  return nextSeason;
}

export function addSeasonMarker(season: Season, weekIndex: number, label: string): Season {
  if (!Number.isInteger(weekIndex) || weekIndex < 0) {
    throw new Error("weekIndex must be a non-negative integer.");
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error("label must be a non-empty string.");
  }

  const marker: SeasonMarker = {
    markerId: randomUUID(),
    label,
    weekIndex,
  };

  const nextSeason: Season = {
    ...season,
    seasonMarkers: [...season.seasonMarkers, marker],
  };

  assertSeason(nextSeason);
  return nextSeason;
}

export function moveSeasonMarker(
  season: Season,
  markerId: string,
  newWeekIndex: number
): Season {
  if (!Number.isInteger(newWeekIndex) || newWeekIndex < 0) {
    throw new Error("newWeekIndex must be a non-negative integer.");
  }

  const markers = season.seasonMarkers.map((marker) =>
    marker.markerId === markerId ? { ...marker, weekIndex: newWeekIndex } : marker
  );

  if (!markers.some((marker) => marker.markerId === markerId)) {
    throw new Error(`Season marker not found: ${markerId}`);
  }

  const nextSeason: Season = {
    ...season,
    seasonMarkers: markers,
  };

  assertSeason(nextSeason);
  return nextSeason;
}

export function removeSeasonMarker(season: Season, markerId: string): Season {
  const markers = season.seasonMarkers.filter((marker) => marker.markerId !== markerId);
  if (markers.length === season.seasonMarkers.length) {
    throw new Error(`Season marker not found: ${markerId}`);
  }

  const nextSeason: Season = {
    ...season,
    seasonMarkers: markers,
  };

  assertSeason(nextSeason);
  return nextSeason;
}
