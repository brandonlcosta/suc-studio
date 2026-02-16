import assert from "assert/strict";
import { MIN_TIMELINE_SPAN_MI } from "../../utils/routeMediaTimelineGuardrails";
import {
  duplicateTimelineEntry,
  nudgeTimelineEntry,
  splitTimelineEntryAtMile,
} from "./timelineEditing";

const baseTimeline = [
  {
    id: "entry-a",
    startMi: 1,
    endMi: 2,
    cameraMode: "third-person-follow" as const,
    speedMiPerSec: 1,
    title: "A",
    subtitleIds: ["sub-a"],
    markerIds: ["marker-a"],
  },
];

const split = splitTimelineEntryAtMile(baseTimeline, "entry-a", 1.4, 10, () => "entry-b");
assert.equal(split.createdEntryId, "entry-b");
assert.equal(split.timeline.length, 2, "split should create one extra entry");
const first = split.timeline.find((entry) => entry.id === "entry-a");
const second = split.timeline.find((entry) => entry.id === "entry-b");
assert(first && second, "split entries should both exist");
assert(Math.abs((first?.endMi || 0) - 1.4) < 1e-9);
assert(Math.abs((second?.startMi || 0) - 1.4) < 1e-9);
assert.deepEqual(second?.subtitleIds, [], "new split segment should not inherit subtitle links");
assert.deepEqual(second?.markerIds, [], "new split segment should not inherit marker links");

const splitTooClose = splitTimelineEntryAtMile(baseTimeline, "entry-a", 1.0 + MIN_TIMELINE_SPAN_MI / 2, 10, () => "entry-c");
assert.equal(splitTooClose.createdEntryId, null, "split should be rejected for near-zero segment");
assert.equal(splitTooClose.timeline.length, 1);

const duplicate = duplicateTimelineEntry(baseTimeline, "entry-a", 10, () => "entry-d");
assert.equal(duplicate.createdEntryId, "entry-d");
assert.equal(duplicate.timeline.length, 2);
const duplicateEntry = duplicate.timeline.find((entry) => entry.id === "entry-d");
assert(duplicateEntry, "duplicate entry should exist");
assert((duplicateEntry?.startMi || 0) > 2, "duplicate should be offset after source segment");
assert.deepEqual(duplicateEntry?.subtitleIds, [], "duplicate should not re-use subtitle links");
assert.deepEqual(duplicateEntry?.markerIds, [], "duplicate should not re-use marker links");

const nudged = nudgeTimelineEntry(baseTimeline, "entry-a", -5, -5, 10);
const nudgedEntry = nudged.timeline.find((entry) => entry.id === "entry-a");
assert(nudgedEntry, "nudged entry should exist");
assert((nudgedEntry?.startMi || 0) >= 0, "nudge should clamp start to route bounds");
assert(
  (nudgedEntry?.endMi || 0) - (nudgedEntry?.startMi || 0) >= MIN_TIMELINE_SPAN_MI,
  "nudge should preserve minimum segment span"
);

console.log("timelineEditing tests passed");
