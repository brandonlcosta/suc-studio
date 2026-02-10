import type { StrengthBlock, StrengthExerciseBlock } from "../../types";

interface StrengthBlockCardProps {
  block: StrengthBlock;
  isLocked: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: StrengthBlock) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const blockColors: Record<StrengthBlock["type"], { border: string; text: string; background: string }> = {
  strength_exercise: {
    border: "#ff5a5a",
    text: "#ffb4b4",
    background: "rgba(255, 90, 90, 0.08)",
  },
  circuit_block: {
    border: "#33d0ff",
    text: "#b7ecff",
    background: "rgba(51, 208, 255, 0.12)",
  },
  mobility_block: {
    border: "#bb63ff",
    text: "#e3c2ff",
    background: "rgba(187, 99, 255, 0.12)",
  },
  crosstrain_block: {
    border: "#f7c948",
    text: "#ffe39a",
    background: "rgba(247, 201, 72, 0.12)",
  },
};

export default function StrengthBlockCard({
  block,
  isLocked,
  onDelete,
  onUpdate,
  dragHandleProps,
}: StrengthBlockCardProps) {
  const colors = blockColors[block.type];

  const handleExerciseUpdate = (index: number, updates: Partial<StrengthExerciseBlock>) => {
    if (block.type !== "circuit_block") return;
    const nextExercises = block.exercises.map((exercise, exerciseIndex) =>
      exerciseIndex === index ? { ...exercise, ...updates } : exercise
    );
    onUpdate(block.id, { ...block, exercises: nextExercises });
  };

  const handleExerciseDelete = (index: number) => {
    if (block.type !== "circuit_block") return;
    const nextExercises = block.exercises.filter((_, exerciseIndex) => exerciseIndex !== index);
    onUpdate(block.id, { ...block, exercises: nextExercises });
  };

  const handleExerciseDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isLocked || block.type !== "circuit_block") return;
    event.preventDefault();
    const raw =
      event.dataTransfer.getData("application/x-suc-strength-block") ||
      event.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { domain?: string; type?: string; name?: string };
      if (payload.domain !== "strength" || payload.type !== "strength_exercise" || !payload.name) return;
      const next: StrengthExerciseBlock = {
        type: "strength_exercise",
        id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: payload.name,
        sets: 3,
        reps: "8-10",
        load: "",
        notes: "",
      };
      onUpdate(block.id, { ...block, exercises: [...block.exercises, next] });
    } catch {
      return;
    }
  };

  const handleExerciseDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isLocked || block.type !== "circuit_block") return;
    event.preventDefault();
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "14px",
        padding: "12px",
        backgroundColor: colors.background,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            {...dragHandleProps}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "6px",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              cursor: isLocked ? "default" : "grab",
            }}
          >
            ::
          </div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text }}>
            {block.type === "strength_exercise" && "Strength Exercise"}
            {block.type === "circuit_block" && "Circuit Block"}
            {block.type === "mobility_block" && "Mobility Block"}
            {block.type === "crosstrain_block" && "Crosstrain"}
          </div>
        </div>
        {!isLocked && (
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            style={deleteButtonStyle}
          >
            Remove
          </button>
        )}
      </div>

      {block.type === "strength_exercise" && (
        <div style={gridStyle}>
          <label style={labelStyle}>
            Name
            <input
              type="text"
              value={block.name}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, name: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Sets
            <input
              type="number"
              min={1}
              value={block.sets ?? ""}
              disabled={isLocked}
              onChange={(event) =>
                onUpdate(block.id, { ...block, sets: event.target.value ? Number(event.target.value) : undefined })
              }
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Reps
            <input
              type="text"
              value={block.reps ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, reps: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Load
            <input
              type="text"
              value={block.load ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, load: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Notes
            <input
              type="text"
              value={block.notes ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, notes: event.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
      )}

      {block.type === "circuit_block" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={labelStyle}>
            Rounds
            <input
              type="number"
              min={1}
              value={block.rounds}
              disabled={isLocked}
              onChange={(event) =>
                onUpdate(block.id, { ...block, rounds: event.target.value ? Number(event.target.value) : 1 })
              }
              style={inputStyle}
            />
          </label>
          <div
            onDragOver={handleExerciseDragOver}
            onDrop={handleExerciseDrop}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: "1px dashed rgba(160, 102, 255, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              backgroundColor: "rgba(160, 102, 255, 0.08)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Drop strength exercises here
            </div>
            {block.exercises.map((exercise, index) => (
              <div key={exercise.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600 }}>{exercise.name}</div>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleExerciseDelete(index)}
                      style={deleteButtonStyle}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={gridStyle}>
                  <label style={labelStyle}>
                    Name
                    <input
                      type="text"
                      value={exercise.name}
                      disabled={isLocked}
                      onChange={(event) => handleExerciseUpdate(index, { name: event.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={labelStyle}>
                    Sets
                    <input
                      type="number"
                      min={1}
                      value={exercise.sets ?? ""}
                      disabled={isLocked}
                      onChange={(event) =>
                        handleExerciseUpdate(index, {
                          sets: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={labelStyle}>
                    Reps
                    <input
                      type="text"
                      value={exercise.reps ?? ""}
                      disabled={isLocked}
                      onChange={(event) => handleExerciseUpdate(index, { reps: event.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={labelStyle}>
                    Load
                    <input
                      type="text"
                      value={exercise.load ?? ""}
                      disabled={isLocked}
                      onChange={(event) => handleExerciseUpdate(index, { load: event.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                    Notes
                    <input
                      type="text"
                      value={exercise.notes ?? ""}
                      disabled={isLocked}
                      onChange={(event) => handleExerciseUpdate(index, { notes: event.target.value })}
                      style={inputStyle}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === "mobility_block" && (
        <div style={gridStyle}>
          <label style={labelStyle}>
            Name
            <input
              type="text"
              value={block.name}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, name: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Duration
            <input
              type="text"
              value={block.duration}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, duration: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Cues
            <input
              type="text"
              value={block.cues ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, cues: event.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
      )}

      {block.type === "crosstrain_block" && (
        <div style={gridStyle}>
          <label style={labelStyle}>
            Modality
            <select
              value={block.modality}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, modality: event.target.value as typeof block.modality })}
              style={inputStyle}
            >
              <option value="bike">Bike</option>
              <option value="row">Row</option>
              <option value="swim">Swim</option>
              <option value="elliptical">Elliptical</option>
              <option value="hike">Hike</option>
            </select>
          </label>
          <label style={labelStyle}>
            Duration
            <input
              type="text"
              value={block.duration}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, duration: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Target
            <input
              type="text"
              value={block.target ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, target: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Notes
            <input
              type="text"
              value={block.notes ?? ""}
              disabled={isLocked}
              onChange={(event) => onUpdate(block.id, { ...block, notes: event.target.value })}
              style={inputStyle}
            />
          </label>
        </div>
      )}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid var(--border-dark)",
  backgroundColor: "transparent",
  color: "var(--text-primary)",
  fontSize: "12px",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "999px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  backgroundColor: "transparent",
  color: "var(--text-secondary)",
  fontSize: "10px",
  cursor: "pointer",
};
