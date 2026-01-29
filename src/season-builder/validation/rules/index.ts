/**
 * Validation Rules Index
 *
 * Exports all validation rules V01-V10
 */

import { V01_Rules } from './V01-required-fields';
import { V02_Rules } from './V02-id-uniqueness';
import { V03_Rules } from './V03-date-format';
import { V04_Rules } from './V04-enum-values';
import { V05_Rules } from './V05-date-range';
import { V06_Rules } from './V06-season-contains-blocks';
import { V07_Rules } from './V07-block-contains-weeks';
import { V08_Rules } from './V08-block-chronology';
import { V09_Rules } from './V09-week-chronology';
import { V10_Rules } from './V10-week-start-monday';
import { V11_Rules } from './V11-season-block-references';
import { V12_Rules } from './V12-block-week-references';
import { V13_Rules } from './V13-week-workout-references';
import { ValidationRule } from '../types';

/**
 * All Day 2 validation rules (V01-V05, CRITICAL only)
 */
export const ALL_CRITICAL_RULES: ValidationRule[] = [
  ...V01_Rules,
  ...V02_Rules,
  ...V03_Rules,
  ...V04_Rules,
  ...V05_Rules
];

/**
 * All Day 3 validation rules (V06-V10, BLOCKING only)
 */
export const ALL_BLOCKING_RULES: ValidationRule[] = [
  ...V06_Rules,
  ...V07_Rules,
  ...V08_Rules,
  ...V09_Rules,
  ...V10_Rules,
  ...V11_Rules,
  ...V12_Rules,
  ...V13_Rules
];

/**
 * Export individual rule sets
 */
export {
  V01_Rules,
  V02_Rules,
  V03_Rules,
  V04_Rules,
  V05_Rules,
  V06_Rules,
  V07_Rules,
  V08_Rules,
  V09_Rules,
  V10_Rules,
  V11_Rules,
  V12_Rules,
  V13_Rules
};
