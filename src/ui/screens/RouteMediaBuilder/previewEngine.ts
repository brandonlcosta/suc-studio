import type { RouteMediaCameraDefaults, RouteMediaCameraMode } from "../../types";
import type { RouteStats } from "../../utils/routeMath";
import type { ElevationPoint } from "./timelineElevation";
import type { TimelineLaneBlock, TimelineLaneId } from "./timelineLanes";
import { projectOverlaysToLanes } from "./timelineLanes";
import type { Overlay } from "./overlays";
import { getOverlayCameraMode, getOverlayEntryId } from "./overlays";

export type PreviewRouteMapping = {
  progress: number;
  mile: number;
  routeIndex: number;
  elevationIndex: number;
  waveformColumn: number;
};

export type PreviewCameraKeyframe = {
  mile: number;
  mode: RouteMediaCameraMode;
  zoom: number;
  bearing: number;
  pitch: number;
  priority: number;
};

export type PreviewCameraState = {
  mile: number;
  routeIndex: number;
  lat: number;
  lon: number;
  mode: RouteMediaCameraMode;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type PreviewOverlayTitle = {
  entryId: string;
  text: string;
  startMi: number;
  endMi: number;
  opacity: number;
};

export type PreviewOverlayPoi = {
  entryId: string;
  label: string;
  distanceMi: number;
  opacity: number;
};

export type PreviewOverlaySpeed = {
  entryId: string;
  speedMiPerSec: number;
};

export type PreviewOverlayState = {
  activeTitles: PreviewOverlayTitle[];
  activePois: PreviewOverlayPoi[];
  speedIndicator: PreviewOverlaySpeed | null;
  activeEntryIds: string[];
  activeCaptions: string[];
};

export type PreviewOverlayLookup = {
  byLane: Record<TimelineLaneId, TimelineLaneBlock[]>;
  allBlocks: TimelineLaneBlock[];
  captions: Array<{ startMi: number; endMi: number; text: string }>;
};

export type PreviewFrameSample = {
  mapping: PreviewRouteMapping;
  camera: PreviewCameraState;
  overlays: PreviewOverlayState;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(toFinite(value, 0), 0, 1);
}

function findNearestIndexByMile(miles: number[], mile: number): number {
  if (!Array.isArray(miles) || miles.length === 0) return -1;
  if (mile <= miles[0]) return 0;
  const last = miles.length - 1;
  if (mile >= miles[last]) return last;

  let low = 0;
  let high = last;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (miles[mid] < mile) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const right = low;
  const left = Math.max(0, right - 1);
  const leftDistance = Math.abs(miles[left] - mile);
  const rightDistance = Math.abs(miles[right] - mile);
  return leftDistance <= rightDistance ? left : right;
}

function presetForMode(
  mode: RouteMediaCameraMode,
  defaults: RouteMediaCameraDefaults
): { zoom: number; bearing: number; pitch: number } {
  const followDistance = Math.max(20, toFinite(defaults.followDistanceMeters, 120));
  const altitude = Math.max(20, toFinite(defaults.altitudeMeters, 90));
  const headingOffset = toFinite(defaults.headingOffsetDeg, 0);
  const pitch = clamp(toFinite(defaults.pitchDeg, 58), 15, 78);

  if (mode === "overview-lock") {
    return {
      zoom: clamp(12.6 - altitude / 220, 9.8, 13.8),
      bearing: headingOffset,
      pitch: clamp(pitch - 18, 20, 58),
    };
  }

  return {
    zoom: clamp(15.4 - followDistance / 75, 11.5, 16.2),
    bearing: headingOffset,
    pitch,
  };
}

export function mapProgressToMile(progress: number, routeLengthMiles: number): number {
  const safeMiles = Math.max(0, toFinite(routeLengthMiles, 0));
  return clamp01(progress) * safeMiles;
}

export function mapProgressToWaveformColumn(progress: number, columns: number): number {
  const safeColumns = Math.max(1, Math.floor(toFinite(columns, 1)));
  return clamp(Math.floor(clamp01(progress) * (safeColumns - 1)), 0, safeColumns - 1);
}

export function mapProgressToRouteMapping(
  progress: number,
  routeStats: RouteStats | null,
  elevationPoints: ElevationPoint[],
  waveformColumns: number
): PreviewRouteMapping {
  const safeProgress = clamp01(progress);
  const routeMiles = Math.max(0, toFinite(routeStats?.totalMiles, 0));
  const mile = mapProgressToMile(safeProgress, routeMiles);
  const routeIndex = findNearestIndexByMile(routeStats?.cumulativeMiles || [], mile);
  const elevationMiles = elevationPoints.map((point) => toFinite(point.mile, 0));
  const elevationIndex = findNearestIndexByMile(elevationMiles, mile);
  return {
    progress: safeProgress,
    mile,
    routeIndex,
    elevationIndex,
    waveformColumn: mapProgressToWaveformColumn(safeProgress, waveformColumns),
  };
}

export function buildCameraKeyframes(
  overlays: Overlay[],
  defaults: RouteMediaCameraDefaults,
  routeLengthMiles: number
): PreviewCameraKeyframe[] {
  const safeRouteMiles = Math.max(0, toFinite(routeLengthMiles, 0));
  const defaultMode: RouteMediaCameraMode =
    defaults.mode === "overview-lock" ? "overview-lock" : "third-person-follow";
  const defaultPreset = presetForMode(defaultMode, defaults);
  const keyframes: PreviewCameraKeyframe[] = [
    {
      mile: 0,
      mode: defaultMode,
      zoom: defaultPreset.zoom,
      bearing: defaultPreset.bearing,
      pitch: defaultPreset.pitch,
      priority: 0,
    },
    {
      mile: safeRouteMiles,
      mode: defaultMode,
      zoom: defaultPreset.zoom,
      bearing: defaultPreset.bearing,
      pitch: defaultPreset.pitch,
      priority: 0,
    },
  ];

  const sorted = [...overlays]
    .filter((overlay) => overlay.type === "camera")
    .sort((left, right) => {
      const startDelta = toFinite(left.startMile, 0) - toFinite(right.startMile, 0);
      if (startDelta !== 0) return startDelta;
      return String(getOverlayEntryId(left)).localeCompare(String(getOverlayEntryId(right)));
    });

  for (const overlay of sorted) {
    const mode = getOverlayCameraMode(overlay) || defaultMode;
    if (mode === defaultMode) continue;
    const startMi = clamp(toFinite(overlay.startMile, 0), 0, safeRouteMiles);
    const endMi = clamp(toFinite(overlay.endMile, startMi), startMi, safeRouteMiles);
    const modePreset = presetForMode(mode, defaults);

    keyframes.push({
      mile: startMi,
      mode,
      zoom: modePreset.zoom,
      bearing: modePreset.bearing,
      pitch: modePreset.pitch,
      priority: 2,
    });
    keyframes.push({
      mile: endMi,
      mode: defaultMode,
      zoom: defaultPreset.zoom,
      bearing: defaultPreset.bearing,
      pitch: defaultPreset.pitch,
      priority: 1,
    });
  }

  const ordered = keyframes.sort((left, right) => {
    const mileDelta = left.mile - right.mile;
    if (mileDelta !== 0) return mileDelta;
    return left.priority - right.priority;
  });

  const deduped: PreviewCameraKeyframe[] = [];
  for (const frame of ordered) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.mile - frame.mile) < 1e-9) {
      deduped[deduped.length - 1] = frame;
      continue;
    }
    deduped.push(frame);
  }
  return deduped;
}

