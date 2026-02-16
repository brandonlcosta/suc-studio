import assert from "assert/strict";
import type { RouteMediaDoc } from "../types";
import { serializeRouteMediaDoc } from "./routeMediaData";

function buildRouteMediaDocWithOrderVariant(reverseArrays = false): RouteMediaDoc {
  const timeline = reverseArrays
    ? [
        {
          id: "entry-b",
          startMi: 5,
          endMi: 6,
          cameraMode: "third-person-follow" as const,
          title: "B",
        },
        {
          id: "entry-a",
          startMi: 1,
          endMi: 2,
          cameraMode: "overview-lock" as const,
          title: "A",
        },
      ]
    : [
        {
          id: "entry-a",
          startMi: 1,
          endMi: 2,
          cameraMode: "overview-lock" as const,
          title: "A",
        },
        {
          id: "entry-b",
          startMi: 5,
          endMi: 6,
          cameraMode: "third-person-follow" as const,
          title: "B",
        },
      ];

  return {
    updatedAt: "2026-02-15T00:00:00.000Z",
    visibility: "private",
    subtitles: reverseArrays
      ? [
          { id: "sub-b", startSec: 12, endSec: 14, text: "B" },
          { id: "sub-a", startSec: 4, endSec: 6, text: "A" },
        ]
      : [
          { id: "sub-a", startSec: 4, endSec: 6, text: "A" },
          { id: "sub-b", startSec: 12, endSec: 14, text: "B" },
        ],
    schemaVersion: "1.0.0",
    routeId: "SUC-036",
    playback: {
      outputFormat: "story",
      holdSeconds: 0.75,
      fps: 24,
      milesPerSecond: 1,
    },
    markers: reverseArrays
      ? [
          { id: "marker-b", atMi: 6.2, type: "poi", title: "B" },
          { id: "marker-a", atMi: 0.2, type: "title", title: "A" },
        ]
      : [
          { id: "marker-a", atMi: 0.2, type: "title", title: "A" },
          { id: "marker-b", atMi: 6.2, type: "poi", title: "B" },
        ],
    id: "SUC-036-MEDIA",
    eventId: "SUC-036",
    createdAt: "2026-02-14T00:00:00.000Z",
    camera: {
      pitchDeg: 58,
      mode: "third-person-follow",
      headingOffsetDeg: 0,
      followDistanceMeters: 120,
      altitudeMeters: 90,
    },
    timeline,
    type: "route-media",
  };
}

const docA = buildRouteMediaDocWithOrderVariant(false);
const docB = buildRouteMediaDocWithOrderVariant(true);

const serializedA = serializeRouteMediaDoc(docA);
const serializedB = serializeRouteMediaDoc(docB);

assert.equal(serializedA, serializedB, "serialization must be stable across input key/array order");
assert(!serializedA.includes("undefined"), "serialized output must not include undefined values");

const parsed = JSON.parse(serializedA) as RouteMediaDoc;
assert.deepEqual(
  parsed.timeline.map((entry) => entry.id),
  ["entry-a", "entry-b"],
  "timeline entries should be deterministically ordered"
);
assert.deepEqual(
  parsed.subtitles.map((entry) => entry.id),
  ["sub-a", "sub-b"],
  "subtitles should be deterministically ordered"
);
assert.deepEqual(
  parsed.markers.map((entry) => entry.id),
  ["marker-a", "marker-b"],
  "markers should be deterministically ordered"
);

console.log("routeMediaSerialization tests passed");
