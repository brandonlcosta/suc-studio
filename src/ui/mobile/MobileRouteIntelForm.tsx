import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
    maxWidth: "500px",
    margin: "0 auto",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#999",
  },
  select: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    background: "#1a1f28",
    color: "#f5f5f5",
    outline: "none",
  },
  textarea: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    background: "#1a1f28",
    color: "#f5f5f5",
    outline: "none",
    resize: "vertical" as const,
    minHeight: "120px",
  },
  button: {
    padding: "1rem",
    fontSize: "1rem",
    fontWeight: 600,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  primaryButton: {
    background: "#3b82f6",
    color: "white",
  },
  secondaryButton: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    color: "#999",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.875rem",
    padding: "0.75rem",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: "8px",
  },
  success: {
    color: "#22c55e",
    fontSize: "0.875rem",
    padding: "0.75rem",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "8px",
  },
  loading: {
    textAlign: "center" as const,
    padding: "2rem",
    color: "#999",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: "0.25rem",
  },
};

type Event = {
  id: string;
  name: string;
  routeGroupIds?: string[];
};

type RouteGroup = {
  id: string;
  name: string;
  label?: string;
};

type FormData = {
  eventId: string;
  routeId: string;
  caption: string;
  sectionCaptions?: Record<string, string>;
};

function normalizeToArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function sanitizeOptions(items: any[]) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .filter((item) => {
      const id =
        item?.id ??
        item?.routeId ??
        item?.eventId ??
        item?.groupId ??
        item?.routeGroupId;
      const name =
        item?.name ??
        item?.label ??
        item?.routeName ??
        item?.eventName ??
        item?.title;
      return (
        typeof id === "string" &&
        id.trim().length > 0 &&
        typeof name === "string" &&
        name.trim().length > 0
      );
    })
    .map((item) => ({
      id:
        item.id ?? item.routeId ?? item.eventId ?? item.groupId ?? item.routeGroupId,
      name: item.name ?? item.label ?? item.routeName ?? item.eventName ?? item.title,
    }));
}

export default function MobileRouteIntelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    eventId: "",
    routeId: "",
    caption: "",
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load events and route groups on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [eventsResponse, routesResponse] = await Promise.all([
          fetch(apiUrl("/events")),
          fetch(apiUrl("/routes")),
        ]);

        if (eventsResponse.ok) {
          const raw = await eventsResponse.json();
          const rawEvents = normalizeToArray(raw?.events ?? raw);
          const availableEvents = sanitizeOptions(rawEvents);
          console.log("[MobileRouteIntelForm] Loaded events:", availableEvents);
          setEvents(availableEvents as Event[]);
        }

        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          const normalizedRoutes = normalizeToArray(
            routesData?.routeGroups ?? routesData?.items ?? routesData
          );
          const availableRoutes = sanitizeOptions(normalizedRoutes);
          setRouteGroups(availableRoutes as RouteGroup[]);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load existing draft if editing
  useEffect(() => {
    if (!id) return;

    const loadDraft = async () => {
      try {
        const url = apiUrl(`/drafts/route-intel/${id}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Draft not found");
        }
        const draft = await response.json();
        setFormData({
          eventId: draft.data.eventId || "",
          routeId: draft.data.routeId || "",
          caption: draft.data.caption || "",
          sectionCaptions: draft.data.sectionCaptions,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load draft");
      }
    };

    loadDraft();
  }, [id]);

  // Filter routes based on selected event
  const selectedEvent = events.find((e) => e.id === formData.eventId);
  const availableRoutesRaw =
    selectedEvent?.routeGroupIds && Array.isArray(selectedEvent.routeGroupIds)
      ? routeGroups.filter((r) =>
          selectedEvent.routeGroupIds?.includes(r.id ?? (r as any).routeGroupId)
        )
      : routeGroups;
  const availableRoutes = sanitizeOptions(
    normalizeToArray(
      (availableRoutesRaw as RouteGroup[] | Record<string, RouteGroup> | null | undefined) ??
        undefined
    )
  );

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.eventId) {
      setError("Please select an event");
      return;
    }
    if (!formData.routeId) {
      setError("Please select a route");
      return;
    }
    if (!formData.caption.trim()) {
      setError("Please add some caption notes");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        eventId: formData.eventId,
        routeId: formData.routeId,
        caption: formData.caption.trim(),
        sectionCaptions: formData.sectionCaptions,
      };

      const url = isEditing
        ? apiUrl(`/drafts/route-intel/${id}`)
        : apiUrl("/drafts/route-intel?source=mobile");

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save draft");
      }

      setSuccess("Draft saved!");
      setTimeout(() => {
        navigate("/mobile/drafts");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Event *</label>
        <select
          value={formData.eventId}
          onChange={(e) => setFormData((prev) => ({ ...prev, eventId: e.target.value, routeId: "" }))}
          style={styles.select}
        >
          <option value="">Select an event</option>
          {events.length > 0 ? (
            events.map((event, index) => (
              <option key={event.id ?? `${event.name}-${index}`} value={event.id}>
                {event.name || event.id}
              </option>
            ))
          ) : (
            <option disabled>No events available</option>
          )}
        </select>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Route *</label>
        <select
          value={formData.routeId}
          onChange={(e) => setFormData((prev) => ({ ...prev, routeId: e.target.value }))}
          style={styles.select}
          disabled={!formData.eventId}
        >
          <option value="">Select a route</option>
          {availableRoutes.length > 0 ? (
            availableRoutes.map((route, index) => (
              <option
                key={route.id ?? route.routeId ?? route.name ?? route.label ?? index}
                value={route.id}
              >
                {route.name || route.label || route.id}
              </option>
            ))
          ) : (
            <option disabled>No routes available</option>
          )}
        </select>
        {!formData.eventId && (
          <p style={styles.hint}>Select an event first to see available routes</p>
        )}
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Caption / Notes *</label>
        <textarea
          value={formData.caption}
          onChange={(e) => setFormData((prev) => ({ ...prev, caption: e.target.value }))}
          placeholder="Add your observations about this route (terrain, key points, strategy notes...)"
          style={styles.textarea}
        />
        <p style={styles.hint}>
          Full route intel configuration (distance variants, sections) will be added on desktop
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSaving}
        style={{
          ...styles.button,
          ...styles.primaryButton,
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        {isSaving ? "Saving..." : isEditing ? "Update Draft" : "Save Draft"}
      </button>

      <button
        onClick={() => navigate("/mobile")}
        style={{ ...styles.button, ...styles.secondaryButton }}
      >
        Cancel
      </button>
    </div>
  );
}
