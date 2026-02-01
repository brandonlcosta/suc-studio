import type { CSSProperties } from "react";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarWeekGridProps = {
  weekStartDate: Date;
  compact?: boolean;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CalendarWeekGrid({ weekStartDate, compact = false }: CalendarWeekGridProps) {
  const dates = dayLabels.map((_, index) => addDays(weekStartDate, index));

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
        {dates.map((date, index) => (
          <div
            key={`${date.toISOString()}-${index}`}
            style={{
              ...slotStyle,
              fontSize: compact ? "0.52rem" : "0.56rem",
              minHeight: compact ? "28px" : "34px",
            }}
          >
            {formatDate(date)}
          </div>
        ))}
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
  alignItems: "center",
  justifyContent: "center",
  aspectRatio: "5 / 4",
};
