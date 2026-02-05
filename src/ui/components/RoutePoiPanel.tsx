import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RouteLabel } from "../types";
import { LABELS } from "../utils/routeLabels";
import {
  deleteRoutePoi,
  ensureStartFinishPoi,
  getRouteGroup,
  getRoutePois,
  snapRoutePoi,
} from "../utils/api";
import { getCoordinateAtDistance, type RouteStats } from "../utils/routeMath";
import {
  VARIANT_INTERSECTION_THRESHOLD_M,
  getIntersectingVariants,
  type RouteVariantGeometry,
} from "../utils/variantIntersection";
import SimpleRouteMap from "./SimpleRouteMap";

const POI_TYPES = ["aid", "water", "summit", "fork", "hazard", "viewpoint", "turnaround"];
const ROUTE_LABELS = new Set<RouteLabel>(LABELS);
const VARIANT_PACE_MIN_PER_MI: Record<RouteLabel, number> = {
  MED: 12,
  LRG: 12,
  XL: 12,
  XXL: 12,
};
const DRIFT_THRESHOLD_MI = 0.25;
const FORK_TOLERANCE_DEG = 0.001;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

function isRouteLabel(value: string): value is RouteLabel {
  return ROUTE_LABELS.has(value as RouteLabel);
}

function formatEtaMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return "n/a";
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

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

