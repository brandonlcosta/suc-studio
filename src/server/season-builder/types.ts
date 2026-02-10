export type IntensityLabel = "low" | "low-med" | "med" | "med-high" | "high" | "very-high";

export type WeekFocus =
  | "base"
  | "deload"
  | "speed"
  | "hill-power"
  | "mileage"
  | "ultra"
  | "heat"
  | "taper"
  | null;

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export type DayAssignment = {
  workoutId?: string;
  workoutIds?: string[];
  notes?: string;
};

export type WeekDays = Record<DayKey, DayAssignment>;

export interface WeekInstance {
  weekId: string;
  focus: WeekFocus;
  stress: IntensityLabel;
  volume: IntensityLabel;
  intensity: IntensityLabel;
  days?: WeekDays;
  eventIds?: string[];
  eventRoles?: Record<string, "goal" | "tuneup" | "simulation" | "social">;
}

export interface BlockInstance {
  blockId: string;
  name: string;
  tags: string[];
  weeks: WeekInstance[];
  raceAnchorId?: string;
}

export interface SeasonMarker {
  markerId: string;
  label: string;
  weekIndex: number;
}

export type SeasonStatus = "draft" | "published";

export interface Season {
  seasonId: string;
  status: SeasonStatus;
  startDate?: string | null;
  blocks: BlockInstance[];
  seasonMarkers: SeasonMarker[];
}
