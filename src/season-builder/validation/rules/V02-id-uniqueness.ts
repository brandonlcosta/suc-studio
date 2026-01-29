/**
 * V2: ID Uniqueness Validator
 *
 * SEVERITY: CRITICAL
 * APPLIES TO: All modes
 *
 * Ensures no duplicate IDs within entity types.
 */

import { ValidationRule, Season, Block, Week, ValidationIssue, ValidationContext } from '../types';

/**
 * V2.1: Season ID uniqueness
 */
export const V02_SeasonIDUniqueness: ValidationRule<Season> = {
  rule_id: 'V02.1',
  name: 'Season ID Uniqueness',
  severity: 'CRITICAL',
  entity_type: 'season',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    if (!context.allSeasons) return null;

    // Count occurrences of this season ID
    const duplicates = context.allSeasons.filter(s => s.seasonId === season.seasonId);

    if (duplicates.length > 1) {
      return {
        severity: 'CRITICAL',
        rule_id: 'V02.1',
        entity_type: 'season',
        entity_id: season.seasonId,
        field_path: 'season.seasonId',
        message: `Duplicate season ID: "${season.seasonId}" (found ${duplicates.length} times)`,
        suggested_fix: 'Use a unique season ID',
        doc_reference: '/docs/validation-invariants.md#V2'
      };
    }

    return null;
  }
};

/**
 * V2.2: Block ID uniqueness
 */
export const V02_BlockIDUniqueness: ValidationRule<Block> = {
  rule_id: 'V02.2',
  name: 'Block ID Uniqueness',
  severity: 'CRITICAL',
  entity_type: 'block',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    if (!context.allBlocks) return null;

    // Count occurrences of this block ID
    const duplicates = context.allBlocks.filter(b => b.blockId === block.blockId);

    if (duplicates.length > 1) {
      return {
        severity: 'CRITICAL',
        rule_id: 'V02.2',
        entity_type: 'block',
        entity_id: block.blockId,
        field_path: 'block.blockId',
        message: `Duplicate block ID: "${block.blockId}" (found ${duplicates.length} times)`,
        suggested_fix: 'Use a unique block ID',
        doc_reference: '/docs/validation-invariants.md#V2'
      };
    }

    return null;
  }
};

/**
 * V2.3: Week ID uniqueness
 */
export const V02_WeekIDUniqueness: ValidationRule<Week> = {
  rule_id: 'V02.3',
  name: 'Week ID Uniqueness',
  severity: 'CRITICAL',
  entity_type: 'week',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    if (!context.allWeeks) return null;

    // Count occurrences of this week ID
    const duplicates = context.allWeeks.filter(w => w.weekId === week.weekId);

    if (duplicates.length > 1) {
      return {
        severity: 'CRITICAL',
        rule_id: 'V02.3',
        entity_type: 'week',
        entity_id: week.weekId,
        field_path: 'week.weekId',
        message: `Duplicate week ID: "${week.weekId}" (found ${duplicates.length} times)`,
        suggested_fix: 'Use a unique week ID',
        doc_reference: '/docs/validation-invariants.md#V2'
      };
    }

    return null;
  }
};

/**
 * All V02 rules (ID uniqueness)
 */
export const V02_Rules: ValidationRule[] = [
  V02_SeasonIDUniqueness,
  V02_BlockIDUniqueness,
  V02_WeekIDUniqueness
];
