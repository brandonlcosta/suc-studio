import fs from "fs";
import path from "path";
import { SHARED_DATA_ROOT } from "./paths";

const EVENTS_SELECTION_PATH = path.join(
  SHARED_DATA_ROOT,
  "events",
  "events.selection.json"
);

type SelectionFile = {
  selectedEventIds?: unknown;
};

function loadSelectionFile(): SelectionFile {
  if (!fs.existsSync(EVENTS_SELECTION_PATH)) {
    throw new Error(`[Studio] Missing file: ${EVENTS_SELECTION_PATH}`);
  }

  const raw = fs.readFileSync(EVENTS_SELECTION_PATH, "utf8");
  try {
    return JSON.parse(raw) as SelectionFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `[Studio] Failed to parse JSON: ${EVENTS_SELECTION_PATH} (${message})`
    );
  }
}

function writeSelectionFile(data: SelectionFile): void {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(EVENTS_SELECTION_PATH, serialized, "utf8");
}

export function selectEventInSelection(eventId: string): "added" | "already" {
  const selection = loadSelectionFile();
  if (!Array.isArray(selection.selectedEventIds)) {
    throw new Error("[Studio] selectedEventIds must be an array.");
  }

  if (selection.selectedEventIds.includes(eventId)) {
    return "already";
  }

  selection.selectedEventIds.push(eventId);
  console.warn(
    "[Studio] Writing to events.selection.json (editorial intent only)"
  );
  writeSelectionFile(selection);
  return "added";
}
