import { useState } from "react";
import type { Season } from "../../../season";

type SeasonMarkersProps = {
  markers: Season["seasonMarkers"];
  isBusy: boolean;
  onAdd: (weekIndex: number, label: string) => void;
  onMove: (markerId: string, newWeekIndex: number) => void;
  onRemove: (markerId: string) => void;
  setError: (message: string | null) => void;
};

export default function SeasonMarkers({
  markers,
  isBusy,
  onAdd,
  onMove,
  onRemove,
  setError,
}: SeasonMarkersProps) {
  const [markerWeekIndex, setMarkerWeekIndex] = useState("0");
  const [markerLabel, setMarkerLabel] = useState("");

  const handleAdd = () => {
    const weekIndex = Number.parseInt(markerWeekIndex, 10);
    if (Number.isNaN(weekIndex)) {
      setError("Marker week index must be a number.");
      return;
    }
    onAdd(weekIndex, markerLabel.trim());
  };

  return (
    <section style={{ padding: "0.75rem 1rem", border: "1px solid #1f2937", borderRadius: "10px" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600 }}>Season Markers</div>
        <input
          value={markerLabel}
          onChange={(event) => setMarkerLabel(event.target.value)}
          placeholder="Marker label"
          style={{
            padding: "0.3rem 0.5rem",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#0f172a",
            color: "#f5f5f5",
          }}
        />
        <input
          value={markerWeekIndex}
          onChange={(event) => setMarkerWeekIndex(event.target.value)}
          placeholder="Week index"
          style={{
            width: "120px",
            padding: "0.3rem 0.5rem",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#0f172a",
            color: "#f5f5f5",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={isBusy}
          style={{
            padding: "0.3rem 0.7rem",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#f5f5f5",
            cursor: "pointer",
          }}
        >
          Add Marker
        </button>
      </div>
      <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {markers.length === 0 && <div style={{ color: "#6b7280" }}>No markers yet.</div>}
        {markers.map((marker) => (
          <div
            key={marker.markerId}
            style={{
              display: "flex",
              gap: "0.35rem",
              alignItems: "center",
              padding: "0.35rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid #1f2937",
              backgroundColor: "#0f172a",
            }}
          >
            <div style={{ fontSize: "0.8rem" }}>{marker.label}</div>
            <input
              type="number"
              value={marker.weekIndex}
              onChange={(event) => {
                const nextIndex = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(nextIndex)) {
                  setError("Marker week index must be a number.");
                  return;
                }
                onMove(marker.markerId, nextIndex);
              }}
              style={{
                width: "70px",
                padding: "0.2rem 0.4rem",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#0f172a",
                color: "#f5f5f5",
                fontSize: "0.75rem",
              }}
            />
            <button
              onClick={() => onRemove(marker.markerId)}
              disabled={isBusy}
              style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "999px",
                border: "1px solid #374151",
                backgroundColor: "#1f2937",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
