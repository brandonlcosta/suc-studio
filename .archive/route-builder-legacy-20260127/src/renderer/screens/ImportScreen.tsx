import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import DropZone from "../components/DropZone";
import RoutePreviewMap from "../components/RoutePreviewMap";
import { parseGPXFile, parseGPXText } from "../utils/gpxParser";
import { RouteLabel, StagedRoute } from "../types";
import { createRoute } from "../utils/createRoute";

const ROUTE_COLORS: Record<RouteLabel, string> = {
  MED: "#00FF99",
  LRG: "#13FFE2",
  XL: "#FF47A1",
  XXL: "#9B4DFF",
};

const LABELS: RouteLabel[] = ["MED", "LRG", "XL", "XXL"];

function labelForRank(index: number, total: number): RouteLabel {
  if (total <= 1) return "MED";
  if (total === 2) return index === 0 ? "MED" : "XXL";
  if (total === 3) return index === 0 ? "MED" : index === 2 ? "XXL" : "LRG";
  if (total === 4) return LABELS[index];
  const lastIndex = total - 1;
  if (index === 0) return "MED";
  if (index === lastIndex) return "XXL";
  const midpoint = Math.floor(total / 2);
  return index < midpoint ? "LRG" : "XL";
}

function inferLabel(fileName: string): RouteLabel {
  const upper = fileName.toUpperCase();
  if (upper.includes("XXL")) return "XXL";
  if (upper.includes("XL")) return "XL";
  if (upper.includes("LRG") || upper.includes("LARGE")) return "LRG";
  return "MED";
}

interface ImportScreenProps {
  routes: StagedRoute[];
  setRoutes: Dispatch<SetStateAction<StagedRoute[]>>;
  onContinue: () => void;
  onOpenCompiler: () => void;
  eventId: string;
}

