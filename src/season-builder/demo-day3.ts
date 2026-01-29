/**
 * Run with:
 *   node node_modules/tsx/dist/cli.mjs src/season-builder/demo-day3.ts
 *
 * Reason:
 * - Node cannot execute .ts files directly
 * - tsx handles TS + ESM at runtime
 */

import { runValidation } from './validation/engine';
import { ALL_BLOCKING_RULES } from './validation/rules';
import { Season, Block, Week } from './validation/types';
import { parseISODate, getDayOfWeek } from './core/date-utils';

const divider = '='.repeat(60);

const season: Season = {
  seasonId: 'season-2026',
  startDate: '2026-01-01',
  endDate: '2026-02-01',
  blockIds: ['block-0', 'block-1']
};

const block0: Block = {
  blockId: 'block-0',
  seasonId: 'season-2026',
  startDate: '2026-01-01',
  endDate: '2026-01-04',
  weekIds: []
};

const block1: Block = {
  blockId: 'block-1',
  seasonId: 'season-2026',
  startDate: '2026-01-05',
  endDate: '2026-02-08',
  weekIds: ['week-1', 'week-2', 'week-3']
};

const week1: Week = {
  weekId: 'week-1',
  blockId: 'block-1',
  startDate: '2026-01-12',
  workoutIds: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
  }
};

const week2: Week = {
  weekId: 'week-2',
  blockId: 'block-1',
  startDate: '2026-01-19',
  workoutIds: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
  }
};

const week3: Week = {
  weekId: 'week-3',
  blockId: 'block-1',
  startDate: '2026-01-05',
  workoutIds: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
  }
};

const week4: Week = {
  weekId: 'week-4',
  blockId: 'block-1',
  startDate: '2026-01-14',
  workoutIds: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
  }
};

const result = runValidation(
  { seasons: [season], blocks: [block0, block1], weeks: [week1, week2, week3, week4] },
  ALL_BLOCKING_RULES,
  'publish'
);

const issueByRule = new Map(result.issues.map(issue => [issue.rule_id, issue]));

const displayRuleId = (ruleId: string): string => ruleId.replace(/^V0/, 'V');
const displayFieldPath = (fieldPath: string): string =>
  fieldPath
    .replace(/^season\.blockIds/, 'blocks')
    .replace(/^block\.weekIds/, 'weeks');

console.log(divider);
console.log('DAY 3 DEMO: STRUCTURAL VALIDATION');
console.log(divider);
console.log('');

const v06 = issueByRule.get('V06');
const v09 = issueByRule.get('V09');
const v10 = issueByRule.get('V10');

console.log('❌ Block exceeds season bounds');
if (v06) {
  console.log(`   Rule: ${displayRuleId(v06.rule_id)}`);
  console.log(`   Field: ${displayFieldPath(v06.field_path)}`);
}
console.log('');

console.log('❌ Weeks out of order');
if (v09) {
  console.log(`   Rule: ${displayRuleId(v09.rule_id)}`);
  console.log(`   Field: ${displayFieldPath(v09.field_path)}`);
}
console.log('');

console.log('❌ Week does not start on Monday');
if (v10) {
  const parsed = parseISODate(week4.startDate);
  const dayName = parsed instanceof Date ? getDayOfWeek(parsed) : 'Unknown';
  console.log(`   Rule: ${displayRuleId(v10.rule_id)}`);
  console.log(`   Field: ${v10.field_path}`);
  console.log(`   Date: ${week4.startDate} (${dayName})`);
}
console.log('');

console.log('Validation Summary:');
console.log(`- Critical: ${result.summary.critical_count}`);
console.log(`- Blocking: ${result.summary.blocking_count}`);
console.log(`- Info: ${result.summary.info_count}`);
console.log(`can_save: ${result.can_save}`);
console.log(`can_publish: ${result.can_publish}`);
console.log(divider);
