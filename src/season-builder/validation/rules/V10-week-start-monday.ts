/**
 * V10: Week Start Date is Monday
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures week.startDate falls on a Monday.
 */

import { ValidationRule, Week, ValidationIssue, ValidationContext } from '../types';
import { parseISODate, isMonday, getDayOfWeek } from '../../core/date-utils';

export const V10_WeekStartMonday: ValidationRule<Week> = {
  rule_id: 'V10',
  name: 'Week Start Date is Monday',
  severity: 'BLOCKING',
  entity_type: 'week',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    if (!week.startDate) {
      // Missing fields caught by V01
      return null;
    }

    const startDate = parseISODate(week.startDate);
    if (!(startDate instanceof Date)) {
      // Invalid date caught by V03
      return null;
    }

    if (!isMonday(startDate)) {
      return {
        severity: 'BLOCKING',
        rule_id: 'V10',
        entity_type: 'week',
        entity_id: week.weekId,
        field_path: 'week.startDate',
        message: `Week "${week.weekId}" startDate ${week.startDate} is a ${getDayOfWeek(startDate)}, expected Monday`,
        suggested_fix: 'Set week startDate to a Monday',
        doc_reference: '/docs/validation-invariants.md#V10'
      };
    }

    return null;
  }
};

export const V10_Rules: ValidationRule[] = [V10_WeekStartMonday];
