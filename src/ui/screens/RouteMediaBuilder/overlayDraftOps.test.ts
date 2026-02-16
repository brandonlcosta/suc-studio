import assert from "assert/strict";
import type { RouteMediaDoc } from "../../types";
import {
  createOverlayDraft,
  estimateSecondsAtMile,
  moveEntryToMileInDraft,
  removeEntryByIdInDraft,
  updateEntryRangeInDraft,
} from "./overlayDraftOps";

function buildDraft(): RouteMediaDoc {
  const now = new Date().toISOString();
  return {
    id: "draft-1",
    type: "route-media",
    schemaVersion: "1.0.0",
    eventId: "event-1",
    routeId: "route-1",
    distanceVariantId: "MED",
    title: "Draft",
    description: "",
    playback: {
      milesPerSecond: 1,
      fps: 24,
      holdSeconds: 0.5,
      outputFormat: "story",
    },
    camera: {
      mode: "third-person-follow",
      followDistanceMeters: 120,
      altitudeMeters: 90,
      pitchDeg: 58,
      headingOffsetDeg: 0,
    },
    timeline: [],
    subtitles: [],
    markers: [],
    visibility: "private",
    publish: true,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

const laneContext = {
  defaultCameraMode: "third-person-follow" as const,
  defaultSpeedMiPerSec: 1,
};

{
  const draft = buildDraft();
  const result = createOverlayDraft({
    draft,
    type: "poi",
    mile: 1.2,
    maxMiles: 10,
    generateId: () => "entry-1",
    titleAttachments: {},
    laneContext,
  });
  assert(result.nextDraft, "poi overlay creation should succeed");
  assert.equal(result.entryId, "entry-1");
  const entry = result.nextDraft?.timeline.find((item) => item.id === "entry-1");
  assert(entry, "created entry should exist");
  assert.equal(entry?.title, "New POI");
  assert.deepEqual(entry?.markerIds, ["marker-entry-1"]);
  const marker = result.nextDraft?.markers.find((item) => item.id === "marker-entry-1");
  assert.equal(marker?.type, "poi");
}

{
  const draft = buildDraft();
  const startSec = estimateSecondsAtMile(draft, 1);
  const baseDraft: RouteMediaDoc = {
    ...draft,
    timeline: [
      {
        id: "entry-1",
        startMi: 1,
        endMi: 1.2,
        cameraMode: "third-person-follow",
        subtitleIds: ["sub-1"],
        markerIds: ["marker-1"],
      },
    ],
    subtitles: [{ id: "sub-1", startSec, endSec: startSec + 0.5, text: "Hello" }],
    markers: [{ id: "marker-1", atMi: 1, type: "title", title: "Title" }],
  };

  const moved = moveEntryToMileInDraft(baseDraft, "entry-1", 2, 10);
  const movedMarker = moved.markers.find((item) => item.id === "marker-1");
  assert.equal(movedMarker?.atMi, 2);
  const movedSubtitle = moved.subtitles.find((item) => item.id === "sub-1");
  assert.equal(movedSubtitle?.startSec, estimateSecondsAtMile(draft, 2));

  const resized = updateEntryRangeInDraft(baseDraft, "entry-1", 1.5, 2.5, 10);
  const resizedEntry = resized.timeline.find((item) => item.id === "entry-1");
  assert(resizedEntry, "resized entry should exist");
  assert.equal(resizedEntry?.startMi, 1.5);
  const resizedMarker = resized.markers.find((item) => item.id === "marker-1");
  assert.equal(resizedMarker?.atMi, 1.5);
}

{
  const draft = buildDraft();
  const next = createOverlayDraft({
    draft,
    type: "title",
    mile: 1,
    maxMiles: 10,
    generateId: () => "entry-a",
    titleAttachments: {},
    laneContext,
  }).nextDraft;

  const overlap = createOverlayDraft({
    draft: next!,
    type: "title",
    mile: 1.005,
    maxMiles: 10,
    generateId: () => "entry-b",
    titleAttachments: {},
    laneContext,
  });

  assert.equal(overlap.nextDraft, null, "overlapping creation should be blocked");
}

{
  const draft = buildDraft();
  const next = createOverlayDraft({
    draft,
    type: "poi",
    mile: 1,
    maxMiles: 10,
    generateId: () => "entry-remove",
    titleAttachments: {},
    laneContext,
  }).nextDraft;
  const removed = removeEntryByIdInDraft(next!, "entry-remove");
  assert.equal(removed.timeline.length, 0, "entry removal should clear timeline");
  assert.equal(removed.markers.length, 0, "entry removal should clear markers");
  assert.equal(removed.subtitles.length, 0, "entry removal should clear subtitles");
}

console.log("overlayDraftOps tests passed");
