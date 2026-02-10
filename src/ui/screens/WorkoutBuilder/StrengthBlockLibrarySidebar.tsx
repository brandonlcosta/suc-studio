import { useMemo, useState } from "react";
import type { StrengthWorkoutType } from "../../types";
import { strengthExerciseLibrary, strengthWorkoutTypeOptions } from "./strengthBlocks";

type StrengthLibraryPayload =
  | { domain: "strength"; type: "strength_exercise"; name: string }
  | { domain: "strength"; type: "circuit_block"; rounds?: number }
  | { domain: "strength"; type: "mobility_block"; name?: string; duration?: string }
  | {
      domain: "strength";
      type: "crosstrain_block";
      modality?: "bike" | "row" | "swim" | "elliptical" | "hike";
      duration?: string;
    };

interface StrengthBlockLibrarySidebarProps {
  activeType: StrengthWorkoutType;
  onTypeChange: (nextType: StrengthWorkoutType) => void;
  isLocked: boolean;
}

const cardBase: React.CSSProperties = {
  border: "1px solid var(--border-dark)",
  borderRadius: "12px",
  padding: "10px",
  backgroundColor: "var(--overlay-dark)",
  cursor: "grab",
  transition: "background-color 0.15s ease",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export default function StrengthBlockLibrarySidebar({
  activeType,
  onTypeChange,
  isLocked,
}: StrengthBlockLibrarySidebarProps) {
  const [customName, setCustomName] = useState("");
  const [customEntries, setCustomEntries] = useState<Array<{ id: string; name: string; category: StrengthWorkoutType }>>(
    []
  );

  const filteredExercises = useMemo(() => {
    const base = strengthExerciseLibrary.filter((exercise) => exercise.categories.includes(activeType));
    const custom = customEntries.filter((entry) => entry.category === activeType);
    return [...base, ...custom.map((entry) => ({ id: entry.id, name: entry.name, categories: [entry.category] }))];
  }, [activeType, customEntries]);

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name) return;
    setCustomEntries((prev) => [
      ...prev,
      { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, category: activeType },
    ]);
    setCustomName("");
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, payload: StrengthLibraryPayload) => {
    if (isLocked) return;
    event.dataTransfer.setData("application/x-suc-strength-block", JSON.stringify(payload));
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside
      style={{
        width: "260px",
        borderRight: "1px solid var(--border-dark)",
        padding: "16px",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "sticky",
        top: "16px",
        alignSelf: "flex-start",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.6px" }}>STRENGTH WORKOUTS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {strengthWorkoutTypeOptions.map((option) => {
          const isActive = option.id === activeType;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onTypeChange(option.id)}
              disabled={isLocked}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: `1px solid ${isActive ? "#ff5a5a" : "var(--border-dark)"}`,
                backgroundColor: isActive ? "rgba(255, 90, 90, 0.15)" : "transparent",
                color: isActive ? "#ffb4b4" : "var(--text-secondary)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.4px", color: "var(--text-secondary)" }}>
        EXERCISES
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            draggable={!isLocked}
            onDragStart={(event) =>
              handleDragStart(event, { domain: "strength", type: "strength_exercise", name: exercise.name })
            }
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--overlay-medium)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--overlay-dark)";
            }}
            style={{
              ...cardBase,
              boxShadow: "inset 0 0 0 2px rgba(255, 90, 90, 0.7)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700 }}>{exercise.name}</div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Strength Exercise</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.4px", color: "var(--text-secondary)" }}>
          CUSTOM EXERCISE
        </div>
        <input
          type="text"
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          placeholder="Exercise name"
          style={inputStyle}
        />
        <button type="button" onClick={handleAddCustom} style={addButtonStyle} disabled={isLocked}>
          Add Exercise
        </button>
      </div>

      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.4px", color: "var(--text-secondary)" }}>
        BLOCKS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          draggable={!isLocked}
          onDragStart={(event) => handleDragStart(event, { domain: "strength", type: "circuit_block", rounds: 3 })}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-medium)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-dark)";
          }}
          style={{
            ...cardBase,
            boxShadow: "inset 0 0 0 2px rgba(51, 208, 255, 0.8)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700 }}>Circuit Block</div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Rounds + nested exercises</div>
        </div>
        <div
          draggable={!isLocked}
          onDragStart={(event) =>
            handleDragStart(event, {
              domain: "strength",
              type: "mobility_block",
              name: "Mobility Flow",
              duration: "8min",
            })
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-medium)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-dark)";
          }}
          style={{
            ...cardBase,
            boxShadow: "inset 0 0 0 2px rgba(187, 99, 255, 0.8)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700 }}>Mobility Block</div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Cue-based flow</div>
        </div>
        <div
          draggable={!isLocked}
          onDragStart={(event) =>
            handleDragStart(event, {
              domain: "strength",
              type: "crosstrain_block",
              modality: "bike",
              duration: "30min",
            })
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-medium)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--overlay-dark)";
          }}
          style={{
            ...cardBase,
            boxShadow: "inset 0 0 0 2px rgba(247, 201, 72, 0.85)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700 }}>Crosstrain</div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Aerobic modality</div>
        </div>
      </div>
    </aside>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid var(--border-dark)",
  backgroundColor: "transparent",
  color: "var(--text-primary)",
  fontSize: "12px",
};

const addButtonStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid var(--border-dark)",
  backgroundColor: "transparent",
  color: "var(--text-primary)",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
};
