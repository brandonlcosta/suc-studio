import type { RouteMediaTimelineEntry } from "../../types";
import {
  MIN_TIMELINE_SPAN_MI,
  normalizeTimelineEntryRange,
  sortTimelineEntries,
} from "../../utils/routeMediaTimelineGuardrails";

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function splitTimelineEntryAtMile(
  entries: RouteMediaTimelineEntry[],
  entryId: string,
  splitMile: number,
  maxMiles: number,
  generateId: () => string
): { timeline: RouteMediaTimelineEntry[]; createdEntryId: string | null } {
  const source = entries.find((entry) => entry.id === entryId);
  if (!source) return { timeline: entries, createdEntryId: null };

  const startMi = toFinite(source.startMi, 0);
  const endMi = toFinite(source.endMi, startMi);
  const safeSplit = clamp(toFinite(splitMile, startMi), startMi, endMi);
  if (safeSplit <= startMi + MIN_TIMELINE_SPAN_MI) return { timeline: entries, createdEntryId: null };
  if (safeSplit >= endMi - MIN_TIMELINE_SPAN_MI) return { timeline: entries, createdEntryId: null };

  const first = normalizeTimelineEntryRange(source, { startMi, endMi: safeSplit }, maxMiles);
  const secondId = generateId();
  const second = normalizeTimelineEntryRange(
    {
      ...source,
      id: secondId,
      startMi: safeSplit,
      endMi,
      subtitleIds: [],
      markerIds: [],
    },
    {},
    maxMiles
  );

  const timeline = sortTimelineEntries(
    entries.flatMap((entry) => (entry.id === entryId ? [first, second] : [entry]))
  );
  return { timeline, createdEntryId: secondId };
}

export function duplicateTimelineEntry(
  entries: RouteMediaTimelineEntry[],
  entryId: string,
  maxMiles: number,
  generateId: () => string
): { timeline: RouteMediaTimelineEntry[]; createdEntryId: string | null } {
  const source = entries.find((entry) => entry.id === entryId);
  if (!source) return { timeline: entries, createdEntryId: null };

  const startMi = toFinite(source.startMi, 0);
  const endMi = toFinite(source.endMi, startMi);
  const span = Math.max(MIN_TIMELINE_SPAN_MI, endMi - startMi);
  const duplicateStart = startMi + span + 0.02;
  const duplicateId = generateId();
  const duplicate = normalizeTimelineEntryRange(
    {
      ...source,
      id: duplicateId,
      startMi: duplicateStart,
      endMi: duplicateStart + span,
      subtitleIds: [],
      markerIds: [],
    },
    {},
    maxMiles
  );

  return {
    timeline: sortTimelineEntries([...entries, duplicate]),
    createdEntryId: duplicateId,
  };
}

export function nudgeTimelineEntry(
  entries: RouteMediaTimelineEntry[],
  entryId: string,
  startDeltaMi: number,
  endDeltaMi: number,
  maxMiles: number
): { timeline: RouteMediaTimelineEntry[]; nextStartMi: number | null } {
  let nextStartMi: number | null = null;
  const timeline = sortTimelineEntries(
    entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      const startMi = toFinite(entry.startMi, 0) + toFinite(startDeltaMi, 0);
      const endMi = toFinite(entry.endMi, startMi) + toFinite(endDeltaMi, 0);
      const normalized = normalizeTimelineEntryRange(entry, { startMi, endMi }, maxMiles);
      nextStartMi = normalized.startMi;
      return normalized;
    })
  );
  return { timeline, nextStartMi };
}
