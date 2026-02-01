import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type { RouteLabel } from "../types";
import maplibreJsUrl from "maplibre-gl/dist/maplibre-gl.js?url";

type ParsedRoute = {
  coords: [number, number][];
};

type RoutePoiRecord = {
  id: string;
  type: string;
  title: string;
  variants?: Record<
    string,
    {
      lat: number;
      lon: number;
      distanceMi: number;
      distanceM: number;
      snapIndex: number;
    }
  >;
};

interface SimpleRouteMapProps {
  routeGroupId: string;
  variant?: RouteLabel;
  pois?: RoutePoiRecord[];
  activePoiId?: string | null;
  allowPoiDrag?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onPoiSelect?: (poiId: string) => void;
  onPoiDragEnd?: (poiId: string, position: { lat: number; lon: number }) => void;
}

const DEMO_STYLE_URL = "https://demotiles.maplibre.org/style.json";
const MAPLIBRE_SCRIPT_ID = "suc-maplibre-js";
const BASELINE_LINE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [-121.48, 38.58],
          [-121.46, 38.59],
        ],
      },
    },
  ],
} as const;
let maplibreLoadPromise: Promise<any> | null = null;

type MarkerEntry = {
  marker: any;
  element: HTMLDivElement;
};

function applyMarkerStyle(
  element: HTMLDivElement,
  options: { active: boolean; draggable: boolean }
) {
  const size = options.active ? 16 : 12;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = "50%";
  element.style.background = options.active ? "#4ade80" : "#38bdf8";
  element.style.border = options.active ? "2px solid #f8fafc" : "1px solid #0f172a";
  element.style.boxShadow = options.active
    ? "0 0 0 4px rgba(59, 130, 246, 0.35)"
    : "0 0 0 2px rgba(15, 23, 42, 0.35)";
  element.style.cursor = options.draggable ? "grab" : "pointer";
}

function loadMapLibre(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("MapLibre requires a browser environment."));
  }

  const existing = (window as any).maplibregl;
  if (existing) return Promise.resolve(existing);

  if (maplibreLoadPromise) return maplibreLoadPromise;

  maplibreLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(MAPLIBRE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve((window as any).maplibregl));
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load MapLibre script."))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = MAPLIBRE_SCRIPT_ID;
    script.src = maplibreJsUrl;
    script.async = true;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error("Failed to load MapLibre script."));
    document.head.appendChild(script);
  });

  return maplibreLoadPromise;
}