export default function ImportScreen({
  routes,
  setRoutes,
  onContinue,
  onOpenCompiler,
  eventId,
}: ImportScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderedRoutes = useMemo(
    () => [...routes].sort((a, b) => a.distanceMi - b.distanceMi),
    [routes]
  );

  const ingestPath = async (filePath: string) => {
    if (!eventId) {
      throw new Error("Cannot ingest GPX without eventId");
    }
    const label = inferLabel(filePath);
    const result = await window.electron.invoke("ingest-gpx", {
      tempPath: filePath,
      eventId,
      label,
    });
    if (!result?.sourcePath) {
      throw new Error("GPX ingestion failed: no sourcePath returned");
    }
    const xmlText = await window.electron.invoke("read-gpx-file", filePath);
    const parsed = parseGPXText(
      xmlText,
      filePath.split(/[\\/]/).pop() ?? filePath
    );
    const route = createRoute({
      id: crypto.randomUUID?.() ?? `route-${Date.now()}-${Math.random()}`,
      fileName: parsed.fileName,
      coords: parsed.coords,
      elevations: parsed.elevations,
      distanceMi: parsed.distanceMi,
      elevationFt: parsed.elevationFt,
      label,
      origin: {
        kind: "source",
        sourcePath: result.sourcePath,
      },
    });
    if (route.origin.kind === "source" && !route.origin.sourcePath) {
      throw new Error("Invariant violation: source route missing sourcePath");
    }
    return route;
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);

    const newRoutes: StagedRoute[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const filePath = (file as File & { path?: string }).path ?? "";
        if (!filePath) {
          throw new Error("Cannot ingest GPX without file.path");
        }
        const route = await ingestPath(filePath);
        newRoutes.push(route);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${file.name}: ${message}`);
      }
    }

    setRoutes((prev) => {
      const merged = [...prev, ...newRoutes];
      if (merged.length === 0) return merged;

      if (prev.length === 0) {
        const ranked = [...merged].sort((a, b) => a.distanceMi - b.distanceMi);
        const labelById = new Map(
          ranked.map((route, idx) => [route.id, labelForRank(idx, ranked.length)])
        );
        return merged.map((route) => ({
          ...route,
          label: labelById.get(route.id) ?? route.label,
        }));
      }

      const newIds = new Set(newRoutes.map((route) => route.id));
      const ranked = [...merged].sort((a, b) => a.distanceMi - b.distanceMi);
      const labelById = new Map(
        ranked.map((route, idx) => [route.id, labelForRank(idx, ranked.length)])
      );
      return merged.map((route) =>
        newIds.has(route.id)
          ? { ...route, label: labelById.get(route.id) ?? route.label }
          : route
      );
    });
    setIsProcessing(false);

    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
  };

  const handlePathsSelected = async (paths: string[]) => {
    setIsProcessing(true);
    setError(null);

    const newRoutes: StagedRoute[] = [];
    const errors: string[] = [];

    for (const filePath of paths) {
      try {
        if (!eventId) {
          throw new Error("Cannot ingest GPX without eventId");
        }
        const label = inferLabel(filePath);
        const route = await ingestPath(filePath);
        newRoutes.push(route);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${filePath}: ${message}`);
      }
    }

    setRoutes((prev) => {
      const merged = [...prev, ...newRoutes];
      if (merged.length === 0) return merged;

      if (prev.length === 0) {
        const ranked = [...merged].sort((a, b) => a.distanceMi - b.distanceMi);
        const labelById = new Map(
          ranked.map((route, idx) => [route.id, labelForRank(idx, ranked.length)])
        );
        return merged.map((route) => ({
          ...route,
          label: labelById.get(route.id) ?? route.label,
        }));
      }

      const newIds = new Set(newRoutes.map((route) => route.id));
      const ranked = [...merged].sort((a, b) => a.distanceMi - b.distanceMi);
      const labelById = new Map(
        ranked.map((route, idx) => [route.id, labelForRank(idx, ranked.length)])
      );
      return merged.map((route) =>
        newIds.has(route.id)
          ? { ...route, label: labelById.get(route.id) ?? route.label }
          : route
      );
    });
    setIsProcessing(false);

    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
  };

  const handleClear = () => {
    setRoutes([]);
    setError(null);
  };

  const handleLabelChange = (id: string, label: RouteLabel) => {
    setRoutes((prev) =>
      prev.map((route) => (route.id === id ? { ...route, label } : route))
    );
  };

  // Empty state: centered import only
  if (routes.length === 0) {
    return (
      <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>SUC Route Builder</h1>
        <p style={{ color: "#666", marginBottom: "2rem" }}>
          Import GPX files to create routes
        </p>

        <DropZone
          onFilesSelected={handleFilesSelected}
          onPathsSelected={handlePathsSelected}
        />

        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={onOpenCompiler}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Event Compiler
          </button>
        </div>

        {isProcessing && (
          <div style={{ marginTop: "1rem", color: "#4CAF50" }}>
            Processing files...
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#ffebee",
              borderRadius: "4px",
              color: "#c62828",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // With routes: two-column layout
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left Panel: Controls + Route List */}
      <div
        style={{
          width: "450px",
          height: "100%",
          overflowY: "auto",
          padding: "1.5rem",
          backgroundColor: "#f5f5f5",
          borderRight: "1px solid #ddd",
        }}
      >
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>
            SUC Route Builder
          </h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleClear}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Clear All
            </button>
            <button
              onClick={onContinue}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#1f2937",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Event Builder
            </button>
            <button
              onClick={onOpenCompiler}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#111827",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Event Compiler
            </button>
          </div>
        </div>

        <DropZone
          onFilesSelected={handleFilesSelected}
          onPathsSelected={handlePathsSelected}
        />

        {isProcessing && (
          <div style={{ marginTop: "1rem", color: "#4CAF50" }}>
            Processing files...
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#ffebee",
              borderRadius: "4px",
              color: "#c62828",
              whiteSpace: "pre-wrap",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
            Routes ({routes.length})
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {orderedRoutes.map((route) => {
              const color = ROUTE_COLORS[route.label];
              const distanceKm = route.distanceMi * 1.609344;
              const elevationM = route.elevationFt / 3.28084;
              return (
              <div
                key={route.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  {route.fileName}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {route.label}
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    {LABELS.map((label) => {
                      const selected = label === route.label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleLabelChange(route.id, label)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.7rem",
                            borderRadius: "4px",
                            border: `1px solid ${selected ? color : "#ccc"}`,
                            backgroundColor: selected ? color : "#fff",
                            color: selected ? "#0b0b0b" : "#555",
                            cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div>
                    <div style={{ color: "#666", fontSize: "0.75rem" }}>Distance</div>
                    <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                      {route.distanceMi.toFixed(2)} mi
                      <span style={{ color: "#999", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                        ({distanceKm.toFixed(2)} km)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#666", fontSize: "0.75rem" }}>Elevation</div>
                    <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                      {route.elevationFt.toFixed(0)} ft
                      <span style={{ color: "#999", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                        ({elevationM.toFixed(0)} m)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#666", fontSize: "0.75rem" }}>Points</div>
                    <div style={{ fontSize: "0.875rem" }}>
                      {route.coords.length.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* Right Panel: Map */}
      <div style={{ flex: 1, height: "100%", backgroundColor: "#000" }}>
        <RoutePreviewMap routes={orderedRoutes} />
      </div>
    </div>
  );
}
