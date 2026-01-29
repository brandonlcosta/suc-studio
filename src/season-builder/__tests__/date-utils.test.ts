/**
 * Unit tests for date-utils
 */

import { describe, it, expect } from 'vitest';
import {
  parseISODate,
  parseISOTimestamp,
  validateDateRange,
  getDayOfWeek,
  isMonday,
  isDateContained,
  checkChronologicalOrder,
  formatDate,
  addDays
} from '../core/date-utils';

describe('parseISODate', () => {
  it('accepts valid ISO date', () => {
    const result = parseISODate('2026-01-15');
    expect(result).toBeInstanceOf(Date);
    if (result instanceof Date) {
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    }
  });

  it('rejects invalid format (missing leading zero)', () => {
    const result = parseISODate('2026-1-15');
    expect(result).toHaveProperty('valid', false);
    if ('valid' in result && !result.valid) {
      expect(result.reason).toContain('Invalid date format');
    }
  });

  it('rejects invalid format (slash separators)', () => {
    const result = parseISODate('01/15/2026');
    expect(result).toHaveProperty('valid', false);
  });

  it('rejects impossible date (Feb 30)', () => {
    const result = parseISODate('2026-02-30');
    expect(result).toHaveProperty('valid', false);
    if ('valid' in result && !result.valid) {
      expect(result.reason).toContain('Invalid calendar date');
    }
  });

  it('rejects invalid month', () => {
    const result = parseISODate('2026-13-01');
    expect(result).toHaveProperty('valid', false);
  });

  it('rejects invalid day', () => {
    const result = parseISODate('2026-01-32');
    expect(result).toHaveProperty('valid', false);
  });

  it('accepts leap year Feb 29', () => {
    const result = parseISODate('2024-02-29');
    expect(result).toBeInstanceOf(Date);
  });

  it('rejects non-leap year Feb 29', () => {
    const result = parseISODate('2025-02-29');
    expect(result).toHaveProperty('valid', false);
  });
});

describe('parseISOTimestamp', () => {
  it('accepts valid ISO timestamp with Z', () => {
    const result = parseISOTimestamp('2026-01-15T14:30:00Z');
    expect(result).toBeInstanceOf(Date);
  });

  it('accepts valid ISO timestamp with timezone offset', () => {
    const result = parseISOTimestamp('2026-01-15T14:30:00-08:00');
    expect(result).toBeInstanceOf(Date);
  });

  it('accepts timestamp with milliseconds', () => {
    const result = parseISOTimestamp('2026-01-15T14:30:00.123Z');
    expect(result).toBeInstanceOf(Date);
  });

  it('rejects timestamp without timezone', () => {
    const result = parseISOTimestamp('2026-01-15T14:30:00');
    expect(result).toHaveProperty('valid', false);
    if ('valid' in result && !result.valid) {
      expect(result.reason).toContain('timezone');
    }
  });

  it('rejects invalid timestamp format', () => {
    const result = parseISOTimestamp('2026-01-15 14:30:00Z');
    expect(result).toHaveProperty('valid', false);
  });
});

describe('validateDateRange', () => {
  it('accepts start before end', () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 31);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(true);
  });

  it('rejects start after end', () => {
    const start = new Date(2026, 0, 31);
    const end = new Date(2026, 0, 1);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(false);
  });

  it('rejects equal dates', () => {
    const start = new Date(2026, 0, 15);
    const end = new Date(2026, 0, 15);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(false);
  });
});

describe('getDayOfWeek', () => {
  it('returns correct day for known date', () => {
    // Jan 6, 2026 is a Tuesday
    const date = new Date(2026, 0, 6);
    expect(getDayOfWeek(date)).toBe('Tuesday');
  });

  it('returns Monday for Jan 12, 2026', () => {
    const date = new Date(2026, 0, 12);
    expect(getDayOfWeek(date)).toBe('Monday');
  });
});

describe('isMonday', () => {
  it('returns true for Monday', () => {
    const monday = new Date(2026, 0, 12); // Jan 12, 2026 is Monday
    expect(isMonday(monday)).toBe(true);
  });

  it('returns false for Tuesday', () => {
    const tuesday = new Date(2026, 0, 13);
    expect(isMonday(tuesday)).toBe(false);
  });

  it('returns false for Sunday', () => {
    const sunday = new Date(2026, 0, 11);
    expect(isMonday(sunday)).toBe(false);
  });
});

