const POI_ICON_MARKUP: Record<string, string> = {
  water: `<path d="M12 2s-6 6-6 10a6 6 0 0 0 12 0c0-4-6-10-6-10z"/>`,
  out_and_back: `<path d="M4 9h12a4 4 0 0 1 0 8H4"/><path d="M8 9l-4-4"/><path d="M8 9l-4 4"/>`,
  turnaround: `<path d="M6 4v8a6 6 0 0 0 12 0V8"/><path d="M6 4l-3 3"/><path d="M6 4l3 3"/>`,
  fork: `<path d="M12 5v6"/><path d="M7 16l5-5"/><path d="M17 16l-5-5"/>`,
  aid: `<path d="M12 6v12"/><path d="M6 12h12"/>`,
  water_tap: `<path d="M5 8h14"/><path d="M7 8v-2a2 2 0 0 1 2-2h2"/><path d="M13 8V6a2 2 0 0 1 2-2h2"/><path d="M10 12v4"/><path d="M14 12v4"/>`,
  viewpoint: `<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>`,
  summit: `<path d="M3 19l7-11 4 6 3-4 4 9H3z"/>`,
  danger: `<path d="M12 4l9 16H3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  climb: `<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h6v6"/>`,
  note: `<path d="M6 3h12v18l-6-4-6 4z"/>`,
  default: `<circle cx="12" cy="12" r="6"/>`
};

function normalizePoiType(type?: string | null) {
  return String(type || "").trim().toLowerCase();
}

export function resolvePoiIconKey(type?: string | null) {
  const normalized = normalizePoiType(type);
  switch (normalized) {
    case "water":
      return "water";
    case "aid":
    case "aid-station":
      return "aid";
    case "view":
    case "viewpoint":
      return "viewpoint";
    case "summit":
      return "summit";
    case "climb":
      return "climb";
    case "hazard":
    case "danger":
      return "danger";
    case "turn":
    case "fork":
      return "fork";
    case "turnaround":
      return "turnaround";
    default:
      return "default";
  }
}

export function getPoiIconMarkup(type?: string | null) {
  const key = resolvePoiIconKey(type);
  return POI_ICON_MARKUP[key] ?? POI_ICON_MARKUP.default;
}
