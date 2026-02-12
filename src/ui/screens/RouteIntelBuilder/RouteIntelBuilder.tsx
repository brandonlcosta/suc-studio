import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Event,
  RouteGroupSummary,
  RouteIntelDoc,
  RouteIntelRoute,
  RouteLabel,
} from "../../types";
import {
  listRouteGroups,
  loadEventsMaster,
  listRouteIntel,
  saveRouteIntel,
  deleteRouteIntel,
} from "../../utils/api";
import { validateRouteIntel, toErrorMap } from "../../utils/validation";
import type { ValidationError } from "../../utils/validation";
import useRouteContext from "../../hooks/useRouteContext";
import RouteMapPreview from "../../components/route-context/RouteMapPreview";
import RouteElevationPreview from "../../components/route-context/RouteElevationPreview";
import type { RoutePoiMarker } from "../../components/route-context/routeContextTypes";

const createEmptyRoute = (): RouteIntelRoute => ({
  routeId: "",
  distanceVariantIds: [],
  sectionMode: "all-poi",
  enabledPoiIds: undefined,
});

const createEmptyIntel = (): RouteIntelDoc => {
  const now = new Date().toISOString();
  return {
    id: "",
    type: "route-intel",
    eventId: "",
    routes: [],
    visibility: "private",
    publish: true,
    createdAt: now,
    updatedAt: now,
  };
};

type SectionPreview = {
  fromPoiId: string | null;
  toPoiId: string | null;
  fromLabel: string;
  toLabel: string;
  startDistanceMi: number;
  endDistanceMi: number;
  distanceMi: number;
  elevationGainFt: number;
};

type PreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  sections: SectionPreview[];
  error?: string;
};

const emptyPreview: PreviewState = { status: "idle", sections: [] };

function formatMiles(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "-";
  return Number(value).toFixed(1);
}

