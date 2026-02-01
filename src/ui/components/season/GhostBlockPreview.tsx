import type { CSSProperties } from "react";
import type { BlockTemplate } from "./presets";

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

type GhostBlockPreviewProps = {
  template: BlockTemplate;
  widthWeeks: number;
};

export default function GhostBlockPreview({ template, widthWeeks }: GhostBlockPreviewProps) {
  const focus = template.weeks[0]?.focus ?? "none";
  const color = focusColor[focus] ?? focusColor.none;
  return (
    <div style={previewStyle}>
      <div style={{ ...barStyle, width: `${Math.max(1, widthWeeks) * 24}px`, backgroundColor: color }} />
      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{template.name}</div>
    </div>
  );
}

const previewStyle: CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "10px",
  border: "1px dashed #4b5563",
  backgroundColor: "#111827",
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  opacity: 0.6,
};

const barStyle: CSSProperties = {
  height: "8px",
  borderRadius: "999px",
};
