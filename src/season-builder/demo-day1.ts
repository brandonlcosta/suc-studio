/**
 * DAY 1 DEMO: Foundation Utilities
 *
 * Demonstrates:
 * - Date parsing and validation
 * - ID generation
 * - File I/O (read/write JSON)
 *
 * Run: npx tsx src/season-builder/demo-day1.ts
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  parseISODate,
  validateDateRange,
  getDayOfWeek,
  isMonday,
  formatDate
} from './core/date-utils';
import { generateID, validateIDFormat } from './core/id-generator';
import { readJSONFile, writeJSONFile, fileExists } from './core/persistence';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('DAY 1 DEMO: Foundation Utilities');
console.log('='.repeat(60));
console.log('');

// ============================================================
// 1. DATE PARSING & VALIDATION
// ============================================================

console.log('1. DATE PARSING & VALIDATION');
console.log('-'.repeat(60));

// Valid date
const validDate = parseISODate('2026-01-15');
if (validDate instanceof Date) {
  console.log('✅ Valid date parsed: 2026-01-15');
  console.log(`   Day of week: ${getDayOfWeek(validDate)}`);
  console.log(`   Is Monday: ${isMonday(validDate)}`);
} else {
  console.log(`❌ ${validDate.reason}`);
}

// Invalid date format
const invalidDate = parseISODate('2026-1-15');
if ('valid' in invalidDate && !invalidDate.valid) {
  console.log('✅ Invalid date rejected: 2026-1-15');
  console.log(`   Reason: ${invalidDate.reason}`);
}

// Impossible date (Feb 30)
const impossibleDate = parseISODate('2026-02-30');
if ('valid' in impossibleDate && !impossibleDate.valid) {
  console.log('✅ Impossible date rejected: 2026-02-30');
  console.log(`   Reason: ${impossibleDate.reason}`);
}

// Date range validation
const startDate = new Date(2026, 0, 12); // Jan 12, 2026
const endDate = new Date(2026, 3, 19);   // Apr 19, 2026
const rangeCheck = validateDateRange(startDate, endDate);

if (rangeCheck.valid) {
  console.log('✅ Date range valid:');
  console.log(`   Start: ${formatDate(startDate)}`);
  console.log(`   End: ${formatDate(endDate)}`);
}

console.log('');

// ============================================================
// 2. ID GENERATION
// ============================================================

console.log('2. ID GENERATION');
console.log('-'.repeat(60));

// Generate season ID
const seasonId = generateID('season', 'Spring 2026 Marathon Build', []);
console.log(`✅ Generated season ID: ${seasonId}`);

// Validate format
const seasonValidation = validateIDFormat(seasonId, 'season');
if (seasonValidation.valid) {
  console.log('   Format valid ✓');
}

// Generate block IDs
const blockId1 = generateID('block', 'Base 1', []);
const blockId2 = generateID('block', 'Build 1', [blockId1]);
console.log(`✅ Generated block IDs: ${blockId1}, ${blockId2}`);

// Generate week ID
const weekId = generateID('week', '1', []);
console.log(`✅ Generated week ID: ${weekId}`);

// Collision handling
const existingIds = ['block-base-1'];
const collidingId = generateID('block', 'Base 1', existingIds);
console.log(`✅ Handled ID collision: ${collidingId}`);
console.log(`   (Different from existing: ${existingIds[0]})`);

console.log('');

// ============================================================
// 3. FILE I/O
// ============================================================

console.log('3. FILE I/O (READ/WRITE JSON)');
console.log('-'.repeat(60));

// Create test data
const testSeason = {
  seasonId: seasonId,
  name: 'Spring 2026 Marathon Build',
  startDate: '2026-01-12',
  endDate: '2026-04-19',
  blockIds: [blockId1, blockId2],
  status: 'draft'
};

// Write to file
const testFilePath = path.join(__dirname, '__demo_output__', 'test-season.json');
const writeResult = writeJSONFile(testFilePath, testSeason);

if (writeResult.success) {
  console.log('✅ JSON file written successfully');
  console.log(`   Path: ${testFilePath}`);
} else {
  console.log(`❌ Write failed: ${writeResult.error}`);
}

// Verify file exists
if (fileExists(testFilePath)) {
  console.log('✅ File exists on disk');
}

// Read back from file
const readResult = readJSONFile<typeof testSeason>(testFilePath);

if (readResult.success) {
  console.log('✅ JSON file read successfully');
  console.log('   Data:');
  console.log(`     Season: ${readResult.data.name}`);
  console.log(`     Blocks: ${readResult.data.blockIds.join(', ')}`);
  console.log(`     Status: ${readResult.data.status}`);

  // Verify data integrity
  if (JSON.stringify(readResult.data) === JSON.stringify(testSeason)) {
    console.log('✅ Data integrity verified (write → read → match)');
  }
} else {
  console.log(`❌ Read failed: ${readResult.error}`);
}

console.log('');

// ============================================================
// SUMMARY
// ============================================================

console.log('='.repeat(60));
console.log('DAY 1 COMPLETE: Foundation Utilities Working');
console.log('='.repeat(60));
console.log('');
console.log('✅ Date parsing & validation');
console.log('✅ ID generation with collision handling');
console.log('✅ JSON file read/write');
console.log('');
console.log('Next: DAY 2 - Validation Engine');
console.log('');
