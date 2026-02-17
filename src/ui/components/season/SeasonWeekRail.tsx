import type { CSSProperties } from "react";
import type { WeekPreset } from "./presets";
import type { WeekWithIndex } from "./weekTypes";

type SeasonWeekRailProps = {
  weeks: WeekWithIndex[];
  blockNameById: Record<string, string>;
  selectedSUCWeekId: string | null;
  isWeekPresetDragActive: boolean;
  weekPresetDrag: WeekPreset | null;
  weekPresetTargetSUCWeekId: string | null;
  onSelectWeek: (sucWeekId: string) => void;
  onDragOverWeek: (sucWeekId: string) => void;
  onDropWeek: (sucWeekId: string) => void;
};

export default function SeasonWeekRail({
  weeks,
  blockNameById,
  selectedSUCWeekId,
  isWeekPresetDragActive,
  weekPresetDrag,
  weekPresetTargetSUCWeekId,
  onSelectWeek,
  onDragOverWeek,
  onDropWeek,
}: SeasonWeekRailProps) {
  if (!weeks.length) return null;

  return (
    <div style={railStyle}>
      {weeks.map((entry) => {
        const isSelected = entry.sucWeekId === selectedSUCWeekId;
        const isTargeted = isWeekPresetDragActive && weekPresetTargetSUCWeekId === entry.sucWeekId;
        const blockName = blockNameById[entry.blockId] || "Block";

        return (
          <button
            key={entry.week.weekId}
            type="button"
            onClick={() => onSelectWeek(entry.sucWeekId)}
            onDragOver={(event) => {
              if (!isWeekPresetDragActive) return;
              event.preventDefault();
              onDragOverWeek(entry.sucWeekId);
            }}
            onDrop={(event) => {
              if (!isWeekPresetDragActive) return;
              event.preventDefault();
              onDropWeek(entry.sucWeekId);
            }}
            style={{
              ...weekChipStyle,
              borderColor: isSelected ? "#67e8f9" : "#1f2937",
              backgroundColor: isSelected ? "rgba(34, 211, 238, 0.13)" : "#0b1220",
              boxShadow: isSelected ? "0 0 0 1px rgba(34, 211, 238, 0.35) inset" : "none",
              outline: isTargeted ? "2px dashed rgba(96, 165, 250, 0.7)" : "none",
            }}
            title={`${entry.sucWeekId} - ${entry.weekRangeLabel}`}
          >
            <span style={weekIdStyle}>{entry.sucWeekId}</span>
            <span style={rangeStyle}>{entry.weekRangeLabel}</span>
            <span style={blockStyle}>{blockName}</span>
            {entry.eventBadgeNames.length > 0 && (
              <span style={badgeStyle}>
                {entry.eventBadgeNames.slice(0, 2).join(" / ")}
                {entry.eventBadgeNames.length > 2 ? " +" : ""}
              </span>
            )}
            {isTargeted && weekPresetDrag && (
              <span style={dropHintStyle}>Drop {weekPresetDrag.name}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const railStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "minmax(180px, 1fr)",
  gap: "0.6rem",
  padding: "0.75rem",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  backgroundColor: "#0b111b",
  overflowX: "auto",
};

const weekChipStyle: CSSProperties = {
  border: "1px solid #1f2937",
  borderRadius: "10px",
  backgroundColor: "#0b1220",
  color: "#f5f5f5",
  display: "grid",
  gap: "0.15rem",
  textAlign: "left",
  padding: "0.55rem 0.6rem",
  minHeight: "88px",
  cursor: "pointer",
  transition: "border-color 0.2s ease, background-color 0.2s ease",
  position: "relative",
};

const weekIdStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.03em",
};

const rangeStyle: CSSProperties = {
  fontSize: "0.68rem",
  color: "#93c5fd",
};

const blockStyle: CSSProperties = {
  fontSize: "0.64rem",
  color: "#a1a1aa",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const badgeStyle: CSSProperties = {
  marginTop: "0.2rem",
  fontSize: "0.62rem",
  color: "#bae6fd",
  borderRadius: "999px",
  border: "1px solid rgba(56, 189, 248, 0.35)",
  padding: "0.12rem 0.45rem",
  width: "fit-content",
};

const dropHintStyle: CSSProperties = {
  position: "absolute",
  right: "8px",
  top: "8px",
  fontSize: "0.58rem",
  color: "#dbeafe",
  backgroundColor: "rgba(30, 64, 175, 0.55)",
  border: "1px solid rgba(147, 197, 253, 0.55)",
  borderRadius: "999px",
  padding: "0.1rem 0.35rem",
};

