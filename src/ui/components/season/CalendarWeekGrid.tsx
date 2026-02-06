import type { CSSProperties } from "react";
import type { DayKey, WeekDays } from "../../../season";
import { DAY_KEYS } from "../../../season";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarWeekGridProps = {
  weekStartDate: Date;
  compact?: boolean;
  dayAssignments?: WeekDays;
  workoutLabels?: Record<string, string>;
  selectedDay?: DayKey | null;
  onSelectDay?: (dayKey: DayKey) => void;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizeDays(days?: WeekDays): WeekDays {
  const base: WeekDays = {
    mon: {},
    tue: {},
    wed: {},
    thu: {},
    fri: {},
    sat: {},
    sun: {},
  };
  if (!days) return base;
  const next: WeekDays = { ...base };
  for (const key of DAY_KEYS) {
    next[key] = { ...base[key], ...(days[key] ?? {}) };
  }
  return next;
}

export default function CalendarWeekGrid({
  weekStartDate,
  compact = false,
  dayAssignments,
  workoutLabels = {},
  selectedDay = null,
  onSelectDay,
}: CalendarWeekGridProps) {
  const dates = dayLabels.map((_, index) => addDays(weekStartDate, index));
  const normalizedDays = normalizeDays(dayAssignments);

  return (
    <div style={{ display: "grid", gap: compact ? "0.12rem" : "0.2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.2rem" }}>
        {dayLabels.map((label) => (
          <div key={label} style={{ fontSize: "0.55rem", color: "#94a3b8", textAlign: "center" }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.2rem" }}>
        {dates.map((date, index) => {
          const dayKey = DAY_KEYS[index];
          const assignment = normalizedDays[dayKey];
          const workoutId = assignment?.workoutId;
          const workoutLabel = workoutId ? workoutLabels[workoutId] ?? "Assigned" : "";
          const isSelected = selectedDay === dayKey;
          return (
          <div
            key={`${date.toISOString()}-${index}`}
            style={{
              ...slotStyle,
              fontSize: compact ? "0.52rem" : "0.56rem",
              minHeight: compact ? "28px" : "34px",
              borderColor: isSelected ? "#60a5fa" : "#1f2937",
              boxShadow: isSelected ? "0 0 0 1px #60a5fa inset" : "none",
              cursor: onSelectDay ? "pointer" : "default",
              gap: compact ? "0.1rem" : "0.15rem",
            }}
            onClick={(event) => {
              if (!onSelectDay) return;
              event.stopPropagation();
              onSelectDay(dayKey);
            }}
          >
            <span>{formatDate(date)}</span>
            {workoutLabel && (
              <span
                style={{
                  fontSize: compact ? "0.5rem" : "0.55rem",
                  color: "#9ca3af",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
                title={workoutLabel}
              >
                {workoutLabel}
              </span>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

const slotStyle: CSSProperties = {
  borderRadius: "6px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
  color: "#e5e7eb",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  aspectRatio: "5 / 4",
};
