import assert from "assert/strict";
import type { RouteMediaMarker, RouteMediaSubtitle, RouteMediaTimelineEntry } from "../../types";
import { canonicalToOverlays, overlaysToCanonical } from "./overlays";

const entries: RouteMediaTimelineEntry[] = [
  {
    id: "entry-title",
    startMi: 0,
    endMi: 0.2,
    cameraMode: "third-person-follow",
    title: "Welcome",
    subtitleIds: ["sub-1"],
    markerIds: ["marker-1"],
  },
  {
    id: "entry-poi",
    startMi: 1,
    endMi: 1.1,
    cameraMode: "third-person-follow",
    title: "Aid Station",
    markerIds: ["marker-2"],
  },
  {
    id: "entry-camera",
    startMi: 2,
    endMi: 2.4,
    cameraMode: "overview-lock",
  },
];

const markers: RouteMediaMarker[] = [
  { id: "marker-1", atMi: 0, type: "title", title: "Welcome" },
  { id: "marker-2", atMi: 1, type: "poi", title: "Aid Station" },
];

const subtitles: RouteMediaSubtitle[] = [
  { id: "sub-1", startSec: 0, endSec: 1.5, text: "Opening" },
];

const titleAttachments = { "entry-title": "entry-poi" };

const overlays = canonicalToOverlays(entries, markers, subtitles, titleAttachments, {
  defaultCameraMode: "third-person-follow",
  defaultSpeedMiPerSec: 1,
});

const roundTrip = overlaysToCanonical(overlays);

assert.equal(JSON.stringify(roundTrip.timeline), JSON.stringify(entries), "timeline should round-trip");
assert.equal(JSON.stringify(roundTrip.markers), JSON.stringify(markers), "markers should round-trip");
assert.equal(JSON.stringify(roundTrip.subtitles), JSON.stringify(subtitles), "subtitles should round-trip");

console.log("overlay mapping tests passed");