export function interpolateCameraState(
  keyframes: PreviewCameraKeyframe[],
  mapping: PreviewRouteMapping,
  routeStats: RouteStats | null
): PreviewCameraState {
  const fallbackCoord =
    routeStats?.coords && routeStats.coords.length > 0 ? routeStats.coords[Math.max(0, mapping.routeIndex)] : null;
  const lat = fallbackCoord ? fallbackCoord[1] : 0;
  const lon = fallbackCoord ? fallbackCoord[0] : 0;

  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return {
      mile: mapping.mile,
      routeIndex: mapping.routeIndex,
      lat,
      lon,
      mode: "third-person-follow",
      zoom: 13,
      bearing: 0,
      pitch: 52,
    };
  }

  if (mapping.mile <= keyframes[0].mile) {
    const first = keyframes[0];
    return {
      mile: mapping.mile,
      routeIndex: mapping.routeIndex,
      lat,
      lon,
      mode: first.mode,
      zoom: first.zoom,
      bearing: first.bearing,
      pitch: first.pitch,
    };
  }
  const last = keyframes[keyframes.length - 1];
  if (mapping.mile >= last.mile) {
    return {
      mile: mapping.mile,
      routeIndex: mapping.routeIndex,
      lat,
      lon,
      mode: last.mode,
      zoom: last.zoom,
      bearing: last.bearing,
      pitch: last.pitch,
    };
  }

  let rightIndex = 1;
  while (rightIndex < keyframes.length && keyframes[rightIndex].mile < mapping.mile) {
    rightIndex += 1;
  }
  const right = keyframes[Math.min(rightIndex, keyframes.length - 1)];
  const left = keyframes[Math.max(0, rightIndex - 1)];
  const span = Math.max(1e-6, right.mile - left.mile);
  const t = clamp((mapping.mile - left.mile) / span, 0, 1);

  return {
    mile: mapping.mile,
    routeIndex: mapping.routeIndex,
    lat,
    lon,
    mode: t < 0.999 ? left.mode : right.mode,
    zoom: left.zoom + (right.zoom - left.zoom) * t,
    bearing: left.bearing + (right.bearing - left.bearing) * t,
    pitch: left.pitch + (right.pitch - left.pitch) * t,
  };
}

