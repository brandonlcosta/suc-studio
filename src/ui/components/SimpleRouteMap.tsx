import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type { ParsedRoute, RouteLabel } from "../types";
import { buildStudioApiUrl } from "../utils/studioApi";
import maplibreJsUrl from "maplibre-gl/dist/maplibre-gl.js?url";
import {
  buildRouteStats,
  getElevationFeet,
  getGradePercent,
  snapToRoute,
  type RouteStats,
} from "../utils/routeMath";

type RoutePoiRecord = {
  id: string;
  type: string;
  title?: string;
  label?: string;
  routePointIndex?: number;
  metadata?: {
    water?: boolean;
    nutrition?: boolean;
    crewAccess?: boolean;
    dropBags?: boolean;
  };
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

type PoiEta = {
  etaMinutes: number;
  etaLabel: string;
};

type BasemapStyle = "clean" | "topo";

type MapClickPayload = {
  click: { lat: number; lon: number };
  screen?: { x: number; y: number };
  snap?: {
    lat: number;
    lon: number;
    index: number;
    distanceMi: number;
    distanceM: number;
    cumulativeMi: number;
    variant: string;
  };
};

type FocusTarget = {
  lat: number;
  lon: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  immediate?: boolean;
  id?: string;
};

type HoverHudState = {
  x: number;
  y: number;
  variant: string;
  distanceMi: number;
  elevationFt: number | null;
  gradePct: number | null;
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

function asPlacements(value: RoutePoiVariantValue | undefined): RoutePoiVariantPlacement[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((entry) => entry && Number.isFinite(entry.distanceMi));
  }
  if (Number.isFinite(value.distanceMi)) return [value];
  return [];
}

function getPrimaryPlacement(
  value: RoutePoiVariantValue | undefined
): RoutePoiVariantPlacement | null {
  const placements = asPlacements(value);
  return placements[0] ?? null;
}

interface SimpleRouteMapProps {
  routeGroupId: string;
  variant?: RouteLabel;
  variants?: RouteLabel[];
  pois?: RoutePoiRecord[];
  poiWarnings?: Record<string, string[]>;
  poiEtas?: Record<string, Partial<Record<RouteLabel, PoiEta>>>;
  activePoiId?: string | null;
  allowPoiDrag?: boolean;
  basemap?: BasemapStyle;
  enableHoverHud?: boolean;
  height?: number | string;
  minHeight?: number | string;
  onMapClick?: (payload: MapClickPayload) => void;
  onMapContextMenu?: (payload: MapClickPayload) => void;
  onRouteData?: (variant: RouteLabel, stats: RouteStats, route: ParsedRoute) => void;
  focusTarget?: FocusTarget | null;
  highlightedPoiId?: string | null;
  snapIndicator?: { lat: number; lon: number } | null;
  onPoiSelect?: (poiId: string) => void;
  onPoiHover?: (poiId: string | null) => void;
  onPoiDragEnd?: (poiId: string, position: { lat: number; lon: number }) => void;
}

const DEMO_STYLE_URL = "https://demotiles.maplibre.org/style.json";
const TOPO_STYLE_URL = "/dark-tactical-terrain.json";
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

function buildRouteGeoJson(coords: [number, number][]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords ?? [],
        },
      },
    ],
  };
}
let maplibreLoadPromise: Promise<any> | null = null;

function normalizeVariants(values?: RouteLabel[]): string[] {
  if (!values) return [];
  return Array.from(
    new Set(values.map((label) => String(label).toUpperCase()).filter(Boolean))
  );
}

type MarkerEntry = {
  marker: any;
  element: HTMLDivElement;
  poiId: string;
  variant: string;
};

