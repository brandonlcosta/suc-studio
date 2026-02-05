import { parseGPXText } from "./gpxParser.js";
import { loadRouteVariantGpx } from "./sharedData.js";
import type { RouteLabel, RoutePoiVariantPlacement, RoutePoiVariantValue } from "../types.js";

type LatLon = { lat: number; lon: number };
type ProjectedHit = {
  lat: number;
  lon: number;
  distanceM: number;
  snapIndex: number;
  distanceToClick: number;
};

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

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function projectPointToSegment(
  a: LatLon,
  b: LatLon,
  p: LatLon,
  lat0Rad: number
): { lat: number; lon: number; t: number } {
  const R = 6371000;
  const cosLat0 = Math.cos(lat0Rad);
  const ax = toRad(a.lon) * R * cosLat0;
  const ay = toRad(a.lat) * R;
  const bx = toRad(b.lon) * R * cosLat0;
  const by = toRad(b.lat) * R;
  const px = toRad(p.lon) * R * cosLat0;
  const py = toRad(p.lat) * R;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  const tRaw = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
  const t = Math.max(0, Math.min(1, tRaw));

  const projX = ax + t * abx;
  const projY = ay + t * aby;

  const lat = toDeg(projY / R);
  const lon = toDeg(projX / (R * cosLat0));

  return { lat, lon, t };
}

function dedupeHits(hits: ProjectedHit[], toleranceM: number): ProjectedHit[] {
  if (hits.length <= 1) return hits;
  const next: ProjectedHit[] = [];
  for (const hit of hits) {
    const last = next[next.length - 1];
    if (!last) {
      next.push(hit);
      continue;
    }
    const separation = haversineMeters(
      { lat: last.lat, lon: last.lon },
      { lat: hit.lat, lon: hit.lon }
    );
    if (separation <= toleranceM) continue;
    next.push(hit);
  }
  return next;
}

function mergeHitsByDistance(
  hits: ProjectedHit[],
  distanceToleranceM: number
): ProjectedHit[] {
  if (hits.length <= 1) return hits;
  const merged: ProjectedHit[] = [];
  let bucket: ProjectedHit[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    let best = bucket[0];
    for (const candidate of bucket) {
      if (candidate.distanceToClick < best.distanceToClick) {
        best = candidate;
      }
    }
    merged.push(best);
    bucket = [];
  };

  for (const hit of hits) {
    if (bucket.length === 0) {
      bucket.push(hit);
      continue;
    }
    const last = bucket[bucket.length - 1];
    if (Math.abs(hit.distanceM - last.distanceM) <= distanceToleranceM) {
      bucket.push(hit);
    } else {
      flush();
      bucket.push(hit);
    }
  }
  flush();

  return merged;
}

export function snapPointToRouteVariant(
  routeGroupId: string,
  label: RouteLabel,
  click: LatLon
): RoutePoiVariantValue {
  const gpxRaw = loadRouteVariantGpx(routeGroupId, label);
  const parsed = parseGPXText(gpxRaw, `${routeGroupId}-${label}.gpx`);

  if (!parsed.coords.length) {
    throw new Error(`No coordinates found for ${routeGroupId} ${label}`);
  }

  const distances = cumulativeDistancesMeters(parsed.coords);
  const SNAP_TOLERANCE_M = 12;
  const DEDUPE_TOLERANCE_M = 6;
  const DISTANCE_CLUSTER_M = 12;
  const hits: ProjectedHit[] = [];
  const lat0Rad = toRad(click.lat);

  for (let i = 0; i < parsed.coords.length - 1; i += 1) {
    const start = { lon: parsed.coords[i][0], lat: parsed.coords[i][1] };
    const end = { lon: parsed.coords[i + 1][0], lat: parsed.coords[i + 1][1] };
    const projection = projectPointToSegment(start, end, click, lat0Rad);
    const distanceToClick = haversineMeters(
      { lat: projection.lat, lon: projection.lon },
      click
    );
    if (distanceToClick > SNAP_TOLERANCE_M) continue;
    const segmentLength = haversineMeters(start, end);
    const distanceM = (distances[i] ?? 0) + segmentLength * projection.t;
    const snapIndex = projection.t <= 0.5 ? i : i + 1;
    hits.push({
      lat: projection.lat,
      lon: projection.lon,
      distanceM,
      snapIndex,
      distanceToClick,
    });
  }

  if (hits.length === 0) {
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

  hits.sort((a, b) => a.distanceM - b.distanceM);
  const deduped = dedupeHits(hits, DEDUPE_TOLERANCE_M);
  const mergedByDistance = mergeHitsByDistance(deduped, DISTANCE_CLUSTER_M);

  const placements: RoutePoiVariantPlacement[] = mergedByDistance.map((hit, index) => ({
    lat: hit.lat,
    lon: hit.lon,
    snapIndex: hit.snapIndex,
    distanceM: hit.distanceM,
    distanceMi: hit.distanceM / 1609.344,
    passIndex: index,
  }));

  return placements.length === 1 ? placements[0] : placements;
}

export function snapPointToVariants(
  routeGroupId: string,
  labels: RouteLabel[],
  click: LatLon
): Record<RouteLabel, RoutePoiVariantValue> {
  const result = {} as Record<RouteLabel, RoutePoiVariantValue>;
  for (const label of labels) {
    result[label] = snapPointToRouteVariant(routeGroupId, label, click);
  }
  return result;
}
