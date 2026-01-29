/**
 * Unit tests for validation rules V06-V10 (Day 3)
 */

import { describe, it, expect } from 'vitest';
import { runValidation } from '../validation/engine';
import { V06_SeasonContainsBlocks } from '../validation/rules/V06-season-contains-blocks';
import { V07_BlockContainsWeeks } from '../validation/rules/V07-block-contains-weeks';
import { V08_BlockChronology } from '../validation/rules/V08-block-chronology';
import { V09_WeekChronology } from '../validation/rules/V09-week-chronology';
import { V10_WeekStartMonday } from '../validation/rules/V10-week-start-monday';
import { Season, Block, Week } from '../validation/types';

describe('V06: Season Contains Block Dates', () => {
  it('passes when block dates are within season range', () => {
    const season: Season = {
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      blockIds: ['block-1']
    };

    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-05',
      endDate: '2026-01-20'
    };

    const result = V06_SeasonContainsBlocks.validate(block, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: [block],
      allWeeks: []
    });

    expect(result).toBeNull();
  });

  it('fails when block startDate is before season startDate (field path includes season index)', () => {
    const season: Season = {
      seasonId: 'season-1',
      startDate: '2026-01-10',
      endDate: '2026-02-01',
      blockIds: ['block-1']
    };

    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-05',
      endDate: '2026-01-20'
    };

    const result = V06_SeasonContainsBlocks.validate(block, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: [block],
      allWeeks: []
    });

    expect(result).not.toBeNull();
    expect(result?.severity).toBe('BLOCKING');
    expect(result?.field_path).toBe('season.blockIds[0].startDate');
  });
});

describe('V07: Block Contains Week Dates', () => {
  it('passes when week fits within block range', () => {
    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-05',
      endDate: '2026-01-25',
      weekIds: ['week-1']
    };

    const week: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-05',
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

    const result = V07_BlockContainsWeeks.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: [week]
    });

    expect(result).toBeNull();
  });

  it('fails when week starts before block startDate', () => {
    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-05',
      endDate: '2026-01-25',
      weekIds: ['week-1']
    };

    const week: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-02',
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

    const result = V07_BlockContainsWeeks.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: [week]
    });

    expect(result).not.toBeNull();
    expect(result?.rule_id).toBe('V07');
    expect(result?.field_path).toBe('block.weekIds[0].startDate');
  });
});

describe('V08: Blocks in Chronological Order', () => {
  it('passes when block startDates are strictly increasing', () => {
    const season: Season = {
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      blockIds: ['block-1', 'block-2']
    };

    const block1: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    };

    const block2: Block = {
      blockId: 'block-2',
      seasonId: 'season-1',
      startDate: '2026-02-01',
      endDate: '2026-03-01'
    };

    const result = V08_BlockChronology.validate(season, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: [block1, block2],
      allWeeks: []
    });

    expect(result).toBeNull();
  });

  it('fails when blocks overlap (overlap detection)', () => {
    const season: Season = {
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      blockIds: ['block-1', 'block-2']
    };

    const block1: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-02-15'
    };

    const block2: Block = {
      blockId: 'block-2',
      seasonId: 'season-1',
      startDate: '2026-02-01',
      endDate: '2026-03-01'
    };

    const result = V08_BlockChronology.validate(season, {
      mode: 'publish',
      allSeasons: [season],
      allBlocks: [block1, block2],
      allWeeks: []
    });

    expect(result).not.toBeNull();
    expect(result?.rule_id).toBe('V08');
    expect(result?.field_path).toBe('season.blockIds[1].startDate');
  });
});

describe('V09: Weeks in Chronological Order', () => {
  it('passes when week startDates are strictly increasing', () => {
    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      weekIds: ['week-1', 'week-2']
    };

    const week1: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-05',
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

    const week2: Week = {
      weekId: 'week-2',
      blockId: 'block-1',
      startDate: '2026-01-12',
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

    const result = V09_WeekChronology.validate(block, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: [week1, week2]
    });

    expect(result).toBeNull();
  });

  it('fails when weeks are out of order', () => {
    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      weekIds: ['week-1', 'week-2']
    };

    const week1: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-12',
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

    const week2: Week = {
      weekId: 'week-2',
      blockId: 'block-1',
      startDate: '2026-01-05',
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

    const result = V09_WeekChronology.validate(block, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [block],
      allWeeks: [week1, week2]
    });

    expect(result).not.toBeNull();
    expect(result?.rule_id).toBe('V09');
    expect(result?.field_path).toBe('block.weekIds[1].startDate');
  });
});

describe('V10: Week Start Date is Monday', () => {
  it('passes when week starts on Monday', () => {
    const week: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-12',
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

    const result = V10_WeekStartMonday.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week]
    });

    expect(result).toBeNull();
  });

  it('fails when week starts on Sunday', () => {
    const week: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-11',
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

    const result = V10_WeekStartMonday.validate(week, {
      mode: 'publish',
      allSeasons: [],
      allBlocks: [],
      allWeeks: [week]
    });

    expect(result).not.toBeNull();
    expect(result?.rule_id).toBe('V10');
    expect(result?.field_path).toBe('week.startDate');
    expect(result?.message).toContain('Sunday');
  });
});

describe('Day 3: Multiple violations aggregated', () => {
  it('aggregates V06, V09, and V10 issues in a single run', () => {
    const season: Season = {
      seasonId: 'season-1',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      blockIds: ['block-1']
    };

    const block: Block = {
      blockId: 'block-1',
      seasonId: 'season-1',
      startDate: '2026-01-05',
      endDate: '2026-02-05',
      weekIds: ['week-1', 'week-2']
    };

    const week1: Week = {
      weekId: 'week-1',
      blockId: 'block-1',
      startDate: '2026-01-12',
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

    const week2: Week = {
      weekId: 'week-2',
      blockId: 'block-1',
      startDate: '2026-01-05',
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

    const week3: Week = {
      weekId: 'week-3',
      blockId: 'block-1',
      startDate: '2026-01-14',
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

    const result = runValidation(
      { seasons: [season], blocks: [block], weeks: [week1, week2, week3] },
      [V06_SeasonContainsBlocks, V09_WeekChronology, V10_WeekStartMonday],
      'publish'
    );

    expect(result.issues.length).toBe(3);
    expect(result.summary.blocking_count).toBe(3);
    expect(result.can_save).toBe(true);
    expect(result.can_publish).toBe(false);
  });
});
