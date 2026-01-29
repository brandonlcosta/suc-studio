/**
 * Unit tests for validation engine
 */

import { describe, it, expect } from 'vitest';
import { runValidation } from '../validation/engine';
import { ALL_CRITICAL_RULES } from '../validation/rules';
import { Season, Block, Week } from '../validation/types';

describe('ValidationEngine', () => {
  it('returns empty result for valid entities', () => {
    const season: Season = {
      seasonId: '2026-spring',
      name: 'Spring 2026',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'save'
    );

    expect(result.issues).toHaveLength(0);
    expect(result.has_critical).toBe(false);
    expect(result.can_save).toBe(true);
    expect(result.can_publish).toBe(true);
  });

  it('detects CRITICAL error and sets can_save to false', () => {
    const season: Season = {
      seasonId: '2026-spring',
      name: '', // Empty name (CRITICAL)
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'save'
    );

    expect(result.has_critical).toBe(true);
    expect(result.can_save).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('aggregates multiple issues correctly', () => {
    const season1: Season = {
      seasonId: 'same-id',
      name: 'Season 1',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const season2: Season = {
      seasonId: 'same-id', // Duplicate ID
      name: 'Season 2',
      startDate: '2026-1-12', // Invalid date format
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = runValidation(
      { seasons: [season1, season2] },
      ALL_CRITICAL_RULES,
      'save'
    );

    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    expect(result.has_critical).toBe(true);
    expect(result.can_save).toBe(false);
  });

  it('computes summary counts correctly', () => {
    const season: Season = {
      seasonId: 'test',
      name: '', // CRITICAL
      startDate: '2026-1-12', // CRITICAL (invalid format)
      endDate: '2026-04-19',
      blockIds: [],
      status: 'invalid' // CRITICAL (invalid enum)
    };

    const result = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'save'
    );

    expect(result.summary.critical_count).toBeGreaterThan(0);
    expect(result.summary.total_count).toBe(result.issues.length);
  });

  it('validates multiple entity types', () => {
    const season: Season = {
      seasonId: 'test-season',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const block: Block = {
      blockId: 'test-block',
      seasonId: 'test-season',
      name: '', // CRITICAL (empty)
      phase: 'base',
      startDate: '2026-01-12',
      endDate: '2026-02-01',
      weekIds: []
    };

    const result = runValidation(
      { seasons: [season], blocks: [block] },
      ALL_CRITICAL_RULES,
      'save'
    );

    expect(result.has_critical).toBe(true);
    expect(result.issues.some(i => i.entity_type === 'block')).toBe(true);
  });

  it('filters rules by mode', () => {
    const season: Season = {
      seasonId: 'test',
      name: 'Test',
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const resultSave = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'save'
    );

    const resultEdit = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'edit'
    );

    // Both should work since all rules apply to all modes
    expect(resultSave.can_save).toBe(true);
    expect(resultEdit.can_save).toBe(true);
  });

  it('includes correct field_path in issues', () => {
    const season: Season = {
      seasonId: 'test',
      name: '', // Empty
      startDate: '2026-01-12',
      endDate: '2026-04-19',
      blockIds: [],
      status: 'draft'
    };

    const result = runValidation(
      { seasons: [season] },
      ALL_CRITICAL_RULES,
      'save'
    );

    const nameIssue = result.issues.find(i => i.field_path === 'season.name');
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.severity).toBe('CRITICAL');
  });
});
