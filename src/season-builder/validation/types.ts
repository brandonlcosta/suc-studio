/**
 * Validation Types
 *
 * RULES (from governance):
 * - Validation is pure (no mutations, no side effects)
 * - No auto-correction
 * - Clear error messages with field paths
 * - Severity enforcement (CRITICAL/BLOCKING/INFO)
 */

/**
 * Severity levels
 *
 * CRITICAL: Data is invalid or corrupt (blocks save)
 * BLOCKING: Structurally valid but incomplete (blocks publish)
 * INFO: Coach guidance only (blocks publish)
 */
export type ValidationSeverity = 'CRITICAL' | 'BLOCKING' | 'INFO';

/**
 * Validation modes
 *
 * edit: Field-level validation on user input
 * save: Pre-save validation (CRITICAL only)
 * publish: Comprehensive validation (all severities)
 * load: Sanity check on data load
 */
export type ValidationMode = 'edit' | 'save' | 'publish' | 'load';

/**
 * Entity types that can be validated
 */
export type EntityType = 'season' | 'block' | 'week' | 'workout';

/**
 * Validation issue - represents a single validation failure
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  rule_id: string;
  entity_type: EntityType;
  entity_id: string;
  field_path: string;
  message: string;
  suggested_fix: string | null;
  doc_reference: string;
}

/**
 * Validation result - aggregated validation outcome
 */
export interface ValidationResult {
  issues: ValidationIssue[];
  has_critical: boolean;
  has_blocking: boolean;
  has_info: boolean;
  can_save: boolean;    // false if has_critical
  can_publish: boolean; // false if ANY issues exist
  summary: {
    critical_count: number;
    blocking_count: number;
    info_count: number;
    total_count: number;
  };
}

/**
 * Validation context - passed to rules
 */
export interface ValidationContext {
  mode: ValidationMode;
  allSeasons?: Season[];
  allBlocks?: Block[];
  allWeeks?: Week[];
  allWorkouts?: Workout[];
}

/**
 * Season entity (minimal for validation)
 */
export interface Season {
  seasonId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  blockIds?: string[];
  status?: string;
  publishedAt?: string;
  notes?: string;
}

/**
 * Block entity (minimal for validation)
 */
export interface Block {
  blockId: string;
  seasonId?: string;
  name?: string;
  phase?: string;
  startDate?: string;
  endDate?: string;
  weekIds?: string[];
  eventId?: string;
  focus?: string;
  notes?: string;
}

/**
 * Week entity (minimal for validation)
 */
export interface Week {
  weekId: string;
  blockId?: string;
  name?: string;
  startDate?: string;
  workoutIds?: {
    mon: string | null;
    tue: string | null;
    wed: string | null;
    thu: string | null;
    fri: string | null;
    sat: string | null;
    sun: string | null;
  };
  notes?: string;
}

/**
 * Workout entity (minimal for validation)
 */
export interface Workout {
  workoutId: string;
  version?: number;
  name?: string;
  tiers?: {
    MED?: any;
    LRG?: any;
    XL?: any;
  };
}

/**
 * Validation rule interface
 *
 * Each rule is a pure function that:
 * - Takes an entity and context
 * - Returns ValidationIssue if rule fails, null if passes
 * - Never mutates inputs
 * - Never performs I/O
 */
export interface ValidationRule<T = any> {
  rule_id: string;
  name: string;
  severity: ValidationSeverity;
  entity_type: EntityType;
  applies_to_modes: ValidationMode[];
  validate: (entity: T, context: ValidationContext) => ValidationIssue | null;
}
