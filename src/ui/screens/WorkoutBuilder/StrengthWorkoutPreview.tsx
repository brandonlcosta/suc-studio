import type { StrengthBlock } from "../../types";

interface StrengthWorkoutPreviewProps {
  blocks: StrengthBlock[];
}

const accentMap: Record<StrengthBlock["type"], string> = {
  strength_exercise: "#ff5a5a",
  circuit_block: "#33d0ff",
  mobility_block: "#bb63ff",
  crosstrain_block: "#f7c948",
};

export default function StrengthWorkoutPreview({ blocks }: StrengthWorkoutPreviewProps) {
  return (
    <div
      style={{
        border: "1px solid #2a2f3a",
        borderRadius: "14px",
        padding: "14px",
        backgroundColor: "#0b111b",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.4px", color: "#f5f5f5" }}>
        Strength Preview
      </div>
      {blocks.length === 0 && (
        <div style={{ fontSize: "11px", color: "#9aa0a6" }}>No strength blocks yet. Drag blocks to begin.</div>
      )}
      {blocks.map((block) => (
        <div
          key={block.id}
          style={{
            border: `1px solid ${accentMap[block.type]}`,
            borderRadius: "12px",
            padding: "10px",
            backgroundColor: "rgba(15, 21, 34, 0.8)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#f5f5f5" }}>
            {block.type === "strength_exercise" && block.name}
            {block.type === "circuit_block" && `Circuit x${block.rounds}`}
            {block.type === "mobility_block" && block.name}
            {block.type === "crosstrain_block" && `${block.modality.toUpperCase()} ${block.duration}`}
          </div>
          {block.type === "strength_exercise" && (
            <div style={{ fontSize: "11px", color: "#c9c9c9" }}>
              {block.sets ? `${block.sets} sets` : "Sets"} {block.reps ? `· ${block.reps} reps` : ""}{" "}
              {block.load ? `· ${block.load}` : ""}
            </div>
          )}
          {block.type === "circuit_block" && (
            <div style={{ fontSize: "11px", color: "#c9c9c9" }}>
              {block.exercises.length} exercises
            </div>
          )}
          {block.type === "mobility_block" && (
            <div style={{ fontSize: "11px", color: "#c9c9c9" }}>{block.duration}</div>
          )}
          {block.type === "crosstrain_block" && (
            <div style={{ fontSize: "11px", color: "#c9c9c9" }}>
              {block.target ? `Target ${block.target}` : "Aerobic focus"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
