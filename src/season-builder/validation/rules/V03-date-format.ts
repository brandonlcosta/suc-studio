/**
 * V3: Date Format Validator
 *
 * SEVERITY: CRITICAL
 * APPLIES TO: All modes
 *
 * Ensures dates are in strict ISO 8601 format (YYYY-MM-DD).
 * Uses Day 1 date utilities for validation.
 */

import { ValidationRule, Season, Block, Week, ValidationIssue, ValidationContext } from '../types';
import { parseISODate, parseISOTimestamp } from '../../core/date-utils';

/**
 * V3.1: Season date format
 */
export const V03_SeasonDateFormat: ValidationRule<Season> = {
  rule_id: 'V03.1',
  name: 'Season Date Format',
  severity: 'CRITICAL',
  entity_type: 'season',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    // Check startDate
    if (season.startDate) {
      const startResult = parseISODate(season.startDate);
      if ('valid' in startResult && !startResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.1',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: 'season.startDate',
          message: startResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DD (e.g., "2026-01-15")',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    // Check endDate
    if (season.endDate) {
      const endResult = parseISODate(season.endDate);
      if ('valid' in endResult && !endResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.1',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: 'season.endDate',
          message: endResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DD (e.g., "2026-04-19")',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    // Check publishedAt (if present)
    if (season.publishedAt) {
      const publishedResult = parseISOTimestamp(season.publishedAt);
      if ('valid' in publishedResult && !publishedResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.1',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: 'season.publishedAt',
          message: publishedResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DDTHH:MM:SSZ',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    return null;
  }
};

/**
 * V3.2: Block date format
 */
export const V03_BlockDateFormat: ValidationRule<Block> = {
  rule_id: 'V03.2',
  name: 'Block Date Format',
  severity: 'CRITICAL',
  entity_type: 'block',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    // Check startDate
    if (block.startDate) {
      const startResult = parseISODate(block.startDate);
      if ('valid' in startResult && !startResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.2',
          entity_type: 'block',
          entity_id: block.blockId,
          field_path: 'block.startDate',
          message: startResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DD (e.g., "2026-01-12")',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    // Check endDate
    if (block.endDate) {
      const endResult = parseISODate(block.endDate);
      if ('valid' in endResult && !endResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.2',
          entity_type: 'block',
          entity_id: block.blockId,
          field_path: 'block.endDate',
          message: endResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DD (e.g., "2026-02-01")',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    return null;
  }
};

/**
 * V3.3: Week date format
 */
export const V03_WeekDateFormat: ValidationRule<Week> = {
  rule_id: 'V03.3',
  name: 'Week Date Format',
  severity: 'CRITICAL',
  entity_type: 'week',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    // Check startDate
    if (week.startDate) {
      const startResult = parseISODate(week.startDate);
      if ('valid' in startResult && !startResult.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V03.3',
          entity_type: 'week',
          entity_id: week.weekId,
          field_path: 'week.startDate',
          message: startResult.reason,
          suggested_fix: 'Use format: YYYY-MM-DD (e.g., "2026-01-12")',
          doc_reference: '/docs/validation-invariants.md#V3'
        };
      }
    }

    return null;
  }
};

/**
 * All V03 rules (date format)
 */
export const V03_Rules: ValidationRule[] = [
  V03_SeasonDateFormat,
  V03_BlockDateFormat,
  V03_WeekDateFormat
];
