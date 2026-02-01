import { useEffect, useState } from "react";
import type { RouteLabel } from "../types";
import { LABELS } from "../utils/routeLabels";
import {
  getRouteGroup,
  getRoutePois,
  snapRoutePoi,
} from "../utils/api";
import SimpleRouteMap from "./SimpleRouteMap";

const POI_TYPES = ["aid", "water", "summit", "fork", "hazard", "viewpoint"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
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
  const [activeVariant, setActiveVariant] = useState<RouteLabel>("MED");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<RoutePoiRecord[]>([]);
  const previewVariant = activeVariant;

  useEffect(() => {
    let isMounted = true;
    setMessage(null);
    setError(null);

    if (!routeGroupId.trim()) {
      setAvailableVariants([]);
      return;
    }

    getRouteGroup(routeGroupId)
      .then((meta) => {
        const variants = meta?.variants?.length ? meta.variants : LABELS;
        if (!isMounted) return;
        setAvailableVariants(variants);
        setActiveVariant((prev) =>
          variants.includes(prev) ? prev : variants.includes("XL") ? "XL" : variants[0] ?? "MED"
        );
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load route group";
        if (isMounted) {
          setAvailableVariants(LABELS);
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [routeGroupId]);

  useEffect(() => {
    let isMounted = true;
    if (!routeGroupId.trim()) {
      setPois([]);
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

  const handleVariantToggle = (label: RouteLabel) => {
    setSelectedVariants((prev) => {
      if (prev.includes(label)) return prev.filter((item) => item !== label);
      return [...prev, label];
    });
  };

  const readyToSnap =
    routeGroupId.trim().length > 0 &&
    poiType.trim().length > 0 &&
    poiTitle.trim().length > 0 &&
    selectedVariants.length > 0;

  const handleMapClick = async (lat: number, lon: number) => {
    setMessage(null);
    setError(null);
    if (!readyToSnap) {
      setError("Select a type, title, and at least one variant before clicking the map.");
      return;
    }

    try {
      const poiId = `${slugify(poiType)}-${slugify(poiTitle)}`.slice(0, 80);
      await snapRoutePoi(routeGroupId, {
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
      const refreshed = await getRoutePois(routeGroupId);
      setPois(Array.isArray(refreshed.pois) ? refreshed.pois : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to snap POI";
      setError(msg);
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
            onChange={(e) => setPoiType(e.target.value)}
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
            onChange={(e) => setPoiTitle(e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #2b2b2b" }}
            placeholder="Mitchell Canyon Aid"
          />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#999999" }}>Variants</label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {LABELS.map((label) => (
              <label key={label} style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={selectedVariants.includes(label)}
                  onChange={() => handleVariantToggle(label)}
                />
                <span style={{ color: "#f5f5f5" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#999999" }}>
            Active Route (viewer toggle)
          </label>
          <select
            value={activeVariant}
            onChange={(e) => setActiveVariant(e.target.value as RouteLabel)}
            style={{ padding: "0.5rem", border: "1px solid #2b2b2b" }}
          >
            {availableVariants.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ color: "#999999", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Click the route preview to place a POI.
        </div>
        <div
          style={{
            border: "1px solid #2b2b2b",
            background: "#0b0b0b",
            cursor: readyToSnap ? "crosshair" : "not-allowed",
          }}
        >
          <SimpleRouteMap routeGroupId={routeGroupId} />
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
                  <tr key={poi.id}>
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
