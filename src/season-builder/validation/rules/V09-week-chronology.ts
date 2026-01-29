/**
 * V9: Weeks in Chronological Order
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures weeks in a block are strictly ordered by startDate.
 */

import { ValidationRule, Block, ValidationIssue, ValidationContext } from '../types';
import { parseISODate } from '../../core/date-utils';

export const V09_WeekChronology: ValidationRule<Block> = {
  rule_id: 'V09',
  name: 'Weeks in Chronological Order',
  severity: 'BLOCKING',
  entity_type: 'block',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    const weekIds = block.weekIds;

    if (!weekIds || weekIds.length < 2) {
      return null;
    }

    for (let i = 1; i < weekIds.length; i++) {
      const previousWeek = context.allWeeks?.find(w => w.weekId === weekIds[i - 1]);
      const currentWeek = context.allWeeks?.find(w => w.weekId === weekIds[i]);

      if (!previousWeek || !currentWeek || !previousWeek.startDate || !currentWeek.startDate) {
        continue;
      }

      const previousStart = parseISODate(previousWeek.startDate);
      const currentStart = parseISODate(currentWeek.startDate);

      if (!(previousStart instanceof Date) || !(currentStart instanceof Date)) {
        continue;
      }

      if (currentStart <= previousStart) {
        return {
          severity: 'BLOCKING',
          rule_id: 'V09',
          entity_type: 'block',
          entity_id: block.blockId,
          field_path: `block.weekIds[${i}].startDate`,
          message: `Week "${currentWeek.weekId}" starts on ${currentWeek.startDate}, which is not after previous week "${previousWeek.weekId}" startDate ${previousWeek.startDate}`,
          suggested_fix: 'Reorder weeks chronologically or adjust week start dates',
          doc_reference: '/docs/validation-invariants.md#V9'
        };
      }
    }

    return null;
  }
};

export const V09_Rules: ValidationRule[] = [V09_WeekChronology];