function applyMarkerStyle(
  element: HTMLDivElement,
  options: {
    activeVariant: boolean;
    selected: boolean;
    hovered: boolean;
    draggable: boolean;
    warning: boolean;
  }
) {
  const emphasized = options.selected || options.hovered;
  const baseSize = options.activeVariant ? 12 : 8;
  const size = baseSize + (emphasized ? 4 : 0);
  const opacity = options.activeVariant ? 1 : 0.45;
  const background = options.warning && !options.activeVariant
    ? "#facc15"
    : options.selected
      ? "#4ade80"
      : options.activeVariant
        ? "#38bdf8"
        : "#94a3b8";
  const borderColor = emphasized ? "#f8fafc" : options.activeVariant ? "#0f172a" : "#1f2937";
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.borderRadius = "50%";
  element.style.background = background;
  element.style.opacity = `${opacity}`;
  element.style.border = emphasized ? `2px solid ${borderColor}` : `1px solid ${borderColor}`;
  element.style.boxShadow = emphasized
    ? "0 0 0 4px rgba(59, 130, 246, 0.35)"
    : "0 0 0 2px rgba(15, 23, 42, 0.35)";
  element.style.cursor = options.draggable
    ? "grab"
    : options.activeVariant
      ? "pointer"
      : "default";
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
  variants,
  pois = [],
  poiWarnings,
  poiEtas,
  activePoiId,
  allowPoiDrag = true,
  basemap = "clean",
  enableHoverHud = false,
  height,
  minHeight,
  onMapClick,
  onMapContextMenu,
  onRouteData,
  focusTarget,
  highlightedPoiId,
  snapIndicator,
  onPoiSelect,
  onPoiHover,
  onPoiDragEnd,
}: SimpleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const maplibreRef = useRef<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleNonce, setStyleNonce] = useState(0);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const routeVariantsRef = useRef<Set<string>>(new Set());
  const routeCacheRef = useRef<Map<string, string>>(new Map());
  const routeDataRef = useRef<Map<string, ParsedRoute>>(new Map());
  const routeStatsRef = useRef<Map<string, RouteStats>>(new Map());
  const lastRouteGroupRef = useRef<string>("");
  const styleRef = useRef<string>(
    basemap === "topo" ? TOPO_STYLE_URL : DEMO_STYLE_URL
  );
  const onPoiSelectRef = useRef<typeof onPoiSelect>(onPoiSelect);
  const onPoiHoverRef = useRef<typeof onPoiHover>(onPoiHover);
  const onPoiDragEndRef = useRef<typeof onPoiDragEnd>(onPoiDragEnd);
  const onRouteDataRef = useRef<typeof onRouteData>(onRouteData);
  const draggingMarkerKeyRef = useRef<string | null>(null);
  const [hoveredPoiId, setHoveredPoiId] = useState<string | null>(null);
  const [hoverHud, setHoverHud] = useState<HoverHudState | null>(null);
  const snapMarkerRef = useRef<any | null>(null);
  const snapElementRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<string | null>(null);

  useEffect(() => {
    onPoiSelectRef.current = onPoiSelect;
  }, [onPoiSelect]);

  useEffect(() => {
    onPoiHoverRef.current = onPoiHover;
  }, [onPoiHover]);

  useEffect(() => {
    onPoiDragEndRef.current = onPoiDragEnd;
  }, [onPoiDragEnd]);

  useEffect(() => {
    onRouteDataRef.current = onRouteData;
  }, [onRouteData]);

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

        const initialStyle = styleRef.current;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: initialStyle,
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
        map.on("style.load", () => {
          setMapLoaded(true);
          setStyleNonce((prev) => prev + 1);
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
      if (snapMarkerRef.current) {
        snapMarkerRef.current.remove();
      }
      snapMarkerRef.current = null;
      snapElementRef.current = null;
      routeVariantsRef.current.clear();
      routeCacheRef.current.clear();
      routeDataRef.current.clear();
      routeStatsRef.current.clear();
      setHoverHud(null);
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = basemap === "topo" ? TOPO_STYLE_URL : DEMO_STYLE_URL;
    if (styleRef.current === nextStyle) return;
    styleRef.current = nextStyle;
    setMapLoaded(false);
    map.setStyle(nextStyle);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (event: any) => {
      if (!onMapClick) return;
      const click = { lat: event.lngLat.lat, lon: event.lngLat.lng };
      const screen = event.point ? { x: event.point.x, y: event.point.y } : undefined;
      let snap: MapClickPayload["snap"];
      const normalizedActive = variant ? String(variant).toUpperCase() : "";
      if (normalizedActive) {
        const stats = routeStatsRef.current.get(normalizedActive);
        const snapped = snapToRoute(stats ?? null, click);
        if (snapped) {
          snap = { ...snapped, variant: normalizedActive };
        }
      }
      onMapClick({ click, screen, snap });
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick, variant]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (event: any) => {
      if (!onMapContextMenu) return;
      if (event?.preventDefault) {
        event.preventDefault();
      }
      const click = { lat: event.lngLat.lat, lon: event.lngLat.lng };
      const screen = event.point ? { x: event.point.x, y: event.point.y } : undefined;
      let snap: MapClickPayload["snap"];
      const normalizedActive = variant ? String(variant).toUpperCase() : "";
      if (normalizedActive) {
        const stats = routeStatsRef.current.get(normalizedActive);
        const snapped = snapToRoute(stats ?? null, click);
        if (snapped) {
          snap = { ...snapped, variant: normalizedActive };
        }
      }
      onMapContextMenu({ click, screen, snap });
    };

    map.on("contextmenu", handler);
    return () => {
      map.off("contextmenu", handler);
    };
  }, [onMapContextMenu, variant]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    const trimmedGroupId = routeGroupId.trim();
    const normalizedActive = variant ? String(variant).toUpperCase() : "";
    const normalizedVariants = normalizeVariants(
      variants && variants.length > 0
        ? variants
        : normalizedActive
          ? [normalizedActive as RouteLabel]
          : []
    );

    if (!trimmedGroupId || normalizedVariants.length === 0) {
      routeVariantsRef.current.forEach((label) => {
        const layerId = `route-line-${label}`;
        const sourceId = `route-${label}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      });
      routeVariantsRef.current.clear();
      routeCacheRef.current.clear();
      routeDataRef.current.clear();
      routeStatsRef.current.clear();
      lastRouteGroupRef.current = trimmedGroupId;
      return;
    }
    if (!trimmedGroupId.includes("-")) {
      console.error(
        "[SIMPLE MAP] Invalid routeGroupId (expected full ID like SUC-034):",
        trimmedGroupId
      );
      return;
    }

    if (lastRouteGroupRef.current && lastRouteGroupRef.current !== trimmedGroupId) {
      routeVariantsRef.current.clear();
      routeCacheRef.current.clear();
      routeDataRef.current.clear();
      routeStatsRef.current.clear();
    }
    lastRouteGroupRef.current = trimmedGroupId;

    routeVariantsRef.current.forEach((label) => {
      if (normalizedVariants.includes(label)) return;
      const layerId = `route-line-${label}`;
      const sourceId = `route-${label}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      routeVariantsRef.current.delete(label);
      routeCacheRef.current.delete(label);
      routeDataRef.current.delete(label);
      routeStatsRef.current.delete(label);
    });

    const ensureLayer = (label: string) => {
      const sourceId = `route-${label}`;
      const layerId = `route-line-${label}`;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: BASELINE_LINE,
        });
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#ff0000",
            "line-width": 2,
            "line-opacity": 0.35,
            "line-dasharray": [2, 2],
          },
        });
      }

      const isActive = label === normalizedActive;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "line-color", "#ff0000");
        map.setPaintProperty(layerId, "line-width", isActive ? 4 : 2);
        map.setPaintProperty(layerId, "line-opacity", isActive ? 1 : 0.35);
        map.setPaintProperty(layerId, "line-dasharray", isActive ? [1, 0] : [2, 2]);
      }

      routeVariantsRef.current.add(label);
    };

    normalizedVariants.forEach(ensureLayer);
    if (normalizedActive && map.getLayer(`route-line-${normalizedActive}`)) {
      map.moveLayer(`route-line-${normalizedActive}`);
    }

    normalizedVariants.forEach(async (label) => {
      const cacheKey = `${trimmedGroupId}:${label}`;
      const cached = routeDataRef.current.get(label);
      const source = map.getSource(`route-${label}`) as any;
      if (cached && routeCacheRef.current.get(label) === cacheKey && source) {
        source.setData(buildRouteGeoJson(cached.coords ?? []));
        let stats = routeStatsRef.current.get(label) ?? null;
        if (!stats) {
          stats = buildRouteStats(cached);
          if (stats) {
            routeStatsRef.current.set(label, stats);
          }
        }
        if (stats) {
          onRouteDataRef.current?.(label as RouteLabel, stats, cached);
        }
        if (label === normalizedActive) {
          const bounds = new maplibregl.LngLatBounds();
          cached.coords?.forEach((coord) => bounds.extend(coord));
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 40, duration: 0 });
          }
        }
        return;
      }
      try {
        const response = await fetch(buildStudioApiUrl(`/routes/${trimmedGroupId}/gpx/${label}`));
        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status}`);
        }
        const parsed = (await response.json()) as ParsedRoute;
        routeDataRef.current.set(label, parsed);
        const stats = buildRouteStats(parsed);
        if (stats) {
          routeStatsRef.current.set(label, stats);
          onRouteDataRef.current?.(label as RouteLabel, stats, parsed);
        }

        const nextSource = map.getSource(`route-${label}`) as any;
        nextSource?.setData(buildRouteGeoJson(parsed.coords ?? []));
        routeCacheRef.current.set(label, cacheKey);

        if (label === normalizedActive) {
          const bounds = new maplibregl.LngLatBounds();
          parsed.coords?.forEach((coord) => bounds.extend(coord));
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 40, duration: 0 });
          }
        }

        console.log("VARIANT_RENDERED", {
          routeGroupId: trimmedGroupId,
          variant: label,
          active: label === normalizedActive,
        });
      } catch (error) {
        console.error("[SIMPLE MAP] Failed to render route:", error);
      }
    });
  }, [routeGroupId, variant, variants, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !enableHoverHud) {
      setHoverHud(null);
      return;
    }

    const handleMove = (event: any) => {
      const layerIds = Array.from(routeVariantsRef.current)
        .map((label) => `route-line-${label}`)
        .filter((id) => map.getLayer(id));
      if (layerIds.length === 0) {
        setHoverHud(null);
        return;
      }
      const features = map.queryRenderedFeatures(event.point, { layers: layerIds });
      if (!features || features.length === 0) {
        setHoverHud(null);
        return;
      }
      const layerId = features[0]?.layer?.id ?? "";
      const variantLabel = layerId.replace("route-line-", "");
      const stats = routeStatsRef.current.get(variantLabel) ?? null;
      const snapped = snapToRoute(stats, {
        lat: event.lngLat.lat,
        lon: event.lngLat.lng,
      });
      if (!snapped) {
        setHoverHud(null);
        return;
      }
      const elevationFt = getElevationFeet(stats, snapped.index);
      const gradePct = getGradePercent(stats, snapped.index);
      setHoverHud({
        x: event.point.x,
        y: event.point.y,
        variant: variantLabel,
        distanceMi: snapped.cumulativeMi,
        elevationFt,
        gradePct,
      });
    };

    const handleLeave = () => setHoverHud(null);

    map.on("mousemove", handleMove);
    map.getCanvas().addEventListener("mouseleave", handleLeave);

    return () => {
      map.off("mousemove", handleMove);
      map.getCanvas().removeEventListener("mouseleave", handleLeave);
    };
  }, [enableHoverHud, mapLoaded, styleNonce]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    if (!snapIndicator) {
      if (snapMarkerRef.current) {
        snapMarkerRef.current.remove();
        snapMarkerRef.current = null;
      }
      return;
    }

    if (!snapElementRef.current) {
      const element = document.createElement("div");
      element.style.width = "14px";
      element.style.height = "14px";
      element.style.borderRadius = "999px";
      element.style.border = "2px solid rgba(248, 250, 252, 0.9)";
      element.style.background = "rgba(56, 189, 248, 0.2)";
      element.style.boxShadow = "0 0 0 4px rgba(56, 189, 248, 0.18)";
      element.style.pointerEvents = "none";
      snapElementRef.current = element;
    }

    if (!snapMarkerRef.current) {
      snapMarkerRef.current = new maplibregl.Marker({
        element: snapElementRef.current,
        draggable: false,
      })
        .setLngLat([snapIndicator.lon, snapIndicator.lat])
        .addTo(map);
    } else {
      snapMarkerRef.current.setLngLat([snapIndicator.lon, snapIndicator.lat]);
    }
  }, [snapIndicator, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !focusTarget) return;
    const zoom = focusTarget.zoom ?? Math.max(map.getZoom(), 13.5);
    const bearing = Number.isFinite(focusTarget.bearing) ? (focusTarget.bearing as number) : map.getBearing();
    const pitch = Number.isFinite(focusTarget.pitch) ? (focusTarget.pitch as number) : map.getPitch();
    const focusKey =
      focusTarget.id ?? `${focusTarget.lat}:${focusTarget.lon}:${zoom}:${bearing}:${pitch}:${focusTarget.immediate ? "1" : "0"}`;
    if (lastFocusRef.current === focusKey) return;
    lastFocusRef.current = focusKey;
    if (focusTarget.immediate) {
      map.jumpTo({
        center: [focusTarget.lon, focusTarget.lat],
        zoom,
        bearing,
        pitch,
      });
      return;
    }
    map.easeTo({
      center: [focusTarget.lon, focusTarget.lat],
      zoom,
      bearing,
      pitch,
      duration: 650,
      essential: true,
    });
  }, [focusTarget, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !mapLoaded) return;

    const normalizedActive = variant ? String(variant).toUpperCase() : "";
    const normalizedVariants = normalizeVariants(
      variants && variants.length > 0
        ? variants
        : normalizedActive
          ? [normalizedActive as RouteLabel]
          : []
    );
    const nextVisibleKeys = new Set<string>();

    for (const poi of pois) {
      const hasWarning = Boolean(poiWarnings?.[poi.id]?.length);
      const poiTitle = poi.label || poi.title || poi.id;
      const activeEta = normalizedActive
        ? poiEtas?.[poi.id]?.[normalizedActive as RouteLabel]
        : undefined;
      const activeEtaLabel = activeEta?.etaLabel ?? "n/a";
      const etaVariantLabel = normalizedActive || "n/a";
      const isIndexedPoi =
        (poi.type === "aid-station" || poi.type === "workout") &&
        Number.isFinite(poi.routePointIndex);

      if (isIndexedPoi) {
        if (!normalizedActive) continue;
        const stats = routeStatsRef.current.get(normalizedActive) ?? null;
        const coord = stats?.coords?.[poi.routePointIndex as number];
        if (!coord) continue;

        const markerKey = `${poi.id}::${normalizedActive}`;
        const isActiveVariant = true;
        const isDraggable = allowPoiDrag && isActiveVariant;
        nextVisibleKeys.add(markerKey);

        let entry = markersRef.current.get(markerKey);
        const indexLabel = Number.isFinite(poi.routePointIndex)
          ? `Index: ${poi.routePointIndex}`
          : "Index: n/a";
        if (!entry) {
          const element = document.createElement("div");
          element.setAttribute("data-poi-id", poi.id);
          element.setAttribute("data-poi-variant", normalizedActive);
          element.title = `${poiTitle}\n${indexLabel}`;
          element.addEventListener("mousedown", (event) => {
            event.stopPropagation();
          });
          element.addEventListener("click", (event) => {
            event.stopPropagation();
            onPoiSelectRef.current?.(poi.id);
          });
          element.addEventListener("mouseenter", () => {
            setHoveredPoiId(poi.id);
            onPoiHoverRef.current?.(poi.id);
          });
          element.addEventListener("mouseleave", () => {
            setHoveredPoiId((prev) => (prev === poi.id ? null : prev));
            onPoiHoverRef.current?.(null);
          });

          const marker = new maplibregl.Marker({ element, draggable: isDraggable })
            .setLngLat([coord[0], coord[1]])
            .addTo(map);

          marker.on("dragstart", () => {
            draggingMarkerKeyRef.current = markerKey;
            onPoiSelectRef.current?.(poi.id);
            element.style.cursor = "grabbing";
          });
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            draggingMarkerKeyRef.current = null;
            element.style.cursor = isDraggable ? "grab" : "pointer";
            onPoiDragEndRef.current?.(poi.id, { lat: lngLat.lat, lon: lngLat.lng });
          });

          entry = { marker, element, poiId: poi.id, variant: normalizedActive };
          markersRef.current.set(markerKey, entry);
        } else {
          entry.element.title = `${poiTitle}\n${indexLabel}`;
          if (draggingMarkerKeyRef.current !== markerKey) {
            entry.marker.setLngLat([coord[0], coord[1]]);
          }
          if (typeof entry.marker.setDraggable === "function") {
            entry.marker.setDraggable(isDraggable);
          }
        }

        const isHovered = poi.id === hoveredPoiId || poi.id === highlightedPoiId;
        applyMarkerStyle(entry.element, {
          activeVariant: isActiveVariant,
          selected: poi.id === activePoiId,
          hovered: isHovered,
          draggable: isDraggable,
          warning: hasWarning,
        });

        continue;
      }
      const placements = Object.entries(poi.variants ?? {}).filter(([label]) =>
        normalizedVariants.includes(String(label).toUpperCase())
      );

      for (const [label, placementValue] of placements) {
        const normalizedLabel = String(label).toUpperCase();
        const primaryPlacement = getPrimaryPlacement(
          placementValue as RoutePoiVariantValue | undefined
        );
        if (!primaryPlacement) continue;
        const allPlacements = asPlacements(
          placementValue as RoutePoiVariantValue | undefined
        );
        const markerKey = `${poi.id}::${normalizedLabel}`;
        const isActiveVariant = normalizedLabel === normalizedActive;
        const isDraggable = allowPoiDrag && isActiveVariant;
        nextVisibleKeys.add(markerKey);

        let entry = markersRef.current.get(markerKey);
        if (!entry) {
          const element = document.createElement("div");
          element.setAttribute("data-poi-id", poi.id);
          element.setAttribute("data-poi-variant", normalizedLabel);
          const distanceLabel = Number.isFinite(primaryPlacement.distanceMi)
            ? `${primaryPlacement.distanceMi.toFixed(2)} mi`
            : "n/a";
          const multiPassLabel =
            allPlacements.length > 1
              ? `\nPasses: ${allPlacements
                  .map((entry) =>
                    Number.isFinite(entry.distanceMi)
                      ? `${entry.distanceMi.toFixed(2)} mi`
                      : "n/a"
                  )
                  .join(", ")}`
              : "";
          element.title = `${poiTitle}\nDistance: ${distanceLabel}\nETA (${etaVariantLabel}): ${activeEtaLabel}${multiPassLabel}`;
          element.addEventListener("mousedown", (event) => {
            event.stopPropagation();
          });
          element.addEventListener("click", (event) => {
            event.stopPropagation();
            if (normalizedLabel !== normalizedActive) return;
            onPoiSelectRef.current?.(poi.id);
          });
          element.addEventListener("mouseenter", () => {
            setHoveredPoiId(poi.id);
            onPoiHoverRef.current?.(poi.id);
          });
          element.addEventListener("mouseleave", () => {
            setHoveredPoiId((prev) => (prev === poi.id ? null : prev));
            onPoiHoverRef.current?.(null);
          });

          const marker = new maplibregl.Marker({ element, draggable: isDraggable })
            .setLngLat([primaryPlacement.lon, primaryPlacement.lat])
            .addTo(map);

          marker.on("dragstart", () => {
            if (normalizedLabel !== normalizedActive) return;
            draggingMarkerKeyRef.current = markerKey;
            onPoiSelectRef.current?.(poi.id);
            element.style.cursor = "grabbing";
          });
          marker.on("dragend", () => {
            if (normalizedLabel !== normalizedActive) return;
            const lngLat = marker.getLngLat();
            draggingMarkerKeyRef.current = null;
            element.style.cursor = isDraggable ? "grab" : "pointer";
            onPoiDragEndRef.current?.(poi.id, { lat: lngLat.lat, lon: lngLat.lng });
          });

          entry = { marker, element, poiId: poi.id, variant: normalizedLabel };
          markersRef.current.set(markerKey, entry);

          if (!isActiveVariant) {
            console.log("POI_PROJECTED", {
              poiId: poi.id,
              routeGroupId,
              variant: normalizedLabel,
            });
          }
        } else {
          const distanceLabel = Number.isFinite(primaryPlacement.distanceMi)
            ? `${primaryPlacement.distanceMi.toFixed(2)} mi`
            : "n/a";
          const multiPassLabel =
            allPlacements.length > 1
              ? `\nPasses: ${allPlacements
                  .map((entry) =>
                    Number.isFinite(entry.distanceMi)
                      ? `${entry.distanceMi.toFixed(2)} mi`
                      : "n/a"
                  )
                  .join(", ")}`
              : "";
          entry.element.title = `${poiTitle}\nDistance: ${distanceLabel}\nETA (${etaVariantLabel}): ${activeEtaLabel}${multiPassLabel}`;
          if (draggingMarkerKeyRef.current !== markerKey) {
            entry.marker.setLngLat([primaryPlacement.lon, primaryPlacement.lat]);
          }
          if (typeof entry.marker.setDraggable === "function") {
            entry.marker.setDraggable(isDraggable);
          }
        }

        const isHovered = poi.id === hoveredPoiId || poi.id === highlightedPoiId;
        applyMarkerStyle(entry.element, {
          activeVariant: isActiveVariant,
          selected: poi.id === activePoiId,
          hovered: isHovered,
          draggable: isDraggable,
          warning: hasWarning,
        });
      }
    }

    markersRef.current.forEach((entry, key) => {
      if (nextVisibleKeys.has(key)) return;
      entry.marker.remove();
      markersRef.current.delete(key);
    });
  }, [
    pois,
    variant,
    variants,
    poiWarnings,
    poiEtas,
    activePoiId,
    hoveredPoiId,
    highlightedPoiId,
    allowPoiDrag,
    mapLoaded,
    routeGroupId,
  ]);

  const poiOverlay = (() => {
    const activeVariantLabel = variant ? String(variant).toUpperCase() : "";
    const targetPoiId = hoveredPoiId || highlightedPoiId || activePoiId;
    if (!targetPoiId || !activeVariantLabel) return null;
    const poi = pois.find((entry) => entry.id === targetPoiId);
    if (!poi) return null;
    if (
      (poi.type === "aid-station" || poi.type === "workout") &&
      Number.isFinite(poi.routePointIndex)
    ) {
      return {
        title: poi.label || poi.title || poi.id,
        variant: activeVariantLabel,
        distances: `Index ${poi.routePointIndex}`,
        count: 1,
        isAidStation: poi.type === "aid-station",
        isWorkout: poi.type === "workout",
      };
    }
    const placements = asPlacements(
      poi.variants?.[activeVariantLabel] as RoutePoiVariantValue | undefined
    );
    if (placements.length === 0) return null;
    const distances = placements
      .map((entry) =>
        Number.isFinite(entry.distanceMi) ? entry.distanceMi.toFixed(2) : "n/a"
      )
      .join(", ");
    return {
      title: poi.label || poi.title || poi.id,
      variant: activeVariantLabel,
      distances,
      count: placements.length,
      isAidStation: false,
      isWorkout: false,
    };
  })();

  const containerHeight = height ?? 360;
  const containerMinHeight = minHeight ?? containerHeight;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: containerHeight,
        minHeight: containerMinHeight,
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {poiOverlay && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            background: "rgba(15, 23, 42, 0.9)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "8px",
            padding: "0.4rem 0.6rem",
            fontSize: "0.7rem",
            pointerEvents: "none",
            minWidth: "160px",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: "0.2rem" }}>
            {poiOverlay.title}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <span>{poiOverlay.variant}</span>
            <span>
              {poiOverlay.isAidStation
                ? "Aid Station"
                : poiOverlay.isWorkout
                  ? "Workout POI"
                  : `${poiOverlay.count} passes`}
            </span>
          </div>
          <div style={{ marginTop: "0.2rem", color: "#cbd5f5" }}>
            {poiOverlay.isAidStation || poiOverlay.isWorkout
              ? poiOverlay.distances
              : `${poiOverlay.distances} mi`}
          </div>
        </div>
      )}
      {enableHoverHud && hoverHud && (
        <div
          style={{
            position: "absolute",
            left: hoverHud.x + 12,
            top: hoverHud.y + 12,
            background: "rgba(15, 23, 42, 0.92)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "6px",
            padding: "0.35rem 0.5rem",
            fontSize: "0.7rem",
            pointerEvents: "none",
            minWidth: "140px",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: "0.15rem" }}>
            {hoverHud.variant}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <span>Dist</span>
            <span>{hoverHud.distanceMi.toFixed(2)} mi</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <span>Elev</span>
            <span>
              {hoverHud.elevationFt !== null ? `${hoverHud.elevationFt.toFixed(0)} ft` : "n/a"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <span>Grade</span>
            <span>
              {hoverHud.gradePct !== null ? `${hoverHud.gradePct.toFixed(1)}%` : "n/a"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
