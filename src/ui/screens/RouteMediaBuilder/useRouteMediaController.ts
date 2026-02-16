import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Event,
  RouteGroupSummary,
  RouteLabel,
  RouteMediaCameraMode,
  RouteMediaDoc,
  RouteMediaMarker,
  RouteMediaSubtitle,
  RouteMediaTimelineEntry,
} from "../../types";
import {
  getRouteVariantPreview,
  listRouteGroups,
  listRouteMedia,
  loadEventsMaster,
  saveRouteMedia,
} from "../../utils/api";
import {
  buildRouteStats,
  getCoordinateAtDistance,
  snapToRoute,
  type RouteStats,
} from "../../utils/routeMath";
import { validateRouteMedia } from "../../utils/routeMediaValidation";
import { toErrorMap } from "../../utils/validation";
import type { ValidationError } from "../../utils/validation";
import {
  normalizeSubtitleDurations,
  normalizeTimelineEntryRange,
  sortTimelineEntries,
  type TimelineOverlapIssue,
  MIN_SUBTITLE_DURATION_SEC,
  MIN_TIMELINE_SPAN_MI,
} from "../../utils/routeMediaTimelineGuardrails";
import { buildElevationPoints, type ElevationPoint } from "./timelineElevation";
import {
  duplicateTimelineEntry,
  nudgeTimelineEntry,
  splitTimelineEntryAtMile,
} from "./timelineEditing";
import {
  detectLaneOverlaps,
  projectOverlaysToLanes,
  type LaneOverlapIssue,
  type TimelineLaneBlock,
  type TimelineLaneId,
  type TimelineLaneProjectionContext,
} from "./timelineLanes";
import { canonicalToOverlays, getOverlayEntryId, type Overlay, type OverlayType } from "./overlays";
import {
  createOverlayDraft,
  estimateSecondsAtMile,
  moveEntryToMileInDraft,
  removeEntryByIdInDraft,
  updateEntryRangeInDraft,
} from "./overlayDraftOps";

type ControllerErrorMap = Record<string, string>;

type TimelineMarkerPoi = {
  id: string;
  type: "workout";
  title: string;
  label: string;
  routePointIndex: number;
};

const VARIANT_SET = new Set<RouteLabel>(["MED", "LRG", "XL", "XXL"]);

