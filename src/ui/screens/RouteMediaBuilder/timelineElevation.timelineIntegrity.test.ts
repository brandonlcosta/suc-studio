import assert from "assert/strict";
import type { RouteMediaTimelineEntry } from "../../types";
import { projectTimelineEntries } from "./timelineElevation";

const input: RouteMediaTimelineEntry[] = [
  {
    id: "entry-b",
    startMi: 2,
    endMi: 3,
    cameraMode: "third-person-follow",
  },
  {
    id: "entry-a",
    startMi: 1,
    endMi: 1.4,
    cameraMode: "overview-lock",
  },
];

const snapshot = JSON.stringify(input);
const projected = projectTimelineEntries(input, 10);

assert.deepEqual(
  projected.map((entry) => entry.id),
  ["entry-a", "entry-b"],
  "projected timeline order should remain deterministic"
);

assert.equal(
  JSON.stringify(input),
  snapshot,
  "projection must not mutate canonical timeline entry objects"
);

console.log("timelineElevation timeline integrity regression tests passed");
