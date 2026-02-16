import type { RouteMediaCameraMode, RouteMediaMarker } from "../../types";
import {
  getOverlayEntryId,
  getOverlayLabel,
  getOverlayMarkerType,
  getOverlaySpeedMiPerSec,
  type Overlay,
  type OverlayType,
} from "./overlays";

export type TimelineLaneId = "title" | "poi" | "camera" | "speed";

export type TimelineLaneDefinition = {
  id: TimelineLaneId;
  label: string;
  color: string;
  blockHeight: number;
};

export type TimelineLaneBlock = {
  blockId: string;
  laneId: TimelineLaneId;
  entryId: string;
  overlayId: string;
  overlayType: OverlayType;
  startMi: number;
  endMi: number;
  label: string;
  markerType?: RouteMediaMarker["type"];
  attachedPoiEntryId?: string;
  speedMiPerSec?: number;
};

export type TimelineLaneProjectionContext = {
  defaultCameraMode?: RouteMediaCameraMode | null;
  defaultSpeedMiPerSec?: number | null;
  speedEpsilon?: number;
};

export type LaneOverlapIssue = {
  laneId: TimelineLaneId;
  entryId: string;
  previousEntryId: string;
  message: string;
};

const DEFAULT_LANE_DEFINITIONS: TimelineLaneDefinition[] = [
  { id: "title", label: "Title Track", color: "#34d399", blockHeight: 28 },
  { id: "poi", label: "POI Overlay Track", color: "#f59e0b", blockHeight: 24 },
  { id: "camera", label: "Camera Track", color: "#60a5fa", blockHeight: 24 },
  { id: "speed", label: "Speed Track", color: "#f472b6", blockHeight: 24 },
];

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function sortByRangeThenId(left: TimelineLaneBlock, right: TimelineLaneBlock): number {
  const startDelta = left.startMi - right.startMi;
  if (startDelta !== 0) return startDelta;
  const endDelta = left.endMi - right.endMi;
  if (endDelta !== 0) return endDelta;
  return left.entryId.localeCompare(right.entryId);
}

function laneBlock(overlay: Overlay, attachedPoiEntryId?: string): TimelineLaneBlock {
  const entryId = getOverlayEntryId(overlay);
  const startMi = toFinite(overlay.startMile, 0);
  const endMi = Math.max(startMi, toFinite(overlay.endMile, startMi));
  const speedMiPerSec = getOverlaySpeedMiPerSec(overlay);
  return {
    blockId: overlay.id,
    laneId: overlay.lane,
    entryId,
    overlayId: overlay.id,
    overlayType: overlay.type,
    startMi,
    endMi,
    label: getOverlayLabel(overlay),
    markerType: getOverlayMarkerType(overlay) ?? undefined,
    attachedPoiEntryId,
    speedMiPerSec: Number.isFinite(speedMiPerSec) ? speedMiPerSec ?? undefined : undefined,
  };
}

export function getTimelineLaneDefinitions(): TimelineLaneDefinition[] {
  return [...DEFAULT_LANE_DEFINITIONS];
}

export function projectOverlaysToLanes(
  overlays: Overlay[],
  titleAttachments?: Record<string, string>
): Record<TimelineLaneId, TimelineLaneBlock[]> {
  const lanes: Record<TimelineLaneId, TimelineLaneBlock[]> = {
    title: [],
    poi: [],
    camera: [],
    speed: [],
  };

  for (const overlay of overlays) {
    const attachment =
      overlay.type === "title"
        ? overlay.attachment?.poiId ?? titleAttachments?.[getOverlayEntryId(overlay)]
        : undefined;
    lanes[overlay.lane].push(laneBlock(overlay, attachment));
  }

  for (const laneId of Object.keys(lanes) as TimelineLaneId[]) {
    lanes[laneId] = [...lanes[laneId]].sort(sortByRangeThenId);
  }

  return lanes;
}

export function detectLaneOverlaps(lanes: Record<TimelineLaneId, TimelineLaneBlock[]>): LaneOverlapIssue[] {
  const issues: LaneOverlapIssue[] = [];
  for (const laneId of Object.keys(lanes) as TimelineLaneId[]) {
    const blocks = [...lanes[laneId]].sort(sortByRangeThenId);
    let previous: TimelineLaneBlock | null = null;
    for (const block of blocks) {
      if (!previous) {
        previous = block;
        continue;
      }
      if (block.startMi < previous.endMi) {
        issues.push({
          laneId,
          entryId: block.entryId,
          previousEntryId: previous.entryId,
          message: `Entry "${block.entryId}" overlaps "${previous.entryId}" in lane ${laneId}.`,
        });
      }
      previous = block;
    }
  }
  return issues;
}

export function maybeSnapToLaneEdge(
  rawMile: number,
  laneBlocks: TimelineLaneBlock[],
  currentEntryId: string,
  thresholdPx: number,
  trackWidthPx: number,
  routeLengthMiles: number
): number {
  const safeRouteMiles = Math.max(0.001, toFinite(routeLengthMiles, 0.001));
  const safeWidth = Math.max(1, toFinite(trackWidthPx, 1));
  const safeThreshold = Math.max(0, toFinite(thresholdPx, 0));
  const rawX = (Math.max(0, Math.min(safeRouteMiles, rawMile)) / safeRouteMiles) * safeWidth;

  let bestMile = rawMile;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const block of laneBlocks) {
    if (block.entryId === currentEntryId) continue;
    const candidates = [block.startMi, block.endMi];
    for (const candidateMile of candidates) {
      const candidateX = (candidateMile / safeRouteMiles) * safeWidth;
      const distance = Math.abs(candidateX - rawX);
      if (distance > safeThreshold || distance >= bestDistance) continue;
      bestDistance = distance;
      bestMile = candidateMile;
    }
  }
  return bestMile;
}

export function findNearestPoiOverlayEntryId(
  titleOverlay: Overlay,
  overlays: Overlay[],
  thresholdMiles = 0.2
): string | null {
  const poiBlocks = projectOverlaysToLanes(overlays).poi;
  if (poiBlocks.length === 0) return null;

  const titleStart = toFinite(titleOverlay.startMile, 0);
  let bestEntryId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const block of poiBlocks) {
    const distance = Math.abs(block.startMi - titleStart);
    if (distance > thresholdMiles || distance >= bestDistance) continue;
    bestDistance = distance;
    bestEntryId = block.entryId;
  }
  return bestEntryId;
}
