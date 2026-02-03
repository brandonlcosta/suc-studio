const EARTH_RADIUS_M = 6371008.8;
export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.28084;

export type RouteStats = {
  coords: [number, number][];
  elevations: number[];
  cumulativeMeters: number[];
  cumulativeMiles: number[];
  totalMeters: number;
  totalMiles: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function buildRouteStats(route: {
  coords?: [number, number][];
  elevations?: number[];
}): RouteStats | null {
  const coords = route.coords ?? [];
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const elevations = Array.isArray(route.elevations) ? route.elevations : [];
  const cumulativeMeters: number[] = [0];

  for (let i = 1; i < coords.length; i += 1) {
    const segment = haversineMeters(coords[i - 1], coords[i]);
    cumulativeMeters.push(cumulativeMeters[i - 1] + (Number.isFinite(segment) ? segment : 0));
  }

  const totalMeters = cumulativeMeters[cumulativeMeters.length - 1] ?? 0;
  const cumulativeMiles = cumulativeMeters.map((value) => value / METERS_PER_MILE);
  const totalMiles = totalMeters / METERS_PER_MILE;

  return {
    coords,
    elevations,
    cumulativeMeters,
    cumulativeMiles,
    totalMeters,
    totalMiles,
  };
}

export function findNearestRoutePoint(
  coords: [number, number][],
  target: { lat: number; lon: number }
): { index: number; distanceMeters: number } | null {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < coords.length; i += 1) {
    const distance = haversineMeters(coords[i], [target.lon, target.lat]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distanceMeters: bestDistance };
}

export function snapToRoute(
  stats: RouteStats | null,
  target: { lat: number; lon: number }
): {
  index: number;
  lat: number;
  lon: number;
  distanceM: number;
  distanceMi: number;
  cumulativeMi: number;
} | null {
  if (!stats) return null;
  const match = findNearestRoutePoint(stats.coords, target);
  if (!match) return null;
  const coord = stats.coords[match.index];
  const cumulativeMi = stats.cumulativeMiles[match.index] ?? 0;
  return {
    index: match.index,
    lat: coord[1],
    lon: coord[0],
    distanceM: match.distanceMeters,
    distanceMi: match.distanceMeters / METERS_PER_MILE,
    cumulativeMi,
  };
}

export function getCoordinateAtDistance(
  stats: RouteStats | null,
  distanceMi: number
): { index: number; lat: number; lon: number; clampedMi: number } | null {
  if (!stats || !Number.isFinite(distanceMi)) return null;
  const clampedMi = Math.min(Math.max(distanceMi, 0), stats.totalMiles);
  const targetMeters = clampedMi * METERS_PER_MILE;
  const cumulative = stats.cumulativeMeters;
  let index = cumulative.findIndex((value) => value >= targetMeters);
  if (index === -1) index = cumulative.length - 1;
  const coord = stats.coords[index];
  if (!coord) return null;
  return { index, lat: coord[1], lon: coord[0], clampedMi };
}

export function getElevationFeet(stats: RouteStats | null, index: number): number | null {
  if (!stats || !Array.isArray(stats.elevations)) return null;
  const elevation = stats.elevations[index];
  if (!Number.isFinite(elevation)) return null;
  return elevation * FEET_PER_METER;
}

export function getGradePercent(stats: RouteStats | null, index: number): number | null {
  if (!stats) return null;
  if (index < 0 || index >= stats.coords.length) return null;
  const prevIndex = Math.max(0, index - 1);
  const nextIndex = Math.min(stats.coords.length - 1, index + 1);
  if (prevIndex === nextIndex) return null;
  const distanceM = haversineMeters(stats.coords[prevIndex], stats.coords[nextIndex]);
  if (!Number.isFinite(distanceM) || distanceM <= 0) return null;
  const elevations = stats.elevations;
  const elevPrev = elevations[prevIndex];
  const elevNext = elevations[nextIndex];
  if (!Number.isFinite(elevPrev) || !Number.isFinite(elevNext)) return null;
  const riseM = elevNext - elevPrev;
  return (riseM / distanceM) * 100;
}
