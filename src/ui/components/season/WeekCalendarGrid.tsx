import type { CSSProperties } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type WeekCalendarGridProps = {
  compact?: boolean;
};

export default function WeekCalendarGrid({ compact = false }: WeekCalendarGridProps) {
  return (
    <div style={gridStyle}>
      {days.map((day) => (
        <div key={`${day}-label`} style={labelStyle}>
          {day}
        </div>
      ))}
      {days.map((day) => (
        <div key={`${day}-slot`} style={{ ...slotStyle, height: compact ? "16px" : "24px" }} />
      ))}
    </div>
  );
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "0.35rem",
  fontSize: "0.7rem",
  color: "#6b7280",
};

const labelStyle: CSSProperties = {
  textAlign: "center",
  padding: "0.15rem 0",
};

const slotStyle: CSSProperties = {
  borderRadius: "6px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
};
