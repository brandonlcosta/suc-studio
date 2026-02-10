import type { CSSProperties } from "react";
import type { DayKey, WeekDays } from "../../../season";
import { DAY_KEYS } from "../../../season";
import type { EventSummary } from "../../hooks/useEvents";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarWeekGridProps = {
  weekStartDate: Date;
  compact?: boolean;
  dayAssignments?: WeekDays;
  workoutLabels?: Record<string, string>;
  eventLookup?: Record<string, EventSummary>;
  weekEventIds?: string[];
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

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeEventDateKey(eventDate?: string): string | null {
  if (!eventDate) return null;
  const match = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
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
  eventLookup = {},
  weekEventIds = [],
  selectedDay = null,
  onSelectDay,
}: CalendarWeekGridProps) {
  const dates = dayLabels.map((_, index) => addDays(weekStartDate, index));
  const normalizedDays = normalizeDays(dayAssignments);
  const weekEvents = weekEventIds
    .map((eventId) => eventLookup[eventId])
    .filter(Boolean)
    .map((event) => ({
      ...event,
      dateKey: normalizeEventDateKey(event.eventDate),
    }));

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
          const workoutIdsRaw = Array.isArray(assignment?.workoutIds)
            ? assignment?.workoutIds
            : assignment?.workoutId
              ? [assignment.workoutId]
              : [];
          const workoutIds = workoutIdsRaw.filter((id) => typeof id === "string" && id.trim().length > 0).slice(0, 2);
          const workoutLabelList = workoutIds.map((id) => workoutLabels[id] ?? "Assigned");
          const dayDateKey = formatDateKey(date);
          const matchingEvents = weekEvents.filter((event) => event.dateKey === dayDateKey);
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
            {workoutLabelList.map((workoutLabel, workoutIndex) => (
              <span
                key={`${dayKey}-${workoutIds[workoutIndex] ?? workoutLabel}`}
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
            ))}
            {matchingEvents.map((event) => (
              <span
                key={`${event.eventId}-${dayDateKey}`}
                style={{
                  fontSize: compact ? "0.48rem" : "0.52rem",
                  color: "#93c5fd",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
                title={event.eventName}
              >
                {event.eventName}
              </span>
            ))}
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
