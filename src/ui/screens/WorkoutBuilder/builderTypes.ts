export type TierLabel = "MED" | "LRG" | "XL" | "XXL";

export type WorkoutStatus = "draft" | "published" | "archived";

export interface EffortBlockDragPayload {
  domain: "run";
  effortBlockId: string;
  label: string;
  target: string;
  accent: string;
}

export interface WorkoutBlockInstance {
  id: string;
  sourceIndex?: number;
  effortBlockId: string;
  duration: string | null;
  rest: string | null;
  reps: number | null;
  notes: string | null;
}

export interface WorkoutBuilderWorkout {
  id: string;
  name: string | null;
  description: string | null;
  tags: string[];
  tiers: Record<TierLabel, WorkoutBlockInstance[]>;
  status: WorkoutStatus;
}

export type LadderDirection = "up" | "down" | "updown";

export interface LadderConfig {
  effortBlockId: string;
  steps: string[];
  direction: LadderDirection;
  stepRest: string | null;
  setRest: string | null;
  sets: number;
}
