import assert from "assert/strict";
import { mapProgressToRouteMapping } from "./previewEngine";

const routeStats = {
  coords: [
    [-120, 35],
    [-119.99, 35.01],
    [-119.98, 35.02],
  ] as [number, number][],
  elevations: [100, 110, 120],
  cumulativeMeters: [0, 1609.344, 3218.688],
  cumulativeMiles: [0, 1, 2],
  totalMeters: 3218.688,
  totalMiles: 2,
};

const elevations = [
  { mile: 0, elevation: 100 },
  { mile: 0.5, elevation: 105 },
  { mile: 1, elevation: 110 },
  { mile: 1.5, elevation: 112 },
  { mile: 2, elevation: 120 },
];

const mid = mapProgressToRouteMapping(0.5, routeStats, elevations, 200);
assert(Math.abs(mid.mile - 1) < 1e-9, "0.5 progress should map to midpoint miles");
assert.equal(mid.routeIndex, 1, "progress should map to nearest geometry index");
assert.equal(mid.elevationIndex, 2, "progress should map to nearest elevation sample");
assert.equal(mid.waveformColumn, 99, "waveform column should be deterministic");

const clamped = mapProgressToRouteMapping(2, routeStats, elevations, 200);
assert(Math.abs(clamped.mile - 2) < 1e-9, "progress must clamp to route length");
assert.equal(clamped.routeIndex, 2, "route index clamps to last index");
assert.equal(clamped.waveformColumn, 199, "waveform column clamps to last column");

console.log("previewEngine progress mapping tests passed");
