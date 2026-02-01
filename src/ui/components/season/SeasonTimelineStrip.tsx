import type { CSSProperties } from "react";
import type { BlockInstance, WeekInstance } from "../../../season";
import type { BlockTemplate } from "./presets";
import GhostBlockPreview from "./GhostBlockPreview";

type SeasonTimelineStripProps = {
  blocks: BlockInstance[];
  onSelectBlock: (blockId: string) => void;
  selectedBlockId: string | null;
  onScrollToBlock: (blockId: string) => void;
  dragTemplate?: BlockTemplate | null;
  dragTargetBlockId?: string | null;
  onDragOverBlock?: (blockId: string) => void;
  onDropTemplate?: () => void;
};

const focusColors: Record<string, string> = {
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

function dominantFocus(weeks: WeekInstance[]): string {
  const counts: Record<string, number> = {};
  weeks.forEach((week) => {
    const key = week.focus ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  let best = "none";
  let bestCount = -1;
  Object.entries(counts).forEach(([key, count]) => {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  });
  return best;
}

function avgLabel(weeks: WeekInstance[]): string {
  if (weeks.length === 0) return "-";
  const total = weeks.reduce(
    (acc, week) => ({
      stress: acc.stress + (intensityMap[week.stress] ?? 0),
      volume: acc.volume + (intensityMap[week.volume] ?? 0),
      intensity: acc.intensity + (intensityMap[week.intensity] ?? 0),
    }),
    { stress: 0, volume: 0, intensity: 0 }
  );
  const count = weeks.length;
  return `S:${(total.stress / count).toFixed(1)} V:${(total.volume / count).toFixed(1)} I:${(
    total.intensity / count
  ).toFixed(1)}`;
}

export default function SeasonTimelineStrip({
  blocks,
  onSelectBlock,
  selectedBlockId,
  onScrollToBlock,
  dragTemplate = null,
  dragTargetBlockId = null,
  onDragOverBlock,
  onDropTemplate,
}: SeasonTimelineStripProps) {
  return (
    <div style={stripStyle}>
      {blocks.map((block) => {
        const focus = dominantFocus(block.weeks);
        const color = focusColors[focus] ?? focusColors.none;
        const title = `${block.name} - ${block.weeks.length} weeks - ${avgLabel(block.weeks)}`;
        return (
          <div key={block.blockId} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => {
                onSelectBlock(block.blockId);
                onScrollToBlock(block.blockId);
              }}
              onDragOver={(event) => {
                if (!dragTemplate || !onDragOverBlock) return;
                event.preventDefault();
                onDragOverBlock(block.blockId);
              }}
              onDrop={(event) => {
                if (!dragTemplate || !onDropTemplate) return;
                event.preventDefault();
                onDropTemplate();
              }}
              title={title}
              style={{
                ...pillStyle,
                flexGrow: Math.max(1, block.weeks.length),
                borderColor: selectedBlockId === block.blockId ? "#e5e7eb" : "#1f2937",
                boxShadow: selectedBlockId === block.blockId ? `0 0 0 2px ${color} inset` : "none",
              }}
            >
              <span style={{ ...dotStyle, backgroundColor: color }} />
              <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {block.name}
              </span>
            </button>
            {dragTemplate && dragTargetBlockId === block.blockId && (
              <GhostBlockPreview template={dragTemplate} widthWeeks={dragTemplate.weeks.length} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const stripStyle: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "stretch",
  padding: "0.75rem",
  borderRadius: "12px",
  border: "1px solid #1f2937",
  backgroundColor: "#0f141c",
  overflowX: "auto",
};

const pillStyle: CSSProperties = {
  minWidth: "80px",
  borderRadius: "999px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
  color: "#f5f5f5",
  padding: "0.35rem 0.75rem",
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  cursor: "pointer",
};

const dotStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
};