function formatFeet(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(Number(value))}`;
}

function buildPreviewUrl(routeId: string, route: RouteIntelRoute) {
  const params = new URLSearchParams();
  params.set("sectionMode", route.sectionMode === "race" ? "race" : "all-poi");
  if (Array.isArray(route.enabledPoiIds)) {
    params.set("enabledPoiIds", route.enabledPoiIds.join(","));
  }
  const query = params.toString();
  return `/api/internal/route-intel/preview/${routeId}${query ? `?${query}` : ""}`;
}

export default function RouteIntelBuilder() {
  const [items, setItems] = useState<RouteIntelDoc[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [routeGroups, setRouteGroups] = useState<RouteGroupSummary[]>([]);
  const [draft, setDraft] = useState<RouteIntelDoc | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationDetails, setValidationDetails] = useState<ValidationError[]>([]);

  const eventOptions = useMemo(() => events, [events]);
  const routeOptions = useMemo(() => routeGroups, [routeGroups]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [intelItems, routesList, eventsMaster] = await Promise.all([
        listRouteIntel(),
        listRouteGroups(),
        loadEventsMaster(),
      ]);
      setItems(intelItems);
      setRouteGroups(routesList);
      setEvents(eventsMaster.events);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load Route Intel: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const startNew = useCallback(() => {
    setDraft(createEmptyIntel());
    setActiveRouteId(null);
    setPreviews({});
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setValidationDetails([]);
  }, []);

  const startEdit = useCallback((item: RouteIntelDoc) => {
    setDraft({ ...item });
    setActiveRouteId(item.routes[0]?.routeId ?? null);
    setPreviews({});
    setError(null);
    setSuccess(null);
    setValidationErrors({});
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(`Delete route intel ${id}?`)) return;
      setError(null);
      setSuccess(null);
      try {
        await deleteRouteIntel(id);
        await refreshData();
        if (draft?.id === id) {
          setDraft(null);
          setActiveRouteId(null);
        }
        setSuccess(`Deleted route intel ${id}.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to delete: ${message}`);
      }
    },
    [draft?.id, refreshData]
  );

  const setDraftField = useCallback((updates: Partial<RouteIntelDoc>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const updateRoute = useCallback((index: number, updates: Partial<RouteIntelRoute>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextRoutes = prev.routes.map((route, i) =>
        i === index ? { ...route, ...updates } : route
      );
      return { ...prev, routes: nextRoutes };
    });
  }, []);

  const addRoute = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextRoute = createEmptyRoute();
      const next = { ...prev, routes: [...prev.routes, nextRoute] };
      return next;
    });
  }, []);

  const removeRoute = useCallback(
    (index: number) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const nextRoutes = prev.routes.filter((_route, i) => i !== index);
        return { ...prev, routes: nextRoutes };
      });
      setActiveRouteId((prev) => {
        if (!draft) return prev;
        const removed = draft.routes[index];
        if (!removed) return prev;
        if (prev === removed.routeId) {
          return draft.routes.find((route, i) => i !== index)?.routeId ?? null;
        }
        return prev;
      });
    },
    [draft]
  );

  const loadPreview = useCallback(async (route: RouteIntelRoute) => {
    if (!route.routeId) return;
    setPreviews((prev) => ({
      ...prev,
      [route.routeId]: { status: "loading", sections: [] },
    }));
    try {
      const response = await fetch(buildPreviewUrl(route.routeId, route));
      if (!response.ok) {
        throw new Error(`Preview failed with ${response.status}`);
      }
      const data = (await response.json()) as { sections?: SectionPreview[] };
      const sections = Array.isArray(data.sections) ? data.sections : [];
      setPreviews((prev) => ({
        ...prev,
        [route.routeId]: { status: "ready", sections },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Preview unavailable";
      setPreviews((prev) => ({
        ...prev,
        [route.routeId]: { status: "error", sections: [], error: message },
      }));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setValidationErrors({});

    const now = new Date().toISOString();
    const payload: RouteIntelDoc = {
      ...draft,
      createdAt: draft.createdAt || now,
      updatedAt: now,
      publish: draft.publish !== false,
    };

    const validation = validateRouteIntel(payload);
    if (!validation.ok) {
      setIsSaving(false);
      setValidationErrors(toErrorMap(validation.errors));
      setValidationDetails(validation.errors);
      setError("Route Intel validation failed. Fix the highlighted fields.");
      return;
    }

    try {
      await saveRouteIntel(payload);
      await refreshData();
      setDraft(payload);
      setSuccess("Route Intel saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save Route Intel: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [draft, refreshData]);

  const activeRoute = useMemo(() => {
    if (!draft || !activeRouteId) return null;
    return draft.routes.find((route) => route.routeId === activeRouteId) ?? null;
  }, [draft, activeRouteId]);

  const activeRouteIndex = useMemo(() => {
    if (!draft || !activeRouteId) return null;
    return draft.routes.findIndex((route) => route.routeId === activeRouteId);
  }, [draft, activeRouteId]);

  const preferredVariants = useMemo<RouteLabel[] | null>(() => {
    if (!activeRoute?.distanceVariantIds?.length) return null;
    return activeRoute.distanceVariantIds
      .map((variant) => String(variant).toUpperCase())
      .filter((variant): variant is RouteLabel =>
        variant === "MED" || variant === "LRG" || variant === "XL" || variant === "XXL"
      );
  }, [activeRoute?.distanceVariantIds]);

  const routeContext = useRouteContext(activeRoute?.routeId ?? null, preferredVariants);

  const activePreview = useMemo(() => {
    if (!activeRoute) return emptyPreview;
    return previews[activeRoute.routeId] ?? emptyPreview;
  }, [activeRoute, previews]);

  useEffect(() => {
    if (!activeRoute || !activeRoute.routeId) return;
    loadPreview(activeRoute);
  }, [
    activeRoute?.routeId,
    activeRoute?.sectionMode,
    activeRoute?.enabledPoiIds?.join("|"),
    loadPreview,
  ]);

  const boundaryPoiIds = useMemo(() => {
    const ids = new Set<string>();
    if (activePreview.status !== "ready") return ids;
    for (const section of activePreview.sections) {
      if (section.toPoiId) ids.add(section.toPoiId);
    }
    return ids;
  }, [activePreview]);

  const allPois = useMemo<RoutePoiMarker[]>(() => {
    return Array.isArray(routeContext.pois) ? routeContext.pois : [];
  }, [routeContext.pois]);

  const enabledPoiIds = useMemo(() => {
    if (Array.isArray(activeRoute?.enabledPoiIds)) {
      return new Set(activeRoute.enabledPoiIds);
    }
    if (boundaryPoiIds.size > 0) return new Set(boundaryPoiIds);
    return new Set(allPois.map((poi) => poi.id));
  }, [activeRoute?.enabledPoiIds, boundaryPoiIds, allPois]);

  const showZeroPoiWarning = useMemo(() => {
    if (!activeRoute) return false;
    return enabledPoiIds.size === 0;
  }, [activeRoute, enabledPoiIds]);

  const showRaceSectionWarning = useMemo(() => {
    if (!activeRoute || activeRoute.sectionMode !== "race") return false;
    if (activePreview.status !== "ready") return false;
    return activePreview.sections.length < 2;
  }, [activeRoute, activePreview]);


  const togglePoi = useCallback(
    (poiId: string) => {
      if (activeRouteIndex == null) return;
      const next = new Set(enabledPoiIds);
      if (next.has(poiId)) {
        next.delete(poiId);
      } else {
        next.add(poiId);
      }
      updateRoute(activeRouteIndex, { enabledPoiIds: Array.from(next) });
    },
    [activeRouteIndex, enabledPoiIds, updateRoute]
  );

  const clearPoiOverrides = useCallback(() => {
    if (activeRouteIndex == null) return;
    updateRoute(activeRouteIndex, { enabledPoiIds: undefined });
  }, [activeRouteIndex, updateRoute]);

  const handleExportMedia = useCallback((item: RouteIntelDoc) => {
    const firstRoute = item.routes[0];
    if (!firstRoute?.routeId) {
      setError("Cannot export: No route configured for this Route Intel.");
      return;
    }
    const broadcastUrl = import.meta.env.VITE_BROADCAST_URL || "http://localhost:5175";
    const exportUrl = `${broadcastUrl}/api/media/route-intel/${item.id}/${firstRoute.routeId}/carousel`;
    window.open(exportUrl, "_blank");
  }, []);
  if (isLoading) {
    return (
      <div style={{ padding: "2rem", backgroundColor: "#0a0e14", minHeight: "100%" }}>
        <div>Loading Route Intel...</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={{ padding: "2rem", backgroundColor: "#0a0e14", minHeight: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ margin: 0, color: "#f5f5f5" }}>Route Intel</h2>
          <button
            onClick={startNew}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Create Route Intel
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#2a1a1a",
              borderRadius: "4px",
              color: "#ff9999",
              border: "1px solid #ff5a5a",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginBottom: "1rem",
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

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#999999" }}>
            No Route Intel documents yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #2a2a2a",
                  borderRadius: "6px",
                  backgroundColor: "#1a1a1a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "1.1rem", color: "#f5f5f5", marginBottom: "0.35rem" }}>
                      {item.id || "(untitled)"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#999999" }}>
                      Event: {item.eventId || "-"} | Routes: {item.routes.length}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => startEdit(item)}
                      style={{
                        padding: "0.45rem 0.8rem",
                        borderRadius: "4px",
                        border: "1px solid #3a3a3a",
                        backgroundColor: "#111111",
                        color: "#f5f5f5",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Edit
                    </button>
                    {item.publish !== false && item.routes.length > 0 && (
                      <button
                        onClick={() => handleExportMedia(item)}
                        title="Export carousel slides"
                        style={{
                          padding: "0.45rem 0.8rem",
                          borderRadius: "4px",
                          border: "1px solid #60a5fa",
                          backgroundColor: "#111111",
                          color: "#60a5fa",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        Export
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: "0.45rem 0.8rem",
                        borderRadius: "4px",
                        border: "1px solid #ff5a5a",
                        backgroundColor: "#111111",
                        color: "#ff5a5a",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ padding: "2rem", backgroundColor: "#0a0e14", minHeight: "100%", color: "#f5f5f5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Route Intel Builder</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setDraft(null)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "4px",
              border: "1px solid #3a3a3a",
              backgroundColor: "#111111",
              color: "#f5f5f5",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "4px",
              border: "1px solid #16a34a",
              backgroundColor: isSaving ? "#0f3f22" : "#16a34a",
              color: "#f5f5f5",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            borderRadius: "6px",
            backgroundColor: "#2a1a1a",
            color: "#ff9999",
            border: "1px solid #ff5a5a",
          }}
        >
          {error}
          {validationDetails.length > 0 && (
            <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.25rem" }}>
              {validationDetails.map((detail, index) => (
                <div key={`${detail.field}-${index}`} style={{ fontSize: "0.75rem", color: "#ffb4b4" }}>
                  {detail.field}: {detail.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            borderRadius: "6px",
            backgroundColor: "#1a2e22",
            color: "#4ade80",
            border: "1px solid #16a34a",
          }}
        >
          {success}
        </div>
      )}

      <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Route Intel ID</label>
          <input
            value={draft.id}
            onChange={(e) => setDraftField({ id: e.target.value })}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #2b2b2b",
              backgroundColor: "#0b0b0b",
              color: "#f5f5f5",
            }}
          />
          {validationErrors.id && (
            <div style={{ color: "#ff9c9c", fontSize: "0.75rem" }}>{validationErrors.id}</div>
          )}
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Event</label>
          <select
            value={draft.eventId}
            onChange={(e) => setDraftField({ eventId: e.target.value })}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #2b2b2b",
              backgroundColor: "#0b0b0b",
              color: "#f5f5f5",
            }}
          >
            <option value="">Select event</option>
            {eventOptions.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.eventName || event.eventId}
              </option>
            ))}
          </select>
          {validationErrors.eventId && (
            <div style={{ color: "#ff9c9c", fontSize: "0.75rem" }}>{validationErrors.eventId}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Visibility</label>
            <select
              value={draft.visibility}
              onChange={(e) => setDraftField({ visibility: e.target.value as RouteIntelDoc["visibility"] })}
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #2b2b2b",
                backgroundColor: "#0b0b0b",
                color: "#f5f5f5",
              }}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Publish</label>
            <button
              onClick={() => setDraftField({ publish: draft.publish === false ? true : false })}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #3a3a3a",
                backgroundColor: draft.publish === false ? "#2a1212" : "#1a2e22",
                color: draft.publish === false ? "#ffb4b4" : "#4ade80",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {draft.publish === false ? "Unpublished" : "Published"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Routes</h3>
          <button
            onClick={addRoute}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "4px",
              border: "1px solid #3a3a3a",
              backgroundColor: "#111111",
              color: "#f5f5f5",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Add Route
          </button>
        </div>

        {draft.routes.length === 0 ? (
          <div style={{ color: "#999999" }}>No routes yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {draft.routes.map((route, index) => {
              const routeGroup = routeOptions.find((r) => r.routeGroupId === route.routeId) ?? null;
              const preview = previews[route.routeId] ?? emptyPreview;
              return (
                <div
                  key={`${route.routeId || "route"}-${index}`}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "8px",
                    padding: "1rem",
                    backgroundColor: "#0c111c",
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Route</label>
                      <select
                        value={route.routeId}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateRoute(index, {
                            routeId: value,
                            distanceVariantIds: [],
                            enabledPoiIds: undefined,
                          });
                          setActiveRouteId(value || null);
                        }}
                        style={{
                          width: "100%",
                          marginTop: "0.4rem",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #2b2b2b",
                          backgroundColor: "#0b0b0b",
                          color: "#f5f5f5",
                        }}
                      >
                        <option value="">Select a route group</option>
                        {routeOptions.map((option) => (
                          <option key={option.routeGroupId} value={option.routeGroupId}>
                            {option.routeGroupId} - {option.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <button
                        onClick={() => setActiveRouteId(route.routeId)}
                        disabled={!route.routeId}
                        style={{
                          padding: "0.4rem 0.75rem",
                          borderRadius: "4px",
                          border: "1px solid #3a3a3a",
                          backgroundColor:
                            activeRouteId === route.routeId ? "#1f2937" : "#111111",
                          color: "#f5f5f5",
                          cursor: route.routeId ? "pointer" : "not-allowed",
                          fontSize: "0.8rem",
                        }}
                      >
                        {activeRouteId === route.routeId ? "Editing" : "Edit"}
                      </button>
                      <button
                        onClick={() => removeRoute(index)}
                        style={{
                          padding: "0.4rem 0.75rem",
                          borderRadius: "4px",
                          border: "1px solid #ff5a5a",
                          backgroundColor: "#111111",
                          color: "#ff5a5a",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Distance Variants</label>
                    {routeGroup?.variants?.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {routeGroup.variants.map((variant) => {
                          const selected = route.distanceVariantIds.includes(variant);
                          return (
                            <button
                              key={variant}
                              type="button"
                              onClick={() => {
                                const next = selected
                                  ? route.distanceVariantIds.filter((id) => id !== variant)
                                  : [...route.distanceVariantIds, variant];
                                updateRoute(index, { distanceVariantIds: next });
                              }}
                              style={{
                                padding: "0.35rem 0.75rem",
                                fontSize: "0.75rem",
                                borderRadius: "999px",
                                border: `1px solid ${selected ? "#16a34a" : "#3a3a3a"}`,
                                backgroundColor: selected ? "#1a2e22" : "#111111",
                                color: selected ? "#4ade80" : "#f5f5f5",
                                cursor: "pointer",
                              }}
                            >
                              {variant}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: "#999999", fontSize: "0.8rem" }}>
                        Select a route to load variants.
                      </div>
                    )}
                  </div>

                  {preview.status === "error" && (
                    <div style={{ color: "#ff9999", fontSize: "0.8rem" }}>
                      Preview error: {preview.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>Section Builder</h3>
        {!activeRoute ? (
          <div style={{ color: "#999999" }}>Select a route to edit its sectioning.</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div
              style={{
                border: "1px solid #1f2937",
                borderRadius: "10px",
                padding: "12px",
                backgroundColor: "#0c111c",
                display: "grid",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#9aa1ad" }}>
                Live Preview
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                <RouteMapPreview
                  track={routeContext.track}
                  pois={allPois}
                  highlightedRange={null}
                  sectionAnchorPoiIds={Array.from(boundaryPoiIds)}
                />
                <RouteElevationPreview
                  track={routeContext.track}
                  poiMarkers={allPois}
                  highlightedRange={null}
                  sectionAnchorPoiIds={Array.from(boundaryPoiIds)}
                />
              </div>
              {routeContext.status === "error" && (
                <div style={{ fontSize: "11px", color: "#ff9c9c" }}>
                  Route preview error: {routeContext.error}
                </div>
              )}
              <div style={{ fontSize: "11px", color: "#7e8798" }}>
                Section boundaries update live from POI selection and mode.
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Section Mode</label>
              <div style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {[
                  { value: "race", label: "Race Sections (Aid/Water)" },
                  { value: "all-poi", label: "All POIs (Micro Sections)" },
                ].map((option) => {
                  const isActive = (activeRoute.sectionMode ?? "all-poi") === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (activeRouteIndex == null) return;
                        updateRoute(activeRouteIndex, {
                          sectionMode: option.value as RouteIntelRoute["sectionMode"],
                          enabledPoiIds: undefined,
                        });
                      }}
                      style={{
                        padding: "0.45rem 0.9rem",
                        borderRadius: "999px",
                        border: isActive ? "1px solid #60a5fa" : "1px solid #2a2f3a",
                        background: isActive ? "rgba(96, 165, 250, 0.15)" : "transparent",
                        color: isActive ? "#e5e7eb" : "#9aa1ad",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>POI Boundaries</label>
                {Array.isArray(activeRoute.enabledPoiIds) && (
                  <button
                    type="button"
                    onClick={clearPoiOverrides}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "4px",
                      border: "1px solid #3a3a3a",
                      backgroundColor: "#111111",
                      color: "#e5e7eb",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                    }}
                  >
                    Clear Overrides
                  </button>
                )}
              </div>
              {allPois.length === 0 ? (
                <div style={{ color: "#999999", fontSize: "0.8rem" }}>No POIs available.</div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "0.35rem",
                    maxHeight: "240px",
                    overflowY: "auto",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #1f2937",
                    backgroundColor: "#0b0f17",
                  }}
                >
                  {allPois.map((poi) => {
                    const checked = enabledPoiIds.has(poi.id);
                    return (
                      <label
                        key={poi.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.8rem",
                          color: checked ? "#e5e7eb" : "#9aa1ad",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePoi(poi.id)}
                        />
                        <span>{poi.title || poi.id}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {showZeroPoiWarning && (
                <div style={{ fontSize: "0.75rem", color: "#fbbf24" }}>
                  Warning: No POIs enabled. Sections will be empty.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Derived Sections</label>
              {showRaceSectionWarning && (
                <div style={{ fontSize: "0.75rem", color: "#fbbf24" }}>
                  Race mode produced fewer than 2 sections. Consider enabling more aid/water POIs.
                </div>
              )}
              {activePreview.status === "loading" && (
                <div style={{ color: "#9aa1ad", fontSize: "0.8rem" }}>Loading preview...</div>
              )}
              {activePreview.status === "error" && (
                <div style={{ color: "#ff9c9c", fontSize: "0.8rem" }}>
                  Preview error: {activePreview.error}
                </div>
              )}
              {activePreview.status === "ready" && activePreview.sections.length === 0 && (
                <div style={{ color: "#999999", fontSize: "0.8rem" }}>
                  No sections derived. Enable POIs to create boundaries.
                </div>
              )}
              {activePreview.status === "ready" && activePreview.sections.length > 0 && (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {activePreview.sections.map((section, index) => (
                    <div
                      key={`${section.fromPoiId ?? "start"}-${section.toPoiId ?? "finish"}-${index}`}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: "8px",
                        padding: "0.6rem 0.8rem",
                        backgroundColor: "#0b0f17",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {section.fromLabel} {"->"} {section.toLabel}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9aa1ad" }}>
                          Mile {formatMiles(section.startDistanceMi)}-{formatMiles(section.endDistanceMi)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#9aa1ad" }}>
                        <span>{formatMiles(section.distanceMi)} mi</span>
                        <span>{formatFeet(section.elevationGainFt)} ft</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


