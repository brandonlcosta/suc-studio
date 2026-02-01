import type { WeekInstance } from "../../../season";
import CalendarWeekGrid from "./CalendarWeekGrid";
import type { WeekPreset } from "./presets";
import { WEEK_PRESETS } from "./presets";
import WeekPresetSlot from "./WeekPresetSlot";

type WeekCardProps = {
  week: WeekInstance;
  globalWeekIndex: number;
  weekStartDate: Date;
  markers: Array<{ markerId: string; label: string; weekIndex: number }>;
  isBusy: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<WeekInstance>) => void;
  quickEdit: boolean;
  presetDragActive: boolean;
  presetDragTargeted: boolean;
  dragPreset: WeekPreset | null;
  onDragOverPreset: () => void;
  onDropPreset: () => void;
  presetLabel: string | null;
};

export default function WeekCard({
  week,
  globalWeekIndex,
  weekStartDate,
  markers,
  isBusy,
  isSelected,
  onSelect,
  onRemove,
  onUpdate,
  quickEdit,
  presetDragActive,
  presetDragTargeted,
  dragPreset,
  onDragOverPreset,
  onDropPreset,
  presetLabel,
}: WeekCardProps) {
  const handleFocusChange = (nextFocus: WeekInstance["focus"]) => {
    if (!nextFocus) {
      onUpdate({ focus: null });
      return;
    }
    const preset = WEEK_PRESETS.find((entry) => entry.focus === nextFocus);
    if (preset) {
      onUpdate({
        focus: preset.focus,
        stress: preset.stress,
        volume: preset.volume,
        intensity: preset.intensity,
      });
      return;
    }
    onUpdate({ focus: nextFocus });
  };

  return (
    <div
      id={`season-week-${globalWeekIndex}`}
      style={{
        padding: quickEdit ? "0.3rem" : "0.45rem",
        borderRadius: "9px",
        border: isSelected ? "1px solid #4b5563" : "1px solid #243041",
        backgroundColor: "#111827",
        display: "grid",
        gap: quickEdit ? "0.25rem" : "0.35rem",
        boxShadow: isSelected ? "0 0 0 1px #4b5563 inset" : "none",
        position: "relative",
        outline: presetDragActive ? "1px dashed #334155" : "none",
      }}
      onClick={onSelect}
      onDragOver={(event) => {
        if (!presetDragActive) return;
        event.preventDefault();
        onDragOverPreset();
      }}
      onDrop={(event) => {
        if (!presetDragActive) return;
        event.preventDefault();
        onDropPreset();
      }}
    >
      {presetDragTargeted && dragPreset && (
        <div
          style={{
            position: "absolute",
            inset: "6px",
            borderRadius: "10px",
            border: "1px dashed #60a5fa",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            color: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            pointerEvents: "none",
          }}
        >
          Drop {dragPreset.name} preset
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            padding: "0.12rem 0.4rem",
            borderRadius: "999px",
            backgroundColor: "#1f2937",
            color: "#e5e7eb",
            fontSize: "0.62rem",
            fontWeight: 600,
          }}
        >
          Week {globalWeekIndex + 1}
        </div>
        {!quickEdit && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            disabled={isBusy}
            style={{
              padding: "0.22rem 0.45rem",
              borderRadius: "6px",
              border: "1px solid #374151",
              backgroundColor: "#111827",
              color: "#f5f5f5",
              cursor: "pointer",
              fontSize: "0.66rem",
            }}
          >
            Remove Week
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "130px minmax(0, 1fr)", gap: "0.45rem" }}>
        <WeekPresetSlot
          label={presetLabel}
          isDragActive={presetDragActive}
          isTargeted={presetDragTargeted}
          dragLabel={dragPreset?.name ?? null}
          focus={week.focus}
          stress={week.stress}
          volume={week.volume}
          intensity={week.intensity}
          onUpdate={onUpdate}
          onFocusChange={handleFocusChange}
        />
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <CalendarWeekGrid weekStartDate={weekStartDate} compact={quickEdit} />
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", color: "#9ca3af" }}>
            <span style={{ fontSize: "0.58rem" }}>Stress: {week.stress}</span>
            <span style={{ fontSize: "0.58rem" }}>Volume: {week.volume}</span>
            <span style={{ fontSize: "0.58rem" }}>Intensity: {week.intensity}</span>
          </div>
        </div>
      </div>

      {!quickEdit && (
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {markers.map((marker) => (
            <span
              key={marker.markerId}
              style={{
                padding: "0.12rem 0.35rem",
                borderRadius: "999px",
                backgroundColor: "#1f2937",
                fontSize: "0.6rem",
                color: "#e5e7eb",
              }}
            >
              {marker.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
