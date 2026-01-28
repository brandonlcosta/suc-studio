import { useState, useEffect, useCallback } from "react";
import type { Event, EventsMaster, EventsSelection, RouteGroupSummary } from "../types";
import {
  loadEventsMaster,
  saveEventsMaster,
  loadEventsSelection,
  saveEventsSelection,
  listRouteGroups,
} from "../utils/api";

export default function EventBuilder() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [routeGroups, setRouteGroups] = useState<RouteGroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editing state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsMaster, eventsSelection, groups] = await Promise.all([
          loadEventsMaster(),
          loadEventsSelection(),
          listRouteGroups(),
        ]);

        setEvents(eventsMaster.events);
        setSelectedEventIds(eventsSelection.selectedEventIds);
        setRouteGroups(groups);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load data: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveEvents = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const eventsMaster: EventsMaster = { version: 1, events };
      const eventsSelection: EventsSelection = { version: 1, selectedEventIds };

      await Promise.all([
        saveEventsMaster(eventsMaster),
        saveEventsSelection(eventsSelection),
      ]);

      setSuccess("Events saved successfully!");
      setEditingEvent(null);
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [events, selectedEventIds]);

  const handleCreateNew = useCallback(() => {
    const newEvent: Event = {
      eventId: "",
      eventName: "",
      eventDescription: "",
      eventDate: "",
      eventTime: "",
      startLocationName: "",
      startLocationUrl: "",
      startLocationCoordinates: { lat: 0, lng: 0 },
      routeGroupIds: [],
    };
    setEditingEvent(newEvent);
    setIsCreating(true);
    setError(null);
    setSuccess(null);
  }, []);

  const handleEdit = useCallback((event: Event) => {
    setEditingEvent({ ...event });
    setIsCreating(false);
    setError(null);
    setSuccess(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingEvent) return;

    if (!editingEvent.eventId.trim()) {
      setError("Event ID is required");
      return;
    }

    if (isCreating) {
      // Add new event
      setEvents((prev) => [...prev, editingEvent]);
    } else {
      // Update existing event
      setEvents((prev) =>
        prev.map((e) => (e.eventId === editingEvent.eventId ? editingEvent : e))
      );
    }

    setEditingEvent(null);
    setIsCreating(false);
    setSuccess("Event updated. Click 'Save All' to persist changes.");
  }, [editingEvent, isCreating]);

  const handleCancelEdit = useCallback(() => {
    setEditingEvent(null);
    setIsCreating(false);
    setError(null);
  }, []);

  const handleDelete = useCallback((eventId: string) => {
    if (!confirm(`Delete event ${eventId}?`)) return;

    setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
    setSelectedEventIds((prev) => prev.filter((id) => id !== eventId));
    setSuccess("Event deleted. Click 'Save All' to persist changes.");
  }, []);

  const handleToggleSelection = useCallback((eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div>Loading events...</div>
      </div>
    );
  }

  // Editing form
  if (editingEvent) {
    return (
      <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ margin: 0 }}>
            {isCreating ? "Create New Event" : `Edit ${editingEvent.eventId}`}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#e5e7eb",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#111827",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {isCreating ? "Create" : "Update"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#ffebee",
              borderRadius: "4px",
              color: "#c62828",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Event ID</label>
            <input
              value={editingEvent.eventId}
              onChange={(e) =>
                setEditingEvent({ ...editingEvent, eventId: e.target.value })
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="SUC-037"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Name</label>
            <input
              value={editingEvent.eventName}
              onChange={(e) =>
                setEditingEvent({ ...editingEvent, eventName: e.target.value })
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="Sacramento Underground Cycling"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>
              Event Description
            </label>
            <textarea
              value={editingEvent.eventDescription}
              onChange={(e) =>
                setEditingEvent({
                  ...editingEvent,
                  eventDescription: e.target.value,
                })
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minHeight: "100px",
              }}
              placeholder="Short description for the event"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Date</label>
              <input
                value={editingEvent.eventDate || ""}
                onChange={(e) =>
                  setEditingEvent({ ...editingEvent, eventDate: e.target.value })
                }
                style={{
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                placeholder="2025-06-15"
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Time</label>
              <input
                value={editingEvent.eventTime || ""}
                onChange={(e) =>
                  setEditingEvent({ ...editingEvent, eventTime: e.target.value })
                }
                style={{
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                placeholder="7:45 PM"
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>
              Start Location Name
            </label>
            <input
              value={editingEvent.startLocationName || ""}
              onChange={(e) =>
                setEditingEvent({
                  ...editingEvent,
                  startLocationName: e.target.value,
                })
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="Southside Park"
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>
              Start Location URL
            </label>
            <input
              value={editingEvent.startLocationUrl || ""}
              onChange={(e) =>
                setEditingEvent({
                  ...editingEvent,
                  startLocationUrl: e.target.value,
                })
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>
              Route Groups
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {routeGroups.map((group) => {
                const isSelected = editingEvent.routeGroupIds.includes(
                  group.routeGroupId
                );
                return (
                  <button
                    key={group.routeGroupId}
                    type="button"
                    onClick={() => {
                      setEditingEvent({
                        ...editingEvent,
                        routeGroupIds: isSelected
                          ? editingEvent.routeGroupIds.filter(
                              (id) => id !== group.routeGroupId
                            )
                          : [...editingEvent.routeGroupIds, group.routeGroupId],
                      });
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.875rem",
                      borderRadius: "4px",
                      border: `1px solid ${isSelected ? "#4CAF50" : "#ccc"}`,
                      backgroundColor: isSelected ? "#4CAF50" : "#fff",
                      color: isSelected ? "#fff" : "#555",
                      cursor: "pointer",
                    }}
                  >
                    {group.routeGroupId} - {group.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Event Builder</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleCreateNew}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Create New Event
          </button>
          <button
            onClick={handleSaveEvents}
            disabled={isSaving}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: isSaving ? "#ccc" : "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
            }}
          >
            {isSaving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#ffebee",
            borderRadius: "4px",
            color: "#c62828",
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
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
            color: "#2e7d32",
          }}
        >
          {success}
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          No events yet. Click "Create New Event" to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {events.map((event) => {
            const isSelected = selectedEventIds.includes(event.eventId);
            return (
              <div
                key={event.eventId}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                  borderLeft: `4px solid ${isSelected ? "#4CAF50" : "#ccc"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "1rem" }}>
                      {event.eventId} - {event.eventName}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
                      {event.eventDescription}
                    </div>
                    {event.eventDate && (
                      <div style={{ fontSize: "0.875rem", color: "#999", marginTop: "0.25rem" }}>
                        {event.eventDate} {event.eventTime && `at ${event.eventTime}`}
                      </div>
                    )}
                    {event.routeGroupIds.length > 0 && (
                      <div style={{ fontSize: "0.875rem", color: "#999", marginTop: "0.25rem" }}>
                        Route Groups: {event.routeGroupIds.join(", ")}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    <button
                      onClick={() => handleToggleSelection(event.eventId)}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: isSelected ? "#4CAF50" : "#fff",
                        color: isSelected ? "#fff" : "#555",
                        cursor: "pointer",
                      }}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                    <button
                      onClick={() => handleEdit(event)}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        color: "#555",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.eventId)}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.75rem",
                        borderRadius: "4px",
                        border: "1px solid #f44336",
                        backgroundColor: "#fff",
                        color: "#f44336",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
