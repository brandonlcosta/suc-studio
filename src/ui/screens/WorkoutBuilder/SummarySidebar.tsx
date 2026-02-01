import type { EffortBlockDefinition } from "./effortBlocks";
import type { TierLabel, WorkoutBlockInstance, WorkoutBuilderWorkout } from "./builderTypes";
import { generateWorkoutNameByTier } from "./workoutName";

interface SummarySidebarProps {
  draft: WorkoutBuilderWorkout;
  effortLookup: Record<string, EffortBlockDefinition>;
}

const tierOrder: TierLabel[] = ["MED", "LRG", "XL", "XXL"];

const parseDurationToMinutes = (value: string | null) => {
  if (!value) return null;
  const raw = value.toLowerCase();
  const minMatch = raw.match(/(\d+)\s*min/);
  const secMatch = raw.match(/(\d+)\s*sec/);

  let minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  let seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

  if (!minMatch && !secMatch) {
    const bare = raw.match(/(\d+)/);
    if (bare) minutes = parseInt(bare[1], 10);
  }

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;

  if (seconds > 59) {
    const carry = Math.floor(seconds / 60);
    minutes += carry;
    seconds = seconds % 60;
  }

  return minutes + seconds / 60;
};

const getTotalDuration = (blocks: WorkoutBlockInstance[]) => {
  return blocks.reduce((total, block) => {
    const reps = block.reps && block.reps > 0 ? block.reps : 1;
    const durationMinutes = parseDurationToMinutes(block.duration) ?? 0;
    const restMinutes = parseDurationToMinutes(block.rest) ?? 0;
    const restSegments = Math.max(reps - 1, 0);
    return total + durationMinutes * reps + restMinutes * restSegments;
  }, 0);
};

export default function SummarySidebar({ draft, effortLookup }: SummarySidebarProps) {
  const handleExport = () => {
    alert("Export not implemented");
  };
  const namesByTier = generateWorkoutNameByTier(draft.tiers, effortLookup);

  return (
    <aside
      style={{
        width: "260px",
        borderLeft: "1px solid #1f1f1f",
        padding: "16px",
        backgroundColor: "#0f1115",
        color: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        position: "sticky",
        top: "16px",
        alignSelf: "flex-start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>Summary</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={handleExport} style={exportButtonStyle}>
            TrainingPeaks
          </button>
          <button type="button" onClick={handleExport} style={exportButtonStyle}>
            JSON
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {tierOrder.map((tier) => {
          const blocks = draft.tiers[tier];
          if (!blocks) return null;
          const totalDuration = getTotalDuration(blocks);

          return (
            <section
              key={tier}
              style={{
                border: "1px solid #2a2a2a",
                borderRadius: "10px",
                padding: "12px",
                backgroundColor: "#111111",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{tier}</div>
                <div style={{ fontSize: "11px", color: "#bdbdbd" }}>{totalDuration}</div>
              </div>
              <div style={{ fontSize: "11px", color: "#cfcfcf", marginBottom: "8px" }}>
                {namesByTier[tier]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {blocks.map((block) => {
                  const effort = effortLookup[block.effortBlockId];
                  return (
                    <div
                      key={block.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: "8px",
                        fontSize: "11px",
                        color: "#e5e5e5",
                      }}
                    >
                      <div>{effort ? effort.label : block.effortBlockId}</div>
                      <div>{block.duration ?? ""}</div>
                      <div>{block.reps ?? ""}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

const exportButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "999px",
  border: "1px solid #3b3b3b",
  backgroundColor: "transparent",
  color: "#f5f5f5",
  fontSize: "10px",
  fontWeight: 600,
  cursor: "pointer",
};