export default function SimpleRouteMap({
  routeGroupId,
  variant,
  pois = [],
  activePoiId,
  allowPoiDrag = true,
  onMapClick,
  onPoiSelect,
  onPoiDragEnd,
}: SimpleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const maplibreRef = useRef<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const onPoiSelectRef = useRef<typeof onPoiSelect>(onPoiSelect);
  const onPoiDragEndRef = useRef<typeof onPoiDragEnd>(onPoiDragEnd);

  useEffect(() => {
    onPoiSelectRef.current = onPoiSelect;
  }, [onPoiSelect]);

  useEffect(() => {
    onPoiDragEndRef.current = onPoiDragEnd;
  }, [onPoiDragEnd]);

  useEffect(() => {
    console.log("[SIMPLE MAP] effect ran");
    if (mapRef.current || !containerRef.current) {
      if (!containerRef.current) {
        console.warn("[SIMPLE MAP] containerRef not ready.");
      }
      return;
    }
    let cancelled = false;

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || mapRef.current || !containerRef.current) return;
        maplibreRef.current = maplibregl;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: DEMO_STYLE_URL,
          center: [-121.48, 38.58],
          zoom: 11,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-left"
        );
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          console.log("[SIMPLE MAP] Map initialized.");
          setMapLoaded(true);
        });

        mapRef.current = map;
      })
      .catch((error) => {
        console.error("[SIMPLE MAP] MapLibre init failed:", error);
      });

    return () => {
      cancelled = true;
      maplibreRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
      }
      mapRef.current = null;
      markersRef.current.forEach((entry) => entry.marker.remove());
      markersRef.current.clear();
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (event: any) => {
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
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    const trimmedGroupId = routeGroupId.trim();
    const normalized = variant ? String(variant).toUpperCase() : "";

    const routeSource = map.getSource("route") as any;
    if (!trimmedGroupId || !normalized) {
      routeSource?.setData(BASELINE_LINE as FeatureCollection);
      return;
    }
    if (!trimmedGroupId.includes("-")) {
      console.error("[SIMPLE MAP] Invalid routeGroupId (expected full ID like SUC-034):", trimmedGroupId);
      return;
    }

    const loadRoute = async () => {
      try {
        if (routeSource) {
          routeSource.setData(BASELINE_LINE as FeatureCollection);
        } else {
          map.addSource("route", {
            type: "geojson",
            data: BASELINE_LINE,
          });

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#ff0000",
              "line-width": 4,
            },
          });
          // TODO: Re-add POI + viewer-mirrored layers after baseline rendering is stable.
        }
        const response = await fetch(
          `/api/routes/${trimmedGroupId}/gpx/${normalized}`
        );
        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status}`);
        }
        const parsed = (await response.json()) as ParsedRoute;

        const geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: parsed.coords ?? [],
              },
            },
          ],
        };

        const featureCount = geojson.features.length;
        const geometryTypes = geojson.features.map((f) => f.geometry?.type).filter(Boolean);
        console.log("[SIMPLE MAP] GeoJSON:", geojson);
        console.log("[SIMPLE MAP] Feature count:", featureCount);
        console.log("[SIMPLE MAP] Geometry types:", geometryTypes);

        const freshSource = map.getSource("route") as any;
        freshSource?.setData(geojson as FeatureCollection);

        const bounds = new maplibregl.LngLatBounds();
        parsed.coords?.forEach((coord) => bounds.extend(coord));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 40, duration: 0 });
          console.log("[SIMPLE MAP] ROUTE RENDERED");
        } else {
          console.log("[SIMPLE MAP] No coordinates to fit bounds.");
        }
      } catch (error) {
        console.error("[SIMPLE MAP] Failed to render route:", error);
      }
    };

    loadRoute();
  }, [routeGroupId, variant, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    const normalizedVariant = variant ? String(variant).toUpperCase() : "";
    const hasVariant = Boolean(normalizedVariant);
    const nextVisibleIds = new Set<string>();

    for (const poi of pois) {
      const placement = hasVariant ? poi.variants?.[normalizedVariant] : undefined;
      if (!placement) continue;
      nextVisibleIds.add(poi.id);

      let entry = markersRef.current.get(poi.id);
      if (!entry) {
        const element = document.createElement("div");
        element.setAttribute("data-poi-id", poi.id);
        element.addEventListener("mousedown", (event) => {
          event.stopPropagation();
        });
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          onPoiSelectRef.current?.(poi.id);
        });

        const marker = new maplibregl.Marker({ element, draggable: allowPoiDrag && hasVariant })
          .setLngLat([placement.lon, placement.lat])
          .addTo(map);

        marker.on("dragstart", () => {
          onPoiSelectRef.current?.(poi.id);
        });
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          onPoiDragEndRef.current?.(poi.id, { lat: lngLat.lat, lon: lngLat.lng });
        });

        entry = { marker, element };
        markersRef.current.set(poi.id, entry);
      } else {
        entry.marker.setLngLat([placement.lon, placement.lat]);
        if (typeof entry.marker.setDraggable === "function") {
          entry.marker.setDraggable(allowPoiDrag && hasVariant);
        }
      }

      applyMarkerStyle(entry.element, {
        active: poi.id === activePoiId,
        draggable: allowPoiDrag && hasVariant,
      });
    }

    markersRef.current.forEach((entry, poiId) => {
      if (nextVisibleIds.has(poiId)) return;
      entry.marker.remove();
      markersRef.current.delete(poiId);
    });
  }, [pois, variant, activePoiId, allowPoiDrag, mapLoaded]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: 360, minHeight: 360 }} />
  );
}
