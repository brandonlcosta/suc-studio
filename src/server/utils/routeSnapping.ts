import { parseGPXText } from "./gpxParser.js";
import { loadRouteVariantGpx } from "./sharedData.js";
import type { RouteLabel, RoutePoiVariantPlacement } from "../types.js";

type LatLon = { lat: number; lon: number };

function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function cumulativeDistancesMeters(coords: [number, number][]): number[] {
  if (!coords.length) return [];
  const distances: number[] = [0];
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = { lon: coords[i - 1][0], lat: coords[i - 1][1] };
    const curr = { lon: coords[i][0], lat: coords[i][1] };
    total += haversineMeters(prev, curr);
    distances.push(total);
  }
  return distances;
}

function findNearestPointIndex(
  coords: [number, number][],
  click: LatLon
): { index: number; distanceMeters: number } {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < coords.length; i += 1) {
    const point = { lon: coords[i][0], lat: coords[i][1] };
    const d = haversineMeters(point, click);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distanceMeters: bestDistance };
}

export function snapPointToRouteVariant(
  routeGroupId: string,
  label: RouteLabel,
  click: LatLon
): RoutePoiVariantPlacement {
  const gpxRaw = loadRouteVariantGpx(routeGroupId, label);
  const parsed = parseGPXText(gpxRaw, `${routeGroupId}-${label}.gpx`);

  if (!parsed.coords.length) {
    throw new Error(`No coordinates found for ${routeGroupId} ${label}`);
  }

  const distances = cumulativeDistancesMeters(parsed.coords);
  const nearest = findNearestPointIndex(parsed.coords, click);
  const snapped = parsed.coords[nearest.index];
  const distanceM = distances[nearest.index] ?? 0;

  return {
    lat: snapped[1],
    lon: snapped[0],
    snapIndex: nearest.index,
    distanceM,
    distanceMi: distanceM / 1609.344,
  };
}

export function snapPointToVariants(
  routeGroupId: string,
  labels: RouteLabel[],
  click: LatLon
): Record<RouteLabel, RoutePoiVariantPlacement> {
  const result = {} as Record<RouteLabel, RoutePoiVariantPlacement>;
  for (const label of labels) {
    result[label] = snapPointToRouteVariant(routeGroupId, label, click);
  }
  return result;
}
