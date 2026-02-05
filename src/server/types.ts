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

export interface RoutePoiVariantPlacement {
  lat: number;
  lon: number;
  distanceMi: number;
  distanceM: number;
  snapIndex: number;
  passIndex?: number;
  direction?: "forward" | "reverse";
}

export type RoutePoiVariantValue = RoutePoiVariantPlacement | RoutePoiVariantPlacement[];

export interface RoutePoi {
  id: string;
  title: string;
  type: string;
  system?: boolean;
  locked?: boolean;
  notes?: string;
  drop?: {
    lat: number;
    lon: number;
  };
  variants: Partial<Record<RouteLabel, RoutePoiVariantValue>>;
}

export interface RoutePoisDoc {
  version?: number;
  routeGroupId: string;
  pois: RoutePoi[];
}

export interface RoutePoiSnapRequest {
  poi: {
    id: string;
    title: string;
    type: string;
    notes?: string;
  };
  click: {
    lat: number;
    lon: number;
  };
  variants: RouteLabel[];
}

export interface SaveRouteGroupRequest {
  routeGroupId: string;
  name: string;
  location: string;
  source?: string;
  notes?: string;
  variants?: RouteVariant[];
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

// Roster types
export type RosterStatus = "active" | "paused" | "alumni";
export type RosterTier = "MED" | "LRG" | "XL";

export interface RosterMember {
  id: string;
  name: string;
  email: string;
  status: RosterStatus;
  tier: RosterTier;
  joinedDate: string;
  trainingGoal?: string;
  weeklyMileageRange?: string;
  consent: {
    publicName: boolean;
    publicStory: boolean;
    publicPhotos: boolean;
    publicMetrics: boolean;
  };
}

// Workout types
export type WorkoutStatus = "draft" | "published" | "archived";
export type TargetType = "pace" | "hr" | "power";
export type TierLabel = "MED" | "LRG" | "XL" | "XXL";

export interface IntervalTarget {
  type: TargetType;
  zone: string; // e.g., "Z1", "Z2", "Z3", "Z4", "Z5"
}

export interface IntervalSegment {
  type: "interval";
  reps: number;
  work: {
    duration: string; // e.g., "15min", "2mi", "30sec"
    target: IntervalTarget;
    cues: string[]; // Coach guidance for work period
  };
  rest: {
    duration: string;
    target: IntervalTarget;
    cues: string[];
  } | null; // null if no rest period
}

export interface TierVariant {
  name: string; // e.g., "Threshold 40 (MED)"
  structure: IntervalSegment[];
}

export interface Workout {
  workoutId: string; // kebab-case ID
  version: number; // 0 for draft, 1+ for published
  status: WorkoutStatus;
  name: string; // Narrative title
  description: string;
  focus: string[]; // Tags like ["threshold", "tempo"]
  coachNotes: string; // Execution guidance
  tiers: Partial<Record<TierLabel, TierVariant>>; // At least one tier must exist
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  publishedAt: string | null; // ISO8601, null if never published
}

export interface WorkoutsMaster {
  version: number;
  workouts: Workout[];
}
