import type { CSSProperties } from "react";
import type { BlockInstance, WeekInstance } from "../../../season";

const intensityValue: Record<string, number> = {
  "low": 0,
  "low-med": 1,
  "med": 2,
  "med-high": 3,
  "high": 4,
  "very-high": 5,
};

type SeasonIntensityChartProps = {
  blocks: BlockInstance[];
};

function labelValue(label: WeekInstance["stress"]): number {
  return intensityValue[label] ?? 0;
}

function scoreForWeek(week: WeekInstance): number {
  const stress = labelValue(week.stress);
  const volume = labelValue(week.volume);
  const intensity = labelValue(week.intensity);
  return (stress + volume + intensity) / 3;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function blockHue(blockId: string): number {
  return hashString(blockId) % 360;
}

function weekColor(blockId: string, score: number): string {
  const hue = blockHue(blockId);
  const clamped = Math.max(0, Math.min(5, score));
  const lightness = 35 + (clamped / 5) * 45;
  return `hsl(${hue} 65% ${lightness}%)`;
}

export default function SeasonIntensityChart({ blocks }: SeasonIntensityChartProps) {
  return (
    <div style={chartCardStyle}>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>Season Intensity</div>
      <div style={chartStyle}>
        {blocks.map((block, blockIndex) => (
          <div key={block.blockId} style={blockGroupStyle}>
            {block.weeks.map((week) => {
              const score = scoreForWeek(week);
              const height = 16 + score * 18;
              return (
                <div
                  key={week.weekId}
                  title={`${block.name} - ${week.focus ?? "none"} - ${score.toFixed(1)} / 5`}
                  style={{
                    ...barStyle,
                    height: `${height}px`,
                    backgroundColor: weekColor(block.blockId, score),
                  }}
                />
              );
            })}
            {blockIndex < blocks.length - 1 && <div style={dividerStyle} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const chartCardStyle: CSSProperties = {
  padding: "0.75rem",
  borderRadius: "12px",
  border: "1px solid #1f2937",
  backgroundColor: "#0f141c",
};

const chartStyle: CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  alignItems: "flex-end",
  overflowX: "auto",
  paddingBottom: "0.5rem",
};

const blockGroupStyle: CSSProperties = {
  display: "flex",
  gap: "0.35rem",
  alignItems: "flex-end",
  padding: "0.35rem 0.5rem",
  borderRadius: "10px",
  backgroundColor: "#0b1220",
  border: "1px solid #1f2937",
};

const barStyle: CSSProperties = {
  width: "14px",
  borderRadius: "6px",
  border: "1px solid rgba(15, 23, 42, 0.4)",
};

const dividerStyle: CSSProperties = {
  width: "1px",
  height: "100%",
  alignSelf: "stretch",
  backgroundColor: "rgba(148, 163, 184, 0.2)",
  marginLeft: "0.35rem",
  marginRight: "0.2rem",
};

