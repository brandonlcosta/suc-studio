import type { EffortBlockDefinition } from "./effortBlocks";
import type { TierLabel, WorkoutBlockInstance, WorkoutBuilderWorkout } from "./builderTypes";
import { generateWorkoutNameByTier } from "./workoutName";

interface WorkoutChartProps {
  draft: WorkoutBuilderWorkout;
  effortLookup: Record<string, EffortBlockDefinition>;
  showXXL?: boolean;
  visibleTiers?: TierLabel[];
}

const tierOrder: TierLabel[] = ["MED", "LRG", "XL", "XXL"];

const tierBaseColors: Record<TierLabel, string> = {
  MED: "#7cdb53",
  LRG: "#33d0ff",
  XL: "#bb63ff",
  XXL: "#f7c948",
};

const UNIT_HEIGHT = 10;
const REST_HEIGHT = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const parseZoneNumber = (target: string): number | null => {
  const match = target.match(/zone\s*(\d+)/i);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  return Number.isNaN(zone) ? null : zone;
};

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

const getZoneLevel = (effortTarget: string) => {
  const zone = parseZoneNumber(effortTarget) ?? 1;
  return clamp(zone, 1, 5);
};

export default function WorkoutChart({
  draft,
  effortLookup,
  showXXL = false,
  visibleTiers,
}: WorkoutChartProps) {
  const baseTiers = showXXL ? tierOrder : tierOrder.filter((tier) => tier !== "XXL");
  const resolvedTiers = visibleTiers
    ? baseTiers.filter((tier) => visibleTiers.includes(tier))
    : baseTiers;
  const namesByTier = generateWorkoutNameByTier(draft.tiers, effortLookup);

  return (
    <section
      style={{
        border: "1px solid #2a2f3a",
        borderRadius: "14px",
        padding: "12px",
        backgroundColor: "#0f1115",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, resolvedTiers.length)}, minmax(0, 1fr))`,
          gap: "12px",
        }}
      >
        {resolvedTiers.map((tier) => {
          const blocks = draft.tiers[tier] ?? [];
          const segments = blocks.flatMap((block) => {
            const effort = effortLookup[block.effortBlockId];
            if (!effort) return [];

            const durationMinutes = parseDurationToMinutes(block.duration);
            const restMinutes = parseDurationToMinutes(block.rest);
            const reps = block.reps && block.reps > 0 ? block.reps : 1;
            const zone = getZoneLevel(effort.target);

            const items: Array<{
              id: string;
              minutes: number;
              zoneLevel: number;
              type: "work" | "rest";
            }> = [];

            for (let i = 0; i < reps; i += 1) {
              if (durationMinutes !== null) {
                items.push({
                  id: `${block.id}-work-${i}`,
                  minutes: durationMinutes,
                  zoneLevel: zone,
                  type: "work",
                });
              }
              if (i < reps - 1 && restMinutes !== null) {
                items.push({
                  id: `${block.id}-rest-${i}`,
                  minutes: restMinutes,
                  zoneLevel: 0,
                  type: "rest",
                });
              }
            }

            return items;
          });

          return (
            <div key={tier} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "10px", color: "#c9c9c9", letterSpacing: "0.4px", textAlign: "center" }}>
                {tier}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "flex-end",
                  height: "90px",
                  borderRadius: "10px",
                  padding: "6px",
                  border: "1px solid #1e2430",
                  backgroundColor: "#0b0f17",
                  overflow: "hidden",
                }}
              >
                {segments.map((segment) => {
                  const alpha = clamp(0.25 + (segment.zoneLevel / 5) * 0.65, 0.2, 0.95);
                  const height = segment.zoneLevel === 0 ? REST_HEIGHT : segment.zoneLevel * UNIT_HEIGHT;
                  const width = `${Math.max(10, segment.minutes * 18)}px`;
                  return (
                    <div
                      key={segment.id}
                      style={{
                        width,
                        height,
                        borderRadius: "8px",
                        backgroundColor:
                          segment.type === "rest"
                            ? "rgba(255, 255, 255, 0.9)"
                            : hexToRgba(tierBaseColors[tier], alpha),
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#e5e5e5",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {namesByTier[tier]}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
