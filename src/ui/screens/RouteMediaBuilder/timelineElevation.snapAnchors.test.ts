import assert from "assert/strict";
import {
  detectElevationAnchors,
  maybeSnapMileToElevationAnchor,
  type ElevationPoint,
} from "./timelineElevation";

const profile: ElevationPoint[] = [
  { mile: 0, elevation: 100 },
  { mile: 1, elevation: 130 }, // summit
  { mile: 2, elevation: 90 },  // valley
  { mile: 3, elevation: 150 }, // summit
  { mile: 4, elevation: 120 },
];

const anchors = detectElevationAnchors(profile);
assert.equal(anchors.length, 3, "should detect local maxima/minima anchors");
assert.deepEqual(
  anchors.map((anchor) => anchor.kind),
  ["summit", "valley", "summit"]
);

const snapped = maybeSnapMileToElevationAnchor(0.98, anchors, 10, 400, 4);
assert(Math.abs(snapped - 1) < 1e-9, "mile should snap to nearest anchor when within threshold");

const unsnapped = maybeSnapMileToElevationAnchor(0.2, anchors, 4, 400, 4);
assert(Math.abs(unsnapped - 0.2) < 1e-9, "mile should not snap when outside threshold");

console.log("timelineElevation snap anchor tests passed");
