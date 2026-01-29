/**
 * V7: Block Contains Week Dates
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures each week's dates fall within the parent block date range.
 * Assumes weeks are 7 days long.
 */

import { ValidationRule, Week, ValidationIssue, ValidationContext } from '../types';
import { parseISODate, addDays, formatDate } from '../../core/date-utils';

export const V07_BlockContainsWeeks: ValidationRule<Week> = {
  rule_id: 'V07',
  name: 'Block Contains Week Dates',
  severity: 'BLOCKING',
  entity_type: 'week',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    if (!week.blockId || !week.startDate) {
      // Missing fields caught by V01
      return null;
    }

    const block = context.allBlocks?.find(b => b.blockId === week.blockId);
    if (!block || !block.startDate || !block.endDate) {
      // Missing block or dates handled by other rules
      return null;
    }

    const blockStart = parseISODate(block.startDate);
    const blockEnd = parseISODate(block.endDate);
    const weekStart = parseISODate(week.startDate);

    if (!(blockStart instanceof Date) || !(blockEnd instanceof Date) || !(weekStart instanceof Date)) {
      // Invalid dates caught by V03
      return null;
    }

    const weekEnd = addDays(weekStart, 6);
    const weekIndex = block.weekIds ? block.weekIds.indexOf(week.weekId) : -1;
    const fieldBase = weekIndex >= 0 ? `block.weekIds[${weekIndex}]` : 'week';

    if (weekStart < blockStart) {
      return {
        severity: 'BLOCKING',
        rule_id: 'V07',
        entity_type: 'week',
        entity_id: week.weekId,
        field_path: `${fieldBase}.startDate`,
        message: `Week "${week.weekId}" starts before block "${block.blockId}" startDate (week: ${week.startDate}, block: ${block.startDate})`,
        suggested_fix: 'Adjust week startDate to be within the block range',
        doc_reference: '/docs/validation-invariants.md#V7'
      };
    }

    if (weekEnd > blockEnd) {
      return {
        severity: 'BLOCKING',
        rule_id: 'V07',
        entity_type: 'week',
        entity_id: week.weekId,
        field_path: `${fieldBase}.startDate`,
        message: `Week "${week.weekId}" exceeds block "${block.blockId}" endDate (week end: ${formatDate(weekEnd)}, block: ${block.endDate})`,
        suggested_fix: 'Adjust week startDate so the 7-day week fits within the block',
        doc_reference: '/docs/validation-invariants.md#V7'
      };
    }

    return null;
  }
};

export const V07_Rules: ValidationRule[] = [V07_BlockContainsWeeks];
