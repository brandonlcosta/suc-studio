/**
 * V1: Required Fields Validator
 *
 * SEVERITY: CRITICAL
 * APPLIES TO: All modes
 *
 * Ensures required fields are present for each entity type.
 */

import { ValidationRule, Season, Block, Week, ValidationIssue, ValidationContext } from '../types';

/**
 * V1.1: Season required fields
 */
export const V01_SeasonRequiredFields: ValidationRule<Season> = {
  rule_id: 'V01.1',
  name: 'Season Required Fields',
  severity: 'CRITICAL',
  entity_type: 'season',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    const requiredFields: (keyof Season)[] = [
      'seasonId',
      'name',
      'startDate',
      'endDate',
      'blockIds',
      'status'
    ];

    for (const field of requiredFields) {
      if (season[field] === undefined || season[field] === null) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.1',
          entity_type: 'season',
          entity_id: season.seasonId || 'unknown',
          field_path: `season.${field}`,
          message: `Required field missing: ${field}`,
          suggested_fix: `Add ${field} field to season`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }

      // Check for empty strings
      if (typeof season[field] === 'string' && season[field] === '') {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.1',
          entity_type: 'season',
          entity_id: season.seasonId || 'unknown',
          field_path: `season.${field}`,
          message: `Required field cannot be empty: ${field}`,
          suggested_fix: `Provide a value for ${field}`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }
    }

    return null;
  }
};

/**
 * V1.2: Block required fields
 */
export const V01_BlockRequiredFields: ValidationRule<Block> = {
  rule_id: 'V01.2',
  name: 'Block Required Fields',
  severity: 'CRITICAL',
  entity_type: 'block',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    const requiredFields: (keyof Block)[] = [
      'blockId',
      'seasonId',
      'name',
      'phase',
      'startDate',
      'endDate',
      'weekIds'
    ];

    for (const field of requiredFields) {
      if (block[field] === undefined || block[field] === null) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.2',
          entity_type: 'block',
          entity_id: block.blockId || 'unknown',
          field_path: `block.${field}`,
          message: `Required field missing: ${field}`,
          suggested_fix: `Add ${field} field to block`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }

      // Check for empty strings
      if (typeof block[field] === 'string' && block[field] === '') {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.2',
          entity_type: 'block',
          entity_id: block.blockId || 'unknown',
          field_path: `block.${field}`,
          message: `Required field cannot be empty: ${field}`,
          suggested_fix: `Provide a value for ${field}`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }
    }

    return null;
  }
};

/**
 * V1.3: Week required fields
 */
export const V01_WeekRequiredFields: ValidationRule<Week> = {
  rule_id: 'V01.3',
  name: 'Week Required Fields',
  severity: 'CRITICAL',
  entity_type: 'week',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    const requiredFields: (keyof Week)[] = [
      'weekId',
      'blockId',
      'name',
      'startDate',
      'workoutIds'
    ];

    for (const field of requiredFields) {
      if (week[field] === undefined || week[field] === null) {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.3',
          entity_type: 'week',
          entity_id: week.weekId || 'unknown',
          field_path: `week.${field}`,
          message: `Required field missing: ${field}`,
          suggested_fix: `Add ${field} field to week`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }

      // Check for empty strings
      if (typeof week[field] === 'string' && week[field] === '') {
        return {
          severity: 'CRITICAL',
          rule_id: 'V01.3',
          entity_type: 'week',
          entity_id: week.weekId || 'unknown',
          field_path: `week.${field}`,
          message: `Required field cannot be empty: ${field}`,
          suggested_fix: `Provide a value for ${field}`,
          doc_reference: '/docs/validation-invariants.md#V1'
        };
      }
    }

    return null;
  }
};

/**
 * All V01 rules (required fields)
 */
export const V01_Rules: ValidationRule[] = [
  V01_SeasonRequiredFields,
  V01_BlockRequiredFields,
  V01_WeekRequiredFields
];
