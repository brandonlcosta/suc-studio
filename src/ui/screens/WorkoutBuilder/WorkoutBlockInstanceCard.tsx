import { useState } from "react";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { LadderDirection, TierLabel, WorkoutBlockInstance } from "./builderTypes";
import DurationInput from "./DurationInput";

interface WorkoutBlockInstanceCardProps {
  instance: WorkoutBlockInstance;
  effort: EffortBlockDefinition;
  blockIndex?: number;
  nextTier?: TierLabel | null;
  allNextTiers?: TierLabel[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WorkoutBlockInstance>) => void;
  onInsertAfter?: (blockIndex: number, effortBlockId: string) => void;
  insertAfterIndex?: number;
  showLadderControls?: boolean;
  ladderDirection?: LadderDirection;
  onChangeLadderDirection?: (direction: LadderDirection) => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onCopyBlock?: (blockIndex: number, targetTiers: TierLabel[]) => void;
  isLocked: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

const parseEffortMeta = (target: string) => {
  return target
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" - ");
};

export default function WorkoutBlockInstanceCard({
  instance,
  effort,
  blockIndex,
  nextTier,
  allNextTiers,
  onDelete,
  onUpdate,
  onInsertAfter,
  insertAfterIndex,
  showLadderControls = false,
  ladderDirection = "up",
  onChangeLadderDirection,
  onToggleExpand,
  isExpanded = true,
  onCopyBlock,
  isLocked,
  dragHandleProps,
  isDragging,
}: WorkoutBlockInstanceCardProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const metaLine = parseEffortMeta(effort.target);
  const allowHours = effort.id === "aerobic" || effort.id === "tempo";

  const handleCopyToNext = () => {
    if (blockIndex !== undefined && nextTier && onCopyBlock) {
      onCopyBlock(blockIndex, [nextTier]);
    }
  };

  const handleCopyToAll = () => {
    if (blockIndex !== undefined && allNextTiers && allNextTiers.length > 0 && onCopyBlock) {
      onCopyBlock(blockIndex, allNextTiers);
    }
  };

  const handleDurationChange = (value: string | null) => {
    onUpdate(instance.id, { duration: value === "" ? null : value });
  };

  const handleRestChange = (value: string | null) => {
    onUpdate(instance.id, { rest: value === "" ? null : value });
  };

  const handleRepsChange = (value: string) => {
    if (value === "") {
      onUpdate(instance.id, { reps: null });
      return;
    }
    const parsed = Number(value);
    onUpdate(instance.id, { reps: Number.isNaN(parsed) ? null : parsed });
  };

  const handleNotesChange = (value: string) => {
    onUpdate(instance.id, { notes: value === "" ? null : value });
  };

  const handleAddInterval = () => {
    if (blockIndex === undefined || !onInsertAfter) return;
    const targetIndex = insertAfterIndex ?? blockIndex;
    onInsertAfter(targetIndex, effort.id);
  };

  return (
    <div
      style={{
        borderRadius: "12px",
        border: `2px solid ${effort.accent}`,
        padding: "10px 12px",
        backgroundColor: "#111111",
        color: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      <div style={blockLayoutStyle}>
        <div style={leftColumnStyle}>
          <div
            {...dragHandleProps}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: isLocked ? "default" : "grab",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {effort.label}
          </div>

          <div style={metaHeaderStyle}>{metaLine}</div>

          <div style={buttonStackStyle}>
            {!isLocked && onCopyBlock && allNextTiers && allNextTiers.length > 0 && (
              <>
                {nextTier && (
                  <button type="button" onClick={handleCopyToNext} style={copyButtonStyle}>
                    {"-> "}{nextTier}
                  </button>
                )}
                {allNextTiers.length > 1 && (
                  <button type="button" onClick={handleCopyToAll} style={copyButtonStyle}>
                    {"-> All"}
                  </button>
                )}
              </>
            )}
            {showLadderControls && onToggleExpand && (
              <button type="button" onClick={onToggleExpand} style={actionButtonStyle}>
                {isExpanded ? "Collapse" : "Expand"}
              </button>
            )}
            <button type="button" onClick={() => setIsNotesExpanded((prev) => !prev)} style={actionButtonStyle}>
              Notes
            </button>
            <button
              type="button"
              onClick={() => onDelete(instance.id)}
              disabled={isLocked}
              style={{
                ...actionButtonStyle,
                borderColor: "#ff5a5a",
                color: "#ff5a5a",
                opacity: isLocked ? 0.4 : 1,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>

        <div style={rightColumnStyle}>
          <div style={fieldBlockStyle}>
            <label style={labelStyle}>Reps</label>
            <input
              type="number"
              value={instance.reps ?? ""}
              onChange={(event) => handleRepsChange(event.target.value)}
              style={repsInputStyle}
              disabled={isLocked}
            />
          </div>

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>Duration</label>
            <DurationInput
              value={instance.duration ?? null}
              onChange={handleDurationChange}
              disabled={isLocked}
              allowNull
              allowHours={allowHours}
            />
            {effort.id === "ladder" && showLadderControls && !isLocked && onInsertAfter && blockIndex !== undefined && (
              <button type="button" onClick={handleAddInterval} style={miniActionStyle}>
                Add Interval
              </button>
            )}
          </div>

          {effort.id === "ladder" && showLadderControls && (
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>Direction</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { value: "up", label: "Up" },
                  { value: "down", label: "Down" },
                  { value: "updown", label: "Up + Down" },
                ].map((option) => (
                  <label key={`ladder-direction-${option.value}`} style={directionOptionStyle}>
                    <input
                      type="radio"
                      name={`ladder-direction-${instance.id}`}
                      value={option.value}
                      checked={ladderDirection === option.value}
                      onChange={() => onChangeLadderDirection?.(option.value as LadderDirection)}
                      disabled={isLocked}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={fieldBlockStyle}>
            <label style={labelStyle}>Rest</label>
            <DurationInput
              value={instance.rest ?? null}
              onChange={handleRestChange}
              disabled={isLocked}
              allowNull
            />
          </div>
        </div>
      </div>

      {isNotesExpanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={instance.notes ?? ""}
            onChange={(event) => handleNotesChange(event.target.value)}
            style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
            disabled={isLocked}
          />
        </div>
      )}
    </div>
  );
}

const blockLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const leftColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
};

const rightColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const buttonStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const fieldBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const metaHeaderStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#8f9aa9",
  letterSpacing: "0.3px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "#c9c9c9",
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #2b2b2b",
  backgroundColor: "#0b0b0b",
  color: "#f5f5f5",
  fontSize: "12px",
};

const actionButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid #4b4b4b",
  backgroundColor: "transparent",
  color: "#f5f5f5",
  fontSize: "10px",
  cursor: "pointer",
};

const copyButtonStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderRadius: "6px",
  border: "1px solid #7cdb53",
  backgroundColor: "transparent",
  color: "#7cdb53",
  fontSize: "9px",
  cursor: "pointer",
};

const miniActionStyle: React.CSSProperties = {
  marginTop: "6px",
  padding: "4px 6px",
  borderRadius: "6px",
  border: "1px solid #3a3a3a",
  backgroundColor: "transparent",
  color: "#c9c9c9",
  fontSize: "10px",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const directionOptionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "11px",
  color: "#e5e7eb",
};

const repsInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  borderRadius: "6px",
  border: "1px solid #2b2b2b",
  backgroundColor: "#0b0b0b",
  color: "#f5f5f5",
  fontSize: "12px",
  textAlign: "center",
};
