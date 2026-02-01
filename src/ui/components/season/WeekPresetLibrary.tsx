import type { CSSProperties } from "react";
import { useState } from "react";
import { Flame, GripVertical, Layers, Zap } from "lucide-react";
import type { WeekPreset } from "./presets";

type WeekPresetLibraryProps = {
  presets: WeekPreset[];
  onDragStart: (preset: WeekPreset) => void;
  onDragEnd: () => void;
  isBusy: boolean;
};

const focusColor: Record<string, string> = {
  base: "#3b82f6",
  deload: "#94a3b8",
  speed: "#22d3ee",
  "hill-power": "#f97316",
  mileage: "#22c55e",
  ultra: "#a855f7",
  heat: "#ef4444",
  taper: "#facc15",
  none: "#4b5563",
};

export default function WeekPresetLibrary({
  presets,
  onDragStart,
  onDragEnd,
  isBusy,
}: WeekPresetLibraryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      {presets.map((preset) => {
        const accent = focusColor[preset.focus ?? "none"] ?? focusColor.none;
        const isHovered = hoveredId === preset.id;
        return (
          <button
            key={preset.id}
            disabled={isBusy}
            draggable={!isBusy}
            onMouseEnter={() => setHoveredId(preset.id)}
            onMouseLeave={() => setHoveredId(null)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", preset.id);
              onDragStart(preset);
            }}
            onDragEnd={onDragEnd}
            title={`${preset.name} - Focus: ${preset.focus ?? "None"} - Stress: ${preset.stress} - Volume: ${preset.volume} - Intensity: ${preset.intensity}`}
            style={{
              ...cardStyle,
              borderColor: accent,
              opacity: isBusy ? 0.6 : 1,
              cursor: isBusy ? "not-allowed" : "grab",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{preset.name}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                {isHovered && <GripVertical size={14} style={{ opacity: 0.5 }} />}
                <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{preset.focus ?? "None"}</span>
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9ca3af", display: "grid", gap: "0.2rem" }}>
              <div style={metricRowStyle}>
                <Zap size={11} style={metricIconStyle} />
                <span>Stress</span>
                <span style={metricValueStyle}>{preset.stress}</span>
              </div>
              <div style={metricRowStyle}>
                <Layers size={11} style={metricIconStyle} />
                <span>Volume</span>
                <span style={metricValueStyle}>{preset.volume}</span>
              </div>
              <div style={metricRowStyle}>
                <Flame size={11} style={metricIconStyle} />
                <span>Intensity</span>
                <span style={metricValueStyle}>{preset.intensity}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const cardStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: "10px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
  color: "#f5f5f5",
  textAlign: "left",
  cursor: "grab",
};

const metricRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: "0.35rem",
  alignItems: "center",
  fontSize: "0.65rem",
};

const metricIconStyle: CSSProperties = {
  opacity: 0.6,
};

const metricValueStyle: CSSProperties = {
  fontWeight: 600,
  color: "#e5e7eb",
};
