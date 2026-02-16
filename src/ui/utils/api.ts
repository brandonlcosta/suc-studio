import type {
  ParsedRoute,
  RouteGroupSummary,
  RouteMeta,
  EventsMaster,
  EventsSelection,
  RouteLabel,
  WorkoutsMaster,
  RouteIntelDoc,
  RouteMediaDoc,
} from "../types";
import { buildStudioApiUrl } from "./studioApi";


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

  const response = await fetch(buildStudioApiUrl(`/routes/import`), {
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
  const response = await fetch(buildStudioApiUrl("/routes"));

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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}`));

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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/gpx/${normalized}`));

  if (!response.ok) {
    await handleError(response, "Failed to load route variant");
  }

  return parseJsonResponse(response, "Get route variant");
}

/**
 * Delete a route group.
 */
export async function deleteRouteGroup(groupId: string): Promise<void> {
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}`), {
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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/gpx/${normalized}`), {
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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois/snap`), {
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
    title?: string;
    label?: string;
    routePointIndex?: number;
    metadata?: {
      water?: boolean;
      nutrition?: boolean;
      crewAccess?: boolean;
      dropBags?: boolean;
    };
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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois`));

  if (!response.ok) {
    await handleError(response, "Failed to load route POIs");
  }

  return parseJsonResponse(response, "Get route POIs");
}

/**
 * Save or update an aid-station POI.
 */
export async function saveAidStationPoi(
  groupId: string,
  data: {
    id: string;
    title: string;
    routePointIndex: number;
    metadata?: {
      water?: boolean;
      nutrition?: boolean;
      crewAccess?: boolean;
      dropBags?: boolean;
    };
  }
): Promise<{ success: boolean; poi: unknown; pois: unknown[] }> {
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois/aid-station`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poi: data }),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save aid station POI");
  }

  return parseJsonResponse(response, "Save aid station POI");
}

/**
 * Save or update a workout POI.
 */
export async function saveWorkoutPoi(
  groupId: string,
  data: {
    id: string;
    label: string;
    routePointIndex: number;
    notes?: string;
  }
): Promise<{ success: boolean; poi: unknown; pois: unknown[] }> {
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois/workout`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ poi: data }),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save workout POI");
  }

  return parseJsonResponse(response, "Save workout POI");
}

/**
 * Delete a POI for a route group.
 */
export async function deleteRoutePoi(
  groupId: string,
  poiId: string
): Promise<{ success: boolean; poiId: string; deleted: boolean; pois: unknown[] }> {
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois/${poiId}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    await handleError(response, "Failed to delete route POI");
  }

  return parseJsonResponse(response, "Delete route POI");
}

/**
 * Ensure Start/Finish POI exists for a route group.
 */
export async function ensureStartFinishPoi(
  groupId: string
): Promise<{ success: boolean; poi: unknown; pois: unknown[] }> {
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}/pois/start-finish`), {
    method: "POST",
  });

  if (!response.ok) {
    await handleError(response, "Failed to ensure Start/Finish POI");
  }

  return parseJsonResponse(response, "Ensure Start/Finish POI");
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
  const response = await fetch(buildStudioApiUrl(`/routes/${groupId}`), {
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
  const response = await fetch(buildStudioApiUrl("/events"));

  if (!response.ok) {
    await handleError(response, "Failed to load events");
  }

  return parseJsonResponse(response, "Load events");
}

/**
 * Save events.master.json
 */
export async function saveEventsMaster(data: EventsMaster): Promise<void> {
  const response = await fetch(buildStudioApiUrl(`/events`), {
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
  const response = await fetch(buildStudioApiUrl("/events/selection"));

  if (!response.ok) {
    await handleError(response, "Failed to load events selection");
  }

  return parseJsonResponse(response, "Load events selection");
}

/**
 * Save events.selection.json
 */
export async function saveEventsSelection(data: EventsSelection): Promise<void> {
  const response = await fetch(buildStudioApiUrl(`/events/selection`), {
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
  const response = await fetch(buildStudioApiUrl("/workouts"));

  if (!response.ok) {
    await handleError(response, "Failed to load workouts");
  }

  return parseJsonResponse(response, "Load workouts");
}

/**
 * Save workouts.master.json
 */
export async function saveWorkoutsMaster(data: WorkoutsMaster): Promise<void> {
  const response = await fetch(buildStudioApiUrl(`/workouts`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save workouts");
  }
}

/**
 * List route intel documents.
 */
export async function listRouteIntel(): Promise<RouteIntelDoc[]> {
  const response = await fetch(buildStudioApiUrl("/route-intel"));

  if (!response.ok) {
    await handleError(response, "Failed to load route intel");
  }

  const data = await parseJsonResponse<{ items: RouteIntelDoc[] }>(
    response,
    "Load route intel"
  );
  return data.items || [];
}

/**
 * Load a single route intel document.
 */
export async function getRouteIntel(id: string): Promise<RouteIntelDoc> {
  const response = await fetch(buildStudioApiUrl(`/route-intel/${id}`));

  if (!response.ok) {
    await handleError(response, "Failed to load route intel");
  }

  return parseJsonResponse(response, "Load route intel");
}

/**
 * Save (publish) a route intel document.
 */
export async function saveRouteIntel(doc: RouteIntelDoc): Promise<void> {
  const response = await fetch(buildStudioApiUrl("/route-intel"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc, null, 2),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save route intel");
  }
}

/**
 * Delete a route intel document.
 */
export async function deleteRouteIntel(id: string): Promise<void> {
  const response = await fetch(buildStudioApiUrl(`/route-intel/${id}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    await handleError(response, "Failed to delete route intel");
  }
}

/**
 * List route media plans.
 */
export async function listRouteMedia(): Promise<RouteMediaDoc[]> {
  const response = await fetch(buildStudioApiUrl("/route-media"));

  if (!response.ok) {
    await handleError(response, "Failed to load route media");
  }

  const data = await parseJsonResponse<{ items: RouteMediaDoc[] }>(
    response,
    "Load route media"
  );
  return data.items || [];
}

/**
 * Load a single route media plan.
 */
export async function getRouteMedia(id: string): Promise<RouteMediaDoc> {
  const response = await fetch(buildStudioApiUrl(`/route-media/${id}`));

  if (!response.ok) {
    await handleError(response, "Failed to load route media");
  }

  return parseJsonResponse(response, "Load route media");
}

/**
 * Load canonical route-media schema from shared-data (via studio API).
 */
export async function getRouteMediaSchema(): Promise<unknown> {
  const response = await fetch(buildStudioApiUrl("/route-media/schema"));

  if (!response.ok) {
    await handleError(response, "Failed to load route media schema");
  }

  return parseJsonResponse(response, "Load route media schema");
}

/**
 * Save (publish) a route media document.
 */
export async function saveRouteMedia(doc: RouteMediaDoc): Promise<void> {
  const response = await fetch(buildStudioApiUrl("/route-media"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc, null, 2),
  });

  if (!response.ok) {
    await handleError(response, "Failed to save route media");
  }
}
