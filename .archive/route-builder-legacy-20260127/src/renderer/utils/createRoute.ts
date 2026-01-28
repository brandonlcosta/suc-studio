import type { RouteOrigin, StagedRoute } from "../types";

export function createRoute(input: {
  id: string;
  fileName: string;
  coords: [number, number][];
  elevations: number[];
  label: StagedRoute["label"];
  distanceMi: number;
  elevationFt: number;
  origin: RouteOrigin;
  geojsonPreview?: GeoJSON.Feature;
}): StagedRoute {
  if (!input.origin) {
    throw new Error("Invariant violation: route created without origin");
  }

  return {
    id: input.id,
    fileName: input.fileName,
    coords: input.coords,
    elevations: input.elevations,
    label: input.label,
    distanceMi: input.distanceMi,
    elevationFt: input.elevationFt,
    origin: input.origin,
    geojsonPreview: input.geojsonPreview,
  };
}
