export type RouteLabel = "MED" | "LRG" | "XL" | "XXL";

export interface ParsedRoute {
  fileName: string;
  coords: [number, number][]; // [lon, lat]
  elevations: number[]; // meters
  distanceMi: number;
  elevationFt: number;
}

export interface RouteMeta {
  routeGroupId: string;
  name: string;
  location: string;
  source: string;
  notes: string;
  variants: RouteLabel[];
}

export interface RouteVariant {
  label: RouteLabel;
  gpxContent: string;
}

export interface SaveRouteGroupRequest {
  routeGroupId: string;
  name: string;
  location: string;
  source: string;
  notes: string;
  variants: RouteVariant[];
}

export interface RouteGroupSummary {
  routeGroupId: string;
  name: string;
  location: string;
  variants: RouteLabel[];
}

export interface Event {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventDate?: string;
  eventTime?: string;
  startLocationName?: string;
  startLocationUrl?: string;
  startLocationCoordinates?: {
    lat: number;
    lng: number;
  };
  routeGroupIds: string[];
}

export interface EventsMaster {
  version: number;
  events: Event[];
}

export interface EventsSelection {
  version: number;
  selectedEventIds: string[];
}

export interface WorkoutsMaster {
  version: number;
  workouts: unknown[];
}
