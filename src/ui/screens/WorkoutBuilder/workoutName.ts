import type { TierLabel, WorkoutBlockInstance } from "./builderTypes";
import type { EffortBlockDefinition } from "./effortBlocks";

const zoneTypeMap: Record<number, string> = {
  1: "Recovery",
  2: "Aerobic",
  3: "Tempo",
  4: "Threshold",
  5: "Intervals",
};

const parseZoneNumber = (target: string): number | null => {
  const match = target.match(/zone\s*(\d+)/i);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  return Number.isNaN(zone) ? null : zone;
};

const parseDurationToSeconds = (value: string | null) => {
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

  return minutes * 60 + seconds;
};

const formatDurationText = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} sec`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} sec`;
};

type WorkPattern = {
  key: string;
  label: string;
  totalSeconds: number;
};

export function generateWorkoutName(
  blocks: WorkoutBlockInstance[],
  effortLookup: Record<string, EffortBlockDefinition>
): string {
  if (blocks.length === 0) return "Workout";

  const workBlocks = blocks
    .map((block) => {
      const effort = effortLookup[block.effortBlockId];
      if (!effort) return null;
      const durationSeconds = parseDurationToSeconds(block.duration);
      if (durationSeconds === null) return null;
      const zone = parseZoneNumber(effort.target) ?? 1;
      const reps = block.reps && block.reps > 0 ? block.reps : 1;
      return { block, effort, durationSeconds, zone, reps };
    })
    .filter(Boolean) as Array<{
    block: WorkoutBlockInstance;
    effort: EffortBlockDefinition;
    durationSeconds: number;
    zone: number;
    reps: number;
  }>;

  if (workBlocks.length === 0) return "Workout";

  const namingBlocks = workBlocks.filter((entry) => entry.zone >= 3);
  if (namingBlocks.length === 0) return "Workout";

  const hasStrides = namingBlocks.some((entry) => entry.effort.label.toLowerCase() === "strides");
  const hasHighZone = namingBlocks.some((entry) => entry.effort.label.toLowerCase() !== "strides");

  if (hasStrides && !hasHighZone) {
    const strideBlocks = namingBlocks.filter((entry) => entry.effort.label.toLowerCase() === "strides");
    const patterns = buildPatterns(strideBlocks);
    return patterns.length > 0 ? `Strides ${patterns[0]}` : "Strides";
  }

  const effortTotals = new Map<string, number>();
  for (const entry of namingBlocks) {
    const type = zoneTypeMap[entry.zone] ?? "Intervals";
    const total = entry.durationSeconds * entry.reps;
    effortTotals.set(type, (effortTotals.get(type) ?? 0) + total);
  }

  const primaryType = [...effortTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Workout";

  const patterns = buildPatterns(namingBlocks);
  const patternLabel = patterns.length > 0 ? patterns.join(" + ") : "";
  return patternLabel ? `${primaryType} ${patternLabel}` : primaryType;
}

function buildPatterns(
  workBlocks: Array<{ durationSeconds: number; reps: number }>
): string[] {
  const totalWorkSeconds = workBlocks.reduce((sum, entry) => sum + entry.durationSeconds * entry.reps, 0);

  const patternMap = new Map<string, WorkPattern>();
  for (const entry of workBlocks) {
    const durationLabel = formatDurationText(entry.durationSeconds);
    const label = entry.reps > 1 ? `${entry.reps} x ${durationLabel}` : durationLabel;
    const key = `${entry.reps}-${entry.durationSeconds}`;
    const totalSeconds = entry.durationSeconds * entry.reps;
    const existing = patternMap.get(key);
    if (existing) {
      existing.totalSeconds += totalSeconds;
    } else {
      patternMap.set(key, { key, label, totalSeconds });
    }
  }

  return [...patternMap.values()]
    .filter((pattern) => totalWorkSeconds === 0 || pattern.totalSeconds / totalWorkSeconds >= 0.1)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 2)
    .map((pattern) => pattern.label);
}

export function generateWorkoutNameByTier(
  tiers: Partial<Record<TierLabel, WorkoutBlockInstance[]>>,
  effortLookup: Record<string, EffortBlockDefinition>
): Record<TierLabel, string> {
  return {
    MED: generateWorkoutName(tiers.MED ?? [], effortLookup),
    LRG: generateWorkoutName(tiers.LRG ?? [], effortLookup),
    XL: generateWorkoutName(tiers.XL ?? [], effortLookup),
    XXL: generateWorkoutName(tiers.XXL ?? [], effortLookup),
  };
}
