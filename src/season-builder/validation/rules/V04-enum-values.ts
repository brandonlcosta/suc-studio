/**
 * V4: Enum Values Validator
 *
 * SEVERITY: CRITICAL
 * APPLIES TO: All modes
 *
 * Ensures enum fields contain valid values.
 */

import { ValidationRule, Season, Block, ValidationIssue, ValidationContext } from '../types';

const VALID_SEASON_STATUS = ['draft', 'active', 'archived'];
const VALID_BLOCK_PHASE = ['base', 'build', 'peak', 'taper', 'recovery'];

/**
 * V4.1: Season status enum
 */
export const V04_SeasonStatusEnum: ValidationRule<Season> = {
  rule_id: 'V04.1',
  name: 'Season Status Enum',
  severity: 'CRITICAL',
  entity_type: 'season',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    if (!season.status) {
      // Missing status is caught by V01 (required fields)
      return null;
    }

    if (!VALID_SEASON_STATUS.includes(season.status)) {
      return {
        severity: 'CRITICAL',
        rule_id: 'V04.1',
        entity_type: 'season',
        entity_id: season.seasonId,
        field_path: 'season.status',
        message: `Invalid status: "${season.status}". Must be one of: ${VALID_SEASON_STATUS.join(', ')}`,
        suggested_fix: `Use one of: ${VALID_SEASON_STATUS.join(', ')}`,
        doc_reference: '/docs/validation-invariants.md#V4'
      };
    }

    return null;
  }
};

/**
 * V4.2: Block phase enum
 */
export const V04_BlockPhaseEnum: ValidationRule<Block> = {
  rule_id: 'V04.2',
  name: 'Block Phase Enum',
  severity: 'CRITICAL',
  entity_type: 'block',
  applies_to_modes: ['edit', 'save', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    if (!block.phase) {
      // Missing phase is caught by V01 (required fields)
      return null;
    }

    if (!VALID_BLOCK_PHASE.includes(block.phase)) {
      return {
        severity: 'CRITICAL',
        rule_id: 'V04.2',
        entity_type: 'block',
        entity_id: block.blockId,
        field_path: 'block.phase',
        message: `Invalid phase: "${block.phase}". Must be one of: ${VALID_BLOCK_PHASE.join(', ')}`,
        suggested_fix: `Use one of: ${VALID_BLOCK_PHASE.join(', ')}`,
        doc_reference: '/docs/validation-invariants.md#V4'
      };
    }

    return null;
  }
};

/**
 * All V04 rules (enum values)
 */
export const V04_Rules: ValidationRule[] = [
  V04_SeasonStatusEnum,
  V04_BlockPhaseEnum
];
