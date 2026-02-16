import type { RouteMediaMarker, RouteMediaSubtitle, RouteMediaTimelineEntry } from "../types";

export const MIN_TIMELINE_SPAN_MI = 0.01;
export const MIN_SUBTITLE_DURATION_SEC = 0.1;

export type TimelineOverlapIssue = {
  lane: string;
  entryId: string;
  previousEntryId: string;
  entryIndex: number;
  previousEntryIndex: number;
  field: string;
  message: string;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sortTimelineEntries(entries: RouteMediaTimelineEntry[]): RouteMediaTimelineEntry[] {
  return [...entries].sort((a, b) => {
    const startDelta = toFiniteNumber(a.startMi, 0) - toFiniteNumber(b.startMi, 0);
    if (startDelta !== 0) return startDelta;
    const endDelta = toFiniteNumber(a.endMi, 0) - toFiniteNumber(b.endMi, 0);
    if (endDelta !== 0) return endDelta;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function getTimelineLane(
  entry: RouteMediaTimelineEntry,
  markersById: ReadonlyMap<string, RouteMediaMarker>
): string {
  const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
  if (markerId) {
    const marker = markersById.get(markerId);
    if (marker?.type) return `marker:${marker.type}`;
  }
  return `camera:${String(entry.cameraMode || "third-person-follow")}`;
}

export function detectTimelineLaneOverlaps(
  entries: RouteMediaTimelineEntry[],
  markers: RouteMediaMarker[]
): TimelineOverlapIssue[] {
  const markersById = new Map(markers.map((marker) => [marker.id, marker]));
  const laneBuckets = new Map<
    string,
    Array<{ entry: RouteMediaTimelineEntry; index: number; startMi: number; endMi: number }>
  >();

  entries.forEach((entry, index) => {
    const lane = getTimelineLane(entry, markersById);
    const startMi = toFiniteNumber(entry.startMi, 0);
    const endMi = toFiniteNumber(entry.endMi, startMi);
    const bucket = laneBuckets.get(lane) || [];
    bucket.push({ entry, index, startMi, endMi });
    laneBuckets.set(lane, bucket);
  });

  const issues: TimelineOverlapIssue[] = [];
  for (const [lane, bucket] of laneBuckets.entries()) {
    const sorted = [...bucket].sort((a, b) => {
      const startDelta = a.startMi - b.startMi;
      if (startDelta !== 0) return startDelta;
      const endDelta = a.endMi - b.endMi;
      if (endDelta !== 0) return endDelta;
      return String(a.entry.id || "").localeCompare(String(b.entry.id || ""));
    });

    let previous = sorted[0] || null;
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (!previous) {
        previous = current;
        continue;
      }

      if (current.startMi < previous.endMi) {
        issues.push({
          lane,
          entryId: current.entry.id,
          previousEntryId: previous.entry.id,
          entryIndex: current.index,
          previousEntryIndex: previous.index,
          field: `timeline[${current.index}].startMi`,
          message: `Overlaps previous entry "${previous.entry.id}" in lane "${lane}".`,
        });
      }

      previous = current;
    }
  }

  return issues;
}

export function normalizeTimelineEntryRange(
  entry: RouteMediaTimelineEntry,
  updates: Partial<RouteMediaTimelineEntry>,
  maxMiles: number
): RouteMediaTimelineEntry {
  const merged = { ...entry, ...updates };
  const safeMaxMiles = Number.isFinite(maxMiles) ? Math.max(0, maxMiles) : Number.POSITIVE_INFINITY;

  if (safeMaxMiles === 0) {
    return { ...merged, startMi: 0, endMi: 0 };
  }

  const maxStartMiles = Number.isFinite(safeMaxMiles)
    ? Math.max(0, safeMaxMiles - MIN_TIMELINE_SPAN_MI)
    : Number.POSITIVE_INFINITY;
  const rawStartMi = toFiniteNumber(merged.startMi, 0);
  const startMi = clamp(rawStartMi, 0, maxStartMiles);
  const minEndMi = Number.isFinite(safeMaxMiles)
    ? Math.min(safeMaxMiles, startMi + MIN_TIMELINE_SPAN_MI)
    : startMi + MIN_TIMELINE_SPAN_MI;
  const rawEndMi = toFiniteNumber(merged.endMi, minEndMi);
  const endMi = Number.isFinite(safeMaxMiles)
    ? clamp(rawEndMi, minEndMi, safeMaxMiles)
    : Math.max(minEndMi, rawEndMi);

  return {
    ...merged,
    startMi,
    endMi,
  };
}

export function normalizeSubtitleDurations(subtitles: RouteMediaSubtitle[]): RouteMediaSubtitle[] {
  return subtitles.map((subtitle) => {
    const startSec = Math.max(0, toFiniteNumber(subtitle.startSec, 0));
    const minEndSec = startSec + MIN_SUBTITLE_DURATION_SEC;
    const endSec = Math.max(minEndSec, toFiniteNumber(subtitle.endSec, minEndSec));
    return { ...subtitle, startSec, endSec };
  });
}
