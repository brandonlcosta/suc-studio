/**
 * V5: Date Range Validator
 *
 * SEVERITY: CRITICAL
 * APPLIES TO: All modes
 *
 * Ensures start date is before end date (strict inequality).
 * Uses Day 1 date utilities.
 */

import { ValidationRule, Season, Block, ValidationIssue, ValidationContext } from '../types';
import { parseISODate, validateDateRange } from '../../core/date-utils';

/**
 * V5.1: Season date range
 */
export const V05_SeasonDateRange: ValidationRule<Season> = {
  rule_id: 'V05.1',
  name: 'Season Date Range',
  severity: 'CRITICAL',
  entity_type: 'season',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    if (!season.startDate || !season.endDate) {
      // Missing dates caught by V01 (required fields)
      return null;
    }

    // Parse dates (if invalid, V03 will catch)
    const startResult = parseISODate(season.startDate);
    const endResult = parseISODate(season.endDate);

    // Only validate if both dates are valid
    if (startResult instanceof Date && endResult instanceof Date) {
      const rangeCheck = validateDateRange(startResult, endResult);

      if (!rangeCheck.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V05.1',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: 'season.startDate',
          message: rangeCheck.reason,
          suggested_fix: 'Ensure start date is before end date',
          doc_reference: '/docs/validation-invariants.md#V5'
        };
      }
    }

    return null;
  }
};

/**
 * V5.2: Block date range
 */
export const V05_BlockDateRange: ValidationRule<Block> = {
  rule_id: 'V05.2',
  name: 'Block Date Range',
  severity: 'CRITICAL',
  entity_type: 'block',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    if (!block.startDate || !block.endDate) {
      // Missing dates caught by V01 (required fields)
      return null;
    }

    // Parse dates (if invalid, V03 will catch)
    const startResult = parseISODate(block.startDate);
    const endResult = parseISODate(block.endDate);

    // Only validate if both dates are valid
    if (startResult instanceof Date && endResult instanceof Date) {
      const rangeCheck = validateDateRange(startResult, endResult);

      if (!rangeCheck.valid) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V05.2',
          entity_type: 'block',
          entity_id: block.blockId,
          field_path: 'block.startDate',
          message: rangeCheck.reason,
          suggested_fix: 'Ensure start date is before end date',
          doc_reference: '/docs/validation-invariants.md#V5'
        };
      }
    }

    return null;
  }
};

/**
 * All V05 rules (date range)
 */
export const V05_Rules: ValidationRule[] = [
  V05_SeasonDateRange,
  V05_BlockDateRange
];
