/**
 * Date Parsing & Validation Utilities
 *
 * RULES (from governance):
 * - Dates must be ISO 8601 format (YYYY-MM-DD)
 * - Timestamps must include timezone
 * - No auto-correction allowed
 * - Strict validation only
 */

export interface DateValidationError {
  valid: false;
  reason: string;
}

export type DateValidationResult = Date | DateValidationError;
export type TimestampValidationResult = Date | DateValidationError;

/**
 * Parse ISO 8601 date string (YYYY-MM-DD)
 *
 * Accepts: Valid calendar dates only
 * Rejects: Invalid format, impossible dates (Feb 30), auto-correction
 */
export function parseISODate(dateString: string): DateValidationResult {
  // Check format: YYYY-MM-DD
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoDatePattern.test(dateString)) {
    return {
      valid: false,
      reason: `Invalid date format: "${dateString}". Expected YYYY-MM-DD (e.g., "2026-01-15")`
    };
  }

  // Parse components
  const [year, month, day] = dateString.split('-').map(Number);

  // Validate ranges
  if (month < 1 || month > 12) {
    return {
      valid: false,
      reason: `Invalid month: ${month}. Must be 01-12`
    };
  }

  if (day < 1 || day > 31) {
    return {
      valid: false,
      reason: `Invalid day: ${day}. Must be 01-31`
    };
  }

  // Create date and verify it's valid (catches Feb 30, etc.)
  const date = new Date(year, month - 1, day);

  // Check if date rolled over (e.g., Feb 30 becomes Mar 2)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      valid: false,
      reason: `Invalid calendar date: ${dateString} (e.g., Feb 30 doesn't exist)`
    };
  }

  return date;
}

/**
 * Parse ISO 8601 timestamp with timezone
 *
 * Accepts: Valid timestamps with timezone (Z or offset)
 * Rejects: Missing timezone, invalid format
 */
export function parseISOTimestamp(timestampString: string): TimestampValidationResult {
  // Check format includes timezone (Z or +/-HH:MM)
  const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;

  if (!isoTimestampPattern.test(timestampString)) {
    return {
      valid: false,
      reason: `Invalid timestamp format: "${timestampString}". Expected YYYY-MM-DDTHH:MM:SSZ or with timezone offset`
    };
  }

  const date = new Date(timestampString);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      reason: `Invalid timestamp: "${timestampString}"`
    };
  }

  return date;
}

/**
 * Validate date range (start must be before end)
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): { valid: true } | { valid: false; reason: string } {
  if (startDate >= endDate) {
    return {
      valid: false,
      reason: `Start date must be before end date (start: ${formatDate(startDate)}, end: ${formatDate(endDate)})`
    };
  }

  return { valid: true };
}

/**
 * Get day of week for a date
 * Returns: "Monday" | "Tuesday" | ... | "Sunday"
 */
export function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if date is a Monday
 */
export function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

/**
 * Check if inner date is contained within outer range
 */
export function isDateContained(
  innerDate: Date,
  outerStart: Date,
  outerEnd: Date
): { contained: true } | { contained: false; reason: string } {
  if (innerDate < outerStart) {
    return {
      contained: false,
      reason: `Date ${formatDate(innerDate)} is before range start ${formatDate(outerStart)}`
    };
  }

  if (innerDate > outerEnd) {
    return {
      contained: false,
      reason: `Date ${formatDate(innerDate)} is after range end ${formatDate(outerEnd)}`
    };
  }

  return { contained: true };
}

/**
 * Check if entities are in chronological order
 */
export function checkChronologicalOrder<T extends { startDate: Date }>(
  entities: T[]
): { ordered: true } | { ordered: false; violation: string } {
  for (let i = 0; i < entities.length - 1; i++) {
    const current = entities[i];
    const next = entities[i + 1];

    if (current.startDate >= next.startDate) {
      return {
        ordered: false,
        violation: `Entity at index ${i} (${formatDate(current.startDate)}) is not before entity at index ${i + 1} (${formatDate(next.startDate)})`
      };
    }
  }

  return { ordered: true };
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current ISO timestamp with timezone
 */
export function getCurrentISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Add days to a date (immutable)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
