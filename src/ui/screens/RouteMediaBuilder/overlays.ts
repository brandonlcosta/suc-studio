import type {
  RouteMediaCameraMode,
  RouteMediaMarker,
  RouteMediaSubtitle,
  RouteMediaTimelineEntry,
} from "../../types";

export type OverlayType = "title" | "poi" | "camera" | "speed";
export type OverlayLane = OverlayType;

export type Overlay = {
  id: string;
  type: OverlayType;
  lane: OverlayLane;
  startMile: number;
  endMile?: number;
  attachment?: {
    poiId?: string;
  };
  config: Record<string, unknown>;
};

export type OverlayMappingContext = {
  defaultCameraMode?: RouteMediaCameraMode | null;
  defaultSpeedMiPerSec?: number | null;
  speedEpsilon?: number;
};

type OverlayConfig = {
  entryId: string;
  entryIndex: number;
  entry: RouteMediaTimelineEntry;
  markerId?: string;
  markerIndex?: number;
  marker?: RouteMediaMarker | null;
  subtitleId?: string;
  subtitleIndex?: number;
  subtitle?: RouteMediaSubtitle | null;
  label?: string;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function overlayId(entryId: string, type: OverlayType): string {
  return `${entryId}:${type}`;
}

function getPrimaryMarker(
  entry: RouteMediaTimelineEntry,
  markersById: ReadonlyMap<string, RouteMediaMarker>
): RouteMediaMarker | null {
  const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
  if (!markerId) return null;
  return markersById.get(markerId) ?? null;
}

function getPrimarySubtitle(
  entry: RouteMediaTimelineEntry,
  subtitlesById: ReadonlyMap<string, RouteMediaSubtitle>
): RouteMediaSubtitle | null {
  const subtitleId = Array.isArray(entry.subtitleIds) ? entry.subtitleIds[0] : null;
  if (!subtitleId) return null;
  return subtitlesById.get(subtitleId) ?? null;
}

function hasTitleSemantic(entry: RouteMediaTimelineEntry, marker: RouteMediaMarker | null): boolean {
  if (marker?.type === "poi") return false;
  if (typeof entry.title === "string" && entry.title.trim().length > 0) return true;
  if (marker?.type === "title") return true;
  if (marker?.type === "subtitle") return true;
  return false;
}

function hasPoiSemantic(marker: RouteMediaMarker | null): boolean {
  return marker?.type === "poi";
}

function hasCameraSemantic(
  entry: RouteMediaTimelineEntry,
  marker: RouteMediaMarker | null,
  context?: OverlayMappingContext
): boolean {
  if (marker?.type === "poi") return false;
  const entryMode = String(entry.cameraMode || "").trim();
  if (!entryMode) return false;
  const defaultMode = String(context?.defaultCameraMode || "").trim();
  if (defaultMode.length > 0) {
    return entryMode !== defaultMode;
  }
  return entryMode !== "third-person-follow";
}

function hasSpeedSemantic(entry: RouteMediaTimelineEntry, context?: OverlayMappingContext): boolean {
  const speed = toFinite(entry.speedMiPerSec, NaN);
  if (!Number.isFinite(speed) || speed <= 0) return false;
  const defaultSpeed = toFinite(context?.defaultSpeedMiPerSec, NaN);
  if (!Number.isFinite(defaultSpeed) || defaultSpeed <= 0) return true;
  const epsilon = Math.max(0, toFinite(context?.speedEpsilon, 1e-4));
  return Math.abs(speed - defaultSpeed) > epsilon;
}

function buildOverlayLabel(
  type: OverlayType,
  entry: RouteMediaTimelineEntry,
  marker: RouteMediaMarker | null
): string {
  if (type === "camera") return String(entry.cameraMode || "Camera");
  if (type === "speed") {
    const speed = toFinite(entry.speedMiPerSec, 0);
    return `Speed ${speed.toFixed(2)}`;
  }
  return entry.title || marker?.title || entry.id;
}

function buildOverlayConfig(
  entry: RouteMediaTimelineEntry,
  entryIndex: number,
  marker: RouteMediaMarker | null,
  markerIndex: number | null,
  subtitle: RouteMediaSubtitle | null,
  subtitleIndex: number | null,
  type: OverlayType
): OverlayConfig {
  const label = buildOverlayLabel(type, entry, marker);
  return {
    entryId: entry.id,
    entryIndex,
    entry,
    markerId: marker?.id,
    markerIndex: markerIndex ?? undefined,
    marker,
    subtitleId: subtitle?.id,
    subtitleIndex: subtitleIndex ?? undefined,
    subtitle,
    label,
  };
}

export function canonicalToOverlays(
  entries: RouteMediaTimelineEntry[],
  markers: RouteMediaMarker[],
  subtitles: RouteMediaSubtitle[],
  titleAttachments: Record<string, string> = {},
  context?: OverlayMappingContext
): Overlay[] {
  const markersById = new Map(markers.map((marker) => [marker.id, marker]));
  const subtitlesById = new Map(subtitles.map((subtitle) => [subtitle.id, subtitle]));
  const markerIndexById = new Map(markers.map((marker, index) => [marker.id, index]));
  const subtitleIndexById = new Map(subtitles.map((subtitle, index) => [subtitle.id, index]));
  const overlays: Overlay[] = [];

  entries.forEach((entry, entryIndex) => {
    const marker = getPrimaryMarker(entry, markersById);
    const subtitle = getPrimarySubtitle(entry, subtitlesById);
    const markerIndex = marker?.id ? markerIndexById.get(marker.id) ?? null : null;
    const subtitleIndex = subtitle?.id ? subtitleIndexById.get(subtitle.id) ?? null : null;

    const isTitle = hasTitleSemantic(entry, marker);
    const isPoi = hasPoiSemantic(marker);
    const isCamera = hasCameraSemantic(entry, marker, context);
    const isSpeed = hasSpeedSemantic(entry, context);

    const baseConfig = (type: OverlayType) =>
      buildOverlayConfig(entry, entryIndex, marker, markerIndex, subtitle, subtitleIndex, type);

    const startMile = toFinite(entry.startMi, 0);
    const endMile = Math.max(startMile, toFinite(entry.endMi, startMile));

    if (isTitle) {
      overlays.push({
        id: overlayId(entry.id, "title"),
        type: "title",
        lane: "title",
        startMile,
        endMile,
        attachment: titleAttachments[entry.id] ? { poiId: titleAttachments[entry.id] } : undefined,
        config: baseConfig("title"),
      });
    }
    if (isPoi) {
      overlays.push({
        id: overlayId(entry.id, "poi"),
        type: "poi",
        lane: "poi",
        startMile,
        endMile,
        config: baseConfig("poi"),
      });
    }
    if (isCamera) {
      overlays.push({
        id: overlayId(entry.id, "camera"),
        type: "camera",
        lane: "camera",
        startMile,
        endMile,
        config: baseConfig("camera"),
      });
    }
    if (isSpeed) {
      overlays.push({
        id: overlayId(entry.id, "speed"),
        type: "speed",
        lane: "speed",
        startMile,
        endMile,
        config: baseConfig("speed"),
      });
    }
    if (!isTitle && !isPoi && !isCamera && !isSpeed) {
      overlays.push({
        id: overlayId(entry.id, "title"),
        type: "title",
        lane: "title",
        startMile,
        endMile,
        attachment: titleAttachments[entry.id] ? { poiId: titleAttachments[entry.id] } : undefined,
        config: baseConfig("title"),
      });
    }
  });

  return overlays;
}

type CanonicalOverlayOutput = {
  timeline: RouteMediaTimelineEntry[];
  markers: RouteMediaMarker[];
  subtitles: RouteMediaSubtitle[];
};

export function overlaysToCanonical(overlays: Overlay[]): CanonicalOverlayOutput {
  const entriesById = new Map<string, { entry: RouteMediaTimelineEntry; index: number }>();
  const markersById = new Map<string, { marker: RouteMediaMarker; index: number }>();
  const subtitlesById = new Map<string, { subtitle: RouteMediaSubtitle; index: number }>();

  const ordered = [...overlays].sort((a, b) => {
    const aIndex = Number((a.config as OverlayConfig | undefined)?.entryIndex ?? 0);
    const bIndex = Number((b.config as OverlayConfig | undefined)?.entryIndex ?? 0);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  for (const overlay of ordered) {
    const config = overlay.config as OverlayConfig | undefined;
    if (!config?.entryId || !config.entry) continue;

    const startMi = toFinite(overlay.startMile, toFinite(config.entry.startMi, 0));
    const endMi = Math.max(startMi, toFinite(overlay.endMile, toFinite(config.entry.endMi, startMi)));

    if (!entriesById.has(config.entryId)) {
      entriesById.set(config.entryId, {
        entry: { ...config.entry, startMi: startMi, endMi: endMi },
        index: Number.isFinite(config.entryIndex) ? config.entryIndex : entriesById.size,
      });
    } else {
      const existing = entriesById.get(config.entryId);
      if (existing) {
        existing.entry = { ...existing.entry, startMi, endMi };
      }
    }

    if (config.marker && config.markerId) {
      if (!markersById.has(config.markerId)) {
        markersById.set(config.markerId, {
          marker: { ...config.marker, atMi: startMi },
          index: Number.isFinite(config.markerIndex) ? config.markerIndex : markersById.size,
        });
      }
    }

    if (config.subtitle && config.subtitleId) {
      if (!subtitlesById.has(config.subtitleId)) {
        subtitlesById.set(config.subtitleId, {
          subtitle: { ...config.subtitle },
          index: Number.isFinite(config.subtitleIndex) ? config.subtitleIndex : subtitlesById.size,
        });
      }
    }
  }

  const timeline = Array.from(entriesById.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.entry);
  const markers = Array.from(markersById.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.marker);
  const subtitles = Array.from(subtitlesById.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.subtitle);

  return { timeline, markers, subtitles };
}

export function getOverlayEntryId(overlay: Overlay): string {
  const config = overlay.config as OverlayConfig | undefined;
  if (config?.entryId) return config.entryId;
  return overlay.id.split(":")[0] || overlay.id;
}

export function getOverlayLabel(overlay: Overlay): string {
  const config = overlay.config as OverlayConfig | undefined;
  if (config?.label) return config.label;
  return overlay.id;
}

export function getOverlayMarkerType(overlay: Overlay): RouteMediaMarker["type"] | null {
  const config = overlay.config as OverlayConfig | undefined;
  return config?.marker?.type ?? null;
}

export function getOverlaySpeedMiPerSec(overlay: Overlay): number | null {
  const config = overlay.config as OverlayConfig | undefined;
  const speed = toFinite(config?.entry?.speedMiPerSec, NaN);
  return Number.isFinite(speed) ? speed : null;
}

export function getOverlayCameraMode(overlay: Overlay): RouteMediaCameraMode | null {
  const config = overlay.config as OverlayConfig | undefined;
  const mode = config?.entry?.cameraMode;
  if (!mode) return null;
  return mode;
}
