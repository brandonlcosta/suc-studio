/**
 * V11: Season -> Block References Exist
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures all blockIds referenced by season.blockIds exist.
 */

import { ValidationRule, Season, ValidationIssue, ValidationContext } from '../types';

export const V11_SeasonBlockReferences: ValidationRule<Season> = {
  rule_id: 'V11',
  name: 'Season Block References Exist',
  severity: 'BLOCKING',
  entity_type: 'season',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    if (!season.blockIds) {
      return null;
    }

    for (let i = 0; i < season.blockIds.length; i++) {
      const blockId = season.blockIds[i];
      const exists = context.allBlocks?.some(b => b.blockId === blockId);

      if (!exists) {
        return {
          severity: 'BLOCKING',
          rule_id: 'V11',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: `season.blockIds[${i}]`,
          message: `Missing block reference: ${blockId}`,
          suggested_fix: 'Remove missing block ID or add the referenced block',
          doc_reference: '/docs/validation-invariants.md#V11'
        };
      }
    }

    return null;
  }
};

export const V11_Rules: ValidationRule[] = [V11_SeasonBlockReferences];
