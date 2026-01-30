import type {
  ParsedRoute,
  RouteGroupSummary,
  RouteMeta,
  EventsMaster,
  EventsSelection,
  RouteLabel,
  WorkoutsMaster,
} from "../types";

const API_BASE = "/api";

/**
 * Upload GPX file for parsing (does NOT save to disk).
 */
export async function importGPX(file: File): Promise<ParsedRoute> {
  const formData = new FormData();
  formData.append("gpx", file);

  const response = await fetch(`${API_BASE}/routes/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to import GPX");
  }

  return response.json();
}

/**
 * List all route groups.
 */
export async function listRouteGroups(): Promise<RouteGroupSummary[]> {
  const response = await fetch(`${API_BASE}/routes`);

  if (!response.ok) {
    throw new Error("Failed to list route groups");
  }

  const data = await response.json();
  return data.routeGroups;
}

/**
 * Get a specific route group.
 */
export async function getRouteGroup(groupId: string): Promise<RouteMeta> {
  const response = await fetch(`${API_BASE}/routes/${groupId}`);

  if (!response.ok) {
    throw new Error("Failed to get route group");
  }

  return response.json();
}

/**
 * Save a route group to suc-shared-data.
 */
export async function saveRouteGroup(
  groupId: string,
  data: {
    name: string;
    location: string;
    source: string;
    notes: string;
    variants: Array<{ label: RouteLabel; gpxContent: string }>;
  }
): Promise<{ success: boolean; routeGroupId: string }> {
  const response = await fetch(`${API_BASE}/routes/${groupId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeGroupId: groupId, ...data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save route group");
  }

  return response.json();
}

/**
 * Load events.master.json
 */
export async function loadEventsMaster(): Promise<EventsMaster> {
  const response = await fetch(`${API_BASE}/events`);

  if (!response.ok) {
    throw new Error("Failed to load events");
  }

  return response.json();
}

/**
 * Save events.master.json
 */
export async function saveEventsMaster(data: EventsMaster): Promise<void> {
  const response = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save events");
  }
}

/**
 * Load events.selection.json
 */
export async function loadEventsSelection(): Promise<EventsSelection> {
  const response = await fetch(`${API_BASE}/events/selection`);

  if (!response.ok) {
    throw new Error("Failed to load events selection");
  }

  return response.json();
}

/**
 * Save events.selection.json
 */
export async function saveEventsSelection(data: EventsSelection): Promise<void> {
  const response = await fetch(`${API_BASE}/events/selection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save events selection");
  }
}

/**
 * Load workouts.master.json
 */
export async function loadWorkoutsMaster(): Promise<WorkoutsMaster> {
  const response = await fetch(`${API_BASE}/workouts`);

  if (!response.ok) {
    throw new Error("Failed to load workouts");
  }

  return response.json();
}

/**
 * Save workouts.master.json
 */
export async function saveWorkoutsMaster(data: WorkoutsMaster): Promise<void> {
  const response = await fetch(`${API_BASE}/workouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save workouts");
  }
}
