import { useCallback, useEffect, useState } from "react";
import type { RouteLabel } from "../types";
import { LABELS } from "../utils/routeLabels";
import {
  getRouteGroup,
  getRoutePois,
  snapRoutePoi,
} from "../utils/api";
import SimpleRouteMap from "./SimpleRouteMap";

const POI_TYPES = ["aid", "water", "summit", "fork", "hazard", "viewpoint"];
const ROUTE_LABELS = new Set<RouteLabel>(LABELS);

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

interface RoutePoiPanelProps {
  routeGroupId: string;
}

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

export default function RoutePoiPanel({ routeGroupId }: RoutePoiPanelProps) {
  const [poiType, setPoiType] = useState("");
  const [poiTitle, setPoiTitle] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<RouteLabel[]>([]);
  const [availableVariants, setAvailableVariants] = useState<RouteLabel[]>(LABELS);
  const [activeVariant, setActiveVariant] = useState<RouteLabel | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<RoutePoiRecord[]>([]);
  const [activePoiId, setActivePoiId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setPoiType("");
    setPoiTitle("");
    setSelectedVariants([]);
  }, []);

  const variantOptions = availableVariants.length > 0 ? availableVariants : LABELS;
  const activeVariantLabel = variantOptions.includes(activeVariant as RouteLabel)
    ? (activeVariant as RouteLabel)
    : "";
  const previewVariant = activeVariantLabel || undefined;
  const canDragPois = Boolean(activeVariantLabel);

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
    selectedVariants.length > 0 &&
    !activePoiId;

  const handleMapClick = async (lat: number, lon: number) => {
    setMessage(null);
    setError(null);
    if (activePoiId) {
      setActivePoiId(null);
      resetForm();
      return;
    }
    if (!readyToSnap) {
      setError("Select a type, title, and at least one variant before clicking the map.");
      return;
    }

    try {
      const poiId = `${slugify(poiType)}-${slugify(poiTitle)}`.slice(0, 80);
      const result = await snapRoutePoi(routeGroupId, {
        poi: {
          id: poiId,
          title: poiTitle.trim(),
          type: poiType.trim(),
        },
        click: { lat, lon },
        variants: selectedVariants,
      });

      setMessage(`POI snapped and saved (${poiId}).`);
      setPoiType("");
      setPoiTitle("");
      setSelectedVariants([]);
      setPois(Array.isArray(result.pois) ? (result.pois as RoutePoiRecord[]) : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to snap POI";
      setError(msg);
    }
  };

  const handlePoiSelect = (poiId: string) => {
    setActivePoiId(poiId);
    console.log("POI_SELECTED", { poiId, routeGroupId, variant: activeVariantLabel || null });
  };

  const handlePoiDragEnd = async (poiId: string, position: { lat: number; lon: number }) => {
    if (!canDragPois || !routeGroupId.trim()) return;
    const target = pois.find((poi) => poi.id === poiId);
    if (!target) return;
    const variantsToSnap = Object.keys(target.variants ?? {})
      .filter(isRouteLabel)
      .filter((label) => variantOptions.includes(label));
    if (variantsToSnap.length === 0) {
      setError("Selected POI has no variants to snap.");
      return;
    }

    try {
      const result = await snapRoutePoi(routeGroupId, {
        poi: {
          id: target.id,
          title: target.title,
          type: target.type,
        },
        click: { lat: position.lat, lon: position.lon },
        variants: variantsToSnap,
      });
      setPois(Array.isArray(result.pois) ? (result.pois as RoutePoiRecord[]) : []);
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

  const handleDeletePoi = () => {
    if (!activePoiId) return;
    const target = pois.find((poi) => poi.id === activePoiId);
    setPois((prev) => prev.filter((poi) => poi.id !== activePoiId));
    setActivePoiId(null);
    resetForm();
    if (target) {
      setMessage(`POI deleted (${target.id}).`);
      console.log("POI_DELETED", { poiId: target.id, routeGroupId });
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ color: "#f5f5f5", marginBottom: "0.75rem" }}>POI Authoring</h3>

      <div style={{ display: "grid", gap: "0.75rem", maxWidth: "600px" }}>
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
              const isDisabled = isEditing && !isSelected;
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
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
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
        </div>

        {activePoiId && (
          <div>
            <button
              type="button"
              onClick={handleDeletePoi}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #3a1a1a",
                background: "#2a1212",
                color: "#ffb4b4",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Delete POI
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ color: "#999999", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Click the route preview to place a POI.
        </div>
        <div
          style={{
            border: "1px solid #2b2b2b",
            background: "#0b0b0b",
            cursor: readyToSnap ? "crosshair" : activePoiId ? "default" : "not-allowed",
          }}
        >
          <SimpleRouteMap
            routeGroupId={routeGroupId}
            variant={previewVariant}
            pois={pois}
            activePoiId={activePoiId}
            allowPoiDrag={canDragPois}
            onMapClick={handleMapClick}
            onPoiSelect={handlePoiSelect}
            onPoiDragEnd={handlePoiDragEnd}
          />
        </div>
      </div>

      {message && (
        <div style={{ marginTop: "0.75rem", color: "#4ade80" }}>{message}</div>
      )}
      {error && (
        <div style={{ marginTop: "0.75rem", color: "#ff9999" }}>{error}</div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <div style={{ color: "#999999", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Existing POIs
        </div>
        {pois.length === 0 ? (
          <div style={{ color: "#666", fontSize: "0.8rem" }}>No POIs yet.</div>
        ) : (
          <table style={{ width: "100%", fontSize: "0.8rem", color: "#f5f5f5" }}>
            <thead>
              <tr>
                <th align="left">id</th>
                <th align="left">type</th>
                <th align="left">title</th>
                <th align="left">variants</th>
                <th align="left">distanceMi</th>
              </tr>
            </thead>
            <tbody>
              {pois.map((poi) => {
                const variants = poi.variants ? Object.keys(poi.variants).sort() : [];
                const distanceMi = variants
                  .map((label) => {
                    const value = poi.variants?.[label]?.distanceMi;
                    return `${label}:${typeof value === "number" ? value.toFixed(2) : "n/a"}`;
                  })
                  .join(", ");
                return (
                  <tr key={poi.id} style={{ background: poi.id === activePoiId ? "#162033" : "transparent" }}>
                    <td>{poi.id}</td>
                    <td>{poi.type}</td>
                    <td>{poi.title}</td>
                    <td>{variants.join(", ")}</td>
                    <td>{distanceMi}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
