import assert from "assert/strict";
import { downsampleElevationByPixel, type ElevationPoint } from "./timelineElevation";

const points: ElevationPoint[] = [
  { mile: 0, elevation: 100 },
  { mile: 0.5, elevation: 140 },
  { mile: 1, elevation: 110 },
  { mile: 1.5, elevation: 170 },
  { mile: 2, elevation: 120 },
];

const columns = downsampleElevationByPixel(points, 2, 2);
assert.equal(columns.length, 2, "should output one bucket per pixel column");
assert.equal(columns[0].minElevation, 100);
assert.equal(columns[0].maxElevation, 170);
assert.equal(columns[1].minElevation, 120);
assert.equal(columns[1].maxElevation, 120);

console.log("timelineElevation downsample tests passed");
