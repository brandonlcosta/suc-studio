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
  title?: string;
  label?: string;
  type: string;
  system?: boolean;
  locked?: boolean;
  notes?: string;
  routePointIndex?: number;
  metadata?: {
    water?: boolean;
    nutrition?: boolean;
    crewAccess?: boolean;
    dropBags?: boolean;
  };
  drop?: {
    lat: number;
    lon: number;
  };
  variants?: Partial<Record<RouteLabel, RoutePoiVariantValue>>;
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
  type?: "crew-run" | "training-run" | "race" | "camp" | "social";
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
export type WorkoutDomain = "run" | "strength";
export type StrengthWorkoutType =
  | "strength_lower"
  | "strength_upper"
  | "strength_general"
  | "mobility"
  | "circuit"
  | "crosstrain";

export type WorkoutRouteMode = "fixed-sections";

export interface WorkoutSectionEffort {
  sectionKey: string;
  effort: string;
}

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

export interface StrengthExerciseBlock {
  type: "strength_exercise";
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  load?: string;
  notes?: string;
}

export interface CircuitBlock {
  type: "circuit_block";
  id: string;
  rounds: number;
  exercises: StrengthExerciseBlock[];
}

export interface CrosstrainBlock {
  type: "crosstrain_block";
  id: string;
  modality: "bike" | "row" | "swim" | "elliptical" | "hike";
  duration: string;
  target?: string;
  notes?: string;
}

export interface MobilityBlock {
  type: "mobility_block";
  id: string;
  name: string;
  duration: string;
  cues?: string;
}

export type StrengthBlock = StrengthExerciseBlock | CircuitBlock | CrosstrainBlock | MobilityBlock;

export interface Workout {
  workoutId: string; // kebab-case ID
  version: number; // 0 for draft, 1+ for published
  status: WorkoutStatus;
  domain?: WorkoutDomain;
  strengthType?: StrengthWorkoutType | null;
  name: string; // Narrative title
  description: string;
  focus: string[]; // Tags like ["threshold", "tempo"]
  coachNotes: string; // Execution guidance
  tiers: Partial<Record<TierLabel, TierVariant>>; // At least one tier must exist for run workouts
  strengthStructure?: StrengthBlock[];
  routeId?: string | null;
  routeMode?: WorkoutRouteMode | null;
  sectionEfforts?: WorkoutSectionEffort[];
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  publishedAt: string | null; // ISO8601, null if never published
}

export interface WorkoutsMaster {
  version: number;
  workouts: Workout[];
}

// Route Intel types
export type RouteIntelSectionMode = "race" | "all-poi";

export interface RouteIntelRoute {
  routeId: string;
  distanceVariantIds: string[];
  sectionMode?: RouteIntelSectionMode;
  enabledPoiIds?: string[];
}

export interface RouteIntelDoc {
  id: string;
  type: "route-intel";
  eventId: string;
  routes: RouteIntelRoute[];
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

// Route Media types
export type RouteMediaOutputFormat = "story" | "square" | "landscape";
export type RouteMediaCameraMode = "third-person-follow" | "overview-lock";

export interface RouteMediaPlayback {
  milesPerSecond: number;
  fps: number;
  holdSeconds: number;
  outputFormat: RouteMediaOutputFormat;
}

export interface RouteMediaCameraDefaults {
  mode: RouteMediaCameraMode;
  followDistanceMeters?: number;
  altitudeMeters?: number;
  pitchDeg?: number;
  headingOffsetDeg?: number;
}

export interface RouteMediaTimelineEntry {
  id: string;
  startMi: number;
  endMi: number;
  cameraMode: RouteMediaCameraMode;
  speedMiPerSec?: number;
  title?: string;
  subtitleIds?: string[];
  markerIds?: string[];
}

export interface RouteMediaSubtitle {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  position?: "top" | "bottom";
}

export interface RouteMediaMarker {
  id: string;
  atMi: number;
  type: "poi" | "title" | "subtitle" | "custom";
  title: string;
  body?: string;
  poiId?: string;
}

export interface RouteMediaDoc {
  id: string;
  type: "route-media";
  schemaVersion: "1.0.0" | string;
  eventId: string;
  routeId: string;
  distanceVariantId?: string;
  title?: string;
  description?: string;
  playback: RouteMediaPlayback;
  camera: RouteMediaCameraDefaults;
  timeline: RouteMediaTimelineEntry[];
  subtitles: RouteMediaSubtitle[];
  markers: RouteMediaMarker[];
  visibility: "public" | "private";
  publish?: boolean;
  status?: "active" | "archived" | "deprecated";
  createdAt: string;
  updatedAt: string;
}
