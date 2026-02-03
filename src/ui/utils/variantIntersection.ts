import type { RouteLabel } from "../types";
import { haversineMeters } from "./routeMath";

export const VARIANT_INTERSECTION_THRESHOLD_M = 100;

export type RouteVariantGeometry = {
  label: RouteLabel;
  coords: [number, number][];
};

export function getIntersectingVariants(
  poiCoord: { lat: number; lon: number },
  routeVariants: RouteVariantGeometry[],
  thresholdMeters: number = VARIANT_INTERSECTION_THRESHOLD_M
): RouteLabel[] {
  if (!Number.isFinite(poiCoord.lat) || !Number.isFinite(poiCoord.lon)) {
    return [];
  }
  if (!Array.isArray(routeVariants) || routeVariants.length === 0) return [];

  const threshold =
    Number.isFinite(thresholdMeters) && thresholdMeters > 0
      ? thresholdMeters
      : VARIANT_INTERSECTION_THRESHOLD_M;

  const matches: RouteLabel[] = [];
  for (const variant of routeVariants) {
    const coords = variant.coords ?? [];
    if (!coords.length) continue;
    let intersects = false;
    for (const coord of coords) {
      const distance = haversineMeters(coord, [poiCoord.lon, poiCoord.lat]);
      if (distance <= threshold) {
        intersects = true;
        break;
      }
    }
    if (intersects) {
      matches.push(variant.label);
    }
  }
  return matches;
}
