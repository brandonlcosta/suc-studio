import type {
  RouteMediaCameraMode,
  RouteMediaDoc,
  RouteMediaMarker,
  RouteMediaSubtitle,
  RouteMediaTimelineEntry,
} from "../../types";
import {
  MIN_SUBTITLE_DURATION_SEC,
  MIN_TIMELINE_SPAN_MI,
  normalizeSubtitleDurations,
  normalizeTimelineEntryRange,
  sortTimelineEntries,
} from "../../utils/routeMediaTimelineGuardrails";
import { canonicalToOverlays } from "./overlays";
import { detectLaneOverlaps, projectOverlaysToLanes, type TimelineLaneProjectionContext } from "./timelineLanes";

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function estimateSecondsAtMile(draft: RouteMediaDoc, mile: number): number {
  const speed = Math.max(0.05, toFinite(draft.playback?.milesPerSecond, 1));
  const hold = Math.max(0, toFinite(draft.playback?.holdSeconds, 0));
  return hold + Math.max(0, mile) / speed;
}

export function moveEntryToMileInDraft(
  draft: RouteMediaDoc,
  entryId: string,
  mile: number,
  maxMiles: number
): RouteMediaDoc {
  const nextMile = clamp(toFinite(mile, 0), 0, Math.max(0, maxMiles));
  let linkedSubtitleIds: string[] = [];
  let primaryMarkerId: string | null = null;

  const timeline = sortTimelineEntries(
    draft.timeline.map((entry) => {
      if (entry.id !== entryId) return entry;
      const span =
        Math.max(MIN_TIMELINE_SPAN_MI, toFinite(entry.endMi, 0) - toFinite(entry.startMi, 0)) ||
        MIN_TIMELINE_SPAN_MI;
      linkedSubtitleIds = Array.isArray(entry.subtitleIds) ? entry.subtitleIds : [];
      primaryMarkerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] ?? null : null;
      const nextEnd = clamp(nextMile + span, nextMile, Math.max(0, maxMiles));
      return normalizeTimelineEntryRange(
        { ...entry, startMi: nextMile, endMi: nextEnd },
        {},
        Math.max(0, maxMiles)
      );
    })
  );

  const subtitles = normalizeSubtitleDurations(draft.subtitles.map((subtitle) => {
    if (!linkedSubtitleIds.includes(subtitle.id)) return subtitle;
    const existingDuration = Math.max(
      MIN_SUBTITLE_DURATION_SEC,
      toFinite(subtitle.endSec, 0) - toFinite(subtitle.startSec, 0)
    );
    const nextStart = estimateSecondsAtMile(draft, nextMile);
    return {
      ...subtitle,
      startSec: nextStart,
      endSec: nextStart + existingDuration,
    };
  }));

  const markers = draft.markers.map((marker) =>
    primaryMarkerId && marker.id === primaryMarkerId ? { ...marker, atMi: nextMile } : marker
  );

  return { ...draft, timeline, subtitles, markers };
}

export function updateEntryRangeInDraft(
  draft: RouteMediaDoc,
  entryId: string,
  startMi: number,
  endMi: number,
  maxMiles: number
): RouteMediaDoc {
  let linkedSubtitleIds: string[] = [];
  let primaryMarkerId: string | null = null;

  const timeline = sortTimelineEntries(
    draft.timeline.map((entry) => {
      if (entry.id !== entryId) return entry;
      linkedSubtitleIds = Array.isArray(entry.subtitleIds) ? entry.subtitleIds : [];
      primaryMarkerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] ?? null : null;
      return normalizeTimelineEntryRange(entry, { startMi, endMi }, maxMiles);
    })
  );

  const nextEntry = timeline.find((entry) => entry.id === entryId);
  const nextStartMi = toFinite(nextEntry?.startMi, startMi);

  const subtitles = normalizeSubtitleDurations(draft.subtitles.map((subtitle) => {
    if (!linkedSubtitleIds.includes(subtitle.id)) return subtitle;
    const existingDuration = Math.max(
      MIN_SUBTITLE_DURATION_SEC,
      toFinite(subtitle.endSec, 0) - toFinite(subtitle.startSec, 0)
    );
    const nextStart = estimateSecondsAtMile(draft, nextStartMi);
    return {
      ...subtitle,
      startSec: nextStart,
      endSec: nextStart + existingDuration,
    };
  }));

  const markers = draft.markers.map((marker) =>
    primaryMarkerId && marker.id === primaryMarkerId ? { ...marker, atMi: nextStartMi } : marker
  );

  return { ...draft, timeline, subtitles, markers };
}

