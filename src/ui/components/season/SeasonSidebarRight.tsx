import type { CSSProperties } from "react";
import type { BlockInstance, Season, WeekInstance } from "../../../season";

type FocusCounts = Record<string, number>;

type SeasonSidebarRightProps = {
  selectedBlock: BlockInstance | null;
  selectedWeek: WeekInstance | null;
};

function countWeekFocus(weeks: WeekInstance[]): FocusCounts {
  const counts: FocusCounts = {};
  weeks.forEach((week) => {
    const key = week.focus ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

export default function SeasonSidebarRight({ selectedBlock, selectedWeek }: SeasonSidebarRightProps) {
  return (
    <aside style={panelStyle}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>Summary</div>
      {!selectedBlock && !selectedWeek && (
        <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
          Select a block or week to see details.
        </div>
      )}

      {selectedBlock && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={sectionTitleStyle}>Block</div>
          <div style={valueStyle}>{selectedBlock.name}</div>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
            {selectedBlock.weeks.length} weeks
          </div>
          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.25rem" }}>
            {Object.entries(countWeekFocus(selectedBlock.weeks)).map(([focus, count]) => (
              <div key={focus} style={pillStyle}>
                {focus === "none" ? "No Focus" : focus} - {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedWeek && (
        <div>
          <div style={sectionTitleStyle}>Week</div>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.85rem" }}>
            <div>
              <span style={labelStyle}>Focus</span>
              {selectedWeek.focus ?? "None"}
            </div>
            <div>
              <span style={labelStyle}>Stress</span>
              {selectedWeek.stress}
            </div>
            <div>
              <span style={labelStyle}>Volume</span>
              {selectedWeek.volume}
            </div>
            <div>
              <span style={labelStyle}>Intensity</span>
              {selectedWeek.intensity}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

const panelStyle: CSSProperties = {
  backgroundColor: "#0a0f15",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  padding: "1rem",
  height: "fit-content",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "0.3rem",
};

const valueStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
};

const labelStyle: CSSProperties = {
  display: "inline-block",
  width: "80px",
  color: "#9ca3af",
};

const pillStyle: CSSProperties = {
  padding: "0.2rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #1f2937",
  backgroundColor: "#0f172a",
  color: "#e5e7eb",
  fontSize: "0.75rem",
  width: "fit-content",
};

