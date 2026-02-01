import type { DragEvent } from "react";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { EffortBlockDragPayload } from "./builderTypes";

interface EffortBlockCardProps {
  block: EffortBlockDefinition;
}

export default function EffortBlockCard({ block }: EffortBlockCardProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    const payload: EffortBlockDragPayload = {
      effortBlockId: block.id,
      label: block.label,
      target: block.target,
      accent: block.accent,
    };
    event.dataTransfer.setData("application/x-suc-effort-block", JSON.stringify(payload));
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--overlay-medium)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--overlay-dark)";
      }}
      style={{
        border: "1px solid var(--border-dark)",
        borderRadius: "12px",
        padding: "12px",
        backgroundColor: "var(--overlay-dark)",
        boxShadow: `inset 0 0 0 2px ${block.accent}`,
        cursor: "grab",
        transition: "background-color 0.15s ease",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
        {block.label}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{block.target}</div>
    </div>
  );
}
