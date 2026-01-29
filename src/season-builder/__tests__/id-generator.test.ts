/**
 * Unit tests for id-generator
 */

import { describe, it, expect } from 'vitest';
import {
  validateIDFormat,
  checkIDUniqueness,
  generateID
} from '../core/id-generator';

describe('validateIDFormat', () => {
  describe('season IDs', () => {
    it('accepts valid season ID', () => {
      const result = validateIDFormat('2026-spring-marathon', 'season');
      expect(result.valid).toBe(true);
    });

    it('accepts simple slug', () => {
      const result = validateIDFormat('spring-2026', 'season');
      expect(result.valid).toBe(true);
    });

    it('rejects uppercase', () => {
      const result = validateIDFormat('Spring-2026', 'season');
      expect(result.valid).toBe(false);
    });

    it('rejects spaces', () => {
      const result = validateIDFormat('spring 2026', 'season');
      expect(result.valid).toBe(false);
    });

    it('rejects special characters', () => {
      const result = validateIDFormat('spring_2026', 'season');
      expect(result.valid).toBe(false);
    });
  });

  describe('block IDs', () => {
    it('accepts valid block ID', () => {
      const result = validateIDFormat('block-base-1', 'block');
      expect(result.valid).toBe(true);
    });

    it('accepts timestamp-based ID', () => {
      const result = validateIDFormat('block-1706461234567', 'block');
      expect(result.valid).toBe(true);
    });

    it('rejects missing block- prefix', () => {
      const result = validateIDFormat('base-1', 'block');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('must start with "block-"');
      }
    });

    it('rejects just "block-"', () => {
      const result = validateIDFormat('block-', 'block');
      expect(result.valid).toBe(false);
    });

    it('rejects uppercase', () => {
      const result = validateIDFormat('block-Base-1', 'block');
      expect(result.valid).toBe(false);
    });
  });

  describe('week IDs', () => {
    it('accepts valid week ID', () => {
      const result = validateIDFormat('week-1', 'week');
      expect(result.valid).toBe(true);
    });

    it('accepts timestamp-based ID', () => {
      const result = validateIDFormat('week-1706461234567', 'week');
      expect(result.valid).toBe(true);
    });

    it('rejects missing week- prefix', () => {
      const result = validateIDFormat('1', 'week');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('must start with "week-"');
      }
    });

    it('rejects just "week-"', () => {
      const result = validateIDFormat('week-', 'week');
      expect(result.valid).toBe(false);
    });
  });

  describe('workout IDs', () => {
    it('accepts valid workout ID', () => {
      const result = validateIDFormat('workout-tempo-40', 'workout');
      expect(result.valid).toBe(true);
    });

    it('accepts timestamp-based ID', () => {
      const result = validateIDFormat('workout-1706461234567', 'workout');
      expect(result.valid).toBe(true);
    });

    it('rejects missing workout- prefix', () => {
      const result = validateIDFormat('tempo-40', 'workout');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('must start with "workout-"');
      }
    });

    it('rejects just "workout-"', () => {
      const result = validateIDFormat('workout-', 'workout');
      expect(result.valid).toBe(false);
    });
  });
});

describe('checkIDUniqueness', () => {
  it('accepts unique ID', () => {
    const result = checkIDUniqueness('new-id', ['existing-1', 'existing-2']);
    expect(result.unique).toBe(true);
  });

  it('rejects duplicate ID', () => {
    const result = checkIDUniqueness('existing-1', ['existing-1', 'existing-2']);
    expect(result.unique).toBe(false);
  });

  it('accepts ID in empty collection', () => {
    const result = checkIDUniqueness('any-id', []);
    expect(result.unique).toBe(true);
  });

  it('is case-sensitive', () => {
    const result = checkIDUniqueness('Existing-1', ['existing-1']);
    expect(result.unique).toBe(true); // Different case = unique
  });
});

describe('generateID', () => {
  describe('with slug', () => {
    it('generates season ID from slug', () => {
      const id = generateID('season', 'Spring 2026 Marathon', []);
      expect(id).toBe('spring-2026-marathon');
    });

    it('generates block ID from slug', () => {
      const id = generateID('block', 'Base 1', []);
      expect(id).toBe('block-base-1');
    });

    it('generates week ID from slug', () => {
      const id = generateID('week', '1', []);
      expect(id).toBe('week-1');
    });

    it('generates workout ID from slug', () => {
      const id = generateID('workout', 'Tempo 40', []);
      expect(id).toBe('workout-tempo-40');
    });

    it('converts special characters to hyphens', () => {
      const id = generateID('block', 'Base & Build #1', []);
      expect(id).toBe('block-base-build-1');
    });

    it('removes leading/trailing hyphens', () => {
      const id = generateID('block', '---Base---', []);
      expect(id).toBe('block-base');
    });
  });

  describe('with slug collision', () => {
    it('falls back to timestamp if slug taken', () => {
      const existingIDs = ['block-base-1'];
      const id = generateID('block', 'Base 1', existingIDs);

      expect(id).not.toBe('block-base-1');
      expect(id).toMatch(/^block-\d+/); // block-{timestamp}
    });
  });

  describe('without slug', () => {
    it('generates timestamp-based season ID', () => {
      const id = generateID('season', null, []);
      expect(id).toMatch(/^season-\d+/);
    });

    it('generates timestamp-based block ID', () => {
      const id = generateID('block', null, []);
      expect(id).toMatch(/^block-\d+/);
    });

    it('generates timestamp-based week ID', () => {
      const id = generateID('week', null, []);
      expect(id).toMatch(/^week-\d+/);
    });

    it('generates timestamp-based workout ID', () => {
      const id = generateID('workout', null, []);
      expect(id).toMatch(/^workout-\d+/);
    });
  });

  describe('uniqueness guarantee', () => {
    it('generates unique ID even without slug', () => {
      const id1 = generateID('block', null, []);
      const id2 = generateID('block', null, [id1]);

      expect(id1).not.toBe(id2);
    });

    it('ensures uniqueness with existing IDs', () => {
      const existingIDs = ['block-1', 'block-2'];
      const id = generateID('block', null, existingIDs);

      expect(existingIDs).not.toContain(id);
    });
  });
});
