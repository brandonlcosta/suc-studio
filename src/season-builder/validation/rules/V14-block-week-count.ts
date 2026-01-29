/**
 * V14: Block Week Count Matches Week Records
 *
 * SEVERITY: INFO
 * APPLIES TO: load
 *
 * Ensures each block's weekIds list matches the number of weeks
 * that reference the blockId. This is a dev-only consistency warning.
 */

import { ValidationRule, Block, ValidationIssue, ValidationContext } from '../types';

export const V14_BlockWeekCount: ValidationRule<Block> = {
  rule_id: 'V14',
  name: 'Block Week Count Matches Week Records',
  severity: 'INFO',
  entity_type: 'block',
  applies_to_modes: ['load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    const blockWeekIds = block.weekIds ?? [];
    const weeksForBlock = context.allWeeks?.filter(week => week.blockId === block.blockId) ?? [];

    if (blockWeekIds.length === weeksForBlock.length) {
      return null;
    }

    return {
      severity: 'INFO',
      rule_id: 'V14',
      entity_type: 'block',
      entity_id: block.blockId,
      field_path: 'block.weekIds',
      message: `Block "${block.blockId}" lists ${blockWeekIds.length} weekIds but ${weeksForBlock.length} weeks reference this block.`,
      suggested_fix: 'Align block.weekIds with the weeks that reference this block',
      doc_reference: '/docs/validation-invariants.md#V14'
    };
  }
};

export const V14_Rules: ValidationRule[] = [V14_BlockWeekCount];
