import { describe, it, expect } from "vitest";
import {
  addSeasonMarker,
  addWeekToBlock,
  moveBlock,
  removeBlock,
  removeWeekFromBlock,
  shrinkBlock,
  updateWeek,
} from "../../server/season-builder/mutations/seasonMutations.js";
import { assertSeason } from "../../server/season-builder/validation.js";
import type { Season } from "../../server/season-builder/types.js";

describe("seasonMutations smoke tests", () => {
  it("Block deletion inserts Blank Block", () => {
    const season: Season = {
      seasonId: "season-1",
      status: "draft",
      blocks: [
        {
          blockId: "block-1",
          name: "Real Block",
          tags: [],
          weeks: [
            {
              weekId: "week-1",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const result = removeBlock(season, "block-1");

    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].name).toBe("Blank Block");
    expect(result.blocks[0].weeks.length).toBeGreaterThanOrEqual(1);
  });

  it("Block shrinking stops at 1 week", () => {
    const season: Season = {
      seasonId: "season-2",
      status: "draft",
      blocks: [
        {
          blockId: "block-2",
          name: "Single Week",
          tags: [],
          weeks: [
            {
              weekId: "week-2",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    expect(() => shrinkBlock(season, "block-2")).toThrow();
    expect(season.blocks[0].weeks.length).toBe(1);
  });

  it("Removing last week is forbidden", () => {
    const season: Season = {
      seasonId: "season-3",
      status: "draft",
      blocks: [
        {
          blockId: "block-3",
          name: "Single Week",
          tags: [],
          weeks: [
            {
              weekId: "week-3",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    expect(() => removeWeekFromBlock(season, "block-3", "week-3")).toThrow();
  });

  it("Moving a block preserves internal week order", () => {
    const season: Season = {
      seasonId: "season-4",
      status: "draft",
      blocks: [
        {
          blockId: "block-4",
          name: "Ordered Block",
          tags: [],
          weeks: [
            {
              weekId: "week-a",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
            {
              weekId: "week-b",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
            {
              weekId: "week-c",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
        {
          blockId: "block-5",
          name: "Other Block",
          tags: [],
          weeks: [
            {
              weekId: "week-x",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const result = moveBlock(season, "block-4", 1);
    const moved = result.blocks.find((block) => block.blockId === "block-4");

    expect(moved?.weeks.map((week) => week.weekId)).toEqual(["week-a", "week-b", "week-c"]);
  });

  it("Adding a week generates a new UUID", () => {
    const season: Season = {
      seasonId: "season-5",
      status: "draft",
      blocks: [
        {
          blockId: "block-6",
          name: "Week Add",
          tags: [],
          weeks: [
            {
              weekId: "week-6",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const beforeIds = season.blocks[0].weeks.map((week) => week.weekId);
    const result = addWeekToBlock(season, "block-6");
    const afterIds = result.blocks[0].weeks.map((week) => week.weekId);

    expect(afterIds.length).toBe(beforeIds.length + 1);
    const newIds = afterIds.filter((id) => !beforeIds.includes(id));
    expect(newIds.length).toBe(1);
  });

  it("Updating a week does not affect siblings", () => {
    const weekA = {
      weekId: "week-7a",
      focus: null,
      stress: "low",
      volume: "low",
      intensity: "low",
    };
    const weekB = {
      weekId: "week-7b",
      focus: null,
      stress: "low",
      volume: "low",
      intensity: "low",
    };

    const season: Season = {
      seasonId: "season-6",
      status: "draft",
      blocks: [
        {
          blockId: "block-7",
          name: "Update Week",
          tags: [],
          weeks: [weekA, weekB],
        },
      ],
      seasonMarkers: [],
    };

    const result = updateWeek(season, "block-7", "week-7a", {
      focus: "speed",
      intensity: "high",
    });

    expect(result.blocks[0].weeks[1]).toEqual(weekB);
  });

  it("Markers do not affect blocks", () => {
    const season: Season = {
      seasonId: "season-7",
      status: "draft",
      blocks: [
        {
          blockId: "block-8",
          name: "Marker Block",
          tags: [],
          weeks: [
            {
              weekId: "week-8",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const result = addSeasonMarker(season, 0, "Race Week");

    expect(result.blocks).toEqual(season.blocks);
  });

  it("Markers may overlap", () => {
    const season: Season = {
      seasonId: "season-8",
      status: "draft",
      blocks: [
        {
          blockId: "block-9",
          name: "Overlap",
          tags: [],
          weeks: [
            {
              weekId: "week-9",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const withFirst = addSeasonMarker(season, 2, "Marker A");
    const withSecond = addSeasonMarker(withFirst, 2, "Marker B");

    expect(withSecond.seasonMarkers.length).toBe(2);
    expect(withSecond.seasonMarkers[0].weekIndex).toBe(2);
    expect(withSecond.seasonMarkers[1].weekIndex).toBe(2);
  });

  it("Invalid mutation triggers assertSeason", () => {
    const season: Season = {
      seasonId: "season-9",
      status: "draft",
      blocks: [
        {
          blockId: "block-10",
          name: "Invalid Update",
          tags: [],
          weeks: [
            {
              weekId: "week-10",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    expect(() =>
      updateWeek(season, "block-10", "week-10", {
        stress: "invalid" as unknown as Season["blocks"][number]["weeks"][number]["stress"],
      })
    ).toThrow();
  });

  it("All mutation results remain valid seasons", () => {
    const season: Season = {
      seasonId: "season-10",
      status: "draft",
      blocks: [
        {
          blockId: "block-11",
          name: "Valid Mutation",
          tags: [],
          weeks: [
            {
              weekId: "week-11",
              focus: null,
              stress: "low",
              volume: "low",
              intensity: "low",
            },
          ],
        },
      ],
      seasonMarkers: [],
    };

    const result = addWeekToBlock(season, "block-11");

    expect(() => assertSeason(result)).not.toThrow();
  });
});
