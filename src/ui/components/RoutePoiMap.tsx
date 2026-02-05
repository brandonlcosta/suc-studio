import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { ParsedRoute, RouteLabel } from "../types";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
} from "geojson";

// NOTE: This mirrors suc-route-viewer/src/components/MultiRouteMap.tsx
// to keep route rendering aligned with the viewer (base + selected + POI layers).

const ROUTE_COLORS: Record<RouteLabel, string> = {
  MED: "#00FF99",
  LRG: "#13FFE2",
  XL: "#D000FF",
  XXL: "#FF5050",
};

const ID = {
  baseSrc: "suc-base-src",
  baseLayer: "suc-base-layer",

  selSrc: "suc-selected-src",
  selGlow: "suc-selected-glow",
  selLine: "suc-selected-line",

  poiSrc: "suc-poi-src",
  poiLayer: "suc-poi-layer",
  poiHighlight: "suc-poi-highlight",
} as const;

function onReady(map: maplibregl.Map, fn: () => void) {
  const style = map.getStyle?.();
  if (!style) {
    const once = () => {
      const st = map.getStyle?.();
      if (!st) return;
      if (!map.isStyleLoaded()) return;
      map.off("styledata", once);
      fn();
    };
    map.on("styledata", once);
    return;
  }

  if (map.isStyleLoaded()) {
    fn();
    return;
  }

  const handler = () => {
    if (!map.isStyleLoaded()) return;
    map.off("idle", handler);
    fn();
  };
  map.on("idle", handler);
}

function addLayerTop(map: maplibregl.Map, layer: maplibregl.AnyLayer) {
  const layers = map.getStyle()?.layers || [];
  const symbol = layers.find((l) => l.type === "symbol");
  if (symbol) map.addLayer(layer, symbol.id);
  else map.addLayer(layer);
}

function buildRouteFeatureCollection(
  route: ParsedRoute,
  label: RouteLabel,
  poiFeatures: Feature<Geometry, GeoJsonProperties>[]
): FeatureCollection<Geometry, GeoJsonProperties> {
  const lineFeature: Feature<LineString, GeoJsonProperties> = {
    type: "Feature",
    properties: {
      label,
      color: ROUTE_COLORS[label],
    },
    geometry: {
      type: "LineString",
      coordinates: route.coords.map((coord) => [coord[0], coord[1]]),
    },
  };

  return {
    type: "FeatureCollection",
    features: [lineFeature, ...poiFeatures],
  };
}

function extractLineFeatures(
  fc: FeatureCollection<Geometry, GeoJsonProperties>
): {
  lines: Feature<Geometry, GeoJsonProperties>[];
  pois: Feature<Geometry, GeoJsonProperties>[];
} {
  const lines: Feature<Geometry, GeoJsonProperties>[] = [];
  const pois: Feature<Geometry, GeoJsonProperties>[] = [];

  for (const f of fc.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString") {
      lines.push(f);
    } else {
      pois.push(f);
    }
  }

  return { lines, pois };
}

type RoutePoiRecord = {
  id: string;
  type: string;
  title: string;
  system?: boolean;
  locked?: boolean;
  variants?: Record<
    string,
    {
      lat: number;
      lon: number;
      distanceMi: number;
      distanceM: number;
      snapIndex: number;
      passIndex?: number;
      direction?: "forward" | "reverse";
    }
    | Array<{
        lat: number;
        lon: number;
        distanceMi: number;
        distanceM: number;
        snapIndex: number;
        passIndex?: number;
        direction?: "forward" | "reverse";
      }>
  >;
};

type RoutePoiVariantPlacement = {
  lat: number;
  lon: number;
  distanceMi: number;
  distanceM: number;
  snapIndex: number;
  passIndex?: number;
  direction?: "forward" | "reverse";
};

type RoutePoiVariantValue = RoutePoiVariantPlacement | RoutePoiVariantPlacement[];

function getPrimaryPlacement(
  value: RoutePoiVariantValue | undefined
): RoutePoiVariantPlacement | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

interface RoutePoiMapProps {
  routesByVariant: Record<string, ParsedRoute>;
  pois: RoutePoiRecord[];
  activeVariant: RouteLabel;
  lastSnapId: string | null;
  onMapClick?: (lat: number, lon: number) => void;
}

