import type { EventDraft, StagedRoute } from "../types";

interface ExportReviewScreenProps {
  eventData: EventDraft;
  routes: StagedRoute[];
  isExporting: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

export default function ExportReviewScreen({
  eventData,
  routes,
  isExporting,
  error,
  onBack,
  onConfirm,
}: ExportReviewScreenProps) {
  const orderedRoutes = [...routes].sort(
    (a, b) => a.distanceMi - b.distanceMi
  );
  const files = routes.flatMap((route) => [
    `public/gpx/${eventData.eventId}/${eventData.eventId}-${route.label}.gpx`,
    `public/routes/${eventData.eventId}-${route.label}.json`,
    `public/routes/${eventData.eventId}-${route.label}.geojson`,
  ]);

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Export Review</h1>
          <div style={{ color: "#666", marginTop: "0.25rem" }}>
            Confirm the metadata and files before writing
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onBack}
            disabled={isExporting}
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
            onClick={onConfirm}
            disabled={isExporting}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isExporting ? "Writing..." : "Write Files"}
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
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: "1.25rem" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Event Metadata</div>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
            <div>Event ID: {eventData.eventId || "—"}</div>
            <div>Name: {eventData.eventName || "—"}</div>
            <div>Description: {eventData.eventDescription || "—"}</div>
            <div>Date: {eventData.eventDate || "—"}</div>
            <div>Time: {eventData.eventTime || "—"}</div>
            <div>Start Location: {eventData.startLocationName || "—"}</div>
            <div>Start URL: {eventData.startLocationUrl || "—"}</div>
            <div>
              Start Coordinates:{" "}
              {eventData.startLocationCoordinates.lat || "—"}, {eventData.startLocationCoordinates.lng || "—"}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Routes Included</div>
          <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.9rem" }}>
            {orderedRoutes.map((route) => (
              <div key={route.id}>
                {route.label} — {route.distanceMi.toFixed(2)} mi ({route.fileName})
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Files To Be Written</div>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.85rem", color: "#333" }}>
            {files.map((file) => (
              <div key={file}>{file}</div>
            ))}
            <div>public/events.master.json (update)</div>
            <div>public/events.selection.json (update)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