describe('isDateContained', () => {
  it('accepts date within range', () => {
    const inner = new Date(2026, 0, 15);
    const outerStart = new Date(2026, 0, 1);
    const outerEnd = new Date(2026, 0, 31);
    const result = isDateContained(inner, outerStart, outerEnd);
    expect(result.contained).toBe(true);
  });

  it('accepts date at range start boundary', () => {
    const inner = new Date(2026, 0, 1);
    const outerStart = new Date(2026, 0, 1);
    const outerEnd = new Date(2026, 0, 31);
    const result = isDateContained(inner, outerStart, outerEnd);
    expect(result.contained).toBe(true);
  });

  it('accepts date at range end boundary', () => {
    const inner = new Date(2026, 0, 31);
    const outerStart = new Date(2026, 0, 1);
    const outerEnd = new Date(2026, 0, 31);
    const result = isDateContained(inner, outerStart, outerEnd);
    expect(result.contained).toBe(true);
  });

  it('rejects date before range', () => {
    const inner = new Date(2025, 11, 31);
    const outerStart = new Date(2026, 0, 1);
    const outerEnd = new Date(2026, 0, 31);
    const result = isDateContained(inner, outerStart, outerEnd);
    expect(result.contained).toBe(false);
  });

  it('rejects date after range', () => {
    const inner = new Date(2026, 1, 1);
    const outerStart = new Date(2026, 0, 1);
    const outerEnd = new Date(2026, 0, 31);
    const result = isDateContained(inner, outerStart, outerEnd);
    expect(result.contained).toBe(false);
  });
});

describe('checkChronologicalOrder', () => {
  it('accepts entities in order', () => {
    const entities = [
      { startDate: new Date(2026, 0, 1) },
      { startDate: new Date(2026, 0, 15) },
      { startDate: new Date(2026, 1, 1) }
    ];
    const result = checkChronologicalOrder(entities);
    expect(result.ordered).toBe(true);
  });

  it('rejects entities out of order', () => {
    const entities = [
      { startDate: new Date(2026, 0, 15) },
      { startDate: new Date(2026, 0, 1) }, // Out of order
      { startDate: new Date(2026, 1, 1) }
    ];
    const result = checkChronologicalOrder(entities);
    expect(result.ordered).toBe(false);
  });

  it('rejects entities with equal dates', () => {
    const entities = [
      { startDate: new Date(2026, 0, 1) },
      { startDate: new Date(2026, 0, 1) }, // Equal
      { startDate: new Date(2026, 1, 1) }
    ];
    const result = checkChronologicalOrder(entities);
    expect(result.ordered).toBe(false);
  });

  it('accepts empty array', () => {
    const result = checkChronologicalOrder([]);
    expect(result.ordered).toBe(true);
  });

  it('accepts single entity', () => {
    const entities = [{ startDate: new Date(2026, 0, 1) }];
    const result = checkChronologicalOrder(entities);
    expect(result.ordered).toBe(true);
  });
});

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date(2026, 0, 15);
    expect(formatDate(date)).toBe('2026-01-15');
  });

  it('pads single-digit month', () => {
    const date = new Date(2026, 0, 1); // January 1
    expect(formatDate(date)).toBe('2026-01-01');
  });

  it('pads single-digit day', () => {
    const date = new Date(2026, 9, 5); // October 5
    expect(formatDate(date)).toBe('2026-10-05');
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    const date = new Date(2026, 0, 15);
    const result = addDays(date, 7);
    expect(formatDate(result)).toBe('2026-01-22');
  });

  it('handles month rollover', () => {
    const date = new Date(2026, 0, 30);
    const result = addDays(date, 5);
    expect(formatDate(result)).toBe('2026-02-04');
  });

  it('does not mutate original date', () => {
    const date = new Date(2026, 0, 15);
    const original = formatDate(date);
    addDays(date, 7);
    expect(formatDate(date)).toBe(original);
  });
});
