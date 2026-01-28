import { useEffect, useRef } from "react";
import { RouteLabel, StagedRoute } from "../types";
import mapStyle from "../assets/dark-tactical-terrain.json";

interface RoutePreviewMapProps {
  routes: StagedRoute[];
}

// SUC color palette (matches compiler)
const ROUTE_COLORS: Record<RouteLabel, string> = {
  MED: "#00FF99",
  LRG: "#13FFE2",
  XL: "#FF47A1",
  XXL: "#9B4DFF",
};

export default function RoutePreviewMap({ routes }: RoutePreviewMapProps) {
  const maplibregl = (window as { maplibregl?: typeof import("maplibre-gl") })
    .maplibregl;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const routesRef = useRef<StagedRoute[]>(routes);

  useEffect(() => {
    if (!maplibregl) {
      throw new Error("MapLibre failed to load");
    }
    if (!containerRef.current || mapRef.current) return;

    // Initialize map with same config as viewer
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle as any,
      center: [-121.48, 38.58], // Sacramento area
      zoom: 11,
      pitch: 35,
      bearing: -28,
    });

    mapRef.current = map;
    map.on("load", () => {
      updateRoutes(map, routesRef.current);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    routesRef.current = routes;
    if (!map || routes.length === 0) return;

    if (map.loaded()) {
      updateRoutes(map, routes);
    }
  }, [routes]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    />
  );
}

function updateRoutes(map: maplibregl.Map, routes: StagedRoute[]) {
  const style = map.getStyle();
  if (!style) return;

  const routeSourceIds = new Set(routes.map((route) => `route-${route.id}`));
  const routeLayerIds = new Set(
    routes.map((route) => `route-${route.id}-line`)
  );

  // Remove stale layers
  (style.layers || []).forEach((layer) => {
    if (layer.id.startsWith("route-") && !routeLayerIds.has(layer.id)) {
      map.removeLayer(layer.id);
    }
  });

  // Remove stale sources
  Object.keys(style.sources || {}).forEach((sourceId) => {
    if (sourceId.startsWith("route-") && !routeSourceIds.has(sourceId)) {
      map.removeSource(sourceId);
    }
  });

  // Add new routes
  routes.forEach((route) => {
    const sourceId = `route-${route.id}`;
    const layerId = `route-${route.id}-line`;
    const color = ROUTE_COLORS[route.label];

    // Convert coords to GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: route.coords,
          },
        },
      ],
    };

    const existingSource = map.getSource(sourceId) as
      | maplibregl.GeoJSONSource
      | undefined;

    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
    } else {
      map.setPaintProperty(layerId, "line-color", color);
    }

    map.moveLayer(layerId);
  });

  // Fit bounds to all routes
  if (routes.length > 0) {
    const bounds = calculateBounds(routes);
    map.fitBounds(bounds, { padding: 50, duration: 1000 });
  }
}

function calculateBounds(
  routes: StagedRoute[]
): [[number, number], [number, number]] {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  routes.forEach((route) => {
    route.coords.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  });

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