export function buildPreviewOverlayLookup(
  overlays: Overlay[],
  captions: Array<{ startMi: number; endMi: number; text: string }> = []
): PreviewOverlayLookup {
  const laneBlocks = projectOverlaysToLanes(overlays);
  const byLane: Record<TimelineLaneId, TimelineLaneBlock[]> = {
    title: [...(laneBlocks.title || [])],
    poi: [...(laneBlocks.poi || [])],
    camera: [...(laneBlocks.camera || [])],
    speed: [...(laneBlocks.speed || [])],
  };
  for (const laneId of Object.keys(byLane) as TimelineLaneId[]) {
    byLane[laneId].sort((left, right) => {
      const startDelta = left.startMi - right.startMi;
      if (startDelta !== 0) return startDelta;
      const endDelta = left.endMi - right.endMi;
      if (endDelta !== 0) return endDelta;
      return left.entryId.localeCompare(right.entryId);
    });
  }
  return {
    byLane,
    allBlocks: [...byLane.title, ...byLane.poi, ...byLane.camera, ...byLane.speed],
    captions: [...captions],
  };
}

function opacityByFadeWindow(mile: number, startMi: number, endMi: number): number {
  if (mile < startMi || mile > endMi) return 0;
  const span = Math.max(0.01, endMi - startMi);
  const fadeWindow = Math.max(0.03, Math.min(0.2, span * 0.2));
  const lead = clamp((mile - startMi) / fadeWindow, 0, 1);
  const tail = clamp((endMi - mile) / fadeWindow, 0, 1);
  return clamp(Math.min(lead, tail, 1), 0, 1);
}

export function resolveOverlayStateAtMile(
  mile: number,
  lookup: PreviewOverlayLookup
): PreviewOverlayState {
  const safeMile = Math.max(0, toFinite(mile, 0));
  const activeTitles: PreviewOverlayTitle[] = [];
  const activeCaptions: string[] = [];
  for (const block of lookup.byLane.title) {
    if (safeMile < block.startMi || safeMile > block.endMi) continue;
    activeTitles.push({
      entryId: block.entryId,
      text: block.label,
      startMi: block.startMi,
      endMi: block.endMi,
      opacity: opacityByFadeWindow(safeMile, block.startMi, block.endMi),
    });
  }

  if (Array.isArray(lookup.captions)) {
    for (const caption of lookup.captions) {
      if (!caption) continue;
      if (safeMile < caption.startMi || safeMile > caption.endMi) continue;
      if (caption.text) activeCaptions.push(caption.text);
    }
  }

  const poiRangeMi = 0.12;
  const activePois: PreviewOverlayPoi[] = [];
  for (const block of lookup.byLane.poi) {
    const distanceMi = Math.abs(block.startMi - safeMile);
    if (distanceMi > poiRangeMi) continue;
    activePois.push({
      entryId: block.entryId,
      label: block.label,
      distanceMi,
      opacity: clamp(1 - distanceMi / poiRangeMi, 0, 1),
    });
  }

  const speedBlock =
    lookup.byLane.speed.find((block) => safeMile >= block.startMi && safeMile <= block.endMi) || null;
  const speedIndicator = speedBlock
    ? {
        entryId: speedBlock.entryId,
        speedMiPerSec: toFinite(speedBlock.speedMiPerSec, 0),
      }
    : null;

  const activeEntryIds = Array.from(
    new Set(
      lookup.allBlocks
        .filter((block) => safeMile >= block.startMi && safeMile <= block.endMi)
        .map((block) => block.entryId)
    )
  ).sort();

  return { activeTitles, activePois, speedIndicator, activeEntryIds, activeCaptions };
}

export function samplePreviewFrame(
  progress: number,
  routeStats: RouteStats | null,
  elevationPoints: ElevationPoint[],
  waveformColumns: number,
  cameraKeyframes: PreviewCameraKeyframe[],
  overlayLookup: PreviewOverlayLookup
): PreviewFrameSample {
  const mapping = mapProgressToRouteMapping(progress, routeStats, elevationPoints, waveformColumns);
  const camera = interpolateCameraState(cameraKeyframes, mapping, routeStats);
  const overlays = resolveOverlayStateAtMile(mapping.mile, overlayLookup);
  return { mapping, camera, overlays };
}
