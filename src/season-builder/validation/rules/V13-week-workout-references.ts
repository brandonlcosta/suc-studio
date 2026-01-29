/**
 * V13: Week -> Workout References Exist + Version Syntax
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures all workoutIds referenced by week.workoutIds exist.
 * Supports optional version syntax: workout-id@vN
 */

import { ValidationRule, Week, ValidationIssue, ValidationContext } from '../types';

const VERSION_PATTERN = /^(.+)@v(\d+)$/;

export const V13_WeekWorkoutReferences: ValidationRule<Week> = {
  rule_id: 'V13',
  name: 'Week Workout References Exist',
  severity: 'BLOCKING',
  entity_type: 'week',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (week: Week, context: ValidationContext): ValidationIssue | null => {
    if (!week.workoutIds) {
      return null;
    }

    const entries = Object.entries(week.workoutIds);

    for (const [day, value] of entries) {
      if (value === null) {
        continue; // Rest days are valid
      }

      const fieldPath = `week.workoutIds.${day}`;

      if (value.includes('@v')) {
        const match = value.match(VERSION_PATTERN);
        if (!match) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V13',
            entity_type: 'week',
            entity_id: week.weekId,
            field_path: fieldPath,
            message: `Invalid workout version syntax: ${value}`,
            suggested_fix: 'Use format workout-id@vN where N is a positive integer',
            doc_reference: '/docs/validation-invariants.md#V13'
          };
        }

        const baseId = match[1];
        const version = Number(match[2]);

        if (!Number.isInteger(version) || version <= 0) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V13',
            entity_type: 'week',
            entity_id: week.weekId,
            field_path: fieldPath,
            message: `Invalid workout version syntax: ${value}`,
            suggested_fix: 'Use format workout-id@vN where N is a positive integer',
            doc_reference: '/docs/validation-invariants.md#V13'
          };
        }

        const baseExists = context.allWorkouts?.some(w => w.workoutId === baseId);
        if (!baseExists) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V13',
            entity_type: 'week',
            entity_id: week.weekId,
            field_path: fieldPath,
            message: `Workout not found: ${baseId}`,
            suggested_fix: 'Add the workout or update the reference',
            doc_reference: '/docs/validation-invariants.md#V13'
          };
        }

        const versionExists = context.allWorkouts?.some(w => w.workoutId === baseId && w.version === version);
        if (!versionExists) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V13',
            entity_type: 'week',
            entity_id: week.weekId,
            field_path: fieldPath,
            message: `Workout version not found: ${value}`,
            suggested_fix: 'Add the workout version or update the reference',
            doc_reference: '/docs/validation-invariants.md#V13'
          };
        }
      } else {
        const exists = context.allWorkouts?.some(w => w.workoutId === value);
        if (!exists) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V13',
            entity_type: 'week',
            entity_id: week.weekId,
            field_path: fieldPath,
            message: `Workout not found: ${value}`,
            suggested_fix: 'Add the workout or update the reference',
            doc_reference: '/docs/validation-invariants.md#V13'
          };
        }
      }
    }

    return null;
  }
};

export const V13_Rules: ValidationRule[] = [V13_WeekWorkoutReferences];
