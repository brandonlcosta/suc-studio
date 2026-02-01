import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import maplibreJsUrl from "maplibre-gl/dist/maplibre-gl.js?url";

type ParsedRoute = {
  coords: [number, number][];
};

interface SimpleRouteMapProps {
  routeGroupId: string;
  variant?: "MED" | "LRG" | "XL" | "XXL";
  onMapClick?: (lat: number, lon: number) => void;
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
  variant = "MED",
  onMapClick,
}: SimpleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const maplibreRef = useRef<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
    if (!trimmedGroupId) return;
    if (!trimmedGroupId.includes("-")) {
      console.error("[SIMPLE MAP] Invalid routeGroupId (expected full ID like SUC-034):", trimmedGroupId);
      return;
    }

    const normalized = String(variant).toUpperCase();

    const loadRoute = async () => {
      try {
        const existingSource = map.getSource("route") as any;
        if (existingSource) {
          existingSource.setData(BASELINE_LINE as FeatureCollection);
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
        const routeSource = map.getSource("route") as any;

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

        routeSource?.setData(geojson as FeatureCollection);

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

  return (
    <div ref={containerRef} style={{ width: "100%", height: 360, minHeight: 360 }} />
  );
}
