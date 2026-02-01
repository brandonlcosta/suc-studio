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

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `${context} expected JSON but received ${contentType || "unknown"}: ${preview || "empty"}`
    );
  }
  return (await response.json()) as T;
}

async function handleError(response: Response, context: string): Promise<never> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || `${context} failed with ${response.status}`);
  }
  const text = await response.text();
  const preview = text.slice(0, 200).replace(/\s+/g, " ").trim();
  throw new Error(
    `${context} failed with ${response.status} (${contentType || "unknown"}): ${preview || "empty"}`
  );
}

/**
 * Upload GPX file for parsing (server may persist if filename is canonical).
 */
export async function importGPX(file: File): Promise<ParsedRoute> {
  const formData = new FormData();
  formData.append("gpx", file);

  const response = await fetch(`${API_BASE}/routes/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    await handleError(response, "Failed to import GPX");
  }

  return parseJsonResponse(response, "Import GPX");
}

/**
 * List all route groups.
 */
export async function listRouteGroups(): Promise<RouteGroupSummary[]> {
  const response = await fetch(`${API_BASE}/routes`);

  if (!response.ok) {
    await handleError(response, "Failed to list route groups");
  }

  const data = await parseJsonResponse<{ routeGroups: RouteGroupSummary[] }>(
    response,
    "List route groups"
  );
  return data.routeGroups;
}

/**
 * Get a specific route group.
 */
export async function getRouteGroup(groupId: string): Promise<RouteMeta> {
  const response = await fetch(`${API_BASE}/routes/${groupId}`);

  if (!response.ok) {
    await handleError(response, "Failed to get route group");
  }

  return parseJsonResponse(response, "Get route group");
}

/**
 * Get parsed GPX geometry for a route variant (preview only).
 */
export async function getRouteVariantPreview(
  groupId: string,
  label: RouteLabel
): Promise<ParsedRoute> {
  const normalized = String(label).toUpperCase() as RouteLabel;
  const response = await fetch(`${API_BASE}/routes/${groupId}/gpx/${normalized}`);

  if (!response.ok) {
    await handleError(response, "Failed to load route variant");
  }

  return parseJsonResponse(response, "Get route variant");
}

/**
 * Delete a route group.
 */
export async function deleteRouteGroup(groupId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/routes/${groupId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await handleError(response, "Failed to delete route group");
  }
}

/**
 * Delete a single route variant.
 */
export async function deleteRouteVariant(
  groupId: string,
  label: RouteLabel
): Promise<RouteMeta> {
  const normalized = String(label).toUpperCase() as RouteLabel;
  const response = await fetch(`${API_BASE}/routes/${groupId}/gpx/${normalized}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await handleError(response, "Failed to delete route variant");
  }

  const data = await parseJsonResponse<{ routeGroup: RouteMeta }>(
    response,
    "Delete route variant"
  );
  return data.routeGroup;
}

/**
 * Snap and persist a POI via the Studio API.
 */
export async function snapRoutePoi(
  groupId: string,
  data: {
    poi: { id: string; title: string; type: string; notes?: string };
    click: { lat: number; lon: number };
    variants: RouteLabel[];
  }
): Promise<{ success: boolean; poi: unknown; pois: unknown[] }> {
  const response = await fetch(`${API_BASE}/routes/${groupId}/pois/snap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleError(response, "Failed to snap POI");
  }

  return parseJsonResponse(response, "Snap route POI");
}

/**
 * Load route POIs for a group.
 */
export async function getRoutePois(groupId: string): Promise<{
  routeGroupId: string;
  pois: Array<{
    id: string;
    type: string;
    title: string;
    variants?: Record<
      string,
      {
        lat: number;
        lon: number;
        distanceMi: number;
        distanceM: number;
        snapIndex: number;
      }
    >;
  }>;
}> {
  const response = await fetch(`${API_BASE}/routes/${groupId}/pois`);

  if (!response.ok) {
    await handleError(response, "Failed to load route POIs");
  }

  return parseJsonResponse(response, "Get route POIs");
}

/**
 * Save a route group to suc-shared-data.
 */
export async function saveRouteGroup(
  groupId: string,
  data: {
    name: string;
    location: string;
    notes: string;
  }
): Promise<{ success: boolean; routeGroupId: string }> {
  const response = await fetch(`${API_BASE}/routes/${groupId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeGroupId: groupId, ...data }),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save route group");
  }

  return parseJsonResponse(response, "Save route group");
}

/**
 * Load events.master.json
 */
export async function loadEventsMaster(): Promise<EventsMaster> {
  const response = await fetch(`${API_BASE}/events`);

  if (!response.ok) {
    await handleError(response, "Failed to load events");
  }

  return parseJsonResponse(response, "Load events");
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
    await handleError(response, "Failed to save events");
  }
}

/**
 * Load events.selection.json
 */
export async function loadEventsSelection(): Promise<EventsSelection> {
  const response = await fetch(`${API_BASE}/events/selection`);

  if (!response.ok) {
    await handleError(response, "Failed to load events selection");
  }

  return parseJsonResponse(response, "Load events selection");
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
    await handleError(response, "Failed to save events selection");
  }
}

/**
 * Load workouts.master.json
 */
export async function loadWorkoutsMaster(): Promise<WorkoutsMaster> {
  const response = await fetch(`${API_BASE}/workouts`);

  if (!response.ok) {
    await handleError(response, "Failed to load workouts");
  }

  return parseJsonResponse(response, "Load workouts");
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
    await handleError(response, "Failed to save workouts");
  }
}