export function removeEntryByIdInDraft(draft: RouteMediaDoc, entryId: string): RouteMediaDoc {
  const entry = draft.timeline.find((item) => item.id === entryId);
  if (!entry) return draft;
  const subtitleIds = new Set(Array.isArray(entry.subtitleIds) ? entry.subtitleIds : []);
  const markerIds = new Set(Array.isArray(entry.markerIds) ? entry.markerIds : []);
  return {
    ...draft,
    timeline: draft.timeline.filter((item) => item.id !== entryId),
    subtitles: draft.subtitles.filter((item) => !subtitleIds.has(item.id)),
    markers: draft.markers.filter((item) => !markerIds.has(item.id)),
  };
}

type CreateOverlayInput = {
  draft: RouteMediaDoc;
  type: "title" | "poi" | "camera" | "speed";
  mile: number;
  maxMiles: number;
  generateId: () => string;
  titleAttachments: Record<string, string>;
  laneContext: TimelineLaneProjectionContext;
};

export function createOverlayDraft(input: CreateOverlayInput): {
  nextDraft: RouteMediaDoc | null;
  entryId: string | null;
  error?: string;
} {
  const { draft, type, mile, maxMiles, generateId, titleAttachments, laneContext } = input;
  const startMi = clamp(toFinite(mile, 0), 0, Math.max(0, maxMiles));
  const entryId = generateId();
  const entryBase: RouteMediaTimelineEntry = normalizeTimelineEntryRange(
    {
      id: entryId,
      startMi,
      endMi: startMi + MIN_TIMELINE_SPAN_MI,
      cameraMode: (draft.camera.mode || "third-person-follow") as RouteMediaCameraMode,
    },
    {},
    Math.max(0, maxMiles)
  );

  let nextEntry: RouteMediaTimelineEntry = entryBase;
  let markers: RouteMediaMarker[] = draft.markers;
  let subtitles: RouteMediaSubtitle[] = draft.subtitles;

  if (type === "poi" || type === "title") {
    const subtitleId = `subtitle-${entryId}`;
    const markerId = `marker-${entryId}`;
    const startSec = estimateSecondsAtMile(draft, startMi);
    const holdSeconds = Math.max(0.1, toFinite(draft.playback.holdSeconds, 0.75));

    nextEntry = {
      ...entryBase,
      title: type === "poi" ? "New POI" : "New Title",
      subtitleIds: [subtitleId],
      markerIds: [markerId],
    };
    const subtitle: RouteMediaSubtitle = {
      id: subtitleId,
      startSec,
      endSec: startSec + holdSeconds,
      text: type === "poi" ? "New POI subtitle" : "New title subtitle",
      position: "bottom",
    };
    const marker: RouteMediaMarker = {
      id: markerId,
      atMi: startMi,
      type: type === "poi" ? "poi" : "title",
      title: type === "poi" ? "POI" : "Title",
    };
    subtitles = normalizeSubtitleDurations([...draft.subtitles, subtitle]);
    markers = [...draft.markers, marker];
  }

  if (type === "camera") {
    const defaultMode = draft.camera.mode || "third-person-follow";
    nextEntry = {
      ...entryBase,
      cameraMode: defaultMode === "third-person-follow" ? "overview-lock" : "third-person-follow",
    };
  }

  if (type === "speed") {
    const baseSpeed = Math.max(0.05, toFinite(draft.playback.milesPerSecond, 1));
    nextEntry = {
      ...entryBase,
      speedMiPerSec: Math.max(0.05, baseSpeed * 0.85),
    };
  }

  const nextDraft: RouteMediaDoc = {
    ...draft,
    timeline: sortTimelineEntries([...draft.timeline, nextEntry]),
    subtitles,
    markers,
  };

  const overlaySnapshot = canonicalToOverlays(
    nextDraft.timeline,
    nextDraft.markers,
    nextDraft.subtitles,
    titleAttachments,
    laneContext
  );
  const overlapIssues = detectLaneOverlaps(projectOverlaysToLanes(overlaySnapshot, titleAttachments));
  const hasOverlap = overlapIssues.some((issue) => issue.entryId === entryId);
  if (hasOverlap) {
    return { nextDraft: null, entryId: null, error: "Timeline overlap detected." };
  }

  return { nextDraft, entryId };
}
