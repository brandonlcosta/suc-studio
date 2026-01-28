import { useEffect } from "react";
import type { EventDraft, StagedRoute } from "../types";

interface EventBuilderScreenProps {
  routes: StagedRoute[];
  eventData: EventDraft;
  setEventData: (data: EventDraft) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function EventBuilderScreen({
  routes,
  eventData,
  setEventData,
  onBack,
  onNext,
}: EventBuilderScreenProps) {
  useEffect(() => {
    let cancelled = false;
    if (!eventData.eventId) {
      window.electron
        .invoke("get-next-event-id")
        .then((nextId) => {
          if (!cancelled && typeof nextId === "string") {
            setEventData({ ...eventData, eventId: nextId });
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [eventData, setEventData]);

  useEffect(() => {
    if (
      routes.length > 0 &&
      routes[0].coords.length > 0 &&
      !eventData.startLocationCoordinates.lat &&
      !eventData.startLocationCoordinates.lng
    ) {
      const [lng, lat] = routes[0].coords[0];
      setEventData({
        ...eventData,
        startLocationCoordinates: {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        },
      });
    }
  }, [eventData, routes, setEventData]);

  const updateField = (field: keyof EventDraft, value: string) => {
    setEventData({ ...eventData, [field]: value });
  };

  const updateCoordinates = (field: "lat" | "lng", value: string) => {
    setEventData({
      ...eventData,
      startLocationCoordinates: {
        ...eventData.startLocationCoordinates,
        [field]: value,
      },
    });
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Event Builder</h1>
          <div style={{ color: "#666", marginTop: "0.25rem" }}>
            Define the event metadata before export
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onBack}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#e5e7eb",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Review Export
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>Event ID</label>
          <input
            value={eventData.eventId}
            onChange={(e) => updateField("eventId", e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            placeholder="SUC-037"
          />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Name</label>
          <input
            value={eventData.eventName}
            onChange={(e) => updateField("eventName", e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            placeholder="Sacramento Underground Cycling"
          />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Description</label>
          <textarea
            value={eventData.eventDescription}
            onChange={(e) => updateField("eventDescription", e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", minHeight: "120px" }}
            placeholder="Short description for the event"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Date</label>
            <input
              value={eventData.eventDate}
              onChange={(e) => updateField("eventDate", e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
              placeholder="Tuesday"
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Event Time</label>
            <input
              value={eventData.eventTime}
              onChange={(e) => updateField("eventTime", e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
              placeholder="7:45 PM"
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>Start Location Name</label>
          <input
            value={eventData.startLocationName}
            onChange={(e) => updateField("startLocationName", e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            placeholder="Southside Park"
          />
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>Start Location URL</label>
          <input
            value={eventData.startLocationUrl}
            onChange={(e) => updateField("startLocationUrl", e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
            placeholder="https://maps.google.com/..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Start Latitude</label>
            <input
              value={eventData.startLocationCoordinates.lat}
              onChange={(e) => updateCoordinates("lat", e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
              placeholder="38.582000"
            />
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#555" }}>Start Longitude</label>
            <input
              value={eventData.startLocationCoordinates.lng}
              onChange={(e) => updateCoordinates("lng", e.target.value)}
              style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
              placeholder="-121.484000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
