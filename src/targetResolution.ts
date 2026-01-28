export type UnitSystem = "mi" | "km";

export type ZoneRange = [number, number];

export type AthleteZoneProfile = {
  athleteId: string;
  hr?: {
    max?: number;
    threshold?: number;
    zones?: Record<string, ZoneRange>;
  };
  pace?: {
    threshold?: string;
    zones?: Record<string, string>;
  };
  preferredUnits?: UnitSystem;
};

export type HeartRateTarget = {
  type: "hr";
  percentMax: ZoneRange;
  zone?: string;
};

export type PaceTarget = {
  type: "pace";
  zone: string;
};

export type PercentTarget = {
  type: "percent";
  range: ZoneRange;
};

export type Target = HeartRateTarget | PaceTarget | PercentTarget;

export type WorkoutSection =
  | {
      type: "warmup" | "steady" | "progression" | "cooldown" | "free";
      duration?: string;
      target?: Target;
      label?: string;
      cues?: string[];
    }
  | {
      type: "interval";
      reps: number;
      work: { duration: string; target: Target; cues?: string[] };
      rest: { duration: string; target: Target; cues?: string[] };
      label?: string;
      cues?: string[];
    };

export type WorkoutDefinition = {
  workoutId: string;
  name: string;
  structure: WorkoutSection[];
  cues?: string[];
};

export type ResolvedTarget =
  | {
      type: "hr";
      min: number;
      max: number;
      source: "percentMax" | "zone";
    }
  | {
      type: "pace";
      minSeconds: number;
      maxSeconds: number;
      unit: UnitSystem;
      source: "zone";
    }
  | {
      type: "percent";
      min: number;
      max: number;
      source: "range";
    };

export type ResolvedTargetResult =
  | {
      status: "resolved";
      target: ResolvedTarget;
      preview: string;
      source: ResolvedTarget["source"];
    }
  | {
      status: "unresolved";
      issues: string[];
    };

export type ExportTarget = {
  hr?: { min: number; max: number };
  pace?: { minSeconds: number; maxSeconds: number; unit: UnitSystem };
  percent?: { min: number; max: number };
};

export type ResolvedSectionPreview =
  | {
      type: "warmup" | "steady" | "progression" | "cooldown" | "free";
      duration?: string;
      label?: string;
      targetPreview?: ResolvedTargetResult;
      exportTarget?: ExportTarget;
    }
  | {
      type: "interval";
      reps: number;
      label?: string;
      work: {
        duration: string;
        targetPreview: ResolvedTargetResult;
        exportTarget?: ExportTarget;
      };
      rest: {
        duration: string;
        targetPreview: ResolvedTargetResult;
        exportTarget?: ExportTarget;
      };
    };

export type ResolvedWorkoutPreview = {
  workoutId: string;
  name: string;
  sections: ResolvedSectionPreview[];
};

export type ResolutionOptions = {
  units?: UnitSystem;
};

const KM_PER_MILE = 1.60934;
const PACE_UNIT_PATTERN = /(mi|km)/i;

function formatRange(min: number, max: number): string {
  return `${min}\u2013${max}`;
}

function parseTimeToSeconds(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }

  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) {
      return null;
    }

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return null;
  }

  const minutes = Number(cleaned);
  if (Number.isNaN(minutes)) {
    return null;
  }
  return minutes * 60;
}

function normalizeUnit(
  unitCandidate: string | undefined,
  fallback: UnitSystem
): UnitSystem {
  if (!unitCandidate) {
    return fallback;
  }
  return unitCandidate.toLowerCase() === "km" ? "km" : "mi";
}

