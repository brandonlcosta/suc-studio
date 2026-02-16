import assert from "assert/strict";
import type { RouteMediaMarker, RouteMediaTimelineEntry } from "../types";
import {
  detectTimelineLaneOverlaps,
  normalizeSubtitleDurations,
  normalizeTimelineEntryRange,
  MIN_SUBTITLE_DURATION_SEC,
  MIN_TIMELINE_SPAN_MI,
} from "./routeMediaTimelineGuardrails";

function makeEntry(
  id: string,
  startMi: number,
  endMi: number,
  markerId: string
): RouteMediaTimelineEntry {
  return {
    id,
    startMi,
    endMi,
    cameraMode: "third-person-follow",
    markerIds: [markerId],
    subtitleIds: [],
  };
}

const markers: RouteMediaMarker[] = [
  { id: "marker-title-a", atMi: 0.5, type: "title", title: "Title A" },
  { id: "marker-title-b", atMi: 1.5, type: "title", title: "Title B" },
  { id: "marker-poi-c", atMi: 1.8, type: "poi", title: "POI C" },
];

{
  const entries: RouteMediaTimelineEntry[] = [
    makeEntry("entry-b", 1.0, 2.0, "marker-title-b"),
    makeEntry("entry-a", 0.0, 1.5, "marker-title-a"),
    makeEntry("entry-c", 1.2, 1.9, "marker-poi-c"),
  ];

  const issues = detectTimelineLaneOverlaps(entries, markers);
  assert.equal(issues.length, 1, "expected one same-lane overlap");
  assert.equal(issues[0].entryId, "entry-b");
  assert.equal(issues[0].previousEntryId, "entry-a");
  assert.match(issues[0].lane, /^marker:title$/);
}

{
  const entries: RouteMediaTimelineEntry[] = [
    makeEntry("entry-title", 0.0, 2.0, "marker-title-a"),
    makeEntry("entry-poi", 1.0, 1.5, "marker-poi-c"),
  ];
  const issues = detectTimelineLaneOverlaps(entries, markers);
  assert.equal(issues.length, 0, "cross-lane overlap should be allowed");
}

{
  const normalized = normalizeTimelineEntryRange(
    makeEntry("entry-range", 5.0, 2.0, "marker-title-a"),
    { startMi: 5.0, endMi: 2.0 },
    10
  );
  assert(normalized.endMi > normalized.startMi, "range must stay positive");
  assert(
    normalized.endMi - normalized.startMi >= MIN_TIMELINE_SPAN_MI - 1e-9,
    "span must be non-zero"
  );
}

{
  const nearEnd = normalizeTimelineEntryRange(
    makeEntry("entry-end", 9.99, 9.99, "marker-title-a"),
    { startMi: 9.99, endMi: 9.99 },
    10
  );
  assert(nearEnd.endMi > nearEnd.startMi, "range near route end must stay positive");
}

{
  const subtitles = normalizeSubtitleDurations([
    { id: "sub-1", startSec: 10, endSec: 9, text: "Hello" },
  ]);
  assert(subtitles[0].endSec - subtitles[0].startSec >= MIN_SUBTITLE_DURATION_SEC - 1e-9);
}

console.log("routeMediaTimelineGuardrails tests passed");
