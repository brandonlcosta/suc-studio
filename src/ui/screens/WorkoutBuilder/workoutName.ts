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
  const hrMatch = raw.match(/(\d+)\s*(hr|hrs|hour|hours)/);
  const minMatch = raw.match(/(\d+)\s*min/);
  const secMatch = raw.match(/(\d+)\s*sec/);

  let hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  let minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  let seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

  if (!hrMatch && !minMatch && !secMatch) {
    const bare = raw.match(/(\d+)/);
    if (bare) minutes = parseInt(bare[1], 10);
  }

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;

  if (seconds > 59) {
    const carry = Math.floor(seconds / 60);
    minutes += carry;
    seconds = seconds % 60;
  }

  return hours * 3600 + minutes * 60 + seconds;
};

const formatDurationText = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const remaining = totalSeconds % 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  if (minutes > 0 && seconds > 0) return `${minutes} min ${seconds} sec`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} sec`;
};

type WorkPattern = {
  key: string;
  label: string;
  totalSeconds: number;
};

type LadderPattern = {
  label: string;
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

  for (let i = 0; i <= workBlocks.length - 3; i += 1) {
    const first = workBlocks[i];
    const second = workBlocks[i + 1];
    const third = workBlocks[i + 2];
    if (!first || !second || !third) continue;
    if (first.reps === 1 && second.reps === 1 && third.reps === 1) {
      if (first.zone === 2 && second.zone === 3 && third.zone === 4) {
        const totalSeconds = first.durationSeconds + second.durationSeconds + third.durationSeconds;
        const totalHoursRaw = totalSeconds / 3600;
        const totalHours = Math.round(totalHoursRaw * 10) / 10;
        const hoursText = totalHours % 1 === 0 ? `${Math.round(totalHours)}` : `${totalHours}`;
        return `${hoursText} hour progression`;
      }
    }
  }

  const namingBlocks = workBlocks.filter((entry) => entry.zone >= 3);
  if (namingBlocks.length === 0) return "Workout";

  const ladderPattern = findLadderPattern(namingBlocks);
  if (ladderPattern) {
    return ladderPattern.label;
  }

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

function findLadderPattern(
  workBlocks: Array<{ durationSeconds: number; reps: number; zone: number }>
): LadderPattern | null {
  const candidates = workBlocks.filter((entry) => entry.reps === 1);
  if (candidates.length < 3) return null;

  for (let i = 0; i <= candidates.length - 5; i += 1) {
    const a = candidates[i];
    const b = candidates[i + 1];
    const c = candidates[i + 2];
    const d = candidates[i + 3];
    const e = candidates[i + 4];
    if (!a || !b || !c || !d || !e) continue;
    if (a.zone !== b.zone || b.zone !== c.zone || c.zone !== d.zone || d.zone !== e.zone) continue;
    if (a.durationSeconds < b.durationSeconds && b.durationSeconds < c.durationSeconds) {
      if (d.durationSeconds === b.durationSeconds && e.durationSeconds === a.durationSeconds) {
        const label = [a, b, c].map((entry) => formatDurationText(entry.durationSeconds)).join("-");
        return { label: `Ladder ${label}` };
      }
    }
  }

  for (let i = 0; i <= candidates.length - 3; i += 1) {
    const first = candidates[i];
    const second = candidates[i + 1];
    const third = candidates[i + 2];
    if (!first || !second || !third) continue;
    if (first.zone !== second.zone || second.zone !== third.zone) continue;
    if (
      first.durationSeconds < second.durationSeconds &&
      second.durationSeconds < third.durationSeconds
    ) {
      const label = [first, second, third].map((entry) => formatDurationText(entry.durationSeconds)).join("-");
      return { label: `Ladder ${label}` };
    }
    if (
      first.durationSeconds > second.durationSeconds &&
      second.durationSeconds > third.durationSeconds
    ) {
      const label = [first, second, third].map((entry) => formatDurationText(entry.durationSeconds)).join("-");
      return { label: `Ladder ${label}` };
    }
  }

  return null;
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
