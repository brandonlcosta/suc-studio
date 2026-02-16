import type { RouteMediaTimelineEntry } from "../../types";
import type { RouteStats } from "../../utils/routeMath";

export type ElevationPoint = {
  mile: number;
  elevation: number;
};

export type ElevationColumn = {
  x: number;
  minElevation: number;
  maxElevation: number;
  gradeDelta: number;
};

export type ElevationAnchor = {
  kind: "summit" | "valley";
  index: number;
  mile: number;
  elevation: number;
};

type ElevationBucket = {
  minElevation: number;
  maxElevation: number;
  firstMile: number;
  lastMile: number;
  firstElevation: number;
  lastElevation: number;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildElevationPoints(stats: RouteStats | null): ElevationPoint[] {
  if (!stats || !Array.isArray(stats.cumulativeMiles) || !Array.isArray(stats.elevations)) {
    return [];
  }
  const count = Math.min(stats.cumulativeMiles.length, stats.elevations.length);
  const points: ElevationPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const mile = toFinite(stats.cumulativeMiles[index], 0);
    const elevation = toFinite(stats.elevations[index], NaN);
    if (!Number.isFinite(elevation)) continue;
    points.push({ mile, elevation });
  }
  return points;
}

export function downsampleElevationByPixel(
  points: ElevationPoint[],
  totalMiles: number,
  columns: number
): ElevationColumn[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeTotalMiles = Math.max(0.001, toFinite(totalMiles, points[points.length - 1]?.mile || 1));
  const buckets: Array<ElevationBucket | null> = Array.from({ length: safeColumns }, () => null);

  for (const point of points) {
    const clampedMile = clamp(toFinite(point.mile, 0), 0, safeTotalMiles);
    const columnIndex = clamp(
      Math.floor((clampedMile / safeTotalMiles) * (safeColumns - 1)),
      0,
      safeColumns - 1
    );
    const elevation = toFinite(point.elevation, NaN);
    if (!Number.isFinite(elevation)) continue;

    const bucket = buckets[columnIndex];
    if (!bucket) {
      buckets[columnIndex] = {
        minElevation: elevation,
        maxElevation: elevation,
        firstMile: clampedMile,
        lastMile: clampedMile,
        firstElevation: elevation,
        lastElevation: elevation,
      };
      continue;
    }

    bucket.minElevation = Math.min(bucket.minElevation, elevation);
    bucket.maxElevation = Math.max(bucket.maxElevation, elevation);
    if (clampedMile < bucket.firstMile) {
      bucket.firstMile = clampedMile;
      bucket.firstElevation = elevation;
    }
    if (clampedMile >= bucket.lastMile) {
      bucket.lastMile = clampedMile;
      bucket.lastElevation = elevation;
    }
  }

  // Fill empty columns with nearest known neighbor to keep the waveform continuous.
  let lastKnown: ElevationBucket | null = null;
  for (let index = 0; index < buckets.length; index += 1) {
    if (buckets[index]) {
      lastKnown = buckets[index];
      continue;
    }
    if (lastKnown) {
      buckets[index] = { ...lastKnown };
    }
  }
  let nextKnown: ElevationBucket | null = null;
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    if (buckets[index]) {
      nextKnown = buckets[index];
      continue;
    }
    if (nextKnown) {
      buckets[index] = { ...nextKnown };
    }
  }

  return buckets
    .map((bucket, index) => {
      if (!bucket) return null;
      const mileDelta = bucket.lastMile - bucket.firstMile;
      const gradeDelta = mileDelta > 0 ? (bucket.lastElevation - bucket.firstElevation) / mileDelta : 0;
      return {
        x: index,
        minElevation: bucket.minElevation,
        maxElevation: bucket.maxElevation,
        gradeDelta,
      };
    })
    .filter((column): column is ElevationColumn => Boolean(column));
}

export function detectElevationAnchors(points: ElevationPoint[]): ElevationAnchor[] {
  if (!Array.isArray(points) || points.length < 3) return [];
  const anchors: ElevationAnchor[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const next = points[index + 1];
    if (curr.elevation > prev.elevation && curr.elevation > next.elevation) {
      anchors.push({ kind: "summit", index, mile: curr.mile, elevation: curr.elevation });
      continue;
    }
    if (curr.elevation < prev.elevation && curr.elevation < next.elevation) {
      anchors.push({ kind: "valley", index, mile: curr.mile, elevation: curr.elevation });
    }
  }
  return anchors;
}

export function maybeSnapMileToElevationAnchor(
  rawMile: number,
  anchors: ElevationAnchor[],
  thresholdPx: number,
  trackWidthPx: number,
  routeLengthMiles: number
): number {
  if (!Array.isArray(anchors) || anchors.length === 0) return rawMile;
  const safeRouteMiles = Math.max(0.001, toFinite(routeLengthMiles, 0.001));
  const safeWidth = Math.max(1, toFinite(trackWidthPx, 1));
  const rawX = (clamp(rawMile, 0, safeRouteMiles) / safeRouteMiles) * safeWidth;
  const safeThreshold = Math.max(0, toFinite(thresholdPx, 0));

  let bestMile = rawMile;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of anchors) {
    const anchorX = (clamp(anchor.mile, 0, safeRouteMiles) / safeRouteMiles) * safeWidth;
    const distance = Math.abs(anchorX - rawX);
    if (distance > safeThreshold || distance >= bestDistance) continue;
    bestDistance = distance;
    bestMile = anchor.mile;
  }

  return bestMile;
}

export function projectTimelineEntries(
  entries: RouteMediaTimelineEntry[],
  routeLengthMiles: number
): RouteMediaTimelineEntry[] {
  const safeRouteMiles = Math.max(0.001, toFinite(routeLengthMiles, 0.001));
  return [...entries].sort((a, b) => {
    const startDelta =
      clamp(toFinite(a.startMi, 0), 0, safeRouteMiles) -
      clamp(toFinite(b.startMi, 0), 0, safeRouteMiles);
    if (startDelta !== 0) return startDelta;
    const endDelta =
      clamp(toFinite(a.endMi, 0), 0, safeRouteMiles) -
      clamp(toFinite(b.endMi, 0), 0, safeRouteMiles);
    if (endDelta !== 0) return endDelta;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}
