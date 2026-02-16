import assert from "assert/strict";
import type { RouteMediaTimelineEntry } from "../../types";
import {
  buildCameraKeyframes,
  buildPreviewOverlayLookup,
  resolveOverlayStateAtMile,
  samplePreviewFrame,
} from "./previewEngine";
import { canonicalToOverlays } from "./overlays";

const timeline: RouteMediaTimelineEntry[] = [
  {
    id: "entry-1",
    startMi: 0,
    endMi: 1,
    cameraMode: "third-person-follow",
    speedMiPerSec: 1.2,
    title: "Start",
    markerIds: ["marker-1"],
    subtitleIds: ["sub-1"],
  },
];

const overlays = canonicalToOverlays(timeline, [], [], {}, { defaultCameraMode: "third-person-follow" });

const routeStats = {
  coords: [
    [-120, 35],
    [-119.99, 35.01],
  ] as [number, number][],
  elevations: [100, 101],
  cumulativeMeters: [0, 1609.344],
  cumulativeMiles: [0, 1],
  totalMeters: 1609.344,
  totalMiles: 1,
};

const defaults = {
  mode: "third-person-follow" as const,
  followDistanceMeters: 120,
  altitudeMeters: 90,
  pitchDeg: 58,
  headingOffsetDeg: 0,
};

const timelineSnapshot = JSON.stringify(timeline);
const overlaysSnapshot = JSON.stringify(overlays);
const statsSnapshot = JSON.stringify(routeStats);

const keyframes = buildCameraKeyframes(overlays, defaults, routeStats.totalMiles);
const lookup = buildPreviewOverlayLookup(overlays);
void resolveOverlayStateAtMile(0.4, lookup);
void samplePreviewFrame(0.4, routeStats, [{ mile: 0, elevation: 100 }], 200, keyframes, lookup);

assert.equal(JSON.stringify(timeline), timelineSnapshot, "preview sampling must not mutate timeline");
assert.equal(JSON.stringify(overlays), overlaysSnapshot, "preview sampling must not mutate overlays");
assert.equal(JSON.stringify(routeStats), statsSnapshot, "preview sampling must not mutate route stats");

console.log("previewEngine immutability tests passed");
