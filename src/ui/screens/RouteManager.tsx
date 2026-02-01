import { useState, useCallback, useMemo, useEffect } from "react";
import DropZone from "../components/DropZone";
import RouteCard from "../components/RouteCard";
import RoutePoiPanel from "../components/RoutePoiPanel";
import type { ParsedRoute, StagedRoute, RouteLabel, RouteGroupSummary } from "../types";
import {
  importGPX,
  saveRouteGroup,
  listRouteGroups,
  getRouteVariantPreview,
  deleteRouteGroup,
  deleteRouteVariant,
  getRouteGroup,
} from "../utils/api";
import { ROUTE_COLORS, labelForRank } from "../utils/routeLabels";

const VARIANT_LABELS: RouteLabel[] = ["MED", "LRG", "XL", "XXL"];

function normalizeVariant(label: string): RouteLabel {
  return String(label).toUpperCase() as RouteLabel;
}

function vertDifficulty(ft: number): string {
  if (!Number.isFinite(ft)) return "n/a";
  if (ft < 1500) return "low";
  if (ft < 3000) return "med";
  return "high";
}

export default function RouteManager() {
  const [routes, setRoutes] = useState<StagedRoute[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingGroups, setExistingGroups] = useState<RouteGroupSummary[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [libraryStats, setLibraryStats] = useState<
    Record<string, Partial<Record<RouteLabel, ParsedRoute>>>
  >({});
  const [libraryErrors, setLibraryErrors] = useState<Record<string, string>>({});

  // Form state
  const [activeRouteGroupId, setActiveRouteGroupId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const orderedRoutes = useMemo(
    () => [...routes].sort((a, b) => a.distanceMi - b.distanceMi),
    [routes]
  );

  const activeRouteGroup = useMemo(
    () =>
      existingGroups.find((group) => group.routeGroupId === activeRouteGroupId) ??
      null,
    [existingGroups, activeRouteGroupId]
  );

  useEffect(() => {
    if (!activeRouteGroupId) {
      setRouteName("");
      setLocation("");
      setNotes("");
      return;
    }

    const summary = existingGroups.find(
      (group) => group.routeGroupId === activeRouteGroupId
    );
    if (!summary) {
      setRouteName("");
      setLocation("");
      setNotes("");
      return;
    }

    setRouteName(summary.name ?? "");
    setLocation(summary.location ?? "");

    getRouteGroup(activeRouteGroupId)
      .then((meta) => {
        setRouteName(meta?.name ?? "");
        setLocation(meta?.location ?? "");
        setNotes(meta?.notes ?? "");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load route metadata";
        setGroupsError(msg);
      });
  }, [activeRouteGroupId, existingGroups]);

  useEffect(() => {
    let isMounted = true;
    if (existingGroups.length === 0) {
      setLibraryStats({});
      setLibraryErrors({});
      return () => {
        isMounted = false;
      };
    }

    const loadStats = async () => {
      const nextStats: Record<string, Partial<Record<RouteLabel, ParsedRoute>>> = {};
      const nextErrors: Record<string, string> = {};

      await Promise.all(
        existingGroups.map(async (group) => {
          const groupId = group.routeGroupId;
          const variants = Array.from(
            new Set((group.variants ?? []).map(normalizeVariant))
          );

          await Promise.all(
            variants.map(async (label) => {
              try {
                const parsed = await getRouteVariantPreview(groupId, label);
                if (!nextStats[groupId]) nextStats[groupId] = {};
                nextStats[groupId][label] = parsed;
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : "Failed to load preview";
                nextErrors[`${groupId}-${label}`] = msg;
              }
            })
          );
        })
      );

      if (isMounted) {
        setLibraryStats((prev) => ({ ...prev, ...nextStats }));
        setLibraryErrors((prev) => ({ ...prev, ...nextErrors }));
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [existingGroups]);

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

  const appendRoute = useCallback((parsed: ParsedRoute, label: RouteLabel) => {
    setRoutes((prev) => {
      const exists = prev.some(
        (route) => route.fileName === parsed.fileName && route.label === label
      );
      if (exists) return prev;
      return [
        ...prev,
        {
          ...parsed,
          id: crypto.randomUUID(),
          label,
          gpxContent: "",
        },
      ];
    });
  }, []);

  const handleAddVariant = useCallback(
    async (groupId: string, label: RouteLabel) => {
      const existing = libraryStats[groupId]?.[label];
      if (existing) {
        appendRoute(existing, label);
        return;
      }
      try {
        const parsed = await getRouteVariantPreview(groupId, label);
        appendRoute(parsed, label);
        setLibraryStats((prev) => ({
          ...prev,
          [groupId]: { ...prev[groupId], [label]: parsed },
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load preview";
        setLibraryErrors((prev) => ({
          ...prev,
          [`${groupId}-${label}`]: msg,
        }));
      }
    },
    [appendRoute, libraryStats]
  );

  const handleDuplicateGroup = useCallback(
    async (group: RouteGroupSummary) => {
      const variants = Array.from(
        new Set((group.variants ?? []).map(normalizeVariant))
      );
      await Promise.all(variants.map((label) => handleAddVariant(group.routeGroupId, label)));
    },
    [handleAddVariant]
  );

  const handleDeleteRouteGroup = useCallback(
    async (groupId: string) => {
      const ok = window.confirm(`Delete route group ${groupId}? This cannot be undone.`);
      if (!ok) return;
      try {
        await deleteRouteGroup(groupId);
        setExistingGroups((prev) => prev.filter((group) => group.routeGroupId !== groupId));
        setLibraryStats((prev) => {
          const next = { ...prev };
          delete next[groupId];
          return next;
        });
        if (activeRouteGroupId === groupId) {
          setActiveRouteGroupId(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete route group";
        setGroupsError(msg);
      }
    },
    [activeRouteGroupId]
  );

  const handleDeleteVariant = useCallback(
    async (groupId: string, label: RouteLabel) => {
      const ok = window.confirm(`Delete ${groupId} ${label} variant?`);
      if (!ok) return;
      try {
        const updated = await deleteRouteVariant(groupId, label);
        setExistingGroups((prev) =>
          prev.map((group) =>
            group.routeGroupId === groupId ? { ...group, variants: updated.variants } : group
          )
        );
        setLibraryStats((prev) => ({
          ...prev,
          [groupId]: { ...prev[groupId], [label]: undefined },
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete route variant";
        setGroupsError(msg);
      }
    },
    []
  );

  const routeLibrary = (
    <aside
      style={{
        width: "320px",
        minWidth: "320px",
        maxWidth: "320px",
        background: "#0b0f17",
        borderRight: "1px solid #1f2734",
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ color: "#f5f5f5", fontSize: "1rem", fontWeight: 600 }}>
          Load Routes
        </div>
        <div style={{ color: "#7e8798", fontSize: "0.75rem" }}>
          Add existing variants into the working group.
        </div>
      </div>

      {isLoadingGroups && <div style={{ color: "#4ade80" }}>Loading routes...</div>}
      {groupsError && <div style={{ color: "#ff9999" }}>{groupsError}</div>}

      {!isLoadingGroups && existingGroups.length === 0 && (
        <div style={{ color: "#7e8798" }}>No route groups found.</div>
      )}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {existingGroups.map((group) => {
          const stats = libraryStats[group.routeGroupId] ?? {};
          const isActive = activeRouteGroupId === group.routeGroupId;
          return (
            <div
              key={group.routeGroupId}
              style={{
                border: isActive ? "1px solid #4b6bff" : "1px solid #1f2734",
                borderRadius: "8px",
                background: "#0f1522",
                padding: "0.75rem",
                boxShadow: isActive ? "0 0 0 1px rgba(75, 107, 255, 0.4)" : "none",
                cursor: "pointer",
              }}
              onClick={() => setActiveRouteGroupId(group.routeGroupId)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ color: "#f5f5f5", fontWeight: 600 }}>
                    {group.routeGroupId}
                  </div>
                  <div style={{ color: "#7e8798", fontSize: "0.75rem" }}>
                    {group.name || group.location || "Route group"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDuplicateGroup(group);
                    }}
                    style={{
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.7rem",
                      borderRadius: "4px",
                      border: "1px solid #2b2b2b",
                      background: "#131a2a",
                      color: "#cbd5f5",
                      cursor: "pointer",
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteRouteGroup(group.routeGroupId);
                    }}
                    style={{
                      padding: "0.2rem 0.4rem",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "1px solid #3a1a1a",
                      background: "#2a1212",
                      color: "#ffb4b4",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "0.5rem",
                }}
              >
                {VARIANT_LABELS.map((label) => {
                  const hasVariant = (group.variants ?? [])
                    .map(normalizeVariant)
                    .includes(label);
                  const preview = stats[label];
                  const errorKey = `${group.routeGroupId}-${label}`;
                  const accent = ROUTE_COLORS[label];
                  return (
                    <div
                      key={label}
                      style={{
                        border: "1px solid #1f2734",
                        borderRadius: "6px",
                        padding: "0.4rem 0.55rem",
                        background: hasVariant ? "#111a2b" : "#0b0f17",
                        opacity: hasVariant ? 1 : 0.5,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {hasVariant && preview && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                fontSize: "0.7rem",
                                color: "#9aa3b2",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "999px",
                                  background: `${accent}22`,
                                  color: accent,
                                  fontWeight: 600,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {label}
                              </span>
                              <span>{preview.distanceMi.toFixed(1)} mi</span>
                              <span>{preview.elevationFt.toFixed(0)} ft</span>
                              <span>{vertDifficulty(preview.elevationFt)}</span>
                            </div>
                          )}
                          {hasVariant && !preview && (
                            <div style={{ fontSize: "0.7rem", color: "#5b6472" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "999px",
                                  background: `${accent}22`,
                                  color: accent,
                                  fontWeight: 600,
                                  letterSpacing: "0.02em",
                                  marginRight: "0.4rem",
                                }}
                              >
                                {label}
                              </span>
                              {libraryErrors[errorKey] ? "preview error" : "loading…"}
                            </div>
                          )}
                          {!hasVariant && (
                            <div style={{ fontSize: "0.7rem", color: "#5b6472" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "999px",
                                  background: `${accent}22`,
                                  color: accent,
                                  fontWeight: 600,
                                  letterSpacing: "0.02em",
                                  marginRight: "0.4rem",
                                }}
                              >
                                {label}
                              </span>
                              missing
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {hasVariant && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteVariant(group.routeGroupId, label);
                              }}
                              style={{
                                border: "1px solid #3a1a1a",
                                background: "#2a1212",
                                color: "#ffb4b4",
                                borderRadius: "4px",
                                fontSize: "0.65rem",
                                padding: "0.15rem 0.35rem",
                                cursor: "pointer",
                              }}
                            >
                              delete
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={!hasVariant}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddVariant(group.routeGroupId, label);
                            }}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: "1px solid #2b2b2b",
                              background: hasVariant ? "#1b2436" : "#0b0f17",
                              color: "#9aa3b2",
                              cursor: hasVariant ? "pointer" : "not-allowed",
                              fontSize: "0.8rem",
                            }}
                            title="Add variant to current routes"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );

  const handleClear = useCallback(() => {
    setRoutes([]);
    setError(null);
    setSuccess(null);
  }, []);

  const handleSave = useCallback(async () => {
    // Validate
    const groupId = (activeRouteGroupId ?? "").trim();
    if (!groupId) {
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
    if (!activeRouteGroup && routes.length === 0) {
      setError("At least one route is required");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await saveRouteGroup(groupId, {
        name: routeName,
        location,
        notes,
      });

      const uploadCandidates = routes.filter((route) => route.gpxContent?.trim());
      const uniqueByLabel = new Map<RouteLabel, StagedRoute>();
      for (const route of uploadCandidates) {
        uniqueByLabel.set(route.label, route);
      }

      if (uniqueByLabel.size > 0) {
        const uploadErrors: string[] = [];
        for (const [label, route] of uniqueByLabel.entries()) {
          try {
            const fileName = `${groupId}-${label}.gpx`;
            const file = new File([route.gpxContent], fileName, {
              type: "application/gpx+xml",
            });
            await importGPX(file);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to upload GPX";
            uploadErrors.push(`${label}: ${message}`);
          }
        }

        if (uploadErrors.length > 0) {
          setError(`Failed to upload GPX variants:\n${uploadErrors.join("\n")}`);
        }
      }

      setSuccess(`Route group ${groupId} saved successfully!`);
      setExistingGroups((prev) => {
        const uploadedLabels = Array.from(uniqueByLabel.keys());
        const mergedVariants = Array.from(
          new Set([...(activeRouteGroup?.variants ?? []), ...uploadedLabels])
        );
        const nextGroup: RouteGroupSummary = {
          routeGroupId: groupId,
          name: routeName,
          location,
          variants: mergedVariants,
        };
        const idx = prev.findIndex((group) => group.routeGroupId === groupId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = nextGroup;
          return next;
        }
        return [...prev, nextGroup];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [activeRouteGroupId, activeRouteGroup, routeName, location, notes, routes]);

  // Empty state
  if (routes.length === 0) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0a0e14" }}>
        {routeLibrary}
        <div style={{ flex: 1, padding: "2rem", maxWidth: "900px" }}>
        <h1 style={{ color: "#f5f5f5" }}>Route Manager</h1>
        <p style={{ color: "#999999", marginBottom: "2rem" }}>
          Import GPX files to create route groups
        </p>

        <DropZone onFilesSelected={handleFilesSelected} disabled={isProcessing} />

        {isProcessing && (
          <div style={{ marginTop: "1rem", color: "#4ade80" }}>
            Processing files...
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#2a1a1a",
              borderRadius: "4px",
              color: "#ff9999",
              border: "1px solid #ff5a5a",
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
              backgroundColor: "#1a2e22",
              borderRadius: "4px",
              color: "#4ade80",
              border: "1px solid #16a34a",
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem", color: "#f5f5f5" }}>POI Authoring</h3>
          <div style={{ display: "grid", gap: "0.5rem", maxWidth: "400px" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999", fontWeight: "500" }}>
              Route Group ID
            </label>
            <input
              value={activeRouteGroupId ?? ""}
              onChange={(e) => setActiveRouteGroupId(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #2b2b2b",
                borderRadius: "4px",
                backgroundColor: "#0b0b0b",
                color: "#f5f5f5",
                fontSize: "1rem",
              }}
              placeholder="SUC-034"
            />
          </div>
          <RoutePoiPanel routeGroupId={activeRouteGroup?.routeGroupId ?? ""} />
        </div>
        </div>
      </div>
    );
  }

  // With routes: two-column layout
  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", backgroundColor: "#0a0e14" }}>
      {routeLibrary}
      {/* Left Panel: Controls + Route List */}
      <div
        style={{
          width: "450px",
          height: "100%",
          overflowY: "auto",
          padding: "1.5rem",
          backgroundColor: "#0b0f17",
          borderRight: "1px solid #2a2a2a",
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
          <h2 style={{ fontSize: "1.25rem", margin: 0, color: "#f5f5f5" }}>Routes ({routes.length})</h2>
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
          <div style={{ marginTop: "1rem", color: "#4ade80" }}>
            Processing files...
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: "#2a1a1a",
              borderRadius: "4px",
              color: "#ff9999",
              border: "1px solid #ff5a5a",
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
              backgroundColor: "#1a2e22",
              borderRadius: "4px",
              color: "#4ade80",
              border: "1px solid #16a34a",
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <strong style={{ color: "#f5f5f5" }}>Existing Route Groups</strong>
            {isLoadingGroups && (
              <div style={{ marginTop: "0.5rem", color: "#4ade80" }}>
                Loading routes...
              </div>
            )}
            {groupsError && (
              <div style={{ marginTop: "0.5rem", color: "#ff9999" }}>
                {groupsError}
              </div>
            )}
            {!isLoadingGroups && !groupsError && existingGroups.length === 0 && (
              <div style={{ marginTop: "0.5rem", color: "#999999" }}>
                No route groups found.
              </div>
            )}
            {existingGroups.length > 0 && (
              <pre
                style={{
                  marginTop: "0.5rem",
                  background: "#1a1a1a",
                  color: "#f5f5f5",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  overflowX: "auto",
                  fontSize: "0.8rem",
                  border: "1px solid #2a2a2a",
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
          backgroundColor: "#0a0e14",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "#f5f5f5" }}>Route Group Details</h2>

        <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999", fontWeight: "500" }}>
              Route Group ID *
            </label>
            <input
              value={activeRouteGroupId ?? ""}
              onChange={(e) => setActiveRouteGroupId(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #2b2b2b",
                borderRadius: "4px",
                backgroundColor: "#0b0b0b",
                color: "#f5f5f5",
                fontSize: "1rem",
              }}
              placeholder="SUC-034"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999", fontWeight: "500" }}>
              Route Name *
            </label>
            <input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #2b2b2b",
                borderRadius: "4px",
                backgroundColor: "#0b0b0b",
                color: "#f5f5f5",
                fontSize: "1rem",
              }}
              placeholder="To Hell and Back"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999", fontWeight: "500" }}>
              Location *
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #2b2b2b",
                borderRadius: "4px",
                backgroundColor: "#0b0b0b",
                color: "#f5f5f5",
                fontSize: "1rem",
              }}
              placeholder="Mount Diablo"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#999999", fontWeight: "500" }}>
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
              backgroundColor: isProcessing ? "#1a1a1a" : "#16a34a",
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

        <RoutePoiPanel routeGroupId={activeRouteGroup?.routeGroupId ?? ""} />
      </div>
    </div>
  );
}