function toRouteLabel(value: string | null | undefined): RouteLabel | null {
  const normalized = String(value || "").trim().toUpperCase();
  if (VARIANT_SET.has(normalized as RouteLabel)) {
    return normalized as RouteLabel;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function generateEntryId(): string {
  const token = Math.random().toString(36).slice(2, 7);
  return `entry-${Date.now().toString(36)}-${token}`;
}

function createDraft(): RouteMediaDoc {
  const now = new Date().toISOString();
  return {
    id: "",
    type: "route-media",
    schemaVersion: "1.0.0",
    eventId: "",
    routeId: "",
    distanceVariantId: "",
    title: "",
    description: "",
    playback: {
      milesPerSecond: 1,
      fps: 24,
      holdSeconds: 0.75,
      outputFormat: "story",
    },
    camera: {
      mode: "third-person-follow",
      followDistanceMeters: 120,
      altitudeMeters: 90,
      pitchDeg: 58,
      headingOffsetDeg: 0,
    },
    timeline: [],
    subtitles: [],
    markers: [],
    visibility: "private",
    publish: true,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function getPrimarySubtitle(
  draft: RouteMediaDoc | null,
  entry: RouteMediaTimelineEntry | null
): RouteMediaSubtitle | null {
  if (!draft || !entry) return null;
  const subtitleId = Array.isArray(entry.subtitleIds) ? entry.subtitleIds[0] : null;
  if (!subtitleId) return null;
  return draft.subtitles.find((item) => item.id === subtitleId) ?? null;
}

function getPrimaryMarker(
  draft: RouteMediaDoc | null,
  entry: RouteMediaTimelineEntry | null
): RouteMediaMarker | null {
  if (!draft || !entry) return null;
  const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
  if (!markerId) return null;
  return draft.markers.find((item) => item.id === markerId) ?? null;
}


export type RouteMediaController = {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  items: RouteMediaDoc[];
  events: Event[];
  routeGroups: RouteGroupSummary[];
  selectedRouteGroup: RouteGroupSummary | null;
  availableVariants: RouteLabel[];
  draft: RouteMediaDoc | null;
  selectedEntryId: string | null;
  hoveredEntryId: string | null;
  selectedEntry: RouteMediaTimelineEntry | null;
  selectedSubtitle: RouteMediaSubtitle | null;
  selectedMarker: RouteMediaMarker | null;
  selectedEntryHoldSeconds: number;
  validationErrors: ControllerErrorMap;
  validationDetails: ValidationError[];
  activeVariant: RouteLabel | null;
  activeRouteStats: RouteStats | null;
  activeRouteLengthMiles: number;
  scrubMile: number;
  elevationPoints: ElevationPoint[];
  scrubIndicator: { lat: number; lon: number } | null;
  timelineMarkers: TimelineMarkerPoi[];
  timelineOverlapIssues: TimelineOverlapIssue[];
  laneBlocks: Record<TimelineLaneId, TimelineLaneBlock[]>;
  laneOverlapIssues: LaneOverlapIssue[];
  overlays: Overlay[];
  titleAttachments: Record<string, string>;
  startNew: () => void;
  closeDraft: () => void;
  loadPlan: (planId: string) => void;
  setSelectedEntryId: (entryId: string | null) => void;
  setHoveredEntryId: (entryId: string | null) => void;
  setDraftField: (updates: Partial<RouteMediaDoc>) => void;
  setPlaybackField: <K extends keyof RouteMediaDoc["playback"]>(
    key: K,
    value: RouteMediaDoc["playback"][K]
  ) => void;
  setCameraField: <K extends keyof RouteMediaDoc["camera"]>(
    key: K,
    value: RouteMediaDoc["camera"][K]
  ) => void;
  setActiveVariant: (variant: RouteLabel) => void;
  setScrubMile: (mile: number) => void;
  setTitleAttachment: (titleEntryId: string, poiEntryId: string | null) => void;
  createEntryAtMile: (mile: number) => void;
  createOverlayAtMile: (type: OverlayType, mile: number) => void;
  moveEntryToMile: (entryId: string, mile: number) => void;
  moveEntryByMapDrag: (entryId: string, lat: number, lon: number) => void;
  updateEntryRange: (entryId: string, startMi: number, endMi: number) => void;
  updateSelectedEntryField: (updates: Partial<RouteMediaTimelineEntry>) => void;
  updateSelectedSubtitleText: (text: string) => void;
  updateSelectedMarkerTitle: (title: string) => void;
  updateSelectedMarkerBody: (body: string) => void;
  updateSelectedMarkerType: (type: RouteMediaMarker["type"]) => void;
  updateSelectedHoldSeconds: (seconds: number) => void;
  splitSelectedEntryAtMile: (mile: number) => void;
  duplicateSelectedEntry: () => void;
  duplicateEntryById: (entryId: string) => void;
  nudgeSelectedEntry: (startDeltaMi: number, endDeltaMi: number) => void;
  removeSelectedEntry: () => void;
  removeEntryById: (entryId: string) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
};

export function useRouteMediaController(): RouteMediaController {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [items, setItems] = useState<RouteMediaDoc[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [routeGroups, setRouteGroups] = useState<RouteGroupSummary[]>([]);
  const [draft, setDraft] = useState<RouteMediaDoc | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ControllerErrorMap>({});
  const [validationDetails, setValidationDetails] = useState<ValidationError[]>([]);
  const [activeVariant, setActiveVariantState] = useState<RouteLabel | null>(null);
  const [activeRouteStats, setActiveRouteStats] = useState<RouteStats | null>(null);
  const [scrubMile, setScrubMileState] = useState(0);
  const [titleAttachments, setTitleAttachments] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<Array<{ draft: RouteMediaDoc; titleAttachments: Record<string, string> }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ draft: RouteMediaDoc; titleAttachments: Record<string, string> }>>([]);
  const draftRef = useRef<RouteMediaDoc | null>(null);
  const titleAttachmentsRef = useRef<Record<string, string>>({});

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mediaItems, eventsMaster, groups] = await Promise.all([
        listRouteMedia(),
        loadEventsMaster(),
        listRouteGroups(),
      ]);
      setItems(mediaItems);
      setEvents(eventsMaster.events);
      setRouteGroups(groups);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unknown error";
      setError(`Failed to load route media data: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const selectedRouteGroup = useMemo(() => {
    if (!draft?.routeId) return null;
    return routeGroups.find((route) => route.routeGroupId === draft.routeId) ?? null;
  }, [draft?.routeId, routeGroups]);

  const availableVariants = useMemo(() => {
    const raw = Array.isArray(selectedRouteGroup?.variants) ? selectedRouteGroup.variants : [];
    return raw
      .map((variant) => toRouteLabel(variant))
      .filter((variant): variant is RouteLabel => Boolean(variant));
  }, [selectedRouteGroup]);

  useEffect(() => {
    if (!draft?.routeId || availableVariants.length === 0) {
      setActiveVariantState(null);
      return;
    }
    const preferred = toRouteLabel(draft.distanceVariantId);
    if (preferred && availableVariants.includes(preferred)) {
      setActiveVariantState(preferred);
      return;
    }
    const fallback = availableVariants[0];
    setActiveVariantState(fallback);
    setDraft((prev) => (prev ? { ...prev, distanceVariantId: fallback } : prev));
  }, [draft?.routeId, draft?.distanceVariantId, availableVariants]);

  useEffect(() => {
    if (!draft?.routeId || !activeVariant) {
      setActiveRouteStats(null);
      return;
    }
    let isMounted = true;
    getRouteVariantPreview(draft.routeId, activeVariant)
      .then((preview) => {
        if (!isMounted) return;
        setActiveRouteStats(buildRouteStats(preview));
      })
      .catch((nextError) => {
        if (!isMounted) return;
        const message =
          nextError instanceof Error ? nextError.message : "Failed to load route preview";
        setError(`Failed to load route preview for ${activeVariant}: ${message}`);
        setActiveRouteStats(null);
      });
    return () => {
      isMounted = false;
    };
  }, [draft?.routeId, activeVariant]);

  const selectedEntry = useMemo(() => {
    if (!draft || !selectedEntryId) return null;
    return draft.timeline.find((entry) => entry.id === selectedEntryId) ?? null;
  }, [draft, selectedEntryId]);

  const selectedSubtitle = useMemo(
    () => getPrimarySubtitle(draft, selectedEntry),
    [draft, selectedEntry]
  );
  const selectedMarker = useMemo(
    () => getPrimaryMarker(draft, selectedEntry),
    [draft, selectedEntry]
  );

  const selectedEntryHoldSeconds = useMemo(() => {
    if (!selectedSubtitle) return 0;
    return Math.max(
      0,
      toFiniteNumber(selectedSubtitle.endSec, 0) - toFiniteNumber(selectedSubtitle.startSec, 0)
    );
  }, [selectedSubtitle]);

  const activeRouteLengthMiles = useMemo(
    () => toFiniteNumber(activeRouteStats?.totalMiles, 0),
    [activeRouteStats]
  );

  useEffect(() => {
    if (!selectedEntry) return;
    setScrubMileState(clamp(toFiniteNumber(selectedEntry.startMi, 0), 0, Math.max(0, activeRouteLengthMiles)));
  }, [selectedEntry, activeRouteLengthMiles]);

  useEffect(() => {
    setScrubMileState((prev) => clamp(prev, 0, Math.max(0, activeRouteLengthMiles)));
  }, [activeRouteLengthMiles]);

  const setScrubMile = useCallback(
    (mile: number) => {
      setScrubMileState(clamp(toFiniteNumber(mile, 0), 0, Math.max(0, activeRouteLengthMiles)));
    },
    [activeRouteLengthMiles]
  );

  const elevationPoints = useMemo(() => buildElevationPoints(activeRouteStats), [activeRouteStats]);

  const scrubIndicator = useMemo(() => {
    const position = getCoordinateAtDistance(activeRouteStats, scrubMile);
    if (!position) return null;
    return { lat: position.lat, lon: position.lon };
  }, [activeRouteStats, scrubMile]);

  const timelineMarkers = useMemo<TimelineMarkerPoi[]>(() => {
    if (!draft || !activeRouteStats) return [];
    return draft.timeline
      .map((entry) => {
        const coord = getCoordinateAtDistance(activeRouteStats, toFiniteNumber(entry.startMi, 0));
        if (!coord) return null;
        const markerTitle = entry.title || entry.id;
        return {
          id: entry.id,
          type: "workout" as const,
          title: markerTitle,
          label: markerTitle,
          routePointIndex: coord.index,
        };
      })
      .filter((marker): marker is TimelineMarkerPoi => Boolean(marker));
  }, [draft, activeRouteStats]);

  const laneContext = useMemo<TimelineLaneProjectionContext>(
    () => ({
      defaultCameraMode: draft?.camera?.mode || null,
      defaultSpeedMiPerSec: toFiniteNumber(draft?.playback?.milesPerSecond, NaN),
    }),
    [draft?.camera?.mode, draft?.playback?.milesPerSecond]
  );

  const overlays = useMemo<Overlay[]>(() => {
    if (!draft) return [];
    return canonicalToOverlays(
      Array.isArray(draft.timeline) ? draft.timeline : [],
      Array.isArray(draft.markers) ? draft.markers : [],
      Array.isArray(draft.subtitles) ? draft.subtitles : [],
      titleAttachments,
      laneContext
    );
  }, [draft, laneContext, titleAttachments]);

  const laneBlocks = useMemo<Record<TimelineLaneId, TimelineLaneBlock[]>>(
    () => projectOverlaysToLanes(overlays, titleAttachments),
    [overlays, titleAttachments]
  );

  const laneOverlapIssues = useMemo(() => detectLaneOverlaps(laneBlocks), [laneBlocks]);

  const timelineOverlapIssues = useMemo<TimelineOverlapIssue[]>(() => {
    return laneOverlapIssues.map((issue) => ({
      lane: issue.laneId,
      entryId: issue.entryId,
      previousEntryId: issue.previousEntryId,
      entryIndex: -1,
      previousEntryIndex: -1,
      field: "timeline",
      message: issue.message,
    }));
  }, [laneOverlapIssues]);

  useEffect(() => {
    if (!draft) return;
    const timelineIds = new Set((draft.timeline || []).map((entry) => entry.id));
    setTitleAttachments((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [titleEntryId, poiEntryId] of Object.entries(prev)) {
        if (!timelineIds.has(titleEntryId) || !timelineIds.has(poiEntryId)) {
          changed = true;
          continue;
        }
        next[titleEntryId] = poiEntryId;
      }
      return changed ? next : prev;
    });
  }, [draft]);

  useEffect(() => {
    if (!draft || Object.keys(titleAttachments).length === 0) return;
    const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;

    setDraft((prev) => {
      if (!prev) return prev;
      const overlaysForSync = canonicalToOverlays(
        prev.timeline,
        prev.markers,
        prev.subtitles,
        titleAttachments,
        laneContext
      );
      const poiStartByEntryId = new Map(
        overlaysForSync
          .filter((overlay) => overlay.type === "poi")
          .map((overlay) => [getOverlayEntryId(overlay), overlay.startMile])
      );
      let changed = false;
      const timeline = prev.timeline.map((entry) => {
        const attachedPoiEntryId = titleAttachments[entry.id];
        if (!attachedPoiEntryId) return entry;
        const poiStart = poiStartByEntryId.get(attachedPoiEntryId);
        if (!Number.isFinite(poiStart)) return entry;
        const entryStart = toFiniteNumber(entry.startMi, 0);
        if (Math.abs(entryStart - (poiStart as number)) < 1e-6) return entry;
        const span = Math.max(
          MIN_TIMELINE_SPAN_MI,
          toFiniteNumber(entry.endMi, entryStart) - entryStart
        );
        changed = true;
        return normalizeTimelineEntryRange(entry, { startMi: poiStart, endMi: (poiStart as number) + span }, maxMiles);
      });
      if (!changed) return prev;
      return { ...prev, timeline: sortTimelineEntries(timeline) };
    });
  }, [activeRouteStats, draft, laneContext, titleAttachments]);

  const startNew = useCallback(() => {
    setDraft(createDraft());
    setScrubMileState(0);
    setTitleAttachments({});
    setUndoStack([]);
    setRedoStack([]);
    setSelectedEntryId(null);
    setHoveredEntryId(null);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    setValidationDetails([]);
  }, []);

  const closeDraft = useCallback(() => {
    setDraft(null);
    setScrubMileState(0);
    setTitleAttachments({});
    setUndoStack([]);
    setRedoStack([]);
    setSelectedEntryId(null);
    setHoveredEntryId(null);
    setValidationErrors({});
    setValidationDetails([]);
    setSuccess(null);
  }, []);

  const loadPlan = useCallback(
    (planId: string) => {
      const found = items.find((plan) => plan.id === planId);
      if (!found) return;
      setDraft({
        ...found,
        timeline: Array.isArray(found.timeline) ? sortTimelineEntries(found.timeline) : [],
        subtitles: normalizeSubtitleDurations(Array.isArray(found.subtitles) ? found.subtitles : []),
        markers: Array.isArray(found.markers) ? found.markers : [],
      });
      setScrubMileState(0);
      setTitleAttachments({});
      setUndoStack([]);
      setRedoStack([]);
      setSelectedEntryId(null);
      setHoveredEntryId(null);
      setValidationErrors({});
      setValidationDetails([]);
      setError(null);
      setSuccess(null);
    },
    [items]
  );

  const setDraftField = useCallback((updates: Partial<RouteMediaDoc>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const setPlaybackField = useCallback(
    <K extends keyof RouteMediaDoc["playback"]>(key: K, value: RouteMediaDoc["playback"][K]) => {
      setDraft((prev) => (prev ? { ...prev, playback: { ...prev.playback, [key]: value } } : prev));
    },
    []
  );

  const setCameraField = useCallback(
    <K extends keyof RouteMediaDoc["camera"]>(key: K, value: RouteMediaDoc["camera"][K]) => {
      setDraft((prev) => (prev ? { ...prev, camera: { ...prev.camera, [key]: value } } : prev));
    },
    []
  );

  const setActiveVariant = useCallback((variant: RouteLabel) => {
    setActiveVariantState(variant);
    setDraft((prev) => (prev ? { ...prev, distanceVariantId: variant } : prev));
  }, []);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft, draftRef]);

  useEffect(() => {
    titleAttachmentsRef.current = titleAttachments;
  }, [titleAttachments]);

  const commitDraft = useCallback((updater: (prev: RouteMediaDoc) => RouteMediaDoc) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (next === prev) return prev;
      setUndoStack((stack) => [...stack, { draft: prev, titleAttachments }]);
      setRedoStack([]);
      return next;
    });
  }, [titleAttachments]);

  const setTitleAttachment = useCallback((titleEntryId: string, poiEntryId: string | null) => {
    setTitleAttachments((prev) => {
      let next = prev;
      if (!poiEntryId) {
        if (!prev[titleEntryId]) return prev;
        next = { ...prev };
        delete next[titleEntryId];
      } else {
        if (prev[titleEntryId] === poiEntryId) return prev;
        next = { ...prev, [titleEntryId]: poiEntryId };
      }
      const currentDraft = draftRef.current;
      if (currentDraft) {
        setUndoStack((stack) => [...stack, { draft: currentDraft, titleAttachments: prev }]);
        setRedoStack([]);
      }
      return next;
    });
  }, []);

  const moveEntryToMile = useCallback(
    (entryId: string, mile: number) => {
      const maxMilesHint = activeRouteStats ? activeRouteStats.totalMiles : Math.max(mile, 0);
      const nextMileHint = clamp(toFiniteNumber(mile, 0), 0, Math.max(0, maxMilesHint));
      setScrubMileState(nextMileHint);
      commitDraft((prev) => {
        if (!prev) return prev;
        const maxMiles = activeRouteStats ? activeRouteStats.totalMiles : Math.max(mile, 0);
        return moveEntryToMileInDraft(prev, entryId, mile, maxMiles);
      });
    },
    [activeRouteStats, commitDraft]
  );

  const moveEntryByMapDrag = useCallback(
    (entryId: string, lat: number, lon: number) => {
      const snapped = snapToRoute(activeRouteStats, { lat, lon });
      if (!snapped) return;
      moveEntryToMile(entryId, snapped.cumulativeMi);
    },
    [activeRouteStats, moveEntryToMile]
  );

  const createEntryAtMile = useCallback(
    (mile: number) => {
      commitDraft((prev) => {
        if (!prev) return prev;
        const maxMiles = activeRouteStats ? activeRouteStats.totalMiles : Math.max(mile, 0);
        const startMi = clamp(toFiniteNumber(mile, 0), 0, Math.max(0, maxMiles));
        const entryId = generateEntryId();
        const subtitleId = `subtitle-${entryId}`;
        const markerId = `marker-${entryId}`;
        const startSec = estimateSecondsAtMile(prev, startMi);
        const holdSeconds = Math.max(0.1, toFiniteNumber(prev.playback.holdSeconds, 0.75));

        const entry = normalizeTimelineEntryRange({
          id: entryId,
          startMi,
          endMi: startMi + MIN_TIMELINE_SPAN_MI,
          cameraMode: (prev.camera.mode || "third-person-follow") as RouteMediaCameraMode,
          speedMiPerSec: toFiniteNumber(prev.playback.milesPerSecond, 1),
          title: "New POI",
          subtitleIds: [subtitleId],
          markerIds: [markerId],
        }, {}, Math.max(0, maxMiles));
        const subtitle: RouteMediaSubtitle = {
          id: subtitleId,
          startSec,
          endSec: startSec + holdSeconds,
          text: "New subtitle",
          position: "bottom",
        };
        const marker: RouteMediaMarker = {
          id: markerId,
          atMi: startMi,
          type: "title",
          title: "POI",
        };

        setSelectedEntryId(entryId);
        setHoveredEntryId(entryId);
        setScrubMileState(startMi);

        return {
          ...prev,
          timeline: sortTimelineEntries([...prev.timeline, entry]),
          subtitles: normalizeSubtitleDurations([...prev.subtitles, subtitle]),
          markers: [...prev.markers, marker],
        };
      });
    },
    [activeRouteStats, commitDraft]
  );

  const createOverlayAtMile = useCallback(
    (type: OverlayType, mile: number) => {
      commitDraft((prev) => {
        if (!prev) return prev;
        const maxMiles = activeRouteStats ? activeRouteStats.totalMiles : Math.max(mile, 0);
        const result = createOverlayDraft({
          draft: prev,
          type,
          mile,
          maxMiles,
          generateId: generateEntryId,
          titleAttachments,
          laneContext,
        });
        if (!result.nextDraft || !result.entryId) {
          setError(result.error || "Timeline overlap detected. Adjust the cursor or choose another lane.");
          return prev;
        }
        const createdEntry = result.nextDraft.timeline.find((entry) => entry.id === result.entryId);
        setSelectedEntryId(result.entryId);
        setHoveredEntryId(result.entryId);
        setScrubMileState(toFiniteNumber(createdEntry?.startMi, mile));
        setError(null);
        return result.nextDraft;
      });
    },
    [activeRouteStats, commitDraft, laneContext, titleAttachments]
  );

  const updateSelectedEntryField = useCallback(
    (updates: Partial<RouteMediaTimelineEntry>) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
        let primaryMarkerId: string | null = null;
        const timeline = sortTimelineEntries(
          prev.timeline.map((entry) => {
            if (entry.id !== selectedEntryId) return entry;
            primaryMarkerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] ?? null : null;
            return normalizeTimelineEntryRange(entry, updates, maxMiles);
          })
        );

        let markers = prev.markers;
        if (typeof updates.title === "string" && primaryMarkerId) {
          markers = prev.markers.map((marker) =>
            marker.id === primaryMarkerId ? { ...marker, title: updates.title || marker.title } : marker
          );
        }

        return { ...prev, timeline, markers };
      });
    },
    [selectedEntryId, activeRouteStats, commitDraft]
  );

  const updateEntryRange = useCallback(
    (entryId: string, startMi: number, endMi: number) => {
      commitDraft((prev) => {
        if (!prev) return prev;
        const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
        const nextDraft = updateEntryRangeInDraft(prev, entryId, startMi, endMi, maxMiles);
        const nextEntry = nextDraft.timeline.find((entry) => entry.id === entryId);
        setScrubMileState(toFiniteNumber(nextEntry?.startMi, startMi));
        return nextDraft;
      });
    },
    [activeRouteStats, commitDraft]
  );

  const updateSelectedSubtitleText = useCallback(
    (text: string) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const entry = prev.timeline.find((item) => item.id === selectedEntryId);
        if (!entry) return prev;
        const subtitleId = Array.isArray(entry.subtitleIds) ? entry.subtitleIds[0] : null;
        if (!subtitleId) return prev;
        return {
          ...prev,
          subtitles: prev.subtitles.map((subtitle) =>
            subtitle.id === subtitleId ? { ...subtitle, text } : subtitle
          ),
        };
      });
    },
    [selectedEntryId, commitDraft]
  );

  const updateSelectedMarkerTitle = useCallback(
    (title: string) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const entry = prev.timeline.find((item) => item.id === selectedEntryId);
        if (!entry) return prev;
        const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
        if (!markerId) return prev;
        return {
          ...prev,
          markers: prev.markers.map((marker) =>
            marker.id === markerId ? { ...marker, title } : marker
          ),
        };
      });
    },
    [selectedEntryId, commitDraft]
  );

  const updateSelectedMarkerBody = useCallback(
    (body: string) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const entry = prev.timeline.find((item) => item.id === selectedEntryId);
        if (!entry) return prev;
        const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
        if (!markerId) return prev;
        return {
          ...prev,
          markers: prev.markers.map((marker) =>
            marker.id === markerId ? { ...marker, body } : marker
          ),
        };
      });
    },
    [selectedEntryId, commitDraft]
  );

  const updateSelectedMarkerType = useCallback(
    (type: RouteMediaMarker["type"]) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const entry = prev.timeline.find((item) => item.id === selectedEntryId);
        if (!entry) return prev;
        const markerId = Array.isArray(entry.markerIds) ? entry.markerIds[0] : null;
        if (!markerId) return prev;
        return {
          ...prev,
          markers: prev.markers.map((marker) =>
            marker.id === markerId ? { ...marker, type } : marker
          ),
        };
      });
    },
    [selectedEntryId, commitDraft]
  );

  const updateSelectedHoldSeconds = useCallback(
    (seconds: number) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const entry = prev.timeline.find((item) => item.id === selectedEntryId);
        if (!entry) return prev;
        const subtitleId = Array.isArray(entry.subtitleIds) ? entry.subtitleIds[0] : null;
        if (!subtitleId) return prev;
        const hold = Math.max(0.1, toFiniteNumber(seconds, 0.75));
        const nextDraft = {
          ...prev,
          subtitles: prev.subtitles.map((subtitle) =>
            subtitle.id === subtitleId
              ? {
                  ...subtitle,
                  endSec: toFiniteNumber(subtitle.startSec, 0) + hold,
                }
              : subtitle
          ),
        };
        return { ...nextDraft, subtitles: normalizeSubtitleDurations(nextDraft.subtitles) };
      });
    },
    [selectedEntryId, commitDraft]
  );

  const splitSelectedEntryAtMile = useCallback(
    (mile: number) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
        const split = splitTimelineEntryAtMile(
          prev.timeline,
          selectedEntryId,
          mile,
          maxMiles,
          generateEntryId
        );
        if (!split.createdEntryId) return prev;
        const created = split.timeline.find((entry) => entry.id === split.createdEntryId);
        setSelectedEntryId(split.createdEntryId);
        setHoveredEntryId(split.createdEntryId);
        setScrubMileState(toFiniteNumber(created?.startMi, 0));
        return { ...prev, timeline: split.timeline };
      });
    },
    [activeRouteStats, selectedEntryId, commitDraft]
  );

  const duplicateSelectedEntry = useCallback(() => {
    commitDraft((prev) => {
      if (!prev || !selectedEntryId) return prev;
      const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
      const duplicate = duplicateTimelineEntry(prev.timeline, selectedEntryId, maxMiles, generateEntryId);
      if (!duplicate.createdEntryId) return prev;
      const created = duplicate.timeline.find((entry) => entry.id === duplicate.createdEntryId);
      setSelectedEntryId(duplicate.createdEntryId);
      setHoveredEntryId(duplicate.createdEntryId);
      setScrubMileState(toFiniteNumber(created?.startMi, 0));
      return { ...prev, timeline: duplicate.timeline };
    });
  }, [activeRouteStats, selectedEntryId, commitDraft]);

  const duplicateEntryById = useCallback(
    (entryId: string) => {
      commitDraft((prev) => {
        if (!prev) return prev;
        const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
        const duplicate = duplicateTimelineEntry(prev.timeline, entryId, maxMiles, generateEntryId);
        if (!duplicate.createdEntryId) return prev;
        const created = duplicate.timeline.find((entry) => entry.id === duplicate.createdEntryId);
        setSelectedEntryId(duplicate.createdEntryId);
        setHoveredEntryId(duplicate.createdEntryId);
        setScrubMileState(toFiniteNumber(created?.startMi, 0));
        return { ...prev, timeline: duplicate.timeline };
      });
    },
    [activeRouteStats, commitDraft]
  );

  const nudgeSelectedEntry = useCallback(
    (startDeltaMi: number, endDeltaMi: number) => {
      commitDraft((prev) => {
        if (!prev || !selectedEntryId) return prev;
        const maxMiles = activeRouteStats ? Math.max(0, activeRouteStats.totalMiles) : Number.POSITIVE_INFINITY;
        const nudged = nudgeTimelineEntry(
          prev.timeline,
          selectedEntryId,
          startDeltaMi,
          endDeltaMi,
          maxMiles
        );
        if (nudged.nextStartMi !== null) {
          setScrubMileState(nudged.nextStartMi);
        }
        return { ...prev, timeline: nudged.timeline };
      });
    },
    [activeRouteStats, selectedEntryId, commitDraft]
  );

  const removeSelectedEntry = useCallback(() => {
    const entryToRemove = selectedEntryId;
    commitDraft((prev) => {
      if (!prev || !selectedEntryId) return prev;
      return removeEntryByIdInDraft(prev, selectedEntryId);
    });
    setSelectedEntryId(null);
    setHoveredEntryId(null);
    if (entryToRemove) {
      setTitleAttachments((prev) => {
        let changed = false;
        const next: Record<string, string> = {};
        for (const [titleEntryId, poiEntryId] of Object.entries(prev)) {
          if (titleEntryId === entryToRemove || poiEntryId === entryToRemove) {
            changed = true;
            continue;
          }
          next[titleEntryId] = poiEntryId;
        }
        return changed ? next : prev;
      });
    }
  }, [selectedEntryId]);

  const removeEntryById = useCallback(
    (entryId: string) => {
      commitDraft((prev) => {
        if (!prev) return prev;
        return removeEntryByIdInDraft(prev, entryId);
      });
      setSelectedEntryId((prevId) => (prevId === entryId ? null : prevId));
      setHoveredEntryId((prevId) => (prevId === entryId ? null : prevId));
      setTitleAttachments((prev) => {
        let changed = false;
        const next: Record<string, string> = {};
        for (const [titleEntryId, poiEntryId] of Object.entries(prev)) {
          if (titleEntryId === entryId || poiEntryId === entryId) {
            changed = true;
            continue;
          }
          next[titleEntryId] = poiEntryId;
        }
        return changed ? next : prev;
      });
    },
    [commitDraft]
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      const current = draftRef.current;
      const currentAttachments = titleAttachmentsRef.current;
      if (!current) return stack;
      setRedoStack((redo) => [{ draft: current, titleAttachments: currentAttachments }, ...redo]);
      setDraft(previous.draft);
      setTitleAttachments(previous.titleAttachments);
      return stack.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[0];
      const current = draftRef.current;
      const currentAttachments = titleAttachmentsRef.current;
      if (!current) return stack;
      setUndoStack((undoEntries) => [...undoEntries, { draft: current, titleAttachments: currentAttachments }]);
      setDraft(next.draft);
      setTitleAttachments(next.titleAttachments);
      return stack.slice(1);
    });
  }, []);

  const save = useCallback(async () => {
    if (!draft) {
      setError("Create or load a route media plan first.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setValidationErrors({});

    const now = new Date().toISOString();
    const payload: RouteMediaDoc = {
      ...draft,
      schemaVersion: "1.0.0",
      type: "route-media",
      createdAt: draft.createdAt || now,
      updatedAt: now,
      publish: draft.publish !== false,
      timeline: sortTimelineEntries(Array.isArray(draft.timeline) ? draft.timeline : []),
      subtitles: normalizeSubtitleDurations(Array.isArray(draft.subtitles) ? draft.subtitles : []),
      markers: Array.isArray(draft.markers) ? draft.markers : [],
    };

    const context: TimelineLaneProjectionContext = {
      defaultCameraMode: payload.camera?.mode || null,
      defaultSpeedMiPerSec: toFiniteNumber(payload.playback?.milesPerSecond, NaN),
    };
    const overlaySnapshot = canonicalToOverlays(
      payload.timeline,
      payload.markers,
      payload.subtitles,
      titleAttachments,
      context
    );
    const overlapIssues = detectLaneOverlaps(projectOverlaysToLanes(overlaySnapshot, titleAttachments));
    if (overlapIssues.length > 0) {
      const overlapValidation: ValidationError[] = overlapIssues.map((issue) => ({
        field: "timeline",
        message: issue.message,
      }));
      setIsSaving(false);
      setValidationErrors(toErrorMap(overlapValidation));
      setValidationDetails(overlapValidation);
      setError("Timeline overlap detected. Resolve lane overlaps before saving.");
      return;
    }

    const validation = await validateRouteMedia(payload);
    if (!validation.ok) {
      setIsSaving(false);
      setValidationErrors(toErrorMap(validation.errors));
      setValidationDetails(validation.errors);
      setError("Route Media validation failed. Fix highlighted fields.");
      return;
    }

    try {
      await saveRouteMedia(payload);
      await refreshData();
      setDraft(payload);
      setSuccess(`Saved ${payload.id}.`);
      setValidationDetails([]);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unknown error";
      setError(`Failed to save route media: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [draft, refreshData, titleAttachments]);

  return {
    isLoading,
    isSaving,
    error,
    success,
    items,
    events,
    routeGroups,
    selectedRouteGroup,
    availableVariants,
    draft,
    selectedEntryId,
    hoveredEntryId,
    selectedEntry,
    selectedSubtitle,
    selectedMarker,
    selectedEntryHoldSeconds,
    validationErrors,
    validationDetails,
    activeVariant,
    activeRouteStats,
    activeRouteLengthMiles,
    scrubMile,
    elevationPoints,
    scrubIndicator,
    timelineMarkers,
    timelineOverlapIssues,
    laneBlocks,
    laneOverlapIssues,
    titleAttachments,
    overlays,
    startNew,
    closeDraft,
    loadPlan,
    setSelectedEntryId,
    setHoveredEntryId,
    setDraftField,
    setPlaybackField,
    setCameraField,
    setActiveVariant,
    setScrubMile,
    setTitleAttachment,
    createEntryAtMile,
    createOverlayAtMile,
    moveEntryToMile,
    moveEntryByMapDrag,
    updateEntryRange,
    updateSelectedEntryField,
    updateSelectedSubtitleText,
    updateSelectedMarkerTitle,
    updateSelectedMarkerBody,
    updateSelectedMarkerType,
    updateSelectedHoldSeconds,
    splitSelectedEntryAtMile,
    duplicateSelectedEntry,
    duplicateEntryById,
    nudgeSelectedEntry,
    removeSelectedEntry,
    removeEntryById,
    undo,
    redo,
    save,
  };
}
