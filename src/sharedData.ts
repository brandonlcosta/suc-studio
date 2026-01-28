import fs from "fs";
import path from "path";
import { SHARED_DATA_ROOT, WORKOUTS_MASTER_PATH } from "./paths";

const EVENTS_MASTER_PATH = path.join(
  SHARED_DATA_ROOT,
  "events",
  "events.master.json"
);
const EVENTS_SELECTION_PATH = path.join(
  SHARED_DATA_ROOT,
  "events",
  "events.selection.json"
);
const ROUTES_ROOT = path.join(SHARED_DATA_ROOT, "routes");

function readJsonFile(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[SharedData] Missing file: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`[SharedData] Failed to parse JSON: ${filePath} (${message})`);
  }
}

export function loadEventsMaster(): unknown {
  return readJsonFile(EVENTS_MASTER_PATH);
}

export function loadEventsSelection(): unknown {
  return readJsonFile(EVENTS_SELECTION_PATH);
}

export function listRouteGroups(): string[] {
  if (!fs.existsSync(ROUTES_ROOT)) {
    throw new Error(`[SharedData] Missing routes directory: ${ROUTES_ROOT}`);
  }

  const entries = fs.readdirSync(ROUTES_ROOT, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export function loadWorkoutsMaster(): unknown {
  return readJsonFile(WORKOUTS_MASTER_PATH);
}
