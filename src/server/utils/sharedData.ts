import fs from "fs";
import path from "path";
import {
  ROUTES_ROOT,
  EVENTS_MASTER_PATH,
  EVENTS_SELECTION_PATH,
  WORKOUTS_MASTER_PATH,
  WORKOUT_DRAFT_PATH,
  WORKOUT_PUBLISHED_PATH,
} from "./paths.js";
import type {
  RouteMeta,
  RoutePoisDoc,
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
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

function normalizeVariantLabel(label: string): string {
  return String(label).toUpperCase();
}

function getRouteGroupIds(raw: any): string[] {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.routeGroupIds)) return raw.routeGroupIds.filter(Boolean);
  if (Array.isArray(raw.route_group_ids)) return raw.route_group_ids.filter(Boolean);
  if (Array.isArray(raw.routeGroups)) return raw.routeGroups.filter(Boolean);
  if (Array.isArray(raw.route_groups)) return raw.route_groups.filter(Boolean);
  if (typeof raw.routeGroupId === "string") return [raw.routeGroupId];
  if (typeof raw.route_group_id === "string") return [raw.route_group_id];
  return [];
}

function normalizeEventFromCanonical(raw: any) {
  if (!raw || typeof raw !== "object") {
    return {
      eventId: "",
      eventName: "",
      eventDescription: "",
      eventDate: "",
      eventTime: "",
      startLocationName: "",
      startLocationUrl: "",
      startLocationCoordinates: { lat: 0, lng: 0 },
      routeGroupIds: [],
    };
  }

  return {
    eventId: raw.eventId ?? raw.event_id ?? raw.id ?? "",
    eventName: raw.eventName ?? raw.event_name ?? raw.name ?? "",
    eventDescription:
      raw.eventDescription ?? raw.event_description ?? raw.description ?? "",
    eventDate: raw.eventDate ?? raw.event_date ?? "",
    eventTime: raw.eventTime ?? raw.event_time ?? "",
    startLocationName:
      raw.startLocationName ?? raw.start_location_name ?? "",
    startLocationUrl: raw.startLocationUrl ?? raw.start_location_url ?? "",
    startLocationCoordinates: raw.startLocationCoordinates
      ? {
          lat: raw.startLocationCoordinates.lat ?? 0,
          lng: raw.startLocationCoordinates.lng ?? 0,
        }
      : raw.start_lat != null && raw.start_lng != null
        ? { lat: raw.start_lat, lng: raw.start_lng }
        : { lat: 0, lng: 0 },
    routeGroupIds: getRouteGroupIds(raw),
  };
}

function normalizeEventToCanonical(raw: any) {
  if (!raw || typeof raw !== "object") return raw;
  const coords = raw.startLocationCoordinates;
  return {
    event_id: raw.event_id ?? raw.eventId ?? raw.id ?? "",
    event_name: raw.event_name ?? raw.eventName ?? raw.name ?? "",
    event_description:
      raw.event_description ?? raw.eventDescription ?? raw.description ?? "",
    event_date: raw.event_date ?? raw.eventDate ?? "",
    event_time: raw.event_time ?? raw.eventTime ?? "",
    start_location_name:
      raw.start_location_name ?? raw.startLocationName ?? "",
    start_location_url:
      raw.start_location_url ?? raw.startLocationUrl ?? "",
    start_lat:
      raw.start_lat ??
      (coords && typeof coords.lat === "number" ? coords.lat : 0),
    start_lng:
      raw.start_lng ??
      (coords && typeof coords.lng === "number" ? coords.lng : 0),
    route_group_ids: getRouteGroupIds(raw),
  };
}

/**
 * Save a single GPX variant and ensure route.meta.json includes the label.
 */
export function saveRouteVariant(
  groupId: string,
  label: string,
  gpxContent: string
): RouteMeta {
  const groupDir = path.join(ROUTES_ROOT, groupId);
  if (!fs.existsSync(groupDir)) {
    fs.mkdirSync(groupDir, { recursive: true });
  }

  const normalizedLabel = normalizeVariantLabel(label);
  const gpxPath = path.join(groupDir, `${normalizedLabel}.gpx`);
  fs.writeFileSync(gpxPath, gpxContent, "utf8");

  const metaPath = path.join(groupDir, "route.meta.json");
  let meta: RouteMeta;
  if (fs.existsSync(metaPath)) {
    meta = readJsonFile<RouteMeta>(metaPath);
  } else {
    meta = {
      routeGroupId: groupId,
      name: groupId,
      location: "Unknown",
      source: "SUC",
      notes: "",
      variants: [],
    };
  }

  const variants = new Set((meta.variants ?? []).map(normalizeVariantLabel));
  variants.add(normalizedLabel);
  meta.variants = Array.from(variants);

  writeJsonFile(metaPath, meta);
  return meta;
}

/**
 * Delete an entire route group directory.
 */
export function deleteRouteGroup(groupId: string): void {
  const groupDir = path.join(ROUTES_ROOT, groupId);
  if (!fs.existsSync(groupDir)) {
    throw new Error(`Route group not found: ${groupId}`);
  }
  fs.rmSync(groupDir, { recursive: true, force: true });
}

/**
 * Delete a GPX variant and remove it from route.meta.json.
 */
