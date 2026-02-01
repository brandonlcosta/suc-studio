import type { CSSProperties } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekCalendarStrip() {
  return (
    <div style={stripStyle}>
      {days.map((day) => (
        <div key={day} style={dayStyle}>
          {day}
        </div>
      ))}
    </div>
  );
}

const stripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "0.25rem",
  fontSize: "0.7rem",
  color: "#6b7280",
};

const dayStyle: CSSProperties = {
  textAlign: "center",
  padding: "0.25rem 0",
  borderRadius: "6px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
};
