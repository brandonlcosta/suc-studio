/**
 * Run with:
 *   node node_modules/tsx/dist/cli.mjs src/season-builder/demo-day4.ts
 *
 * Reason:
 * - Node cannot execute .ts files directly
 * - tsx handles TS + ESM at runtime
 */

import { runValidation } from './validation/engine';
import { V11_SeasonBlockReferences } from './validation/rules/V11-season-block-references';
import { V12_BlockWeekReferences } from './validation/rules/V12-block-week-references';
import { V13_WeekWorkoutReferences } from './validation/rules/V13-week-workout-references';
import { Season, Block, Week, Workout } from './validation/types';

const divider = '='.repeat(60);

const season: Season = {
  seasonId: 'season-1',
  blockIds: ['block-base-1', 'block-build-2']
};

const block: Block = {
  blockId: 'block-base-1',
  weekIds: ['week-3']
};

const weekMissingWorkout: Week = {
  weekId: 'week-1',
  workoutIds: {
    mon: null,
    tue: 'workout-tempo-40',
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
  }
};

const weekInvalidVersion: Week = {
  weekId: 'week-2',
  workoutIds: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: 'workout-long@v99',
    sun: null
  }
};

const workouts: Workout[] = [
  { workoutId: 'workout-long', version: 1 },
  { workoutId: 'workout-long', version: 2 }
];

const result = runValidation(
  {
    seasons: [season],
    blocks: [block],
    weeks: [weekMissingWorkout, weekInvalidVersion],
    workouts
  },
  [V11_SeasonBlockReferences, V12_BlockWeekReferences, V13_WeekWorkoutReferences],
  'publish'
);

const missingBlock = result.issues.find(issue => issue.rule_id === 'V11');
const missingWeek = result.issues.find(issue => issue.rule_id === 'V12');
const missingWorkout = result.issues.find(issue => issue.rule_id === 'V13' && issue.field_path === 'week.workoutIds.tue');
const invalidWorkout = result.issues.find(issue => issue.rule_id === 'V13' && issue.field_path === 'week.workoutIds.sat');

console.log(divider);
console.log('DAY 4 DEMO: REFERENCE INTEGRITY');
console.log(divider);
console.log('');

console.log('❌ Missing block reference');
if (missingBlock) {
  console.log(`   Rule: ${missingBlock.rule_id}`);
  console.log(`   Field: ${missingBlock.field_path}`);
  console.log('   Missing: block-build-2');
}
console.log('');

console.log('❌ Missing week reference');
if (missingWeek) {
  console.log(`   Rule: ${missingWeek.rule_id}`);
  console.log(`   Field: ${missingWeek.field_path}`);
  console.log('   Missing: week-3');
}
console.log('');

console.log('❌ Missing workout reference');
if (missingWorkout) {
  console.log(`   Rule: ${missingWorkout.rule_id}`);
  console.log(`   Field: ${missingWorkout.field_path}`);
  console.log('   Missing: workout-tempo-40');
}
console.log('');

console.log('❌ Invalid workout version');
if (invalidWorkout) {
  console.log(`   Rule: ${invalidWorkout.rule_id}`);
  console.log(`   Field: ${invalidWorkout.field_path}`);
  console.log('   Value: workout-long@v99');
}
console.log('');

console.log('Validation Summary:');
console.log(`- Critical: ${result.summary.critical_count}`);
console.log(`- Blocking: ${result.summary.blocking_count}`);
console.log(`- Info: ${result.summary.info_count}`);
console.log(`can_save: ${result.can_save}`);
console.log(`can_publish: ${result.can_publish}`);
console.log(divider);
