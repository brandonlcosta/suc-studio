import assert from "assert/strict";
import {
  buildCameraKeyframes,
  buildPreviewOverlayLookup,
  samplePreviewFrame,
} from "./previewEngine";
import { canonicalToOverlays } from "./overlays";

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

const pointCount = 1600;
const routeStats = {
  coords: Array.from({ length: pointCount }, (_, index) => [
    -120 + index * 0.0001,
    35 + index * 0.0001,
  ]) as [number, number][],
  elevations: Array.from({ length: pointCount }, (_, index) => 100 + Math.sin(index / 20) * 30),
  cumulativeMeters: Array.from({ length: pointCount }, (_, index) => index * 160.9344),
  cumulativeMiles: Array.from({ length: pointCount }, (_, index) => index * 0.1),
  totalMeters: (pointCount - 1) * 160.9344,
  totalMiles: (pointCount - 1) * 0.1,
};

const timeline = Array.from({ length: 240 }, (_, index) => ({
  id: `entry-${index}`,
  startMi: index * 0.4,
  endMi: index * 0.4 + 0.3,
  cameraMode: index % 8 === 0 ? ("overview-lock" as const) : ("third-person-follow" as const),
  speedMiPerSec: index % 6 === 0 ? 0.8 : 1,
  title: `Title ${index}`,
}));

const overlays = canonicalToOverlays(timeline, [], [], {}, {
  defaultCameraMode: "third-person-follow",
  defaultSpeedMiPerSec: 1,
});

const keyframes = buildCameraKeyframes(
  overlays,
  {
    mode: "third-person-follow",
    followDistanceMeters: 120,
    altitudeMeters: 90,
    pitchDeg: 58,
    headingOffsetDeg: 0,
  },
  routeStats.totalMiles
);
const overlayLookup = buildPreviewOverlayLookup(overlays);
const elevations = routeStats.cumulativeMiles.map((mile, index) => ({
  mile,
  elevation: routeStats.elevations[index],
}));

const iterations = 1200;
const startMs = nowMs();
for (let index = 0; index < iterations; index += 1) {
  const progress = (index % 1000) / 1000;
  samplePreviewFrame(progress, routeStats, elevations, 1600, keyframes, overlayLookup);
}
const elapsedMs = nowMs() - startMs;
const avgFrameComputeMs = elapsedMs / iterations;

assert(
  avgFrameComputeMs < 16,
  `preview frame compute exceeded 16ms target (avg=${avgFrameComputeMs.toFixed(3)}ms)`
);

console.log(
  `previewEngine performance tests passed (avg frame compute ${avgFrameComputeMs.toFixed(3)} ms)`
);
