import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { BlockInstance } from "../../../season";

const buttonStyle: CSSProperties = {
  padding: "0.35rem 0.7rem",
  borderRadius: "6px",
  border: "1px solid #374151",
  backgroundColor: "#111827",
  color: "#f5f5f5",
  cursor: "pointer",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid #7f1d1d",
  backgroundColor: "#1f1315",
  color: "#fecaca",
};

type BlockHeaderProps = {
  block: BlockInstance;
  blockIndex: number;
  totalBlocks: number;
  isBusy: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddBlockAfter: () => void;
  onDeleteBlock: () => void;
  onMoveBlock: (newIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onApplyTemplate: () => void;
  dragTemplateActive: boolean;
  onRenameBlock: (name: string) => void;
};

const intensityMap: Record<string, number> = {
  "low": 0,
  "low-med": 1,
  "med": 2,
  "med-high": 3,
  "high": 4,
  "very-high": 5,
};

function avgLevel(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function toLabel(avg: number): string {
  if (avg <= 0.5) return "low";
  if (avg <= 1.5) return "low-med";
  if (avg <= 2.5) return "med";
  if (avg <= 3.5) return "med-high";
  if (avg <= 4.5) return "high";
  return "very-high";
}

export default function BlockHeader({
  block,
  blockIndex,
  totalBlocks,
  isBusy,
  isSelected,
  onSelect,
  isCollapsed,
  onToggleCollapse,
  onAddBlockAfter,
  onDeleteBlock,
  onMoveBlock,
  onDragStart,
  onDragEnd,
  isDragging,
  onApplyTemplate,
  dragTemplateActive,
  onRenameBlock,
}: BlockHeaderProps) {
  const [isDragHover, setIsDragHover] = useState(false);
  const [draftName, setDraftName] = useState(block.name);
  const stressAvg = avgLevel(block.weeks.map((week) => intensityMap[week.stress] ?? 0));
  const volumeAvg = avgLevel(block.weeks.map((week) => intensityMap[week.volume] ?? 0));
  const intensityAvg = avgLevel(block.weeks.map((week) => intensityMap[week.intensity] ?? 0));

  useEffect(() => {
    setDraftName(block.name);
  }, [block.name]);

  const commitName = () => {
    const next = draftName.trim();
    if (!next) {
      setDraftName(block.name);
      return;
    }
    if (next !== block.name) {
      onRenameBlock(next);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div
          onClick={onSelect}
          style={{
            background: "transparent",
            border: isSelected ? "1px solid #4b5563" : "1px solid transparent",
            borderRadius: "10px",
            padding: "0.4rem 0.6rem",
            textAlign: "left",
            cursor: "pointer",
            color: "inherit",
          }}
          role="button"
        >
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Block</div>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setDraftName(block.name);
                event.currentTarget.blur();
              }
            }}
            onClick={(event) => event.stopPropagation()}
            readOnly={isBusy}
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              border: "none",
              background: "transparent",
              color: "inherit",
              padding: 0,
              width: "100%",
            }}
          />
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{block.weeks.length} weeks</div>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
            {block.weeks.length} weeks | Stress: {toLabel(stressAvg)} | Volume: {toLabel(volumeAvg)} | Intensity: {toLabel(intensityAvg)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
          <button onClick={onToggleCollapse} disabled={isBusy} style={buttonStyle}>
            {isCollapsed ? <ChevronDown size={14} style={{ opacity: 0.7 }} /> : <ChevronUp size={14} style={{ opacity: 0.7 }} />}
          </button>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={onApplyTemplate} disabled={isBusy} style={buttonStyle}>
              Apply Template
            </button>
            <button
              onClick={() => onMoveBlock(blockIndex - 1)}
              disabled={isBusy || blockIndex === 0}
              style={buttonStyle}
            >
              Move Up
            </button>
            <button
              onClick={() => onMoveBlock(blockIndex + 1)}
              disabled={isBusy || blockIndex >= totalBlocks - 1}
              style={buttonStyle}
            >
              Move Down
            </button>
            <span
              draggable={!isBusy && !dragTemplateActive}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", block.blockId);
                onDragStart();
              }}
              onDragEnd={onDragEnd}
              onMouseEnter={() => setIsDragHover(true)}
              onMouseLeave={() => setIsDragHover(false)}
              title="Drag to reorder"
              style={{
                padding: "0.35rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid #374151",
                cursor: isBusy ? "not-allowed" : "grab",
                backgroundColor: isDragging ? "#1f2937" : "#111827",
                color: "#9ca3af",
                fontSize: "0.9rem",
                userSelect: "none",
                opacity: dragTemplateActive ? 0.4 : 1,
              }}
            >
              {isDragHover ? <GripVertical size={14} style={{ opacity: 0.6 }} /> : null}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={onDeleteBlock} disabled={isBusy} style={dangerButtonStyle}>
              Delete Block
            </button>
            <button onClick={onAddBlockAfter} disabled={isBusy} style={buttonStyle}>
              Add Block After
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