function parsePaceRange(
  value: string,
  fallbackUnit: UnitSystem
): { minSeconds: number; maxSeconds: number; unit: UnitSystem } | null {
  const unitMatch = value.match(/\/\s*(mi|km)\b/i);
  const unit = normalizeUnit(unitMatch?.[1], fallbackUnit);
  const withoutUnit = value.replace(/\/\s*(mi|km)\b/i, "").trim();
  const parts = withoutUnit.split(/-|\u2013/).map((part) => part.trim());
  const minPart = parts[0] ?? "";
  const maxPart = parts.length > 1 ? parts[1] : minPart;
  const minSeconds = parseTimeToSeconds(minPart);
  const maxSeconds = parseTimeToSeconds(maxPart);

  if (minSeconds === null || maxSeconds === null) {
    return null;
  }

  return {
    minSeconds: Math.min(minSeconds, maxSeconds),
    maxSeconds: Math.max(minSeconds, maxSeconds),
    unit,
  };
}

function convertPaceSeconds(
  seconds: number,
  fromUnit: UnitSystem,
  toUnit: UnitSystem
): number {
  if (fromUnit === toUnit) {
    return seconds;
  }
  return fromUnit === "mi" ? seconds / KM_PER_MILE : seconds * KM_PER_MILE;
}

