export interface EffortBlockDefinition {
  id: string;
  label: string;
  target: string;
  accent: string;
}

export const effortBlocks: EffortBlockDefinition[] = [
  {
    id: "warm-up",
    label: "Warm Up",
    target: "Zone 1 | 55-65% Max HR | 3-5 RPE",
    accent: "#ffffff",
  },
  {
    id: "recovery",
    label: "Recovery",
    target: "Zone 1 | 55-65% Max HR | 3-5 RPE",
    accent: "#e5e7eb",
  },
  {
    id: "aerobic",
    label: "Aerobic",
    target: "Zone 2 | 65-75% Max HR | 4-6 RPE",
    accent: "#33d0ff",
  },
  {
    id: "tempo",
    label: "Tempo",
    target: "Zone 3 | 75-85% Max HR | 6-7 RPE",
    accent: "#7cdb53",
  },
  {
    id: "threshold",
    label: "Threshold",
    target: "Zone 4 | 85-90% Max HR | 8 RPE",
    accent: "#bb63ff",
  },
  {
    id: "interval",
    label: "Interval",
    target: "Zone 5 | 90%+ Max HR | 9 RPE",
    accent: "#ff5a5a",
  },
  {
    id: "ladder",
    label: "Ladder",
    target: "Zone 5 | 90%+ Max HR | 9 RPE",
    accent: "#34d399",
  },
  {
    id: "strides",
    label: "Strides",
    target: "Zone 5 | -% Max HR | 8-9 RPE",
    accent: "#f7c948",
  },
];
