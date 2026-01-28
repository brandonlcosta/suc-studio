import type { RouteLabel } from "../types";

export const ROUTE_COLORS: Record<RouteLabel, string> = {
  MED: "#00FF99",  // neon green
  LRG: "#13FFE2",  // neon blue
  XL: "#FF47A1",   // neon pink
  XXL: "#9B4DFF",  // neon purple
};

export const LABELS: RouteLabel[] = ["MED", "LRG", "XL", "XXL"];

/**
 * Assign a label based on route rank (by distance).
 */
export function labelForRank(index: number, total: number): RouteLabel {
  if (total <= 1) return "MED";
  if (total === 2) return index === 0 ? "MED" : "XXL";
  if (total === 3) return index === 0 ? "MED" : index === 2 ? "XXL" : "LRG";
  if (total === 4) return LABELS[index];

  // For 5+ routes, distribute across labels
  const lastIndex = total - 1;
  if (index === 0) return "MED";
  if (index === lastIndex) return "XXL";
  const midpoint = Math.floor(total / 2);
  return index < midpoint ? "LRG" : "XL";
}

/**
 * Infer label from filename.
 */
export function inferLabelFromFilename(fileName: string): RouteLabel {
  const upper = fileName.toUpperCase();
  if (upper.includes("XXL")) return "XXL";
  if (upper.includes("XL")) return "XL";
  if (upper.includes("LRG") || upper.includes("LARGE")) return "LRG";
  return "MED";
}