function formatPace(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatResolvedTarget(target: ResolvedTarget): string {
  if (target.type === "hr") {
    return `${formatRange(target.min, target.max)} bpm`;
  }
  if (target.type === "pace") {
    return `${formatRange(formatPace(target.minSeconds), formatPace(target.maxSeconds))} / ${
      target.unit
    }`;
  }
  return `${formatRange(Math.round(target.min * 100), Math.round(target.max * 100))}%`;
}

function resolveHeartRateTarget(
  target: HeartRateTarget,
  athlete: AthleteZoneProfile
): ResolvedTargetResult {
  if (target.zone && athlete.hr?.zones?.[target.zone]) {
    const zoneRange = athlete.hr.zones[target.zone];
    const isPercent =
      zoneRange.every((value) => value >= 0 && value <= 1) || !athlete.hr?.max;
    if (isPercent) {
      if (!athlete.hr?.max) {
        return {
          status: "unresolved",
          issues: [
            `Missing max heart rate to resolve HR zone ${target.zone}.`,
          ],
        };
      }
      const resolved: ResolvedTarget = {
        type: "hr",
        min: Math.round(zoneRange[0] * athlete.hr.max),
        max: Math.round(zoneRange[1] * athlete.hr.max),
        source: "zone",
      };
      return {
        status: "resolved",
        target: resolved,
        preview: formatResolvedTarget(resolved),
        source: resolved.source,
      };
    }

    const resolved: ResolvedTarget = {
      type: "hr",
      min: Math.round(zoneRange[0]),
      max: Math.round(zoneRange[1]),
      source: "zone",
    };
    return {
      status: "resolved",
      target: resolved,
      preview: formatResolvedTarget(resolved),
      source: resolved.source,
    };
  }

  if (!athlete.hr?.max) {
    return {
      status: "unresolved",
      issues: ["Missing max heart rate to resolve percentMax target."],
    };
  }

  const resolved: ResolvedTarget = {
    type: "hr",
    min: Math.round(target.percentMax[0] * athlete.hr.max),
    max: Math.round(target.percentMax[1] * athlete.hr.max),
    source: "percentMax",
  };

  return {
    status: "resolved",
    target: resolved,
    preview: formatResolvedTarget(resolved),
    source: resolved.source,
  };
}

function resolvePaceTarget(
  target: PaceTarget,
  athlete: AthleteZoneProfile,
  options: ResolutionOptions = {}
): ResolvedTargetResult {
  const paceZones = athlete.pace?.zones;
  const zoneValue = paceZones?.[target.zone];
  if (!zoneValue) {
    return {
      status: "unresolved",
      issues: [`Missing pace zone ${target.zone} for athlete.`],
    };
  }

  const fallbackUnit = options.units ?? athlete.preferredUnits ?? "mi";
  const parsed = parsePaceRange(zoneValue, fallbackUnit);
  if (!parsed) {
    return {
      status: "unresolved",
      issues: [`Unable to parse pace zone ${target.zone} value "${zoneValue}".`],
    };
  }

  const resolvedUnit = options.units ?? parsed.unit;
  const resolved: ResolvedTarget = {
    type: "pace",
    minSeconds: convertPaceSeconds(parsed.minSeconds, parsed.unit, resolvedUnit),
    maxSeconds: convertPaceSeconds(parsed.maxSeconds, parsed.unit, resolvedUnit),
    unit: resolvedUnit,
    source: "zone",
  };

  return {
    status: "resolved",
    target: resolved,
    preview: formatResolvedTarget(resolved),
    source: resolved.source,
  };
}

function resolvePercentTarget(target: PercentTarget): ResolvedTargetResult {
  const resolved: ResolvedTarget = {
    type: "percent",
    min: target.range[0],
    max: target.range[1],
    source: "range",
  };

  return {
    status: "resolved",
    target: resolved,
    preview: formatResolvedTarget(resolved),
    source: resolved.source,
  };
}

export function resolveTarget(
  target: Target,
  athlete: AthleteZoneProfile,
  options: ResolutionOptions = {}
): ResolvedTargetResult {
  if (target.type === "hr") {
    return resolveHeartRateTarget(target, athlete);
  }
  if (target.type === "pace") {
    return resolvePaceTarget(target, athlete, options);
  }
  return resolvePercentTarget(target);
}

export function buildExportTarget(
  resolvedTarget: ResolvedTarget
): ExportTarget {
  if (resolvedTarget.type === "hr") {
    return { hr: { min: resolvedTarget.min, max: resolvedTarget.max } };
  }
  if (resolvedTarget.type === "pace") {
    return {
      pace: {
        minSeconds: Math.round(resolvedTarget.minSeconds),
        maxSeconds: Math.round(resolvedTarget.maxSeconds),
        unit: resolvedTarget.unit,
      },
    };
  }
  return {
    percent: { min: resolvedTarget.min, max: resolvedTarget.max },
  };
}

function resolveSectionTarget(
  target: Target | undefined,
  athlete: AthleteZoneProfile,
  options: ResolutionOptions
): { targetPreview: ResolvedTargetResult; exportTarget?: ExportTarget } {
  if (!target) {
    return {
      targetPreview: {
        status: "unresolved",
        issues: ["Missing target definition."],
      },
    };
  }

  const resolved = resolveTarget(target, athlete, options);
  return {
    targetPreview: resolved,
    exportTarget:
      resolved.status === "resolved" ? buildExportTarget(resolved.target) : undefined,
  };
}

export function resolveWorkoutPreview(
  workout: WorkoutDefinition,
  athlete: AthleteZoneProfile,
  options: ResolutionOptions = {}
): ResolvedWorkoutPreview {
  const sections = workout.structure.map((section) => {
    if (section.type === "interval") {
      const work = resolveSectionTarget(section.work.target, athlete, options);
      const rest = resolveSectionTarget(section.rest.target, athlete, options);

      return {
        type: "interval",
        reps: section.reps,
        label: section.label,
        work: {
          duration: section.work.duration,
          targetPreview: work.targetPreview,
          exportTarget: work.exportTarget,
        },
        rest: {
          duration: section.rest.duration,
          targetPreview: rest.targetPreview,
          exportTarget: rest.exportTarget,
        },
      };
    }

    const resolved = resolveSectionTarget(section.target, athlete, options);
    return {
      type: section.type,
      duration: section.duration,
      label: section.label,
      targetPreview: resolved.targetPreview,
      exportTarget: resolved.exportTarget,
    };
  });

  return {
    workoutId: workout.workoutId,
    name: workout.name,
    sections,
  };
}

export function inferUnitsFromPaceZone(paceZone: string): UnitSystem | null {
  const match = paceZone.match(PACE_UNIT_PATTERN);
  if (!match) {
    return null;
  }
  return normalizeUnit(match[1], "mi");
}
