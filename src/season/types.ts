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

export interface WeekInstance {
  weekId: string;
  focus: WeekFocus;
  stress: IntensityLabel;
  volume: IntensityLabel;
  intensity: IntensityLabel;
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
  blocks: BlockInstance[];
  seasonMarkers: SeasonMarker[];
}
