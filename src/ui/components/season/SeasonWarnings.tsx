import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { Season } from "../../../season";

type WarningItem = {
  id: string;
  message: string;
};

type SeasonWarningsProps = {
  season: Season | null;
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
};

const intensityMap: Record<string, number> = {
  "low": 0,
  "low-med": 1,
  "med": 2,
  "med-high": 3,
  "high": 4,
  "very-high": 5,
};

function hasDeloadBlock(season: Season): boolean {
  return season.blocks.some((block) => block.weeks.some((week) => week.focus === "deload"));
}

export default function SeasonWarnings({ season, dismissedIds, onDismiss }: SeasonWarningsProps) {
  const warnings = useMemo(() => {
    if (!season) return [] as WarningItem[];
    const items: WarningItem[] = [];

    if (!hasDeloadBlock(season)) {
      items.push({ id: "no-deload", message: "Warning: No deload block detected" });
    }

    const intensities = season.blocks.flatMap((block) => block.weeks.map((week) => intensityMap[week.intensity] ?? 0));
    let streak = 0;
    for (const intensity of intensities) {
      if (intensity >= 4) {
        streak += 1;
        if (streak >= 3) {
          items.push({ id: "high-streak", message: "Warning: 3 high-intensity weeks in a row" });
          break;
        }
      } else {
        streak = 0;
      }
    }

    const avgStress = intensities.reduce((acc, value) => acc + value, 0) / (intensities.length || 1);
    const avgVolume = season.blocks
      .flatMap((block) => block.weeks.map((week) => intensityMap[week.volume] ?? 0))
      .reduce((acc, value) => acc + value, 0) / (intensities.length || 1);

    if (avgStress - avgVolume >= 1.5) {
      items.push({ id: "peak-mismatch", message: "Warning: Peak intensity exceeds volume support" });
    }

    return items.filter((item) => !dismissedIds.has(item.id));
  }, [season, dismissedIds]);

  if (warnings.length === 0) return null;

  return (
    <div style={{ marginBottom: "1rem", display: "grid", gap: "0.5rem" }}>
      {warnings.map((warning) => (
        <div
          key={warning.id}
          style={{
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid #fbbf24",
            backgroundColor: "#1f1b13",
            color: "#fde68a",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={16} style={{ opacity: 0.8 }} />
            <span>{warning.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(warning.id)}
            style={{
              border: "none",
              background: "transparent",
              color: "#fde68a",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
