import type { StrengthBlock } from "../../types";

interface StrengthSummarySidebarProps {
  blocks: StrengthBlock[];
}

export default function StrengthSummarySidebar({ blocks }: StrengthSummarySidebarProps) {
  const totals = blocks.reduce(
    (acc, block) => {
      if (block.type === "strength_exercise") acc.exercises += 1;
      if (block.type === "circuit_block") acc.circuits += 1;
      if (block.type === "mobility_block") acc.mobility += 1;
      if (block.type === "crosstrain_block") acc.crosstrain += 1;
      return acc;
    },
    { exercises: 0, circuits: 0, mobility: 0, crosstrain: 0 }
  );

  const totalExercises =
    totals.exercises +
    blocks.reduce((sum, block) => (block.type === "circuit_block" ? sum + block.exercises.length : sum), 0);

  const estimatedMinutes = blocks.reduce((sum, block) => {
    if (block.type === "crosstrain_block") {
      return sum + parseDurationToMinutes(block.duration);
    }
    if (block.type === "mobility_block") {
      return sum + parseDurationToMinutes(block.duration);
    }
    if (block.type === "strength_exercise") {
      return sum + 6;
    }
    if (block.type === "circuit_block") {
      return sum + block.rounds * Math.max(block.exercises.length, 1) * 2;
    }
    return sum;
  }, 0);

  return (
    <aside
      style={{
        width: "260px",
        borderLeft: "1px solid var(--border-dark)",
        padding: "16px",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.6px" }}>SUMMARY</div>
      <div style={summaryCardStyle}>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Blocks</div>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>{blocks.length}</div>
      </div>
      <div style={summaryCardStyle}>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Exercises</div>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>{totalExercises}</div>
      </div>
      <div style={summaryCardStyle}>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Estimated Length</div>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>
          {estimatedMinutes > 0 ? `${Math.round(estimatedMinutes)} min` : "—"}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
          Rough estimate based on blocks + rounds.
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SummaryRow label="Strength Blocks" value={totals.exercises} />
        <SummaryRow label="Circuit Blocks" value={totals.circuits} />
        <SummaryRow label="Mobility Blocks" value={totals.mobility} />
        <SummaryRow label="Crosstrain Blocks" value={totals.crosstrain} />
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
        Notes: Adjusted in coaching notes or block details.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px",
        color: "var(--text-secondary)",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid var(--border-dark)",
  borderRadius: "12px",
  padding: "12px",
  backgroundColor: "var(--overlay-dark)",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

function parseDurationToMinutes(value: string): number {
  if (!value) return 0;
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/(\d+(\.\d+)?)\s*(hr|hrs|hour|hours|min|mins|minute|minutes)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (Number.isNaN(amount)) return 0;
  const unit = match[3];
  if (unit.startsWith("hr")) return amount * 60;
  return amount;
}
