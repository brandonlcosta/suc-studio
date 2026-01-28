import { DOMParser } from "xmldom";
import { gpx } from "@tmcw/togeojson";
export type ParsedRoute = {
  fileName: string;
  coords: [number, number][];
  elevations: number[];
  distanceMi: number;
  elevationFt: number;
};

/**
 * Haversine distance (meters) between two [lon, lat] pairs.
 */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const [lon1, lat1] = a;
  const [lon2, lat2] = b;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(sLat1) * Math.cos(sLat2) * sinDLon * sinDLon;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Compute distance and elevation stats from coordinates and elevations.
 */
function computeStats(
  coords: [number, number][],
  elevations: number[]
): {
  distanceMi: number;
  elevationFt: number;
} {
  let totalDist = 0;

  // Calculate total distance
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i]);
    totalDist += d;
  }

  // Calculate elevation gain
  let elevGain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevGain += diff;
  }

  return {
    distanceMi: totalDist / 1609.344,
    elevationFt: elevGain * 3.28084,
  };
}

/**
 * Parse a GPX file and extract route data.
 */
export function parseGPXText(
  xmlStr: string,
  fileName: string
): ParsedRoute {
  const dom = new DOMParser().parseFromString(xmlStr, "text/xml");

  const geo = gpx(dom);
  const feats = geo.features.filter(
    (f) => f.geometry && f.geometry.type === "LineString"
  );

  if (feats.length === 0) {
    throw new Error(`No LineString found in ${fileName}`);
  }

  // Flatten all coordinates and elevations into a single track
  const allCoords: [number, number][] = [];
  const allElevs: number[] = [];

  for (const f of feats) {
    if (f.geometry.type === "LineString") {
      for (const coord of f.geometry.coordinates) {
        const [lon, lat, ele] = coord;
        allCoords.push([lon, lat]);
        allElevs.push(ele ?? 0);
      }
    }
  }

  if (allCoords.length < 2) {
    throw new Error(`Not enough coordinates in ${fileName}`);
  }

  const stats = computeStats(allCoords, allElevs);

  return {
    fileName,
    coords: allCoords,
    elevations: allElevs,
    distanceMi: stats.distanceMi,
    elevationFt: stats.elevationFt,
  };
}

export async function parseGPXFile(file: File): Promise<ParsedRoute> {
  const xmlStr = await file.text();
  return parseGPXText(xmlStr, file.name);
}