function computePoiWarnings(
  poi: RoutePoiRecord,
  variants: RouteLabel[],
  activeVariant: RouteLabel | ""
): string[] {
  const warnings: string[] = [];
  const placements = variants
    .map((label) => {
      const placement = getPrimaryPlacement(poi.variants?.[label] as RoutePoiVariantValue);
      if (!placement) return null;
      return { label, placement };
    })
    .filter(Boolean) as Array<{ label: RouteLabel; placement: RoutePoiVariantPlacement }>;

  if (placements.length >= 2) {
    const distances = placements
      .map((entry) => entry.placement.distanceMi)
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    if (distances.length >= 2) {
      const max = Math.max(...distances);
      const min = Math.min(...distances);
      if (max - min > DRIFT_THRESHOLD_MI) {
        warnings.push("WARNING_DRIFT");
      }
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    placements.forEach(({ placement }) => {
      minLat = Math.min(minLat, placement.lat);
      maxLat = Math.max(maxLat, placement.lat);
      minLon = Math.min(minLon, placement.lon);
      maxLon = Math.max(maxLon, placement.lon);
    });
    if (maxLat - minLat > FORK_TOLERANCE_DEG || maxLon - minLon > FORK_TOLERANCE_DEG) {
      warnings.push("WARNING_FORK");
    }
  }

  if (activeVariant && poi.variants?.[activeVariant]) {
    const missing = variants.some((label) => !poi.variants?.[label]);
    if (missing) {
      warnings.push("WARNING_MISSING_VARIANT");
    }
  }

  return warnings;
}

type PoiEta = {
  etaMinutes: number;
  etaLabel: string;
};

interface RoutePoiPanelProps {
  routeGroupId: string;
  layout?: "stacked" | "split";
  sidebarContent?: ReactNode;
  mapHeight?: number | string;
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

type MapClickPayload = {
  click: { lat: number; lon: number };
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

type MapFocusTarget = {
  lat: number;
  lon: number;
  zoom?: number;
  id?: string;
};

export default function RoutePoiPanel({
  routeGroupId,
  layout = "stacked",
  sidebarContent,
  mapHeight,
}: RoutePoiPanelProps) {
  const [viewMode, setViewMode] = useState<"authoring" | "cue">("authoring");
  const [poiType, setPoiType] = useState("");
  const [poiTitle, setPoiTitle] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<RouteLabel[]>([]);
  const [availableVariants, setAvailableVariants] = useState<RouteLabel[]>(LABELS);
  const [activeVariant, setActiveVariant] = useState<RouteLabel | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<RoutePoiRecord[]>([]);
  const [activePoiId, setActivePoiId] = useState<string | null>(null);
  const [hoveredRowPoiId, setHoveredRowPoiId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocusTarget | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [variantAssignmentNote, setVariantAssignmentNote] = useState<string | null>(
    null
  );
  const [routeStatsByVariant, setRouteStatsByVariant] = useState<
    Record<string, RouteStats>
  >({});
  const [placeDistanceMi, setPlaceDistanceMi] = useState("");
  const [basemap, setBasemap] = useState<"clean" | "topo">(() => {
    if (typeof window === "undefined") return "clean";
    const stored = window.sessionStorage.getItem("suc-studio-basemap");
    return stored === "topo" ? "topo" : "clean";
  });
  const isSplit = layout === "split";
  const controlsMaxWidth = isSplit ? "100%" : "400px";
  const authoringMaxWidth = isSplit ? "100%" : "600px";
  const resolvedMapHeight = mapHeight ?? (isSplit ? "55vh" : undefined);

  const resetForm = useCallback(() => {
    setPoiType("");
    setPoiTitle("");
    setSelectedVariants([]);
    setVariantAssignmentNote(null);
  }, []);

  const variantOptions = availableVariants.length > 0 ? availableVariants : LABELS;
  const activeVariantLabel = variantOptions.includes(activeVariant as RouteLabel)
    ? (activeVariant as RouteLabel)
    : "";
  const previewVariant = activeVariantLabel || undefined;
  const canDragPois = Boolean(activeVariantLabel);
  const activePoi = activePoiId ? pois.find((poi) => poi.id === activePoiId) : null;
  const isActivePoiLocked = Boolean(activePoi?.locked || activePoi?.system);
  const activeRouteStats = activeVariantLabel
    ? routeStatsByVariant[activeVariantLabel]
    : null;
  const maxDistanceMi = activeRouteStats?.totalMiles ?? null;
  const warningLogRef = useRef<Map<string, string>>(new Map());
  const etaLogRef = useRef<Map<string, number>>(new Map());
  const snapTimerRef = useRef<number | null>(null);
  const manualVariantOverrideRef = useRef<Map<string, boolean>>(new Map());

  const routeVariantGeoms = useMemo<RouteVariantGeometry[]>(() => {
    return variantOptions
      .map((label) => ({
        label,
        coords: routeStatsByVariant[label]?.coords ?? [],
      }))
      .filter((entry) => entry.coords.length > 0);
  }, [variantOptions, routeStatsByVariant]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("suc-studio-basemap", basemap);
  }, [basemap]);

  useEffect(() => {
    setRouteStatsByVariant({});
    setMapFocus(null);
    setHoveredRowPoiId(null);
    setVariantAssignmentNote(null);
    manualVariantOverrideRef.current.clear();
  }, [routeGroupId]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  // Derived selector output only; never mutate directly.
  const poiWarnings = useMemo(() => {
    const next: Record<string, string[]> = {};
    if (variantOptions.length === 0) return next;
    for (const poi of pois) {
      const warnings = computePoiWarnings(poi, variantOptions, activeVariantLabel);
      if (warnings.length > 0) {
        next[poi.id] = warnings;
      }
    }
    return next;
  }, [pois, variantOptions, activeVariantLabel]);

  const poiEtas = useMemo(() => {
    const next: Record<string, Partial<Record<RouteLabel, PoiEta>>> = {};
    if (variantOptions.length === 0) return next;
    for (const poi of pois) {
      const byVariant: Partial<Record<RouteLabel, PoiEta>> = {};
      variantOptions.forEach((label) => {
        const placement = getPrimaryPlacement(
          poi.variants?.[label] as RoutePoiVariantValue | undefined
        );
        const pace = VARIANT_PACE_MIN_PER_MI[label];
        if (!placement || typeof placement.distanceMi !== "number") return;
        if (!Number.isFinite(placement.distanceMi) || !Number.isFinite(pace)) return;
        const etaMinutes = placement.distanceMi * pace;
        byVariant[label] = {
          etaMinutes,
          etaLabel: formatEtaMinutes(etaMinutes),
        };
      });
      if (Object.keys(byVariant).length > 0) {
        next[poi.id] = byVariant;
      }
    }
    return next;
  }, [pois, variantOptions, activeVariantLabel]);

  const cueSheetRows = useMemo(() => {
    if (!activeVariantLabel) return [];
    const pace = VARIANT_PACE_MIN_PER_MI[activeVariantLabel];
    const rows = pois
      .flatMap((poi) => {
        const placements = asPlacements(
          poi.variants?.[activeVariantLabel] as RoutePoiVariantValue | undefined
        );
        if (placements.length === 0) return [];
        return placements
          .filter((placement) => Number.isFinite(placement.distanceMi))
          .map((placement, index) => {
            const etaMinutes = placement.distanceMi * pace;
            return {
              poiId: poi.id,
              name: poi.title || poi.id,
              type: poi.type,
              distanceMi: placement.distanceMi,
              etaMinutes,
              etaLabel: formatEtaMinutes(etaMinutes),
              passIndex: placement.passIndex ?? index,
            };
          });
      }) as Array<{
      poiId: string;
      name: string;
      type: string;
      distanceMi: number;
      etaMinutes: number;
      etaLabel: string;
      passIndex: number;
    }>;

    rows.sort((a, b) => a.distanceMi - b.distanceMi);
    return rows.map((row, index) => {
      if (index === 0) {
        return { ...row, deltaMi: null, deltaEtaLabel: "" };
      }
      const prev = rows[index - 1];
      const deltaMi = row.distanceMi - prev.distanceMi;
      const deltaEtaMinutes = row.etaMinutes - prev.etaMinutes;
      return {
        ...row,
        deltaMi,
        deltaEtaLabel: formatEtaMinutes(deltaEtaMinutes),
      };
    });
  }, [pois, activeVariantLabel]);

  const cueSheetText = useMemo(() => {
    if (cueSheetRows.length === 0) return "";
    return cueSheetRows
      .map((row, index) => {
        const distanceLabel = `${row.distanceMi.toFixed(2)} mi`;
        if (index === 0) {
          return `${distanceLabel} - ${row.name} (ETA ${row.etaLabel})`;
        }
        const deltaLabel = row.deltaMi !== null ? `+${row.deltaMi.toFixed(2)} mi` : "+0.00 mi";
        const deltaEta = row.deltaEtaLabel ? `+${row.deltaEtaLabel}` : "+00:00";
        return `${deltaLabel} / ${deltaEta} - ${row.name} (ETA ${row.etaLabel})`;
      })
      .join("\n");
  }, [cueSheetRows]);

  useEffect(() => {
    const nextIds = new Set(Object.keys(poiWarnings));
    Object.entries(poiWarnings).forEach(([poiId, warnings]) => {
      const signature = warnings.join("|");
      if (warningLogRef.current.get(poiId) !== signature) {
        console.log("POI_VALIDATION_WARNING", { poiId, warnings });
        warningLogRef.current.set(poiId, signature);
      }
    });
    warningLogRef.current.forEach((_signature, poiId) => {
      if (!nextIds.has(poiId)) {
        warningLogRef.current.delete(poiId);
      }
    });
  }, [poiWarnings]);

  useEffect(() => {
    const nextKeys = new Set<string>();
    Object.entries(poiEtas).forEach(([poiId, byVariant]) => {
      Object.entries(byVariant).forEach(([variant, eta]) => {
        if (!eta) return;
        const etaMinutes = eta.etaMinutes;
        const signature = Number(etaMinutes.toFixed(3));
        const key = `${poiId}:${variant}`;
        nextKeys.add(key);
        if (etaLogRef.current.get(key) !== signature) {
          console.log("POI_ETA_COMPUTED", {
            poiId,
            variant,
            etaMinutes,
          });
          etaLogRef.current.set(key, signature);
        }
      });
    });
    etaLogRef.current.forEach((_value, key) => {
      if (!nextKeys.has(key)) {
        etaLogRef.current.delete(key);
      }
    });
  }, [poiEtas]);

  useEffect(() => {
    if (viewMode !== "cue") return;
    console.log("CUE_SHEET_RENDERED", {
      routeGroupId,
      variant: activeVariantLabel || null,
      count: cueSheetRows.length,
    });
  }, [viewMode, cueSheetRows, routeGroupId, activeVariantLabel]);

  useEffect(() => {
    if (activePoiId) return;
    if (!activeVariantLabel) {
      setSelectedVariants([]);
      return;
    }
    setSelectedVariants((prev) => {
      if (prev.length === 1 && prev[0] === activeVariantLabel) return prev;
      return [activeVariantLabel];
    });
  }, [activeVariantLabel, activePoiId]);

  useEffect(() => {
    if (!activeVariantLabel || !routeGroupId.trim()) return;
    console.log("ACTIVE_VARIANT_CHANGED", {
      routeGroupId,
      variant: activeVariantLabel,
    });
  }, [activeVariantLabel, routeGroupId]);

  useEffect(() => {
    let isMounted = true;
    setMessage(null);
    setError(null);

    if (!routeGroupId.trim()) {
      setAvailableVariants([]);
      setActiveVariant("");
      setActivePoiId(null);
      resetForm();
      return;
    }

    getRouteGroup(routeGroupId)
      .then((meta) => {
        const variants = meta?.variants?.length ? meta.variants : LABELS;
        if (!isMounted) return;
        setAvailableVariants(variants);
        setActiveVariant((prev) =>
          variants.includes(prev as RouteLabel)
            ? (prev as RouteLabel)
            : variants.includes("XL")
              ? "XL"
              : variants[0] ?? ""
        );
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load route group";
        if (isMounted) {
          setAvailableVariants(LABELS);
          setActiveVariant("MED");
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [routeGroupId, resetForm]);

  useEffect(() => {
    let isMounted = true;
    if (!routeGroupId.trim()) {
      setPois([]);
      setActivePoiId(null);
      return () => {
        isMounted = false;
      };
    }

    // Canonical POIs live in route.pois.json for the route group.
    getRoutePois(routeGroupId)
      .then((data) => {
        if (isMounted) setPois(Array.isArray(data.pois) ? data.pois : []);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load POIs";
        if (isMounted) {
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [routeGroupId]);

  useEffect(() => {
    if (!activePoiId) return;
    const activePoi = pois.find((poi) => poi.id === activePoiId);
    if (!activePoi) {
      setActivePoiId(null);
      return;
    }
    setPoiType(activePoi.type ?? "");
    setPoiTitle(activePoi.title ?? "");
    const variants = Object.keys(activePoi.variants ?? {}).filter(isRouteLabel);
    setSelectedVariants(variants);
    setVariantAssignmentNote(null);
  }, [activePoiId, pois]);

  useEffect(() => {
    if (!activePoiId || !activeVariantLabel) return;
    const activePoi = pois.find((poi) => poi.id === activePoiId);
    if (!activePoi) return;
    if (!activePoi.variants?.[activeVariantLabel]) {
      setActivePoiId(null);
    }
  }, [activePoiId, activeVariantLabel, pois]);

  const handleVariantToggle = (label: RouteLabel) => {
    setSelectedVariants((prev) => {
      const next = prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label];

      if (activePoiId) {
        manualVariantOverrideRef.current.set(activePoiId, true);
        setVariantAssignmentNote(null);
        setPois((prevPois) =>
          prevPois.map((poi) => {
            if (poi.id !== activePoiId) return poi;
            const nextVariants = { ...(poi.variants ?? {}) };
            Object.keys(nextVariants).forEach((key) => {
              if (!next.includes(key as RouteLabel)) {
                delete nextVariants[key];
              }
            });
            return { ...poi, variants: nextVariants };
          })
        );
      }

      return next;
    });
  };

  const readyToSnap =
    routeGroupId.trim().length > 0 &&
    poiType.trim().length > 0 &&
    poiTitle.trim().length > 0 &&
    Boolean(activeVariantLabel) &&
    !activePoiId;

  const handleRouteData = useCallback((label: RouteLabel, stats: RouteStats) => {
    if (!stats) return;
    setRouteStatsByVariant((prev) => ({ ...prev, [label]: stats }));
  }, []);

  const showSnapIndicator = useCallback((lat: number, lon: number) => {
    setSnapIndicator({ lat, lon });
    if (snapTimerRef.current) {
      window.clearTimeout(snapTimerRef.current);
    }
    snapTimerRef.current = window.setTimeout(() => {
      setSnapIndicator(null);
    }, 1200);
  }, []);

  const getAutoVariantsForCoord = useCallback(
    (coord: { lat: number; lon: number }) => {
      if (routeVariantGeoms.length === 0) return [];
      return getIntersectingVariants(
        coord,
        routeVariantGeoms,
        VARIANT_INTERSECTION_THRESHOLD_M
      );
    },
    [routeVariantGeoms]
  );

  const applyAutoVariantSelection = useCallback(
    (coord: { lat: number; lon: number }) => {
      const autoVariants = getAutoVariantsForCoord(coord);
      setSelectedVariants(autoVariants);
      setVariantAssignmentNote("Variants auto-assigned based on route overlap.");
      return autoVariants;
    },
    [getAutoVariantsForCoord]
  );

  const resolvePoiCoordinate = useCallback(
    (poi: RoutePoiRecord) => {
      if (!poi.variants) return null;
      if (activeVariantLabel && poi.variants[activeVariantLabel]) {
        const placement = getPrimaryPlacement(
          poi.variants[activeVariantLabel] as RoutePoiVariantValue
        );
        if (placement) return { lat: placement.lat, lon: placement.lon };
      }
      const first = Object.values(poi.variants)[0] as RoutePoiVariantValue | undefined;
      const placement = getPrimaryPlacement(first);
      if (!placement) return null;
      return { lat: placement.lat, lon: placement.lon };
    },
    [activeVariantLabel]
  );

  const clearActivePoiSelection = useCallback(() => {
    if (!activePoiId) return false;
    setActivePoiId(null);
    resetForm();
    return true;
  }, [activePoiId, resetForm]);

  const placePoiAtPosition = useCallback(
    async (position: { lat: number; lon: number }) => {
      setMessage(null);
      setError(null);

      if (!activeVariantLabel) {
        setError("Select an active route variant before placing a POI.");
        return false;
      }
      if (!readyToSnap) {
        setError("Select a type and title before placing a POI.");
        return false;
      }
      if (routeVariantGeoms.length === 0) {
        setError("Route data not loaded yet. Wait for the route to render.");
        return false;
      }

      try {
        const poiId = `${slugify(poiType)}-${slugify(poiTitle)}`.slice(0, 80);
        const autoVariants = applyAutoVariantSelection(position);
        const result = await snapRoutePoi(routeGroupId, {
          poi: {
            id: poiId,
            title: poiTitle.trim(),
            type: poiType.trim(),
          },
          click: { lat: position.lat, lon: position.lon },
          variants: autoVariants,
        });

        const updatedPoi = result.poi as RoutePoiRecord;
        setMessage(`POI snapped and saved (${poiId}).`);
        setPoiType("");
        setPoiTitle("");
        setSelectedVariants([]);
        if (updatedPoi) {
          setPois((prev) => {
            const next = prev.filter((poi) => poi.id !== updatedPoi.id);
            return [...next, updatedPoi];
          });
          manualVariantOverrideRef.current.delete(updatedPoi.id);
          setActivePoiId(updatedPoi.id);
        }
        showSnapIndicator(position.lat, position.lon);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to snap POI";
        setError(msg);
        return false;
      }
    },
    [
      activeVariantLabel,
      applyAutoVariantSelection,
      poiType,
      poiTitle,
      readyToSnap,
      routeGroupId,
      routeVariantGeoms.length,
      showSnapIndicator,
    ]
  );

  const handleMapClick = async (payload: MapClickPayload) => {
    setMessage(null);
    setError(null);
    if (clearActivePoiSelection()) return;
    if (!activeVariantLabel) {
      setError("Select an active route variant before clicking the map.");
      return;
    }
    if (!payload.snap) {
      setError("Route data not loaded yet. Wait for the route to render.");
      return;
    }
    await placePoiAtPosition({ lat: payload.snap.lat, lon: payload.snap.lon });
  };

  const handlePlaceAtDistance = async () => {
    setMessage(null);
    setError(null);
    if (clearActivePoiSelection()) return;
    if (!activeVariantLabel) {
      setError("Select an active route variant before placing by distance.");
      return;
    }
    if (!activeRouteStats) {
      setError("Route data not loaded yet. Wait for the route to render.");
      return;
    }
    if (!placeDistanceMi.trim()) {
      setError("Enter a distance in miles.");
      return;
    }
    const raw = Number(placeDistanceMi);
    if (!Number.isFinite(raw)) {
      setError("Enter a valid mile value.");
      return;
    }
    if (!Number.isFinite(activeRouteStats.totalMiles) || activeRouteStats.totalMiles <= 0) {
      setError("Route distance unavailable.");
      return;
    }

    const clamped = Math.min(Math.max(raw, 0), activeRouteStats.totalMiles);
    if (raw !== clamped) {
      setPlaceDistanceMi(clamped.toFixed(2));
    }

    const result = getCoordinateAtDistance(activeRouteStats, clamped);
    if (!result) {
      setError("Unable to resolve a coordinate for that distance.");
      return;
    }

    const placed = await placePoiAtPosition({ lat: result.lat, lon: result.lon });
    if (placed) {
      setMapFocus({
        lat: result.lat,
        lon: result.lon,
        zoom: 14,
        id: `distance-${Date.now()}`,
      });
    }
  };

  const handlePoiSelect = (poiId: string) => {
    setActivePoiId(poiId);
    console.log("POI_SELECTED", { poiId, routeGroupId, variant: activeVariantLabel || null });
  };

  const handleRecalculateVariants = async () => {
    if (!activePoiId) return;
    const target = pois.find((poi) => poi.id === activePoiId);
    if (!target) return;
    if (routeVariantGeoms.length === 0) {
      setError("Route data not loaded yet. Wait for the route to render.");
      return;
    }
    const coord = resolvePoiCoordinate(target);
    if (!coord) {
      setError("Selected POI is missing coordinates.");
      return;
    }

    try {
      const autoVariants = applyAutoVariantSelection(coord);
      const result = await snapRoutePoi(routeGroupId, {
        poi: {
          id: target.id,
          title: target.title,
          type: target.type,
        },
        click: { lat: coord.lat, lon: coord.lon },
        variants: autoVariants,
      });
      const updatedPoi = result.poi as RoutePoiRecord;
      if (updatedPoi) {
        setPois((prev) =>
          prev.map((poi) => (poi.id === updatedPoi.id ? updatedPoi : poi))
        );
        manualVariantOverrideRef.current.delete(updatedPoi.id);
      }
      setMessage("Variants recalculated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to recalculate variants";
      setError(msg);
    }
  };

  const handleEnsureStartFinish = async () => {
    if (!routeGroupId.trim()) return;
    setMessage(null);
    setError(null);
    try {
      const result = await ensureStartFinishPoi(routeGroupId);
      const nextPois = Array.isArray(result.pois) ? (result.pois as RoutePoiRecord[]) : [];
      setPois(nextPois);
      setActivePoiId(null);
      setMessage("Start / Finish POI ensured.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to ensure Start / Finish POI";
      setError(msg);
    }
  };

  const handlePoiRowFocus = (poi: RoutePoiRecord) => {
    handlePoiSelect(poi.id);
    const placementValue =
      (activeVariantLabel && (poi.variants?.[activeVariantLabel] as RoutePoiVariantValue)) ||
      (poi.variants ? (Object.values(poi.variants)[0] as RoutePoiVariantValue) : undefined);
    const placement = getPrimaryPlacement(placementValue);
    if (!placement) return;
    setMapFocus({
      lat: placement.lat,
      lon: placement.lon,
      zoom: 14,
      id: `poi-${poi.id}-${Date.now()}`,
    });
  };

  const handlePoiDragEnd = async (poiId: string, position: { lat: number; lon: number }) => {
    if (!canDragPois || !routeGroupId.trim()) return;
    if (!activeVariantLabel) return;
    const target = pois.find((poi) => poi.id === poiId);
    if (!target) return;
    if (target.system || target.locked) return;
    if (routeVariantGeoms.length === 0) {
      setError("Route data not loaded yet. Wait for the route to render.");
      return;
    }

    try {
      const autoVariants = applyAutoVariantSelection(position);
      const result = await snapRoutePoi(routeGroupId, {
        poi: {
          id: target.id,
          title: target.title,
          type: target.type,
        },
        click: { lat: position.lat, lon: position.lon },
        variants: autoVariants,
      });
      const updatedPoi = result.poi as RoutePoiRecord;
      if (updatedPoi) {
        setPois((prev) =>
          prev.map((poi) => (poi.id === updatedPoi.id ? updatedPoi : poi))
        );
        manualVariantOverrideRef.current.delete(updatedPoi.id);
      }
      setMessage(`POI moved (${poiId}).`);
      console.log("POI_MOVED", {
        poiId,
        routeGroupId,
        variant: activeVariantLabel || null,
        lat: position.lat,
        lon: position.lon,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to move POI";
      setError(msg);
    }
  };

  const handleDeletePoi = useCallback(async () => {
    if (!activePoiId) return;
    if (!routeGroupId.trim()) {
      setError("Select a route group before deleting a POI.");
      return;
    }
    setMessage(null);
    setError(null);

    const target = pois.find((poi) => poi.id === activePoiId);
    const expectedCount = Math.max(0, pois.length - 1);

    try {
      const result = await deleteRoutePoi(routeGroupId, activePoiId);
      const nextPois = Array.isArray(result.pois)
        ? (result.pois as RoutePoiRecord[])
        : [];
      setPois(nextPois);
      setActivePoiId(null);
      resetForm();

      if (nextPois.length !== expectedCount) {
        console.warn("POI_DELETE_MISMATCH", {
          routeGroupId,
          poiId: activePoiId,
          expectedCount,
          actualCount: nextPois.length,
        });
      }

      if (target) {
        setMessage(`POI deleted (${target.id}).`);
        console.log("POI_DELETED", { poiId: target.id, routeGroupId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete POI";
      setError(msg);
    }
  }, [activePoiId, pois, resetForm, routeGroupId]);

  const handleCopyCueSheet = async () => {
    if (!cueSheetText) {
      setError("No cue sheet entries to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(cueSheetText);
      setMessage("Cue sheet copied to clipboard.");
      console.log("CUE_SHEET_EXPORTED", { routeGroupId, format: "text" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to copy cue sheet";
      setError(msg);
    }
  };

  const handleExportCueSheet = () => {
    const payload = cueSheetRows.map((row) => ({
      poiId: row.poiId,
      name: row.name,
      type: row.type,
      distanceMi: row.distanceMi,
      etaMinutes: row.etaMinutes,
      etaLabel: row.etaLabel,
      deltaMi: row.deltaMi,
      deltaEta: row.deltaEtaLabel || null,
    }));
    const json = JSON.stringify(
      { routeGroupId, variant: activeVariantLabel || null, entries: payload },
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${routeGroupId || "route"}-cue-sheet.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    console.log("CUE_SHEET_EXPORTED", { routeGroupId, format: "json" });
  };

  const controls = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setViewMode("authoring")}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            border: viewMode === "authoring" ? "1px solid #4b6bff" : "1px solid #2b2b2b",
            background: viewMode === "authoring" ? "#1a2240" : "#0b0f17",
            color: "#f5f5f5",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Authoring
        </button>
        <button
          type="button"
          onClick={() => setViewMode("cue")}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            border: viewMode === "cue" ? "1px solid #4b6bff" : "1px solid #2b2b2b",
            background: viewMode === "cue" ? "#1a2240" : "#0b0f17",
            color: "#f5f5f5",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Cue Sheet
        </button>
      </div>

      <h3 style={{ color: "#f5f5f5", marginBottom: "0.75rem" }}>
        {viewMode === "cue" ? "Cue Sheet" : "POI Authoring"}
      </h3>

      <div style={{ display: "grid", gap: "0.5rem", maxWidth: controlsMaxWidth, marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.85rem", color: "#999999" }}>
          Active Route (viewer toggle)
        </label>
        <select
          value={activeVariant}
          onChange={(e) => setActiveVariant(e.target.value as RouteLabel | "")}
          style={{ padding: "0.5rem", border: "1px solid #2b2b2b" }}
        >
          <option value="">Select variant</option>
          {availableVariants.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#7e8798" }}>Basemap</span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {(["clean", "topo"] as const).map((option) => {
              const isActive = basemap === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBasemap(option)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "999px",
                    border: isActive ? "1px solid #4b6bff" : "1px solid #2b2b2b",
                    background: isActive ? "#1a2240" : "#0b0f17",
                    color: "#f5f5f5",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === "authoring" ? (
        <div style={{ display: "grid", gap: "0.75rem", maxWidth: authoringMaxWidth }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999" }}>POI Type</label>
            <select
              value={poiType}
              onChange={(e) => {
                const value = e.target.value;
                setPoiType(value);
                if (activePoiId) {
                  setPois((prev) =>
                    prev.map((poi) =>
                      poi.id === activePoiId ? { ...poi, type: value } : poi
                    )
                  );
                }
              }}
              disabled={isActivePoiLocked}
              style={{ padding: "0.5rem", border: "1px solid #2b2b2b" }}
            >
              <option value="">Select type</option>
              {POI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999" }}>Title</label>
            <input
              value={poiTitle}
              onChange={(e) => {
                const value = e.target.value;
                setPoiTitle(value);
                if (activePoiId) {
                  setPois((prev) =>
                    prev.map((poi) =>
                      poi.id === activePoiId ? { ...poi, title: value } : poi
                    )
                  );
                }
              }}
              disabled={isActivePoiLocked}
              style={{ padding: "0.5rem", border: "1px solid #2b2b2b" }}
              placeholder="Mitchell Canyon Aid"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999" }}>Variants</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {variantOptions.map((label) => {
                const isEditing = Boolean(activePoiId);
                const isSelected = selectedVariants.includes(label);
                const isDisabled = (isEditing && !isSelected) || isActivePoiLocked;
                return (
                  <label
                    key={label}
                    style={{ display: "flex", gap: "0.4rem", opacity: isDisabled ? 0.5 : 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleVariantToggle(label)}
                      disabled={isDisabled}
                    />
                    <span style={{ color: "#f5f5f5" }}>{label}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleRecalculateVariants}
                disabled={!activePoiId || routeVariantGeoms.length === 0 || isActivePoiLocked}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #2b2b2b",
                  background:
                    !activePoiId || routeVariantGeoms.length === 0 || isActivePoiLocked
                      ? "#131a2a"
                      : "#0f1522",
                  color: "#f5f5f5",
                  cursor:
                    !activePoiId || routeVariantGeoms.length === 0 || isActivePoiLocked
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Recalculate variants
              </button>
              <button
                type="button"
                onClick={handleEnsureStartFinish}
                disabled={!routeGroupId.trim() || routeVariantGeoms.length === 0}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #2b2b2b",
                  background:
                    !routeGroupId.trim() || routeVariantGeoms.length === 0
                      ? "#131a2a"
                      : "#0f1522",
                  color: "#f5f5f5",
                  cursor:
                    !routeGroupId.trim() || routeVariantGeoms.length === 0
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Add Start / Finish
              </button>
              {variantAssignmentNote && (
                <span style={{ fontSize: "0.75rem", color: "#7e8798" }}>
                  {variantAssignmentNote}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999" }}>
              Place POI at mile
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={placeDistanceMi}
                onChange={(e) => setPlaceDistanceMi(e.target.value)}
                disabled={isActivePoiLocked}
                style={{ padding: "0.5rem", border: "1px solid #2b2b2b", flex: 1 }}
                placeholder={maxDistanceMi ? `0 - ${maxDistanceMi.toFixed(2)}` : "e.g. 12.5"}
              />
              <button
                type="button"
                onClick={handlePlaceAtDistance}
                disabled={!readyToSnap || !activeVariantLabel || isActivePoiLocked}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #2b2b2b",
                  background:
                    !readyToSnap || !activeVariantLabel || isActivePoiLocked
                      ? "#131a2a"
                      : "#0f1522",
                  color: "#f5f5f5",
                  cursor:
                    !readyToSnap || !activeVariantLabel || isActivePoiLocked
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Place
              </button>
            </div>
            {maxDistanceMi !== null && (
              <div style={{ fontSize: "0.75rem", color: "#666" }}>
                Route range: 0.00 - {maxDistanceMi.toFixed(2)} mi
              </div>
            )}
          </div>

          {activePoiId && (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <div style={{ fontSize: "0.85rem", color: "#999999" }}>POI Hits</div>
                {activePoi?.variants &&
                Object.keys(activePoi.variants).length > 0 ? (
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    {Object.entries(activePoi.variants)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([label, value]) => {
                        const placements = asPlacements(value as RoutePoiVariantValue);
                        if (placements.length === 0) {
                          return (
                            <div key={`${activePoi.id}-${label}`} style={{ color: "#94a3b8" }}>
                              {label}: no placements
                            </div>
                          );
                        }
                        return (
                          <div key={`${activePoi.id}-${label}`} style={{ color: "#e2e8f0" }}>
                            <div style={{ fontWeight: 600 }}>{label}</div>
                            <div style={{ display: "grid", gap: "0.2rem", marginLeft: "0.5rem" }}>
                              {placements.map((placement, index) => {
                                const passIndex = placement.passIndex ?? index;
                                const distanceLabel = Number.isFinite(placement.distanceMi)
                                  ? `${placement.distanceMi.toFixed(2)} mi`
                                  : "n/a";
                                const directionLabel = placement.direction
                                  ? ` (${placement.direction})`
                                  : "";
                                const isStartFinish =
                                  activePoi?.id === "start-finish" ||
                                  activePoi?.type === "start-finish";
                                let passLabel = `Pass ${passIndex + 1}`;
                                if (isStartFinish) {
                                  if (passIndex === 0) {
                                    passLabel = "Start";
                                  } else if (passIndex === placements.length - 1) {
                                    passLabel = "Finish";
                                  }
                                }
                                return (
                                  <div key={`${activePoi.id}-${label}-${passIndex}`}>
                                    {passLabel}: {distanceLabel}
                                    {directionLabel}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ color: "#666" }}>No variants yet.</div>
                )}
              </div>
              <button
                type="button"
                onClick={handleDeletePoi}
                disabled={isActivePoiLocked}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #3a1a1a",
                  background: isActivePoiLocked ? "#1f2937" : "#2a1212",
                  color: isActivePoiLocked ? "#9ca3af" : "#ffb4b4",
                  cursor: isActivePoiLocked ? "not-allowed" : "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {isActivePoiLocked ? "System POI (locked)" : "Delete POI"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleCopyCueSheet}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #2b2b2b",
                background: "#0f1522",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Copy as Text
            </button>
            <button
              type="button"
              onClick={handleExportCueSheet}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #2b2b2b",
                background: "#0f1522",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Export JSON
            </button>
          </div>

          {!activeVariantLabel && (
            <div style={{ color: "#999999", fontSize: "0.85rem" }}>
              Select an active variant to view the cue sheet.
            </div>
          )}

          {activeVariantLabel && cueSheetRows.length === 0 && (
            <div style={{ color: "#666", fontSize: "0.85rem" }}>
              No cue sheet entries yet.
            </div>
          )}

          {activeVariantLabel && cueSheetRows.length > 0 && (
            <table style={{ width: "100%", fontSize: "0.8rem", color: "#f5f5f5" }}>
              <thead>
                <tr>
                  <th align="left">POI Name</th>
                  <th align="left">Type</th>
                  <th align="left">Distance (mi)</th>
                  <th align="left">ETA ({activeVariantLabel})</th>
                  <th align="left">Delta from previous</th>
                </tr>
              </thead>
              <tbody>
                {cueSheetRows.map((row) => (
                  <tr key={row.poiId}>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>{row.distanceMi.toFixed(2)}</td>
                    <td>{row.etaLabel}</td>
                    <td>
                      {row.deltaMi === null
                        ? "-"
                        : `+${row.deltaMi.toFixed(2)} mi / +${row.deltaEtaLabel}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  const existingPois = viewMode === "authoring" ? (
    <div>
      <div style={{ color: "#999999", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Existing POIs
      </div>
      {pois.length === 0 ? (
        <div style={{ color: "#666", fontSize: "0.8rem" }}>No POIs yet.</div>
      ) : (
        <table style={{ width: "100%", fontSize: "0.8rem", color: "#f5f5f5" }}>
          <thead>
            <tr>
              <th align="left">warn</th>
              <th align="left">id</th>
              <th align="left">type</th>
              <th align="left">title</th>
              <th align="left">variants</th>
              <th align="left">distanceMi</th>
              {variantOptions.map((label) => (
                <th key={`eta-${label}`} align="left">
                  ETA {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pois.map((poi) => {
              const variants = poi.variants ? Object.keys(poi.variants).sort() : [];
              const variantSummaries = variants.map((label) => {
                const value = poi.variants?.[label] as RoutePoiVariantValue | undefined;
                const placements = asPlacements(value);
                const isStartFinish = poi.id === "start-finish" || poi.type === "start-finish";
                if (placements.length > 1) {
                  if (isStartFinish) {
                    const sorted = [...placements].sort(
                      (a, b) => (a.distanceMi ?? 0) - (b.distanceMi ?? 0)
                    );
                    const finish = sorted[sorted.length - 1];
                    const finishLabel =
                      finish && Number.isFinite(finish.distanceMi)
                        ? `finish (${finish.distanceMi.toFixed(2)} mi)`
                        : "finish";
                    const midLabels = sorted.slice(1, -1).map((placement, index) => {
                      const distanceLabel = Number.isFinite(placement.distanceMi)
                        ? `${placement.distanceMi.toFixed(2)} mi`
                        : "n/a";
                      return `pass ${index + 2} (${distanceLabel})`;
                    });
                    const segments = ["start", ...midLabels, finishLabel].join(", ");
                    return `${label} - ${segments}`;
                  }
                  const distances = placements
                    .map((entry) =>
                      Number.isFinite(entry.distanceMi) ? entry.distanceMi.toFixed(2) : "n/a"
                    )
                    .join(", ");
                  return `${label} - ${placements.length} passes (${distances} mi)`;
                }
                const single = placements[0];
                const distanceLabel =
                  single && Number.isFinite(single.distanceMi)
                    ? `${single.distanceMi.toFixed(2)} mi`
                    : "n/a";
                return `${label} - ${distanceLabel}`;
              });
              const distanceMi = variantSummaries.join(" | ");
              const warnings = poiWarnings[poi.id] ?? [];
              const warningText = warnings.join("\n");
              const etas = poiEtas[poi.id] ?? {};
              const isRowHovered = hoveredRowPoiId === poi.id;
              return (
                <tr
                  key={poi.id}
                  onClick={() => handlePoiRowFocus(poi)}
                  onMouseEnter={() => setHoveredRowPoiId(poi.id)}
                  onMouseLeave={() =>
                    setHoveredRowPoiId((prev) => (prev === poi.id ? null : prev))
                  }
                  style={{
                    background:
                      poi.id === activePoiId
                        ? "#162033"
                        : isRowHovered
                          ? "#111827"
                          : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <td>
                    {warnings.length > 0 && (
                      <span
                        title={warningText}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          background: "#facc15",
                          color: "#1f2937",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                        }}
                      >
                        !
                      </span>
                    )}
                  </td>
                  <td>{poi.id}</td>
                  <td>{poi.type}</td>
                  <td>
                    <span>{poi.title}</span>
                    {poi.system && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "999px",
                          fontSize: "0.65rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          background: "#1f2937",
                          color: "#f9fafb",
                          border: "1px solid #374151",
                        }}
                      >
                        SYSTEM
                      </span>
                    )}
                  </td>
                  <td>{variants.join(", ")}</td>
                  <td>{distanceMi}</td>
                  {variantOptions.map((label) => (
                    <td key={`${poi.id}-eta-${label}`}>
                      {etas[label]?.etaLabel ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  ) : null;

  const viewer = (
    <div style={{ marginTop: isSplit ? 0 : "1rem" }}>
      {viewMode === "authoring" && (
        <div style={{ color: "#999999", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Click the route preview to place a POI.
        </div>
      )}
      <div
        style={{
          border: "1px solid #2b2b2b",
          background: "#0b0b0b",
          cursor:
            viewMode === "authoring"
              ? readyToSnap
                ? "crosshair"
                : activePoiId
                  ? "default"
                  : "not-allowed"
              : "default",
        }}
      >
        <SimpleRouteMap
          routeGroupId={routeGroupId}
          variant={previewVariant}
          variants={variantOptions}
          pois={pois}
          poiWarnings={poiWarnings}
          poiEtas={poiEtas}
          activePoiId={activePoiId}
          allowPoiDrag={canDragPois && viewMode === "authoring" && !isActivePoiLocked}
          basemap={basemap}
          enableHoverHud={viewMode === "authoring"}
          height={resolvedMapHeight}
          onRouteData={handleRouteData}
          focusTarget={mapFocus}
          highlightedPoiId={hoveredRowPoiId}
          snapIndicator={snapIndicator}
          onMapClick={viewMode === "authoring" ? handleMapClick : undefined}
          onPoiSelect={handlePoiSelect}
          onPoiDragEnd={handlePoiDragEnd}
        />
      </div>

      {isSplit && (
        <div
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          <div>{controls}</div>
          <div>{existingPois}</div>
        </div>
      )}

      {message && (
        <div style={{ marginTop: "0.75rem", color: "#4ade80" }}>{message}</div>
      )}
      {error && (
        <div style={{ marginTop: "0.75rem", color: "#ff9999" }}>{error}</div>
      )}

      {!isSplit && existingPois && <div style={{ marginTop: "1rem" }}>{existingPois}</div>}
    </div>
  );

  if (isSplit) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div>{viewer}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {sidebarContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      {controls}
      {viewer}
    </div>
  );
}
