import assert from "assert/strict";
import {
  buildPreviewOverlayLookup,
  resolveOverlayStateAtMile,
  type PreviewOverlayLookup,
} from "./previewEngine";
import type { Overlay } from "./overlays";

const overlays: Overlay[] = [
  {
    id: "title-1:title",
    type: "title",
    lane: "title",
    startMile: 0.8,
    endMile: 1.2,
    config: { entryId: "title-1", entryIndex: 0, entry: { id: "title-1", startMi: 0.8, endMi: 1.2, cameraMode: "third-person-follow" }, label: "Summit Push" },
  },
  {
    id: "poi-1:poi",
    type: "poi",
    lane: "poi",
    startMile: 1.0,
    endMile: 1.0,
    config: { entryId: "poi-1", entryIndex: 1, entry: { id: "poi-1", startMi: 1.0, endMi: 1.0, cameraMode: "third-person-follow" }, label: "Aid 1" },
  },
  {
    id: "cam-1:camera",
    type: "camera",
    lane: "camera",
    startMile: 0.5,
    endMile: 1.5,
    config: { entryId: "cam-1", entryIndex: 2, entry: { id: "cam-1", startMi: 0.5, endMi: 1.5, cameraMode: "overview-lock" }, label: "overview-lock" },
  },
  {
    id: "spd-1:speed",
    type: "speed",
    lane: "speed",
    startMile: 0.9,
    endMile: 1.4,
    config: { entryId: "spd-1", entryIndex: 3, entry: { id: "spd-1", startMi: 0.9, endMi: 1.4, cameraMode: "third-person-follow", speedMiPerSec: 0.8 }, label: "Speed 0.80" },
  },
];

const lookup: PreviewOverlayLookup = buildPreviewOverlayLookup(overlays);

const mid = resolveOverlayStateAtMile(1.0, lookup);
assert.equal(mid.activeTitles.length, 1, "title should be active at in-range mile");
assert.equal(mid.activePois.length, 1, "poi should be active within range window");
assert(mid.speedIndicator, "speed indicator should activate for in-range speed block");
assert(mid.activeEntryIds.includes("title-1"), "active entry ids should include title");
assert(mid.activeEntryIds.includes("cam-1"), "active entry ids should include camera");
assert(mid.activeEntryIds.includes("spd-1"), "active entry ids should include speed");
assert(mid.activeTitles[0].opacity > 0, "title opacity should be positive within active region");

const out = resolveOverlayStateAtMile(3, lookup);
assert.equal(out.activeTitles.length, 0, "title should be inactive out of range");
assert.equal(out.activePois.length, 0, "poi should be inactive out of range");
assert.equal(out.speedIndicator, null, "speed should be inactive out of range");

console.log("previewEngine overlay activation tests passed");
