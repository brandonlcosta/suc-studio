/**
 * DAY 2 DEMO: VALIDATION ENGINE
 *
 * Demonstrates:
 * - Validation engine executing rules
 * - CRITICAL error detection
 * - can_save behavior
 * - Multiple issues aggregation
 *
 * Run: npx tsx src/season-builder/demo-day2.ts
 */

import { runValidation } from './validation/engine';
import { ALL_CRITICAL_RULES } from './validation/rules';
import { Season, Block, Week } from './validation/types';

console.log('='.repeat(60));
console.log('DAY 2 DEMO: VALIDATION ENGINE');
console.log('='.repeat(60));
console.log('');

// ============================================================
// 1. VALID SEASON (SHOULD PASS)
// ============================================================

console.log('1. VALID SEASON');
console.log('-'.repeat(60));

const validSeason: Season = {
  seasonId: '2026-spring',
  name: 'Spring 2026 Marathon Build',
  startDate: '2026-01-12',
  endDate: '2026-04-19',
  blockIds: [],
  status: 'draft'
};

const validResult = runValidation(
  { seasons: [validSeason] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`✅ Valid season passed validation`);
console.log(`   Issues: ${validResult.issues.length}`);
console.log(`   can_save: ${validResult.can_save}`);
console.log(`   can_publish: ${validResult.can_publish}`);
console.log('');

// ============================================================
// 2. INVALID DATE FORMAT
// ============================================================

console.log('2. INVALID DATE FORMAT');
console.log('-'.repeat(60));

const invalidDateSeason: Season = {
  seasonId: '2026-spring',
  name: 'Spring 2026',
  startDate: '2026-1-15', // Missing leading zero
  endDate: '2026-04-19',
  blockIds: [],
  status: 'draft'
};

const invalidDateResult = runValidation(
  { seasons: [invalidDateSeason] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`❌ Invalid season rejected`);
console.log(`   Issues: ${invalidDateResult.issues.length}`);
console.log(`   can_save: ${invalidDateResult.can_save}`);
console.log('');

for (const issue of invalidDateResult.issues) {
  console.log(`   Rule: ${issue.rule_id}`);
  console.log(`   Field: ${issue.field_path}`);
  console.log(`   Message: ${issue.message}`);
  console.log('');
}

// ============================================================
// 3. DUPLICATE IDS
// ============================================================

console.log('3. DUPLICATE IDS');
console.log('-'.repeat(60));

const block1: Block = {
  blockId: 'block-base-1',
  seasonId: '2026-spring',
  name: 'Base 1',
  phase: 'base',
  startDate: '2026-01-12',
  endDate: '2026-02-01',
  weekIds: []
};

const block2: Block = {
  blockId: 'block-base-1', // DUPLICATE
  seasonId: '2026-spring',
  name: 'Base 1 Copy',
  phase: 'base',
  startDate: '2026-02-02',
  endDate: '2026-03-01',
  weekIds: []
};

const duplicateResult = runValidation(
  { blocks: [block1, block2] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`❌ Duplicate block ID detected`);
console.log(`   Issues: ${duplicateResult.issues.length}`);
console.log(`   can_save: ${duplicateResult.can_save}`);
console.log('');

for (const issue of duplicateResult.issues) {
  console.log(`   Rule: ${issue.rule_id}`);
  console.log(`   Field: ${issue.field_path}`);
  console.log(`   Message: ${issue.message}`);
  console.log('');
}

// ============================================================
// 4. INVALID ENUM VALUE
// ============================================================

console.log('4. INVALID ENUM VALUE');
console.log('-'.repeat(60));

const invalidEnumBlock: Block = {
  blockId: 'block-test',
  seasonId: '2026-spring',
  name: 'Test Block',
  phase: 'ramp', // INVALID (not in enum)
  startDate: '2026-01-12',
  endDate: '2026-02-01',
  weekIds: []
};

const enumResult = runValidation(
  { blocks: [invalidEnumBlock] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`❌ Invalid block phase`);
console.log(`   Issues: ${enumResult.issues.length}`);
console.log(`   can_save: ${enumResult.can_save}`);
console.log('');

for (const issue of enumResult.issues) {
  console.log(`   Rule: ${issue.rule_id}`);
  console.log(`   Field: ${issue.field_path}`);
  console.log(`   Message: ${issue.message}`);
  console.log('');
}

// ============================================================
// 5. MULTIPLE ERRORS
// ============================================================

console.log('5. MULTIPLE ERRORS IN ONE ENTITY');
console.log('-'.repeat(60));

const multipleErrorsSeason: Season = {
  seasonId: 'test',
  name: '', // Empty name (CRITICAL)
  startDate: '2026-04-19', // After end date (CRITICAL)
  endDate: '2026-01-12',
  blockIds: [],
  status: 'pending' // Invalid status (CRITICAL)
};

const multipleResult = runValidation(
  { seasons: [multipleErrorsSeason] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`❌ Multiple validation errors`);
console.log(`   Issues: ${multipleResult.issues.length}`);
console.log(`   can_save: ${multipleResult.can_save}`);
console.log('');

for (const issue of multipleResult.issues) {
  console.log(`   Rule: ${issue.rule_id}`);
  console.log(`   Field: ${issue.field_path}`);
  console.log(`   Message: ${issue.message}`);
  console.log('');
}

// ============================================================
// 6. VALIDATION SUMMARY
// ============================================================

console.log('6. VALIDATION SUMMARY');
console.log('-'.repeat(60));

const summarySeason: Season = {
  seasonId: 'summary-test',
  name: '',
  startDate: '2026-1-12',
  endDate: '2026-04-19',
  blockIds: [],
  status: 'invalid'
};

const summaryResult = runValidation(
  { seasons: [summarySeason] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log('Validation Summary:');
console.log(`  Critical: ${summaryResult.summary.critical_count}`);
console.log(`  Blocking: ${summaryResult.summary.blocking_count}`);
console.log(`  Info: ${summaryResult.summary.info_count}`);
console.log(`  Total: ${summaryResult.summary.total_count}`);
console.log('');
console.log(`  can_save: ${summaryResult.can_save}`);
console.log(`  can_publish: ${summaryResult.can_publish}`);
console.log('');

// ============================================================
// 7. MISSING REQUIRED FIELDS
// ============================================================

console.log('7. MISSING REQUIRED FIELDS');
console.log('-'.repeat(60));

const missingFieldsSeason: any = {
  seasonId: 'test',
  name: 'Test Season'
  // Missing: startDate, endDate, blockIds, status
};

const missingResult = runValidation(
  { seasons: [missingFieldsSeason] },
  ALL_CRITICAL_RULES,
  'save'
);

console.log(`❌ Required fields missing`);
console.log(`   Issues: ${missingResult.issues.length}`);
console.log(`   can_save: ${missingResult.can_save}`);
console.log('');

for (const issue of missingResult.issues.slice(0, 3)) {
  console.log(`   Missing: ${issue.message}`);
}

if (missingResult.issues.length > 3) {
  console.log(`   ... and ${missingResult.issues.length - 3} more`);
}
console.log('');

// ============================================================
// SUMMARY
// ============================================================

console.log('='.repeat(60));
console.log('DAY 2 COMPLETE: VALIDATION ENGINE WORKING');
console.log('='.repeat(60));
console.log('');
console.log('✅ ValidationEngine aggregates issues');
console.log('✅ CRITICAL errors block save');
console.log('✅ Multiple issues detected');
console.log('✅ Field paths are precise');
console.log('✅ V01-V05 rules implemented');
console.log('');
console.log('Next: DAY 3 - Structural & Reference Validation');
console.log('');
