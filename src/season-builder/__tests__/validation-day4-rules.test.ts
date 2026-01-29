/**
 * Unit tests for validation rules V11-V13 (Day 4)
 */

import { describe, it, expect } from 'vitest';
import { runValidation } from '../validation/engine';
import { V11_SeasonBlockReferences } from '../validation/rules/V11-season-block-references';
import { V12_BlockWeekReferences } from '../validation/rules/V12-block-week-references';
import { V13_WeekWorkoutReferences } from '../validation/rules/V13-week-workout-references';
import { Season, Block, Week, Workout } from '../validation/types';

describe('V11: Season -> Block References Exist', () => {
  it('passes when all blockIds exist', () => {
    const season: Season = {
      seasonId: 'season-1',
      blockIds: ['block-1', 'block-2']
    };

    const blocks: Block[] = [
      { blockId: 'block-1' },
      { blockId: 'block-2' }
    ];

    const result = V11_SeasonBlockReferences.validate(season, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: blocks,
      allWeeks: []
    });

    expect(result).toBeNull();
  });

  it('fails when referenced block is missing', () => {
    const season: Season = {
      seasonId: 'season-1',
      blockIds: ['block-1', 'block-2']
    };

    const blocks: Block[] = [
      { blockId: 'block-1' }
    ];

    const result = V11_SeasonBlockReferences.validate(season, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: blocks,
      allWeeks: []
    });

    expect(result).not.toBeNull();
    expect(result?.severity).toBe('BLOCKING');
    expect(result?.field_path).toBe('season.blockIds[1]');
  });
});

describe('V12: Block -> Week References Exist', () => {
  it('passes when all weekIds exist', () => {
    const block: Block = {
      blockId: 'block-1',
      weekIds: ['week-1', 'week-2']
    };

    const weeks: Week[] = [
      { weekId: 'week-1' },
      { weekId: 'week-2' }
    ];

    const result = V12_BlockWeekReferences.validate(block, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: weeks
    });

    expect(result).toBeNull();
  });

  it('fails when referenced week is missing', () => {
    const block: Block = {
      blockId: 'block-1',
      weekIds: ['week-1']
    };

    const weeks: Week[] = [];

    const result = V12_BlockWeekReferences.validate(block, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: weeks
    });

    expect(result).not.toBeNull();
    expect(result?.severity).toBe('BLOCKING');
    expect(result?.field_path).toBe('block.weekIds[0]');
  });
});

describe('V13: Week -> Workout References Exist + Version Syntax', () => {
  it('passes when referenced workouts exist', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: 'workout-base',
        tue: null,
        wed: 'workout-tempo@v2',
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const workouts: Workout[] = [
      { workoutId: 'workout-base', version: 1 },
      { workoutId: 'workout-tempo', version: 1 },
      { workoutId: 'workout-tempo', version: 2 }
    ];

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: workouts
    });

    expect(result).toBeNull();
  });

  it('ignores rest days (null)', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: []
    });

    expect(result).toBeNull();
  });

  it('fails when workout reference is missing', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: null,
        tue: 'workout-missing',
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: []
    });

    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('week.workoutIds.tue');
    expect(result?.message).toContain('Workout not found');
  });

  it('fails when version syntax is invalid (@v)', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: 'workout@v',
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: []
    });

    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('week.workoutIds.mon');
    expect(result?.message).toContain('Invalid workout version syntax');
  });

  it('fails when version is zero (@v0)', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: 'workout@v0',
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: []
    });

    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('week.workoutIds.mon');
    expect(result?.message).toContain('Invalid workout version syntax');
  });

  it('fails when version is negative (@v-1)', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: 'workout@v-1',
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: []
    });

    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('week.workoutIds.mon');
    expect(result?.message).toContain('Invalid workout version syntax');
  });

  it('fails when workout version does not exist', () => {
    const week: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: 'workout-tempo@v99',
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const workouts: Workout[] = [
      { workoutId: 'workout-tempo', version: 1 }
    ];

    const result = V13_WeekWorkoutReferences.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week],
      allWorkouts: workouts
    });

    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('week.workoutIds.mon');
    expect(result?.message).toContain('Workout version not found');
  });
});

describe('Day 4: Multiple missing references aggregated', () => {
  it('aggregates V11, V12, V13 issues in a single run', () => {
    const season: Season = {
      seasonId: 'season-1',
      blockIds: ['block-missing']
    };

    const block: Block = {
      blockId: 'block-1',
      weekIds: ['week-missing']
    };

    const weekMissingWorkout: Week = {
      weekId: 'week-1',
      workoutIds: {
        mon: null,
        tue: 'workout-missing',
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null
      }
    };

    const result = runValidation(
      {
        seasons: [season],
        blocks: [block],
        weeks: [weekMissingWorkout],
        workouts: []
      },
      [V11_SeasonBlockReferences, V12_BlockWeekReferences, V13_WeekWorkoutReferences],
      'publish'
    );

    expect(result.issues.length).toBe(3);
    expect(result.summary.blocking_count).toBe(3);
    expect(result.can_save).toBe(true);
    expect(result.can_publish).toBe(false);
  });
});
