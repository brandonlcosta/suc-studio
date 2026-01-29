/**
 * V8: Blocks in Chronological Order
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures blocks in a season are strictly ordered by startDate.
 * Overlaps or out-of-order blocks are blocking.
 */

import { ValidationRule, Season, ValidationIssue, ValidationContext } from '../types';
import { parseISODate } from '../../core/date-utils';

export const V08_BlockChronology: ValidationRule<Season> = {
  rule_id: 'V08',
  name: 'Blocks in Chronological Order',
  severity: 'BLOCKING',
  entity_type: 'season',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (season: Season, context: ValidationContext): ValidationIssue | null => {
    const blockIds = season.blockIds;

    if (!blockIds || blockIds.length < 2) {
      return null;
    }

    for (let i = 1; i < blockIds.length; i++) {
      const previousBlock = context.allBlocks?.find(b => b.blockId === blockIds[i - 1]);
      const currentBlock = context.allBlocks?.find(b => b.blockId === blockIds[i]);

      if (!previousBlock || !currentBlock || !previousBlock.startDate || !currentBlock.startDate) {
        continue;
      }

      const previousStart = parseISODate(previousBlock.startDate);
      const currentStart = parseISODate(currentBlock.startDate);

      if (!(previousStart instanceof Date) || !(currentStart instanceof Date)) {
        continue;
      }

      if (currentStart <= previousStart) {
        return {
          severity: 'BLOCKING',
          rule_id: 'V08',
          entity_type: 'season',
          entity_id: season.seasonId,
          field_path: `season.blockIds[${i}].startDate`,
          message: `Block "${currentBlock.blockId}" starts on ${currentBlock.startDate}, which is not after previous block "${previousBlock.blockId}" startDate ${previousBlock.startDate}`,
          suggested_fix: 'Reorder blocks chronologically or adjust block start dates',
          doc_reference: '/docs/validation-invariants.md#V8'
        };
      }

      if (previousBlock.endDate) {
        const previousEnd = parseISODate(previousBlock.endDate);
        if (previousEnd instanceof Date && previousEnd >= currentStart) {
          return {
            severity: 'BLOCKING',
            rule_id: 'V08',
            entity_type: 'season',
            entity_id: season.seasonId,
            field_path: `season.blockIds[${i}].startDate`,
            message: `Block "${currentBlock.blockId}" overlaps previous block "${previousBlock.blockId}" (prev end: ${previousBlock.endDate}, current start: ${currentBlock.startDate})`,
            suggested_fix: 'Adjust block dates to remove overlap',
            doc_reference: '/docs/validation-invariants.md#V8'
          };
        }
      }
    }

    return null;
  }
};

export const V08_Rules: ValidationRule[] = [V08_BlockChronology];
