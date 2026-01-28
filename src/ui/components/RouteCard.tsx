import type { StagedRoute, RouteLabel } from "../types";
import { ROUTE_COLORS, LABELS } from "../utils/routeLabels";

interface RouteCardProps {
  route: StagedRoute;
  onLabelChange: (id: string, label: RouteLabel) => void;
}

export default function RouteCard({ route, onLabelChange }: RouteCardProps) {
  const color = ROUTE_COLORS[route.label];
  const distanceKm = route.distanceMi * 1.609344;
  const elevationM = route.elevationFt / 3.28084;

  return (
    <div
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
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
                onClick={() => onLabelChange(route.id, label)}
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
            <span
              style={{ color: "#999", fontSize: "0.75rem", marginLeft: "0.5rem" }}
            >
              ({distanceKm.toFixed(2)} km)
            </span>
          </div>
        </div>

        <div>
          <div style={{ color: "#666", fontSize: "0.75rem" }}>Elevation</div>
          <div style={{ fontSize: "1rem", fontWeight: "500" }}>
            {route.elevationFt.toFixed(0)} ft
            <span
              style={{ color: "#999", fontSize: "0.75rem", marginLeft: "0.5rem" }}
            >
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
  );
}
