import type { CSSProperties } from "react";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import type { BlockTemplate } from "./presets";

type TrainingBlockLibraryProps = {
  templates: BlockTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInsert: (template: BlockTemplate) => void;
  onDragStart: (template: BlockTemplate) => void;
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

const intensityMap: Record<string, number> = {
  "low": 0,
  "low-med": 1,
  "med": 2,
  "med-high": 3,
  "high": 4,
  "very-high": 5,
};

function countFocus(weeks: BlockTemplate["weeks"]): Record<string, number> {
  const counts: Record<string, number> = {};
  weeks.forEach((week) => {
    const key = week.focus ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

function avgLabels(weeks: BlockTemplate["weeks"]): string {
  if (weeks.length === 0) return "-";
  const totals = weeks.reduce(
    (acc, week) => ({
      stress: acc.stress + (intensityMap[week.stress] ?? 0),
      volume: acc.volume + (intensityMap[week.volume] ?? 0),
      intensity: acc.intensity + (intensityMap[week.intensity] ?? 0),
    }),
    { stress: 0, volume: 0, intensity: 0 }
  );
  const count = weeks.length;
  return `S:${(totals.stress / count).toFixed(1)} V:${(totals.volume / count).toFixed(1)} I:${(
    totals.intensity / count
  ).toFixed(1)}`;
}

export default function TrainingBlockLibrary({
  templates,
  selectedId,
  onSelect,
  onInsert,
  onDragStart,
  onDragEnd,
  isBusy,
}: TrainingBlockLibraryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: "0.6rem" }}>
      {templates.map((template) => {
        const breakdown = Object.entries(countFocus(template.weeks))
          .map(([focus, count]) => `${focus}:${count}`)
          .join(" ");
        const focusKey = template.weeks[0]?.focus ?? "none";
        const accent = focusColor[focusKey] ?? focusColor.none;
        const isHovered = hoveredId === template.id;
        return (
          <button
            key={template.id}
            disabled={isBusy}
            onClick={() => {
              onSelect(template.id);
              onInsert(template);
            }}
            onMouseEnter={() => setHoveredId(template.id)}
            onMouseLeave={() => setHoveredId(null)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", template.id);
              onDragStart(template);
            }}
            onDragEnd={onDragEnd}
            draggable={!isBusy}
            title={`${template.name} - ${template.weeks.length} weeks - ${breakdown} - ${avgLabels(template.weeks)}`}
            style={{
              ...cardStyle,
              borderColor: selectedId === template.id ? "#e5e7eb" : "#1f2937",
              boxShadow: selectedId === template.id ? `0 0 0 2px ${accent} inset` : "none",
              opacity: isBusy ? 0.6 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{template.name}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                {isHovered && <GripVertical size={14} style={{ opacity: 0.5 }} />}
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{template.weeks.length}w</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", fontSize: "0.7rem", color: "#9ca3af" }}>
              {breakdown}
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
  cursor: "pointer",
};
