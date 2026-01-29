/**
 * Unit tests for validation rules V01-V05
 */

import { describe, it, expect } from 'vitest';
import { V01_Rules } from '../validation/rules/V01-required-fields';
import { V02_Rules } from '../validation/rules/V02-id-uniqueness';
import { V03_Rules } from '../validation/rules/V03-date-format';
import { V04_Rules } from '../validation/rules/V04-enum-values';
import { V05_Rules } from '../validation/rules/V05-date-range';
import { Season, Block, Week, ValidationContext } from '../validation/types';

const createContext = (overrides?: Partial<ValidationContext>): ValidationContext => ({
  mode: 'save',
  allSeasons: [],
  allBlocks: [],
  allWeeks: [],
  ...overrides
});

describe('V01: Required Fields', () => {
  const rule = V01_Rules[0]; // Season required fields

  it('passes when all required fields present', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test Season',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).toBeNull();
  });

  it('fails when seasonId missing', () => {
    const season: any = {
      name: 'Test Season',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('seasonId');
  });

  it('fails when name is empty string', () => {
    const season: Season = {
      seasonId: 'test',
      name: '',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.field_path).toBe('season.name');
  });

  it('fails when status missing', () => {
    const season: any = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: []
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.message).toContain('status');
  });
});

describe('V02: ID Uniqueness', () => {
  const rule = V02_Rules[0]; // Season ID uniqueness

  it('passes when ID is unique', () => {
    const season: Season = {
      seasonId: 'unique-id',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const context = createContext({
      allSeasons: [season]
    });

    const result = rule.validate(season, context);
    expect(result).toBeNull();
  });

  it('fails when duplicate ID exists', () => {
    const season1: Season = {
      seasonId: 'duplicate',
      name: 'Season 1',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const season2: Season = {
      seasonId: 'duplicate',
      name: 'Season 2',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const context = createContext({
      allSeasons: [season1, season2]
    });

    const result = rule.validate(season1, context);
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('Duplicate');
    expect(result?.message).toContain('duplicate');
  });

  it('passes when only one instance of ID', () => {
    const season: Season = {
      seasonId: 'single',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const other: Season = {
      seasonId: 'other',
      name: 'Other',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const context = createContext({
      allSeasons: [season, other]
    });

    const result = rule.validate(season, context);
    expect(result).toBeNull();
  });
});

describe('V03: Date Format', () => {
  const rule = V03_Rules[0]; // Season date format

  it('passes with valid ISO dates', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).toBeNull();
  });

  it('fails with invalid date format (missing leading zero)', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-1-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.field_path).toBe('season.startDate');
    expect(result?.message).toContain('Invalid date format');
  });

  it('fails with impossible date (Feb 30)', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-02-30',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('Invalid calendar date');
  });

  it('fails with invalid endDate format', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '04/19/2026',
      blockIds: [],
      status: 'draft'
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('season.endDate');
  });

  it('validates publishedAt timestamp format', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'active',
      publishedAt: '2026-01-15 14:30:00' // Missing T and Z
    };

    const result = rule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.field_path).toBe('season.publishedAt');
    expect(result?.message).toContain('timezone');
  });

  it('passes with valid publishedAt timestamp', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'active',
      publishedAt: '2026-01-15T14:30:00Z'
    };

    const result = rule.validate(season, createContext());
    expect(result).toBeNull();
  });
});

describe('V04: Enum Values', () => {
  const seasonRule = V04_Rules[0]; // Season status
  const blockRule = V04_Rules[1]; // Block phase

  it('passes with valid season status', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = seasonRule.validate(season, createContext());
    expect(result).toBeNull();
  });

  it('accepts all valid season statuses', () => {
    const statuses = ['draft', 'active', 'archived'];

    for (const status of statuses) {
      const season: Season = {
        seasonId: 'test',
        name: 'Test',
        startDate: '2026-01-12',
        endDate: '2026-04-19',
        blockIds: [],
        status
      };

      const result = seasonRule.validate(season, createContext());
      expect(result).toBeNull();
    }
  });

  it('fails with invalid season status', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'pending'
    };

    const result = seasonRule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('Invalid status');
    expect(result?.message).toContain('pending');
  });

  it('passes with valid block phase', () => {
    const block: Block = {
      blockId: 'test',
      seasonId: 'season-1',
      name: 'Base 1',
      phase: 'base',
      startDate: '2026-01-12',
      endDate: '2026-02-01',
      weekIds: []
    };

    const result = blockRule.validate(block, createContext());
    expect(result).toBeNull();
  });

  it('accepts all valid block phases', () => {
    const phases = ['base', 'build', 'peak', 'taper', 'recovery'];

    for (const phase of phases) {
      const block: Block = {
        blockId: 'test',
        seasonId: 'season-1',
        name: 'Test',
        phase,
        startDate: '2026-01-12',
        endDate: '2026-02-01',
        weekIds: []
      };

      const result = blockRule.validate(block, createContext());
      expect(result).toBeNull();
    }
  });

  it('fails with invalid block phase', () => {
    const block: Block = {
      blockId: 'test',
      seasonId: 'season-1',
      name: 'Test',
      phase: 'ramp',
      startDate: '2026-01-12',
      endDate: '2026-02-01',
      weekIds: []
    };

    const result = blockRule.validate(block, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('Invalid phase');
    expect(result?.message).toContain('ramp');
  });
});

describe('V05: Date Range', () => {
  const seasonRule = V05_Rules[0]; // Season date range
  const blockRule = V05_Rules[1]; // Block date range

  it('passes when start date before end date', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = seasonRule.validate(season, createContext());
    expect(result).toBeNull();
  });

  it('fails when start date after end date', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-04-19',
      endDate: '2026-01-12',
      blockIds: [],
      status: 'draft'
    };

    const result = seasonRule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
    expect(result?.message).toContain('before end date');
  });

  it('fails when start date equals end date', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-01-12',
      blockIds: [],
      status: 'draft'
    };

    const result = seasonRule.validate(season, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
  });

  it('validates block date range', () => {
    const block: Block = {
      blockId: 'test',
      seasonId: 'season-1',
      name: 'Test',
      phase: 'base',
      startDate: '2026-01-12',
      endDate: '2026-02-01',
      weekIds: []
    };

    const result = blockRule.validate(block, createContext());
    expect(result).toBeNull();
  });

  it('fails block when dates reversed', () => {
    const block: Block = {
      blockId: 'test',
      seasonId: 'season-1',
      name: 'Test',
      phase: 'base',
      startDate: '2026-02-01',
      endDate: '2026-01-12',
      weekIds: []
    };

    const result = blockRule.validate(block, createContext());
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('CRITICAL');
  });

  it('skips validation if dates invalid (caught by V03)', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: 'invalid',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    // V05 should not fire if dates are invalid (V03 catches that)
    const result = seasonRule.validate(season, createContext());
    expect(result).toBeNull(); // V03 will catch the invalid format
  });
});
