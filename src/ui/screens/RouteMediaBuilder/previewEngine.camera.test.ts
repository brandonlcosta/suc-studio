import assert from "assert/strict";
import type { RouteMediaTimelineEntry } from "../../types";
import {
  buildCameraKeyframes,
  interpolateCameraState,
  mapProgressToRouteMapping,
} from "./previewEngine";
import { canonicalToOverlays } from "./overlays";

const timeline: RouteMediaTimelineEntry[] = [
  {
    id: "entry-1",
    startMi: 1,
    endMi: 2,
    cameraMode: "overview-lock",
  },
];

const defaults = {
  mode: "third-person-follow" as const,
  followDistanceMeters: 120,
  altitudeMeters: 90,
  pitchDeg: 58,
  headingOffsetDeg: 10,
};

const routeStats = {
  coords: [
    [-120, 35],
    [-119.99, 35.01],
    [-119.98, 35.02],
    [-119.97, 35.03],
  ] as [number, number][],
  elevations: [100, 105, 110, 120],
  cumulativeMeters: [0, 1609.344, 3218.688, 4828.032],
  cumulativeMiles: [0, 1, 2, 3],
  totalMeters: 4828.032,
  totalMiles: 3,
};

const overlays = canonicalToOverlays(timeline, [], [], {}, { defaultCameraMode: "third-person-follow" });
const keyframes = buildCameraKeyframes(overlays, defaults, 3);
assert(keyframes.length >= 4, "camera keyframes should include defaults + override boundaries");

const mapping = mapProgressToRouteMapping(0.5, routeStats, [], 1); // 1.5 miles
const camera = interpolateCameraState(keyframes, mapping, routeStats);
assert.equal(camera.mode, "overview-lock", "mid override should keep overview mode");
assert(camera.zoom < 14, "overview lock should use a wider zoom than follow mode");
assert(Math.abs(camera.bearing - 10) < 1e-6, "bearing should inherit deterministic heading offset");

const mappingEnd = mapProgressToRouteMapping(0.9, routeStats, [], 1); // 2.7 miles
const cameraEnd = interpolateCameraState(keyframes, mappingEnd, routeStats);
assert.equal(cameraEnd.mode, "third-person-follow", "camera should return to default after override");

console.log("previewEngine camera interpolation tests passed");
