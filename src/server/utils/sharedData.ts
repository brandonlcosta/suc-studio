import fs from "fs";
import path from "path";
import {
  ROUTES_ROOT,
  EVENTS_MASTER_PATH,
  EVENTS_SELECTION_PATH,
  WORKOUTS_MASTER_PATH,
} from "./paths.js";
import type {
  RouteMeta,
  EventsMaster,
  EventsSelection,
  WorkoutsMaster,
  RouteGroupSummary,
} from "../types.js";

/**
 * Read and parse JSON file from suc-shared-data.
 */
function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse JSON: ${filePath} (${message})`);
  }
}

/**
 * Write JSON file atomically to suc-shared-data.
 */
function writeJsonFile(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

/**
 * List all route group directories in suc-shared-data/routes/
 */
export function listRouteGroups(): RouteGroupSummary[] {
  if (!fs.existsSync(ROUTES_ROOT)) {
    return [];
  }

  const entries = fs.readdirSync(ROUTES_ROOT, { withFileTypes: true });
  const groups: RouteGroupSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metaPath = path.join(ROUTES_ROOT, entry.name, "route.meta.json");
    if (!fs.existsSync(metaPath)) continue;

    try {
      const meta = readJsonFile<RouteMeta>(metaPath);
      groups.push({
        routeGroupId: meta.routeGroupId,
        name: meta.name,
        location: meta.location,
        variants: meta.variants,
      });
    } catch (error) {
      console.warn(`Failed to read route group ${entry.name}:`, error);
    }
  }

  return groups;
}

/**
 * Get a specific route group's metadata.
 */
export function getRouteGroup(groupId: string): RouteMeta | null {
  const metaPath = path.join(ROUTES_ROOT, groupId, "route.meta.json");
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    return readJsonFile<RouteMeta>(metaPath);
  } catch (error) {
    console.error(`Failed to read route group ${groupId}:`, error);
    return null;
  }
}

/**
 * Save a route group to suc-shared-data/routes/:groupId/
 */
export function saveRouteGroup(
  groupId: string,
  meta: RouteMeta,
  variants: Array<{ label: string; gpxContent: string }>
): void {
  const groupDir = path.join(ROUTES_ROOT, groupId);

  // Create directory if it doesn't exist
  if (!fs.existsSync(groupDir)) {
    fs.mkdirSync(groupDir, { recursive: true });
  }

  // Write route.meta.json
  const metaPath = path.join(groupDir, "route.meta.json");
  writeJsonFile(metaPath, meta);

  // Write GPX files
  for (const variant of variants) {
    const gpxPath = path.join(groupDir, `${variant.label}.gpx`);
    fs.writeFileSync(gpxPath, variant.gpxContent, "utf8");
  }
}

/**
 * Read events.master.json
 */
export function loadEventsMaster(): EventsMaster {
  return readJsonFile<EventsMaster>(EVENTS_MASTER_PATH);
}

/**
 * Write events.master.json
 */
export function saveEventsMaster(data: EventsMaster): void {
  writeJsonFile(EVENTS_MASTER_PATH, data);
}

/**
 * Read events.selection.json
 */
export function loadEventsSelection(): EventsSelection {
  return readJsonFile<EventsSelection>(EVENTS_SELECTION_PATH);
}

/**
 * Write events.selection.json
 */
export function saveEventsSelection(data: EventsSelection): void {
  writeJsonFile(EVENTS_SELECTION_PATH, data);
}

/**
 * Read workouts.master.json
 */
export function loadWorkoutsMaster(): WorkoutsMaster {
  return readJsonFile<WorkoutsMaster>(WORKOUTS_MASTER_PATH);
}

/**
 * Write workouts.master.json
 */
export function saveWorkoutsMaster(data: WorkoutsMaster): void {
  writeJsonFile(WORKOUTS_MASTER_PATH, data);
}
