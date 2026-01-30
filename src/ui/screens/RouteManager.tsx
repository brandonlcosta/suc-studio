import { useState, useCallback, useMemo, useEffect } from "react";
import DropZone from "../components/DropZone";
import RouteCard from "../components/RouteCard";
import type { StagedRoute, RouteLabel, RouteGroupSummary } from "../types";
import { importGPX, saveRouteGroup, listRouteGroups } from "../utils/api";
import { labelForRank } from "../utils/routeLabels";

export default function RouteManager() {
  const [routes, setRoutes] = useState<StagedRoute[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingGroups, setExistingGroups] = useState<RouteGroupSummary[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Form state
  const [routeGroupId, setRouteGroupId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const orderedRoutes = useMemo(
    () => [...routes].sort((a, b) => a.distanceMi - b.distanceMi),
    [routes]
  );

  useEffect(() => {
    let isMounted = true;
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      setGroupsError(null);
      try {
        const groups = await listRouteGroups();
        if (isMounted) {
          setExistingGroups(groups);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load routes";
        console.error("[Studio] Failed to load route groups:", err);
        if (isMounted) {
          setGroupsError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
        }
      }
    };

    loadGroups();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    const newRoutes: StagedRoute[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const parsed = await importGPX(file);
        const gpxContent = await file.text();

        newRoutes.push({
          ...parsed,
          id: crypto.randomUUID(),
          label: "MED", // Will be reassigned
          gpxContent,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${file.name}: ${message}`);
      }
    }

    setRoutes((prev) => {
      const merged = [...prev, ...newRoutes];
      if (merged.length === 0) return merged;

      // Rank by distance and assign labels
      const ranked = [...merged].sort((a, b) => a.distanceMi - b.distanceMi);
      const labelById = new Map(
        ranked.map((route, idx) => [route.id, labelForRank(idx, ranked.length)])
      );

      return merged.map((route) => ({
        ...route,
        label: labelById.get(route.id) ?? route.label,
      }));
    });

    setIsProcessing(false);

    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
  }, []);

  const handleLabelChange = useCallback((id: string, label: RouteLabel) => {
    setRoutes((prev) =>
      prev.map((route) => (route.id === id ? { ...route, label } : route))
    );
  }, []);

  const handleClear = useCallback(() => {
    setRoutes([]);
    setError(null);
    setSuccess(null);
  }, []);

  const handleSave = useCallback(async () => {
    // Validate
    if (!routeGroupId.trim()) {
      setError("Route Group ID is required");
      return;
    }
    if (!routeName.trim()) {
      setError("Route Name is required");
      return;
    }
    if (!location.trim()) {
      setError("Location is required");
      return;
    }
    if (routes.length === 0) {
      setError("At least one route is required");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await saveRouteGroup(routeGroupId, {
        name: routeName,
        location,
        source: "SUC",
        notes,
        variants: routes.map((route) => ({
          label: route.label,
          gpxContent: route.gpxContent,
        })),
      });

      setSuccess(`Route group ${routeGroupId} saved successfully!`);

      // Clear form
      setRoutes([]);
      setRouteGroupId("");
      setRouteName("");
      setLocation("");
      setNotes("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [routeGroupId, routeName, location, notes, routes]);

  // Empty state
  if (routes.length === 0) {
    return (
      <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>Route Manager</h1>
        <p style={{ color: "#666", marginBottom: "2rem" }}>
          Import GPX files to create route groups
        </p>

        <DropZone onFilesSelected={handleFilesSelected} disabled={isProcessing} />

        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Existing Route Groups</h3>
          {isLoadingGroups && (
            <div style={{ color: "#4CAF50" }}>Loading routes...</div>
          )}
          {groupsError && (
            <div style={{ color: "#c62828", whiteSpace: "pre-wrap" }}>
              {groupsError}
            </div>
          )}
          {!isLoadingGroups && !groupsError && existingGroups.length === 0 && (
            <div style={{ color: "#666" }}>No route groups found.</div>
          )}
          {existingGroups.length > 0 && (
            <pre
              style={{
                background: "#f3f4f6",
                padding: "0.75rem",
                borderRadius: "4px",
                overflowX: "auto",
                fontSize: "0.85rem",
              }}
            >
              {JSON.stringify(existingGroups, null, 2)}
            </pre>
          )}
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

        {success && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#e8f5e9",
              borderRadius: "4px",
              color: "#2e7d32",
            }}
          >
            {success}
          </div>
        )}
      </div>
    );
  }

  // With routes: two-column layout
  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
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
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Routes ({routes.length})</h2>
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
        </div>

        <DropZone onFilesSelected={handleFilesSelected} disabled={isProcessing} />

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

        {success && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#e8f5e9",
              borderRadius: "4px",
              color: "#2e7d32",
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <strong>Existing Route Groups</strong>
            {isLoadingGroups && (
              <div style={{ marginTop: "0.5rem", color: "#4CAF50" }}>
                Loading routes...
              </div>
            )}
            {groupsError && (
              <div style={{ marginTop: "0.5rem", color: "#c62828" }}>
                {groupsError}
              </div>
            )}
            {!isLoadingGroups && !groupsError && existingGroups.length === 0 && (
              <div style={{ marginTop: "0.5rem", color: "#666" }}>
                No route groups found.
              </div>
            )}
            {existingGroups.length > 0 && (
              <pre
                style={{
                  marginTop: "0.5rem",
                  background: "#f3f4f6",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  overflowX: "auto",
                  fontSize: "0.8rem",
                }}
              >
                {JSON.stringify(existingGroups, null, 2)}
              </pre>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {orderedRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onLabelChange={handleLabelChange}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Route Group Form */}
      <div
        style={{
          flex: 1,
          height: "100%",
          overflowY: "auto",
          padding: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem" }}>Route Group Details</h2>

        <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555", fontWeight: "500" }}>
              Route Group ID *
            </label>
            <input
              value={routeGroupId}
              onChange={(e) => setRouteGroupId(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
              placeholder="SUC-034"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555", fontWeight: "500" }}>
              Route Name *
            </label>
            <input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
              placeholder="To Hell and Back"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555", fontWeight: "500" }}>
              Location *
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "1rem",
              }}
              placeholder="Mount Diablo"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555", fontWeight: "500" }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minHeight: "100px",
                fontSize: "1rem",
              }}
              placeholder="Optional notes about this route group"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isProcessing}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: isProcessing ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              marginTop: "1rem",
            }}
          >
            {isProcessing ? "Saving..." : "Save Route Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
