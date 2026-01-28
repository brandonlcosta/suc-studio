import {
  ExportTarget,
  ResolvedSectionPreview,
  ResolvedTargetResult,
  ResolvedWorkoutPreview,
} from "./targetResolution";

const TIME_UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
};

const DISTANCE_UNITS: Record<string, number> = {
  m: 1,
  meter: 1,
  meters: 1,
  km: 1000,
  kilometer: 1000,
  kilometers: 1000,
  mi: 1609.34,
  mile: 1609.34,
  miles: 1609.34,
  yd: 0.9144,
  yard: 0.9144,
  yards: 0.9144,
};

const DURATION_PATTERN =
  /^(\d+(?:\.\d+)?)(s|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|m|meter|meters|km|kilometer|kilometers|mi|mile|miles|yd|yard|yards)$/;

type TrainingPeaksDuration =
  | { time: number }
  | { distance: number; unit: "m" }
  | { open: true };

type TrainingPeaksTarget =
  | { open: true }
  | { type: "heartRate"; min: number; max: number }
  | { type: "pace"; min: number; max: number; unit: "secPerKm" | "secPerMi" };

type TrainingPeaksStep =
  | {
      type: "warmup" | "active" | "rest" | "cooldown";
      duration: TrainingPeaksDuration;
      target: TrainingPeaksTarget;
    }
  | {
      type: "repetition";
      reps: number;
      steps: TrainingPeaksStep[];
    };

export type TrainingPeaksWorkout = {
  name: string;
  sport: "run";
  steps: TrainingPeaksStep[];
};

function parseDuration(duration?: string): TrainingPeaksDuration {
  if (!duration) {
    return { open: true };
  }
  const match = duration.trim().match(DURATION_PATTERN);
  if (!match) {
    throw new Error(`Unsupported duration format "${duration}".`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (Number.isNaN(value)) {
    throw new Error(`Invalid duration value "${duration}".`);
  }
  if (TIME_UNITS[unit]) {
    return { time: Math.round(value * TIME_UNITS[unit]) };
  }
  if (DISTANCE_UNITS[unit]) {
    return { distance: Math.round(value * DISTANCE_UNITS[unit]), unit: "m" };
  }
  throw new Error(`Unsupported duration unit "${unit}".`);
}

function buildTarget(
  exportTarget: ExportTarget | undefined,
  preview: ResolvedTargetResult | undefined
): TrainingPeaksTarget {
  if (exportTarget?.percent) {
    throw new Error("Percent targets are not supported for TrainingPeaks export.");
  }
  if (exportTarget?.hr) {
    return {
      type: "heartRate",
      min: exportTarget.hr.min,
      max: exportTarget.hr.max,
    };
  }
  if (exportTarget?.pace) {
    return {
      type: "pace",
      min: Math.round(exportTarget.pace.minSeconds),
      max: Math.round(exportTarget.pace.maxSeconds),
      unit: exportTarget.pace.unit === "km" ? "secPerKm" : "secPerMi",
    };
  }
  if (preview?.status === "unresolved") {
    const missingDefinition = preview.issues.some((issue) =>
      issue.toLowerCase().includes("missing target definition")
    );
    if (!missingDefinition) {
      throw new Error(`Unable to resolve target: ${preview.issues.join(" ")}`);
    }
  }
  return { open: true };
}

function mapSection(section: ResolvedSectionPreview): TrainingPeaksStep {
  if (section.type === "interval") {
    return {
      type: "repetition",
      reps: section.reps,
      steps: [
        {
          type: "active",
          duration: parseDuration(section.work.duration),
          target: buildTarget(section.work.exportTarget, section.work.targetPreview),
        },
        {
          type: "rest",
          duration: parseDuration(section.rest.duration),
          target: buildTarget(section.rest.exportTarget, section.rest.targetPreview),
        },
      ],
    };
  }

  const typeMap: Record<
    ResolvedSectionPreview["type"],
    "warmup" | "active" | "cooldown"
  > = {
    warmup: "warmup",
    steady: "active",
    progression: "active",
    cooldown: "cooldown",
    free: "active",
    interval: "active",
  };

  const mappedType = typeMap[section.type];
  if (!mappedType) {
    throw new Error(`Unsupported section type "${section.type}".`);
  }

  return {
    type: mappedType,
    duration: parseDuration(section.duration),
    target: buildTarget(section.exportTarget, section.targetPreview),
  };
}

export function exportTrainingPeaksWorkout(
  workout: ResolvedWorkoutPreview,
  options: { sport?: TrainingPeaksWorkout["sport"] } = {}
): TrainingPeaksWorkout {
  const steps = workout.sections.map((section) => mapSection(section));
  return {
    name: workout.name,
    sport: options.sport ?? "run",
    steps,
  };
}