export default function RoutePoiMap({
  routesByVariant,
  pois,
  activeVariant,
  lastSnapId,
  onMapClick,
}: RoutePoiMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Init map (mirror suc-route-viewer)
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "/dark-tactical-terrain.json",
      center: [-121.48, 38.58],
      zoom: 11,
      pitch: 35,
      bearing: -28,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (event: maplibregl.MapMouseEvent & maplibregl.EventData) => {
      if (!onMapClick) return;
      onMapClick(event.lngLat.lat, event.lngLat.lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const routes = Object.entries(routesByVariant).map(([label, route]) => [
      String(label).toUpperCase(),
      route,
    ]) as Array<[string, ParsedRoute]>;
    if (routes.length === 0) {
      onReady(map, () => {
        [ID.baseLayer, ID.selGlow, ID.selLine, ID.poiLayer, ID.poiHighlight].forEach(
          (layer) => {
            if (map.getLayer(layer)) map.removeLayer(layer);
          }
        );
        [ID.baseSrc, ID.selSrc, ID.poiSrc].forEach((src) => {
          if (map.getSource(src)) map.removeSource(src);
        });
      });
      return;
    }

    const poiFeaturesByVariant: Record<string, Feature<Geometry, GeoJsonProperties>[]> = {};
    pois.forEach((poi) => {
      const variants = poi.variants || {};
      Object.entries(variants).forEach(([label, placementValue]) => {
        const placement = getPrimaryPlacement(placementValue as RoutePoiVariantValue);
        if (!placement) return;
        if (!poiFeaturesByVariant[label]) poiFeaturesByVariant[label] = [];
        poiFeaturesByVariant[label].push({
          type: "Feature",
          properties: {
            id: poi.id,
            title: poi.title,
            type: poi.type,
            variant: label,
            distanceMi: placement.distanceMi,
          },
          geometry: {
            type: "Point",
            coordinates: [placement.lon, placement.lat],
          },
        });
      });
    });

    const collections = routes.map(([label, route]) => {
      const variant = String(label).toUpperCase() as RouteLabel;
      const poiFeatures = poiFeaturesByVariant[variant] ?? [];
      return buildRouteFeatureCollection(route, variant, poiFeatures);
    });

    const baseFeatures = collections.flatMap((fc) => fc.features);
    const collectionByVariant = new Map<string, FeatureCollection<Geometry, GeoJsonProperties>>();
    routes.forEach(([label], idx) => {
      const variant = String(label).toUpperCase();
      collectionByVariant.set(variant, collections[idx]);
    });
    const selectedCollection = collectionByVariant.get(activeVariant);

    onReady(map, () => {
      [ID.baseLayer, ID.selGlow, ID.selLine, ID.poiLayer, ID.poiHighlight].forEach((layer) => {
        if (map.getLayer(layer)) map.removeLayer(layer);
      });
      [ID.baseSrc, ID.selSrc, ID.poiSrc].forEach((src) => {
        if (map.getSource(src)) map.removeSource(src);
      });

      if (baseFeatures.length > 0) {
        map.addSource(ID.baseSrc, {
          type: "geojson",
          data: { type: "FeatureCollection", features: baseFeatures },
        });

        addLayerTop(map, {
          id: ID.baseLayer,
          type: "line",
          source: ID.baseSrc,
          paint: {
            "line-color": "#7a7a96",
            "line-width": 2,
            "line-opacity": 0.45,
          },
        });
      }

      if (selectedCollection) {
        const { lines, pois: selectedPois } = extractLineFeatures(selectedCollection);
        map.addSource(ID.selSrc, {
          type: "geojson",
          data: { type: "FeatureCollection", features: lines },
        });

        addLayerTop(map, {
          id: ID.selGlow,
          type: "line",
          source: ID.selSrc,
          paint: {
            "line-color": ROUTE_COLORS[activeVariant],
            "line-width": 12,
            "line-opacity": 0.45,
            "line-blur": 3,
          },
        });

        addLayerTop(map, {
          id: ID.selLine,
          type: "line",
          source: ID.selSrc,
          paint: {
            "line-color": ROUTE_COLORS[activeVariant],
            "line-width": 3,
            "line-opacity": 1,
          },
        });

        if (selectedPois.length > 0) {
          map.addSource(ID.poiSrc, {
            type: "geojson",
            data: { type: "FeatureCollection", features: selectedPois },
          });

          addLayerTop(map, {
            id: ID.poiLayer,
            type: "circle",
            source: ID.poiSrc,
            paint: {
              "circle-radius": 4,
              "circle-color": "#ffffff",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": ROUTE_COLORS[activeVariant],
              "circle-opacity": 0.95,
            },
          });

          if (lastSnapId) {
            addLayerTop(map, {
              id: ID.poiHighlight,
              type: "circle",
              source: ID.poiSrc,
              filter: ["==", ["get", "id"], lastSnapId],
              paint: {
                "circle-radius": 6,
                "circle-color": "#ffe76a",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#111111",
              },
            });
          }
        }

        const bounds = new maplibregl.LngLatBounds();
        lines.forEach((feature) => {
          if (!feature.geometry) return;
          if (feature.geometry.type === "LineString") {
            (feature.geometry.coordinates as [number, number][])
              .forEach((c) => bounds.extend(c));
          } else if (feature.geometry.type === "MultiLineString") {
            (feature.geometry.coordinates as [number, number][][]).forEach((seg) =>
              seg.forEach((c) => bounds.extend(c))
            );
          }
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
        }
      }
    });
  }, [routesByVariant, pois, activeVariant, lastSnapId, mapLoaded]);

  return <div ref={containerRef} style={{ width: "100%", height: 360 }} />;
}
