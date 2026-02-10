import type { HighlightRange, RoutePoiMarker, TrackPoint } from "./routeContextTypes";

const clampIndex = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function normalizeHighlightRange(
  range: HighlightRange | null,
  trackLength: number
): HighlightRange | null {
  if (!range || trackLength <= 1) return null;
  const min = 0;
  const max = trackLength - 1;
  const start = clampIndex(Math.min(range.startIndex, range.endIndex), min, max);
  const end = clampIndex(Math.max(range.startIndex, range.endIndex), min, max);
  if (end <= start) return null;
  return { startIndex: start, endIndex: end };
}

export function buildSectionRangeFromPois(
  pois: RoutePoiMarker[],
  sectionIndex: number,
  trackLength: number
): HighlightRange | null {
  if (trackLength <= 1) return null;
  const lastIndex = trackLength - 1;
  const startIndex =
    sectionIndex <= 0
      ? 0
      : Math.floor(Number(pois[sectionIndex - 1]?.routePointIndex ?? 0));
  const endIndex =
    sectionIndex >= pois.length
      ? lastIndex
      : Math.floor(Number(pois[sectionIndex]?.routePointIndex ?? lastIndex));

  if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) return null;
  return normalizeHighlightRange({ startIndex, endIndex }, trackLength);
}

export function projectTrack(
  track: TrackPoint[],
  options?: { width?: number; height?: number; padding?: number }
): { points: string; coords: Array<{ x: number; y: number }> } {
  const width = options?.width ?? 100;
  const height = options?.height ?? 60;
  const padding = options?.padding ?? 4;

  if (!track.length) {
    return { points: "", coords: [] };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  track.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  });

  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;
  const scaleX = (width - padding * 2) / spanLon;
  const scaleY = (height - padding * 2) / spanLat;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (width - padding * 2 - spanLon * scale) / 2;
  const offsetY = (height - padding * 2 - spanLat * scale) / 2;

  const coords = track.map((point) => {
    const x = padding + offsetX + (point.lon - minLon) * scale;
    const y = padding + offsetY + (maxLat - point.lat) * scale;
    return { x, y };
  });

  const points = coords.map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`).join(" ");
  return { points, coords };
}
