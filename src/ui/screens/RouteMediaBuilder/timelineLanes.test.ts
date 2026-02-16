import assert from "assert/strict";
import type { RouteMediaMarker, RouteMediaTimelineEntry } from "../../types";
import {
  detectLaneOverlaps,
  findNearestPoiOverlayEntryId,
  projectOverlaysToLanes,
  type TimelineLaneProjectionContext,
} from "./timelineLanes";
import { canonicalToOverlays } from "./overlays";

const context: TimelineLaneProjectionContext = {
  defaultCameraMode: "third-person-follow",
  defaultSpeedMiPerSec: 1,
};

const markers: RouteMediaMarker[] = [
  { id: "marker-title-a", atMi: 0, type: "title", title: "Title A" },
  { id: "marker-poi-a", atMi: 1, type: "poi", title: "POI A" },
  { id: "marker-title-b", atMi: 1.5, type: "title", title: "Title B" },
];

const entries: RouteMediaTimelineEntry[] = [
  {
    id: "title-a",
    startMi: 0,
    endMi: 2,
    cameraMode: "third-person-follow",
    speedMiPerSec: 1,
    title: "Title A",
    markerIds: ["marker-title-a"],
  },
  {
    id: "poi-a",
    startMi: 1,
    endMi: 3,
    cameraMode: "third-person-follow",
    speedMiPerSec: 1,
    title: "POI A",
    markerIds: ["marker-poi-a"],
  },
  {
    id: "title-b",
    startMi: 1.5,
    endMi: 2.5,
    cameraMode: "third-person-follow",
    speedMiPerSec: 1,
    title: "Title B",
    markerIds: ["marker-title-b"],
  },
];

const overlays = canonicalToOverlays(entries, markers, [], {}, context);
const lanes = projectOverlaysToLanes(overlays, {});
assert.equal(lanes.title.length, 2, "title entries should map into title lane");
assert.equal(lanes.poi.length, 1, "poi entries should map into poi lane");
assert.equal(lanes.camera.length, 0, "camera lane should only include camera overrides");
assert.equal(lanes.speed.length, 0, "speed lane should only include speed overrides");

const overlaps = detectLaneOverlaps(lanes);
assert.equal(overlaps.length, 1, "only intra-lane overlap should be reported");
assert.equal(overlaps[0]?.laneId, "title");
assert.equal(overlaps[0]?.entryId, "title-b");
assert.equal(overlaps[0]?.previousEntryId, "title-a");

const titleOverlay = overlays.find((overlay) => overlay.type === "title" && overlay.id.startsWith("title-b"));
assert(titleOverlay, "title overlay should exist");
const nearestPoi = findNearestPoiOverlayEntryId(titleOverlay!, overlays, 0.3);
assert.equal(nearestPoi, "poi-a", "should resolve nearest poi for title overlay");

console.log("timelineLanes tests passed");
