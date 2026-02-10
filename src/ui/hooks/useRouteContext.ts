import { useEffect, useMemo, useState } from "react";
import type { RouteLabel } from "../types";
import { getRouteGroup, getRoutePois, getRouteVariantPreview } from "../utils/api";
import type { RoutePoiMarker, TrackPoint } from "../components/route-context/routeContextTypes";

type RouteContextState = {
  status: "idle" | "loading" | "ready" | "error";
  track: TrackPoint[];
  pois: RoutePoiMarker[];
  variant: RouteLabel | null;
  error?: string;
};

const pickCandidateVariants = (
  variants: RouteLabel[],
  preferred?: RouteLabel[] | null
): RouteLabel[] => {
  if (preferred && preferred.length > 0) {
    const filtered = preferred.filter((variant) => variants.includes(variant));
    if (filtered.length > 0) return filtered;
  }
  if (variants.includes("MED")) return ["MED", ...variants.filter((variant) => variant !== "MED")];
  return [...variants];
};

// Preview-only loader: DO NOT compute metrics or persist geometry here.
export default function useRouteContext(routeId: string | null, preferredVariants?: RouteLabel[] | null) {
  const [state, setState] = useState<RouteContextState>({
    status: "idle",
    track: [],
    pois: [],
    variant: null,
  });

  const routeKey = useMemo(() => routeId?.trim() ?? "", [routeId]);

  useEffect(() => {
    if (!routeKey) {
      setState({ status: "idle", track: [], pois: [], variant: null });
      return;
    }

    let isMounted = true;
    setState((prev) => ({ ...prev, status: "loading", error: undefined }));

    const load = async () => {
      try {
        const routeGroup = await getRouteGroup(routeKey);
        const variants = Array.isArray(routeGroup?.variants) ? routeGroup.variants : [];
        const candidates = pickCandidateVariants(variants, preferredVariants);
        if (candidates.length === 0) {
          throw new Error("No route variants available.");
        }

        const previewResults = await Promise.all(
          candidates.map(async (variant) => {
            const preview = await getRouteVariantPreview(routeKey, variant);
            const coords = Array.isArray(preview.coords) ? preview.coords : [];
            return { variant, preview, length: coords.length };
          })
        );
        const best = previewResults.reduce((acc, entry) => {
          if (!acc || entry.length > acc.length) return entry;
          return acc;
        }, null as null | typeof previewResults[number]);

        if (!best || best.length === 0) {
          throw new Error("Route preview unavailable.");
        }

        const [poisResult] = await Promise.all([getRoutePois(routeKey)]);
        const preview = best.preview;

        const coords = Array.isArray(preview.coords) ? preview.coords : [];
        const elevations = Array.isArray(preview.elevations) ? preview.elevations : [];
        const track: TrackPoint[] = coords.map((coord, index) => ({
          lon: coord[0],
          lat: coord[1],
          ele: Number.isFinite(elevations[index]) ? elevations[index] : null,
        }));

        const pois = Array.isArray(poisResult.pois)
          ? (poisResult.pois as RoutePoiMarker[])
          : [];

        if (!isMounted) return;
        setState({ status: "ready", track, pois, variant: best.variant });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load route context.";
        if (!isMounted) return;
        setState({ status: "error", track: [], pois: [], variant: null, error: message });
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [routeKey, preferredVariants]);

  return state;
}
