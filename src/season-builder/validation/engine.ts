/**
 * Validation Engine
 *
 * RULES (from governance):
 * - Execute rules deterministically
 * - Aggregate issues by severity
 * - Compute save/publish eligibility
 * - No mutations, no side effects
 */

import {
  ValidationRule,
  ValidationResult,
  ValidationContext,
  ValidationMode,
  ValidationIssue,
  Season,
  Block,
  Week,
  Workout
} from './types';

/**
 * Run validation rules and aggregate results
 *
 * @param entities - Entities to validate (seasons, blocks, weeks)
 * @param rules - Validation rules to execute
 * @param mode - Validation mode (edit, save, publish, load)
 * @returns ValidationResult with aggregated issues
 */
export function runValidation(
  entities: {
    seasons?: Season[];
    blocks?: Block[];
    weeks?: Week[];
    workouts?: Workout[];
  },
  rules: ValidationRule[],
  mode: ValidationMode
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Create validation context
  const context: ValidationContext = {
    mode,
    allSeasons: entities.seasons || [],
    allBlocks: entities.blocks || [],
    allWeeks: entities.weeks || [],
    allWorkouts: entities.workouts || []
  };

  // Filter rules that apply to this mode
  const applicableRules = rules.filter(rule =>
    rule.applies_to_modes.includes(mode)
  );

  // Run rules on seasons
  if (entities.seasons) {
    for (const season of entities.seasons) {
      const seasonRules = applicableRules.filter(r => r.entity_type === 'season');
      for (const rule of seasonRules) {
        const issue = rule.validate(season, context);
        if (issue) {
          issues.push(issue);
        }
      }
    }
  }

  // Run rules on blocks
  if (entities.blocks) {
    for (const block of entities.blocks) {
      const blockRules = applicableRules.filter(r => r.entity_type === 'block');
      for (const rule of blockRules) {
        const issue = rule.validate(block, context);
        if (issue) {
          issues.push(issue);
        }
      }
    }
  }

  // Run rules on weeks
  if (entities.weeks) {
    for (const week of entities.weeks) {
      const weekRules = applicableRules.filter(r => r.entity_type === 'week');
      for (const rule of weekRules) {
        const issue = rule.validate(week, context);
        if (issue) {
          issues.push(issue);
        }
      }
    }
  }

  // Aggregate by severity
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const blocking = issues.filter(i => i.severity === 'BLOCKING');
  const info = issues.filter(i => i.severity === 'INFO');

  const has_critical = critical.length > 0;
  const has_blocking = blocking.length > 0;
  const has_info = info.length > 0;

  // Compute eligibility flags
  const can_save = !has_critical;
  const can_publish = !has_critical && !has_blocking && !has_info;

  return {
    issues,
    has_critical,
    has_blocking,
    has_info,
    can_save,
    can_publish,
    summary: {
      critical_count: critical.length,
      blocking_count: blocking.length,
      info_count: info.length,
      total_count: issues.length
    }
  };
}

/**
 * Create an empty validation result (all passing)
 */
export function createEmptyResult(): ValidationResult {
  return {
    issues: [],
    has_critical: false,
    has_blocking: false,
    has_info: false,
    can_save: true,
    can_publish: true,
    summary: {
      critical_count: 0,
      blocking_count: 0,
      info_count: 0,
      total_count: 0
    }
  };
}
