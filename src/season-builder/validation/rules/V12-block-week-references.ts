/**
 * V12: Block -> Week References Exist
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures all weekIds referenced by block.weekIds exist.
 */

import { ValidationRule, Block, ValidationIssue, ValidationContext } from '../types';

export const V12_BlockWeekReferences: ValidationRule<Block> = {
  rule_id: 'V12',
  name: 'Block Week References Exist',
  severity: 'BLOCKING',
  entity_type: 'block',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    if (!block.weekIds) {
      return null;
    }

    for (let i = 0; i < block.weekIds.length; i++) {
      const weekId = block.weekIds[i];
      const exists = context.allWeeks?.some(w => w.weekId === weekId);

      if (!exists) {
        return {
          severity: 'BLOCKING',
          rule_id: 'V12',
          entity_type: 'block',
          entity_id: block.blockId,
          field_path: `block.weekIds[${i}]`,
          message: `Missing week reference: ${weekId}`,
          suggested_fix: 'Remove missing week ID or add the referenced week',
          doc_reference: '/docs/validation-invariants.md#V12'
        };
      }
    }

    return null;
  }
};

export const V12_Rules: ValidationRule[] = [V12_BlockWeekReferences];
