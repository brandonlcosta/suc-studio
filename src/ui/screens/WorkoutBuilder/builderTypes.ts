export type TierLabel = "MED" | "LRG" | "XL" | "XXL";

export type WorkoutStatus = "draft" | "published" | "archived";

export interface EffortBlockDragPayload {
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