export function deleteRouteVariant(groupId: string, label: string): RouteMeta {
  const groupDir = path.join(ROUTES_ROOT, groupId);
  if (!fs.existsSync(groupDir)) {
    throw new Error(`Route group not found: ${groupId}`);
  }

  const metaPath = path.join(groupDir, "route.meta.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Route metadata missing for ${groupId}`);
  }

  const normalizedLabel = normalizeVariantLabel(label);
  const candidates = [
    `${normalizedLabel}.gpx`,
    `${groupId}-${normalizedLabel}.gpx`,
    path.join("variants", `${normalizedLabel}.gpx`),
    path.join("variants", `${groupId}-${normalizedLabel}.gpx`),
  ];

  for (const name of candidates) {
    const filePath = path.join(groupDir, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  const meta = readJsonFile<RouteMeta>(metaPath);
  meta.variants = (meta.variants ?? []).filter(
    (variant) => normalizeVariantLabel(variant) !== normalizedLabel
  );
  writeJsonFile(metaPath, meta);
  return meta;
}

/**
 * Read route.pois.json for a route group (if present).
 * Canonical POI ownership lives in route.pois.json per route group.
 */
export function loadRoutePois(groupId: string): RoutePoisDoc {
  const poisPath = path.join(ROUTES_ROOT, groupId, "route.pois.json");
  if (!fs.existsSync(poisPath)) {
    return { routeGroupId: groupId, pois: [] };
  }

  try {
    const parsed = readJsonFile<RoutePoisDoc>(poisPath);
    if (!parsed || !Array.isArray(parsed.pois)) {
      return { routeGroupId: groupId, pois: [] };
    }
    return {
      version: parsed.version,
      routeGroupId: parsed.routeGroupId ?? groupId,
      pois: parsed.pois,
    };
  } catch (error) {
    console.error(`Failed to read route.pois.json for ${groupId}:`, error);
    return { routeGroupId: groupId, pois: [] };
  }
}

/**
 * Write route.pois.json for a route group.
 */
export function saveRoutePois(groupId: string, data: RoutePoisDoc): void {
  const poisPath = path.join(ROUTES_ROOT, groupId, "route.pois.json");
  writeJsonFile(poisPath, {
    version: data.version,
    routeGroupId: data.routeGroupId ?? groupId,
    pois: Array.isArray(data.pois) ? data.pois : [],
  });
}

/**
 * Load GPX content for a route variant (label or routeId filename).
 */
export function loadRouteVariantGpx(groupId: string, label: string): string {
  const baseDir = path.join(ROUTES_ROOT, groupId);
  const normalized = String(label).toUpperCase();
  const candidates = [
    `${normalized}.gpx`,
    `${groupId}-${normalized}.gpx`,
    `${label}.gpx`,
    `${groupId}-${label}.gpx`,
    path.join("variants", `${normalized}.gpx`),
    path.join("variants", `${groupId}-${normalized}.gpx`),
    path.join("variants", `${label}.gpx`),
    path.join("variants", `${groupId}-${label}.gpx`),
  ];

  for (const name of candidates) {
    const filePath = path.join(baseDir, name);
    if (!fs.existsSync(filePath)) continue;
    return fs.readFileSync(filePath, "utf8");
  }

  throw new Error(`GPX not found for ${groupId} ${label} in ${baseDir}`);
}

/**
 * Read events.master.json
 */
export function loadEventsMaster(): EventsMaster {
  const raw = readJsonFile<EventsMaster | { version?: number; events?: any[] }>(
    EVENTS_MASTER_PATH
  );
  const events = Array.isArray(raw.events) ? raw.events : [];
  return {
    version: typeof (raw as EventsMaster).version === "number" ? (raw as EventsMaster).version : 1,
    events: events.map(normalizeEventFromCanonical),
  };
}

/**
 * Write events.master.json
 */
export function saveEventsMaster(data: EventsMaster): void {
  const events = Array.isArray(data.events) ? data.events : [];
  const normalized = {
    version: typeof data.version === "number" ? data.version : 1,
    events: events.map(normalizeEventToCanonical),
  };
  writeJsonFile(EVENTS_MASTER_PATH, normalized);
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

/**
 * Read workout.draft.json (if present)
 * Deprecated: drafts live in workouts.master.json
 */
export function loadWorkoutDraft(): unknown | null {
  if (!fs.existsSync(WORKOUT_DRAFT_PATH)) {
    return null;
  }

  return readJsonFile<unknown>(WORKOUT_DRAFT_PATH);
}

/**
 * Write workout.draft.json
 * Deprecated: drafts live in workouts.master.json
 */
export function saveWorkoutDraft(data: unknown): void {
  writeJsonFile(WORKOUT_DRAFT_PATH, data);
}

/**
 * Delete workout.draft.json
 * Deprecated: drafts live in workouts.master.json
 */
export function deleteWorkoutDraft(): void {
  if (fs.existsSync(WORKOUT_DRAFT_PATH)) {
    fs.unlinkSync(WORKOUT_DRAFT_PATH);
  }
}

/**
 * Read workout.published.json (if present)
 * Deprecated: published workouts live in workouts.master.json
 */
export function loadWorkoutPublished(): unknown | null {
  if (!fs.existsSync(WORKOUT_PUBLISHED_PATH)) {
    return null;
  }

  return readJsonFile<unknown>(WORKOUT_PUBLISHED_PATH);
}

/**
 * Write workout.published.json
 * Deprecated: published workouts live in workouts.master.json
 */
export function saveWorkoutPublished(data: unknown): void {
  writeJsonFile(WORKOUT_PUBLISHED_PATH, data);
}

/**
 * Delete workout.published.json
 * Deprecated: published workouts live in workouts.master.json
 */
export function deleteWorkoutPublished(): void {
  if (fs.existsSync(WORKOUT_PUBLISHED_PATH)) {
    fs.unlinkSync(WORKOUT_PUBLISHED_PATH);
  }
}
