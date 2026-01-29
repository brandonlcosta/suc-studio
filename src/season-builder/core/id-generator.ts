/**
 * ID Generation Utilities
 *
 * RULES (from governance):
 * - IDs are kebab-case (lowercase, hyphens only)
 * - IDs follow entity-specific patterns
 * - IDs must be unique
 * - No spaces, no special characters
 */

export type EntityType = 'season' | 'block' | 'week' | 'workout';

/**
 * ID Format Patterns:
 * - Season: {year}-{slug} or {slug}
 * - Block: block-{slug} or block-{timestamp}
 * - Week: week-{n} or week-{timestamp}
 * - Workout: workout-{slug} or workout-{timestamp}
 */

export interface IDValidationError {
  valid: false;
  reason: string;
}

export type IDValidationResult = { valid: true } | IDValidationError;

/**
 * Validate ID format for entity type
 */
export function validateIDFormat(id: string, entityType: EntityType): IDValidationResult {
  // Check for lowercase, hyphens only
  const kebabCasePattern = /^[a-z0-9-]+$/;

  if (!kebabCasePattern.test(id)) {
    return {
      valid: false,
      reason: `ID must be lowercase with hyphens only (kebab-case): "${id}"`
    };
  }

  // Check for spaces (should be caught by above, but explicit)
  if (id.includes(' ')) {
    return {
      valid: false,
      reason: `ID cannot contain spaces: "${id}"`
    };
  }

  // Entity-specific pattern validation
  switch (entityType) {
    case 'season':
      // Season: flexible format (year-slug or just slug)
      if (id.length === 0) {
        return { valid: false, reason: 'Season ID cannot be empty' };
      }
      return { valid: true };

    case 'block':
      // Block: must start with "block-"
      if (!id.startsWith('block-')) {
        return {
          valid: false,
          reason: `Block ID must start with "block-": "${id}"`
        };
      }
      if (id === 'block-') {
        return { valid: false, reason: 'Block ID cannot be just "block-"' };
      }
      return { valid: true };

    case 'week':
      // Week: must start with "week-"
      if (!id.startsWith('week-')) {
        return {
          valid: false,
          reason: `Week ID must start with "week-": "${id}"`
        };
      }
      if (id === 'week-') {
        return { valid: false, reason: 'Week ID cannot be just "week-"' };
      }
      return { valid: true };

    case 'workout':
      // Workout: must start with "workout-"
      if (!id.startsWith('workout-')) {
        return {
          valid: false,
          reason: `Workout ID must start with "workout-": "${id}"`
        };
      }
      if (id === 'workout-') {
        return { valid: false, reason: 'Workout ID cannot be just "workout-"' };
      }
      return { valid: true };

    default:
      return { valid: false, reason: `Unknown entity type: ${entityType}` };
  }
}

/**
 * Check if ID is unique in collection
 */
export function checkIDUniqueness(
  id: string,
  existingIDs: string[]
): { unique: true } | { unique: false; reason: string } {
  if (existingIDs.includes(id)) {
    return {
      unique: false,
      reason: `ID already exists: "${id}"`
    };
  }

  return { unique: true };
}

/**
 * Convert string to kebab-case slug
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Generate unique ID for entity
 *
 * @param entityType - Type of entity
 * @param slug - Optional semantic name/slug
 * @param existingIDs - Collection of existing IDs to check uniqueness
 * @returns Valid, unique ID
 */
export function generateID(
  entityType: EntityType,
  slug: string | null,
  existingIDs: string[]
): string {
  let candidateID: string;

  if (slug) {
    const kebabSlug = toKebabCase(slug);

    switch (entityType) {
      case 'season':
        candidateID = kebabSlug;
        break;
      case 'block':
        candidateID = `block-${kebabSlug}`;
        break;
      case 'week':
        candidateID = `week-${kebabSlug}`;
        break;
      case 'workout':
        candidateID = `workout-${kebabSlug}`;
        break;
    }

    // Check uniqueness
    const uniquenessCheck = checkIDUniqueness(candidateID, existingIDs);
    if (uniquenessCheck.unique) {
      return candidateID;
    }
  }

  // Fallback to timestamp-based ID
  const timestamp = Date.now();

  switch (entityType) {
    case 'season':
      candidateID = `season-${timestamp}`;
      break;
    case 'block':
      candidateID = `block-${timestamp}`;
      break;
    case 'week':
      candidateID = `week-${timestamp}`;
      break;
    case 'workout':
      candidateID = `workout-${timestamp}`;
      break;
  }

  // Timestamp should be unique, but verify
  const uniquenessCheck = checkIDUniqueness(candidateID, existingIDs);
  if (!uniquenessCheck.unique) {
    // Very rare: add random suffix
    candidateID = `${candidateID}-${Math.random().toString(36).substr(2, 9)}`;
  }

  return candidateID;
}

/**
 * Extract entity type from ID (best effort)
 */
export function inferEntityType(id: string): EntityType | null {
  if (id.startsWith('block-')) return 'block';
  if (id.startsWith('week-')) return 'week';
  if (id.startsWith('workout-')) return 'workout';
  // Season IDs are flexible, can't reliably infer
  return null;
}
