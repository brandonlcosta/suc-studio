import type { BlockInstance, WeekInstance } from "../../../season";

export type WeekPreset = {
  id: string;
  name: string;
  focus: WeekInstance["focus"];
  stress: WeekInstance["stress"];
  volume: WeekInstance["volume"];
  intensity: WeekInstance["intensity"];
};

export type WeekTemplate = Pick<WeekInstance, "focus" | "stress" | "volume" | "intensity">;

export type BlockTemplate = {
  id: string;
  name: string;
  weeks: WeekTemplate[];
};

export const WEEK_PRESETS: WeekPreset[] = [
  { id: "base", name: "Base", focus: "base", stress: "med", volume: "med", intensity: "med" },
  { id: "speed", name: "Speed", focus: "speed", stress: "med-high", volume: "med", intensity: "high" },
  { id: "hill-power", name: "Hill Power", focus: "hill-power", stress: "high", volume: "med-high", intensity: "high" },
  { id: "deload", name: "Deload", focus: "deload", stress: "low", volume: "low", intensity: "low" },
  { id: "ultra", name: "Ultra", focus: "ultra", stress: "med-high", volume: "very-high", intensity: "med" },
  { id: "heat", name: "Heat", focus: "heat", stress: "high", volume: "med", intensity: "med-high" },
  { id: "taper", name: "Taper", focus: "taper", stress: "low", volume: "low-med", intensity: "low" },
];

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: "salmon-falls",
    name: "Salmon Falls",
    weeks: [
      { focus: "base", stress: "med", volume: "med", intensity: "low" },
      { focus: "base", stress: "med", volume: "med", intensity: "low" },
      { focus: "speed", stress: "med-high", volume: "med", intensity: "high" },
      { focus: "taper", stress: "low", volume: "low-med", intensity: "low" },
    ],
  },
  {
    id: "canyons",
    name: "Canyons",
    weeks: [
      { focus: "base", stress: "med", volume: "med", intensity: "low" },
      { focus: "base", stress: "med", volume: "med", intensity: "low" },
      { focus: "hill-power", stress: "high", volume: "med-high", intensity: "high" },
      { focus: "hill-power", stress: "high", volume: "med-high", intensity: "high" },
      { focus: "taper", stress: "low", volume: "low-med", intensity: "low" },
    ],
  },
  {
    id: "western-states",
    name: "Western States",
    weeks: [
      { focus: "mileage", stress: "med", volume: "high", intensity: "med" },
      { focus: "mileage", stress: "med", volume: "high", intensity: "med" },
      { focus: "ultra", stress: "med-high", volume: "very-high", intensity: "med" },
      { focus: "ultra", stress: "med-high", volume: "very-high", intensity: "med" },
      { focus: "heat", stress: "high", volume: "med", intensity: "med-high" },
      { focus: "taper", stress: "low", volume: "low-med", intensity: "low" },
    ],
  },
];

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildBlockTemplate(template: BlockTemplate): BlockInstance {
  const firstWeek = template.weeks[0] ?? {
    focus: null,
    stress: "low",
    volume: "low",
    intensity: "low",
  };

  return {
    blockId: randomId(),
    name: template.name,
    tags: [],
    weeks: [
      {
        weekId: randomId(),
        ...firstWeek,
      },
    ],
  };
}
