/**
 * V6: Season Contains Block Dates
 *
 * SEVERITY: BLOCKING
 * APPLIES TO: edit, publish, load
 *
 * Ensures each block's dates are within the parent season date range.
 */

import { ValidationRule, Block, ValidationIssue, ValidationContext } from '../types';
import { parseISODate } from '../../core/date-utils';

export const V06_SeasonContainsBlocks: ValidationRule<Block> = {
  rule_id: 'V06',
  name: 'Season Contains Block Dates',
  severity: 'BLOCKING',
  entity_type: 'block',
  applies_to_modes: ['edit', 'publish', 'load'],

  validate: (block: Block, context: ValidationContext): ValidationIssue | null => {
    if (!block.seasonId || !block.startDate || !block.endDate) {
      // Missing fields caught by V01
      return null;
    }

    const season = context.allSeasons?.find(s => s.seasonId === block.seasonId);
    if (!season || !season.startDate || !season.endDate) {
      // Missing season or dates handled by other rules
      return null;
    }

    const seasonStart = parseISODate(season.startDate);
    const seasonEnd = parseISODate(season.endDate);
    const blockStart = parseISODate(block.startDate);
    const blockEnd = parseISODate(block.endDate);

    if (
      !(seasonStart instanceof Date) ||
      !(seasonEnd instanceof Date) ||
      !(blockStart instanceof Date) ||
      !(blockEnd instanceof Date)
    ) {
      // Invalid dates caught by V03
      return null;
    }

    const blockIndex = season.blockIds ? season.blockIds.indexOf(block.blockId) : -1;
    const fieldBase = blockIndex >= 0 ? `season.blockIds[${blockIndex}]` : 'block';

    if (blockStart < seasonStart) {
      return {
        severity: 'BLOCKING',
        rule_id: 'V06',
        entity_type: 'block',
        entity_id: block.blockId,
        field_path: `${fieldBase}.startDate`,
        message: `Block "${block.blockId}" starts before season "${season.seasonId}" startDate (block: ${block.startDate}, season: ${season.startDate})`,
        suggested_fix: 'Adjust block startDate to be within the season range',
        doc_reference: '/docs/validation-invariants.md#V6'
      };
    }

    if (blockEnd > seasonEnd) {
      return {
        severity: 'BLOCKING',
        rule_id: 'V06',
        entity_type: 'block',
        entity_id: block.blockId,
        field_path: `${fieldBase}.endDate`,
        message: `Block "${block.blockId}" ends after season "${season.seasonId}" endDate (block: ${block.endDate}, season: ${season.endDate})`,
        suggested_fix: 'Adjust block endDate to be within the season range',
        doc_reference: '/docs/validation-invariants.md#V6'
      };
    }

    return null;
  }
};

export const V06_Rules: ValidationRule[] = [V06_SeasonContainsBlocks];
