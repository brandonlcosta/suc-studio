import { useEffect, useMemo, useState, type DragEvent } from "react";
import ActionBar from "./WorkoutBuilder/ActionBar";
import BlockLibrarySidebar from "./WorkoutBuilder/BlockLibrarySidebar";
import StrengthBlockLibrarySidebar from "./WorkoutBuilder/StrengthBlockLibrarySidebar";
import SummarySidebar from "./WorkoutBuilder/SummarySidebar";
import StrengthSummarySidebar from "./WorkoutBuilder/StrengthSummarySidebar";
import WorkoutMetadata from "./WorkoutBuilder/WorkoutMetadata";
import WorkoutChart from "./WorkoutBuilder/WorkoutChart";
import StrengthWorkoutPreview from "./WorkoutBuilder/StrengthWorkoutPreview";
import TierColumns from "./WorkoutBuilder/TierColumns";
import StrengthColumns, { type StrengthLibraryPayload } from "./WorkoutBuilder/StrengthColumns";
import { effortBlocks } from "./WorkoutBuilder/effortBlocks";
import type { EffortBlockDefinition } from "./WorkoutBuilder/effortBlocks";
import { strengthWorkoutTypeOptions } from "./WorkoutBuilder/strengthBlocks";
import type {
  EffortBlockDragPayload,
  LadderConfig,
  TierLabel,
  WorkoutBlockInstance,
  WorkoutBuilderWorkout,
} from "./WorkoutBuilder/builderTypes";
import { generateWorkoutNameByTier } from "./WorkoutBuilder/workoutName";
import type {
  IntervalSegment,
  IntervalTarget,
  StrengthBlock,
  StrengthWorkoutType,
  TierVariant,
  Workout,
  WorkoutDomain,
  RouteGroupSummary,
  WorkoutSectionEffort,
  WorkoutsMaster,
} from "../types";
import { buildStudioApiUrl } from "../utils/studioApi";
import { listRouteGroups } from "../utils/api";
import useRouteContext from "../hooks/useRouteContext";
import RouteMapPreview from "../components/route-context/RouteMapPreview";
import RouteElevationPreview from "../components/route-context/RouteElevationPreview";
import { buildSectionRangeFromPois } from "../components/route-context/routeContextUtils";

type ViewMode = "builder" | "preview" | "library";

type WorkoutGroup = {
  workoutId: string;
  draft?: Workout;
  published: Workout[];
  archived: Workout[];
};

const emptyTierBlocks: Record<TierLabel, WorkoutBlockInstance[]> = {
  MED: [],
  LRG: [],
  XL: [],
  XXL: [],
};

const createWorkoutId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `workout-${crypto.randomUUID()}`;
  }
  return `workout-${Date.now()}-${Math.random()}`;
};

const createDraftWorkout = (domain: WorkoutDomain = "run", strengthType?: StrengthWorkoutType): Workout => {
  const now = new Date().toISOString();
  const resolvedDomain = domain ?? "run";
  return {
    workoutId: createWorkoutId(),
    version: 0,
    status: "draft",
    domain: resolvedDomain,
    strengthType: resolvedDomain === "strength" ? strengthType ?? "strength_general" : null,
    name: "Untitled Workout",
    description: "",
    focus: [],
    coachNotes: "",
    tiers: {},
    strengthStructure: resolvedDomain === "strength" ? [] : undefined,
    routeId: null,
    routeMode: null,
    sectionEfforts: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
};

const normalizeWorkoutDomain = (workout: Workout): Workout => {
  const domain: WorkoutDomain = workout.domain ?? "run";
  return {
    ...workout,
    domain,
    strengthType:
      domain === "strength" ? workout.strengthType ?? "strength_general" : workout.strengthType ?? null,
    strengthStructure: domain === "strength" ? workout.strengthStructure ?? [] : workout.strengthStructure,
    tiers: workout.tiers ?? {},
    routeId: workout.routeId ?? null,
    routeMode: workout.routeMode ?? null,
    sectionEfforts: Array.isArray(workout.sectionEfforts) ? workout.sectionEfforts : [],
  };
};

const normalizeStrengthStructure = (workout: Workout): StrengthBlock[] => {
  return Array.isArray(workout.strengthStructure) ? workout.strengthStructure : [];
};

const resolveStrengthTypeLabel = (type: StrengthWorkoutType | null | undefined): string => {
  const match = strengthWorkoutTypeOptions.find((option) => option.id === type);
  return match ? match.label : "General Strength";
};

const createStrengthBlockFromPayload = (payload: StrengthLibraryPayload): StrengthBlock | null => {
  const id = `strength-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (payload.type === "strength_exercise") {
    return {
      type: "strength_exercise",
      id,
      name: payload.name,
      sets: 3,
      reps: "8-10",
      load: "",
      notes: "",
    };
  }
  if (payload.type === "circuit_block") {
    return {
      type: "circuit_block",
      id,
      rounds: payload.rounds ?? 3,
      exercises: [],
    };
  }
  if (payload.type === "mobility_block") {
    return {
      type: "mobility_block",
      id,
      name: payload.name ?? "Mobility Flow",
      duration: payload.duration ?? "8min",
      cues: "",
    };
  }
  if (payload.type === "crosstrain_block") {
    return {
      type: "crosstrain_block",
      id,
      modality: payload.modality ?? "bike",
      duration: payload.duration ?? "30min",
      target: "",
      notes: "",
    };
  }
  return null;
};

const parseZoneNumber = (value?: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/Z(\d+)/i) || value.match(/Zone\s*(\d+)/i);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  return Number.isNaN(zone) ? null : zone;
};

const effortIdFromZone = (zone: number | null): string => {
  if (!zone || zone <= 1) return "recovery";
  if (zone === 2) return "aerobic";
  if (zone === 3) return "tempo";
  if (zone === 4) return "threshold";
  return "interval";
};

const buildWorkoutSectionKey = (index: number, totalMarkers: number): string => {
  if (totalMarkers <= 0) return "start_to_finish";
  if (index === 0) return "start_to_wk_1";
  if (index === totalMarkers) return `wk_${totalMarkers}_to_finish`;
  return `wk_${index}_to_wk_${index + 1}`;
};

const buildWorkoutSectionKeys = (markerCount: number): string[] => {
  if (markerCount <= 0) return [];
  return Array.from({ length: markerCount + 1 }, (_, index) =>
    buildWorkoutSectionKey(index, markerCount)
  );
};

const buildSectionEffortList = (
  sectionKeys: string[],
  effortMap: Map<string, string>
): WorkoutSectionEffort[] => {
  return sectionKeys
    .map((key) => {
      const effort = effortMap.get(key);
      return effort ? { sectionKey: key, effort } : null;
    })
    .filter((entry): entry is WorkoutSectionEffort => Boolean(entry));
};

const parseEffortDropPayload = (
  event: DragEvent<HTMLElement>
): EffortBlockDragPayload | null => {
  const raw =
    event.dataTransfer.getData("application/x-suc-effort-block") ||
    event.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EffortBlockDragPayload;
    if (parsed && parsed.effortBlockId) return parsed;
  } catch {
    return null;
  }
  return null;
};

const isStrideTarget = (target?: IntervalTarget | null): boolean => {
  if (!target) return false;
  const extended = target as IntervalTarget & { paceTag?: string };
  if (typeof extended.paceTag === "string" && extended.paceTag.toLowerCase() === "strides") {
    return true;
  }
  return typeof target.zone === "string" && /stride/i.test(target.zone);
};

const isLadderTarget = (target?: IntervalTarget | null): boolean => {
  if (!target) return false;
  const extended = target as IntervalTarget & { paceTag?: string };
  return typeof extended.paceTag === "string" && extended.paceTag.toLowerCase() === "ladder";
};

const resolveEffortBlockId = (target?: IntervalTarget | null): string => {
  if (isLadderTarget(target)) return "ladder";
  if (isStrideTarget(target)) return "strides";
  const zoneNumber = target?.zone ? parseZoneNumber(target.zone) : null;
  return effortIdFromZone(zoneNumber ?? 1);
};

const targetFromEffortBlockId = (effortBlockId: string): IntervalTarget => {
  const effort = effortBlocks.find((block) => block.id === effortBlockId);
  const zoneNumber = effort ? parseZoneNumber(effort.target) : 1;
  const target: IntervalTarget & { paceTag?: string } = {
    type: "pace",
    zone: `Z${zoneNumber ?? 1}`,
  };
  if (effortBlockId === "ladder") {
    target.paceTag = "ladder";
  }
  if (effortBlockId === "strides") {
    target.paceTag = "strides";
  }
  return target;
};

const defaultRestTarget = (): IntervalTarget => ({
  type: "pace",
  zone: "Z1",
});

const defaultTierName = (workout: Workout, tier: TierLabel) => {
  const name = workout.name?.trim() || "Untitled Workout";
  return `${name} (${tier})`;
};

const buildSegmentFromBlock = (block: WorkoutBlockInstance): IntervalSegment => {
  return {
    type: "interval",
    reps: block.reps && block.reps > 0 ? block.reps : 1,
    work: {
      duration: block.duration ?? "",
      target: targetFromEffortBlockId(block.effortBlockId),
      cues: block.notes ? [block.notes] : [],
    },
    rest: block.rest
      ? {
          duration: block.rest,
          target: defaultRestTarget(),
          cues: [],
        }
      : null,
  };
};

const buildBlockFromSegment = (segment: IntervalSegment, tier: TierLabel, index: number): WorkoutBlockInstance => {
  return {
    id: `${tier}-${index}`,
    sourceIndex: index,
    effortBlockId: resolveEffortBlockId(segment.work?.target),
    duration: segment.work?.duration ?? null,
    rest: segment.rest?.duration ?? null,
    reps: segment.reps ?? null,
    notes: segment.work?.cues?.[0] ?? null,
  };
};

const buildLadderSegments = (config: LadderConfig): IntervalSegment[] => {
  const steps = config.steps.map((step) => step.trim()).filter(Boolean);
  if (steps.length === 0) return [];

  let orderedSteps = steps;
  if (config.direction === "down") {
    orderedSteps = [...steps].reverse();
  } else if (config.direction === "updown") {
    const downSteps = steps.slice(0, -1).reverse();
    orderedSteps = [...steps, ...downSteps];
  }

  const sets = Math.max(1, config.sets || 1);
  const segments: IntervalSegment[] = [];

  for (let setIndex = 0; setIndex < sets; setIndex += 1) {
    orderedSteps.forEach((duration, stepIndex) => {
      const isLastStep = stepIndex === orderedSteps.length - 1;
      const isLastSet = setIndex === sets - 1;
      const restDuration = isLastStep ? (isLastSet ? null : config.setRest) : config.stepRest;
      segments.push({
        type: "interval",
        reps: 1,
        work: {
          duration,
          target: targetFromEffortBlockId(config.effortBlockId),
          cues: [],
        },
        rest: restDuration
          ? {
              duration: restDuration,
              target: defaultRestTarget(),
              cues: [],
            }
          : null,
      });
    });
  }

  return segments;
};

const workoutToView = (workout: Workout): WorkoutBuilderWorkout => {
  const tiers: Record<TierLabel, WorkoutBlockInstance[]> = { ...emptyTierBlocks };
  (Object.keys(emptyTierBlocks) as TierLabel[]).forEach((tier) => {
    const variant = workout.tiers[tier];
    if (!variant) return;
    tiers[tier] = variant.structure.map((segment, index) => buildBlockFromSegment(segment, tier, index));
  });

  return {
    id: workout.workoutId,
    name: workout.name ?? null,
    description: workout.description ?? null,
    tags: workout.focus ?? [],
    tiers,
    status: workout.status,
  };
};

const normalizeTierVariant = (workout: Workout, tier: TierLabel): TierVariant => {
  const existing = workout.tiers[tier];
  if (existing) return existing;
  return {
    name: defaultTierName(workout, tier),
    structure: [],
  };
};

const updateTierStructure = (
  workout: Workout,
  tier: TierLabel,
  nextStructure: IntervalSegment[]
): Workout => {
  const existing = normalizeTierVariant(workout, tier);
  return {
    ...workout,
    tiers: {
      ...workout.tiers,
      [tier]: {
        ...existing,
        name: existing.name || defaultTierName(workout, tier),
        structure: nextStructure,
      },
    },
  };
};

const groupWorkouts = (workouts: Workout[]): WorkoutGroup[] => {
  const groups = new Map<string, WorkoutGroup>();

  for (const workout of workouts) {
    const group = groups.get(workout.workoutId) ?? {
      workoutId: workout.workoutId,
      published: [],
      archived: [],
    };

    if (workout.status === "draft") {
      if (!group.draft || (workout.updatedAt || "") > (group.draft.updatedAt || "")) {
        group.draft = workout;
      }
    } else if (workout.status === "published") {
      group.published.push(workout);
    } else if (workout.status === "archived") {
      group.archived.push(workout);
    }

    groups.set(workout.workoutId, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    published: group.published.sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
    archived: group.archived.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
  }));
};

export default function WorkoutBuilder() {
  const [mode, setMode] = useState<ViewMode>("builder");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout>(() => createDraftWorkout());
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showPublishOverlay, setShowPublishOverlay] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<WorkoutDomain>("run");
  const [routeGroups, setRouteGroups] = useState<RouteGroupSummary[]>([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [hoveredSectionIndex, setHoveredSectionIndex] = useState<number | null>(null);
  const [workoutTab, setWorkoutTab] = useState<"standard" | "route">("standard");

  const refreshWorkouts = async () => {
    const response = await fetch(buildStudioApiUrl("/workouts"));
    if (!response.ok) {
      throw new Error("Failed to load workouts");
    }
    const data = (await response.json()) as WorkoutsMaster;
    const list = Array.isArray(data.workouts) ? data.workouts.map(normalizeWorkoutDomain) : [];
    setWorkouts(list);
    return list;
  };

  useEffect(() => {
    let isMounted = true;
    listRouteGroups()
      .then((groups) => {
        if (isMounted) setRouteGroups(groups);
      })
      .catch((error) => {
        console.warn("Failed to load route groups.", error);
        if (isMounted) setRouteGroups([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshWorkouts();
        setCurrentWorkout(createDraftWorkout(selectedDomain));
        setPreviewWorkout(null);
        setMode("builder");
        setIsDirty(false);
      } catch {
        setCurrentWorkout(createDraftWorkout(selectedDomain));
        setPreviewWorkout(null);
        setMode("builder");
      }
    };

    load();
  }, []);

  const effortLookup = useMemo<Record<string, EffortBlockDefinition>>(() => {
    return Object.fromEntries(effortBlocks.map((block) => [block.id, block]));
  }, []);

  useEffect(() => {
    if (mode === "library") return;
    const active = mode === "preview" && previewWorkout ? previewWorkout : currentWorkout;
    const nextDomain = active.domain ?? "run";
    setSelectedDomain((prev) => (prev === nextDomain ? prev : nextDomain));
  }, [mode, currentWorkout, previewWorkout]);

  const isPreview = mode === "preview";
  const activeWorkout = isPreview && previewWorkout ? previewWorkout : currentWorkout;
  const activeDomain: WorkoutDomain = mode === "library" ? selectedDomain : activeWorkout.domain ?? "run";
  const isLocked = isPreview;

  const routeContext = useRouteContext(activeWorkout?.routeId ?? null, null);

  const workoutRoutePois = useMemo(() => {
    return routeContext.pois
      .filter((poi) => poi.type === "workout" && Number.isFinite(poi.routePointIndex))
      .sort((a, b) => (a.routePointIndex ?? 0) - (b.routePointIndex ?? 0));
  }, [routeContext.pois]);

  const workoutSectionKeys = useMemo(
    () => buildWorkoutSectionKeys(workoutRoutePois.length),
    [workoutRoutePois.length]
  );
  const sectionTemplate =
    workoutSectionKeys.length > 0
      ? `repeat(${workoutSectionKeys.length}, minmax(0, 1fr))`
      : "1fr";

  const workoutRouteAvailable =
    activeDomain === "run" && Boolean(activeWorkout.routeId) && workoutSectionKeys.length > 0;

  useEffect(() => {
    setSelectedSectionIndex(null);
    setHoveredSectionIndex(null);
  }, [activeWorkout?.routeId]);

  useEffect(() => {
    if (selectedSectionIndex == null) return;
    if (selectedSectionIndex >= workoutSectionKeys.length) {
      setSelectedSectionIndex(null);
    }
  }, [selectedSectionIndex, workoutSectionKeys.length]);

  const activeHighlightIndex = hoveredSectionIndex ?? selectedSectionIndex;
  const highlightedRange = useMemo(() => {
    if (activeHighlightIndex == null) return null;
    return buildSectionRangeFromPois(workoutRoutePois, activeHighlightIndex, routeContext.track.length);
  }, [activeHighlightIndex, workoutRoutePois, routeContext.track.length]);

  const routePoisLoading = routeContext.status === "loading";
  const routePoisError = routeContext.status === "error" ? routeContext.error ?? null : null;

  useEffect(() => {
    if (!workoutRouteAvailable && workoutTab !== "standard") {
      setWorkoutTab("standard");
    }
  }, [workoutRouteAvailable, workoutTab]);

  const sectionEffortMap = useMemo(() => {
    const map = new Map<string, string>();
    const entries = Array.isArray(activeWorkout.sectionEfforts)
      ? activeWorkout.sectionEfforts
      : [];
    entries.forEach((entry) => {
      if (entry?.sectionKey && entry?.effort) {
        map.set(entry.sectionKey, entry.effort);
      }
    });
    return map;
  }, [activeWorkout.sectionEfforts]);

  const workoutRouteValidation = useMemo(() => {
    if (!activeWorkout.routeId) return null;
    if (workoutSectionKeys.length === 0) {
      return "Selected route has no workout POIs.";
    }
    const invalidKeys =
      activeWorkout.sectionEfforts?.map((entry) => entry.sectionKey).filter(Boolean) ?? [];
    const missing = invalidKeys.filter((key) => !workoutSectionKeys.includes(key));
    if (missing.length > 0) {
      return `Workout route efforts reference unknown sections: ${missing.join(", ")}`;
    }
    return null;
  }, [activeWorkout.routeId, activeWorkout.sectionEfforts, workoutSectionKeys]);

  const sanitizeWorkoutRoute = (workout: Workout): Workout => {
    if (!workout.routeId) {
      return {
        ...workout,
        routeMode: workout.routeMode ?? null,
        sectionEfforts: Array.isArray(workout.sectionEfforts) ? workout.sectionEfforts : [],
      };
    }
    const effortMap = new Map<string, string>();
    const entries = Array.isArray(workout.sectionEfforts) ? workout.sectionEfforts : [];
    entries.forEach((entry) => {
      if (entry?.sectionKey && entry?.effort) {
        effortMap.set(entry.sectionKey, entry.effort);
      }
    });
    return {
      ...workout,
      routeMode: "fixed-sections",
      sectionEfforts: buildSectionEffortList(workoutSectionKeys, effortMap),
    };
  };

  const confirmDiscardIfDirty = () => {
    if (!isDirty) return true;
    return window.confirm("You have unsaved changes. Discard them and continue?");
  };

  // Draft-only invariant: builder must never mutate non-draft workouts.
  const ensureDraftForBuilder = () => {
    if (currentWorkout.status !== "draft") {
      console.error("WorkoutBuilder invariant violated: non-draft entered builder", currentWorkout);
      return false;
    }
    return true;
  };

  const handleDropEffortBlock = (tier: TierLabel, payload: EffortBlockDragPayload) => {
    if (!ensureDraftForBuilder()) return;
    const instance: WorkoutBlockInstance = {
      id: `${tier}-${Date.now()}`,
      effortBlockId: payload.effortBlockId,
      duration: null,
      rest: null,
      reps: null,
      notes: null,
    };

    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const nextStructure = [...variant.structure, buildSegmentFromBlock(instance)];
      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleDeleteBlock = (tier: TierLabel, id: string) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const viewBlocks = variant.structure.map((segment, index) => buildBlockFromSegment(segment, tier, index));
      const target = viewBlocks.find((block) => block.id === id);
      if (!target || target.sourceIndex === undefined) return prev;
      const nextStructure = variant.structure.filter((_, index) => index !== target.sourceIndex);
      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleUpdateBlock = (tier: TierLabel, id: string, updates: Partial<WorkoutBlockInstance>) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const viewBlocks = variant.structure.map((segment, index) => buildBlockFromSegment(segment, tier, index));
      const target = viewBlocks.find((block) => block.id === id);
      if (!target || target.sourceIndex === undefined) return prev;

      const mergedBlock: WorkoutBlockInstance = { ...target, ...updates };
      const nextStructure = variant.structure.map((segment, index) => {
        if (index !== target.sourceIndex) return segment;
        return buildSegmentFromBlock(mergedBlock);
      });

      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleReorderBlocks = (tier: TierLabel, nextBlocks: WorkoutBlockInstance[]) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const nextStructure = nextBlocks.map((block) => {
        if (block.sourceIndex !== undefined && block.id.startsWith(`${tier}-`)) {
          return variant.structure[block.sourceIndex];
        }
        return buildSegmentFromBlock(block);
      });
      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleMoveBlocks = (
    sourceTier: TierLabel,
    targetTier: TierLabel,
    nextSourceBlocks: WorkoutBlockInstance[],
    nextTargetBlocks: WorkoutBlockInstance[]
  ) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const sourceVariant = normalizeTierVariant(prev, sourceTier);
      const targetVariant = normalizeTierVariant(prev, targetTier);

      const nextSourceStructure = nextSourceBlocks.map((block) => {
        if (block.sourceIndex !== undefined && block.id.startsWith(`${sourceTier}-`)) {
          return sourceVariant.structure[block.sourceIndex];
        }
        return buildSegmentFromBlock(block);
      });

      const nextTargetStructure = nextTargetBlocks.map((block) => {
        if (block.sourceIndex !== undefined && block.id.startsWith(`${targetTier}-`)) {
          return targetVariant.structure[block.sourceIndex];
        }
        return buildSegmentFromBlock(block);
      });

      let nextWorkout = updateTierStructure(prev, sourceTier, nextSourceStructure);
      nextWorkout = updateTierStructure(nextWorkout, targetTier, nextTargetStructure);
      return nextWorkout;
    });
    setIsDirty(true);
  };

  const handleCopyBlock = (sourceTier: TierLabel, blockIndex: number, targetTiers: TierLabel[]) => {
    if (!ensureDraftForBuilder()) return;

    setCurrentWorkout((prev) => {
      const sourceVariant = normalizeTierVariant(prev, sourceTier);
      const sourceBlock = sourceVariant.structure[blockIndex];
      if (!sourceBlock) return prev;

      let nextWorkout = { ...prev };

      for (const targetTier of targetTiers) {
        if (targetTier === sourceTier) continue;
        const targetVariant = normalizeTierVariant(nextWorkout, targetTier);
        const nextStructure = [...targetVariant.structure];
        if (blockIndex < nextStructure.length) {
          nextStructure[blockIndex] = sourceBlock;
        } else {
          nextStructure.push(sourceBlock);
        }
        nextWorkout = updateTierStructure(nextWorkout, targetTier, nextStructure);
      }

      return nextWorkout;
    });
    setIsDirty(true);
  };

  const handleCopyTier = (sourceTier: TierLabel, targetTiers: TierLabel[]) => {
    if (!ensureDraftForBuilder()) return;

    setCurrentWorkout((prev) => {
      const sourceVariant = normalizeTierVariant(prev, sourceTier);
      let nextWorkout = { ...prev };

      for (const targetTier of targetTiers) {
        if (targetTier === sourceTier) continue;
        nextWorkout = updateTierStructure(nextWorkout, targetTier, [...sourceVariant.structure]);
      }

      return nextWorkout;
    });
    setIsDirty(true);
  };

  const handleAssignSectionEffort = (sectionKey: string, effortId: string) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const effortMap = new Map<string, string>();
      const existing = Array.isArray(prev.sectionEfforts) ? prev.sectionEfforts : [];
      existing.forEach((entry) => {
        if (entry?.sectionKey && entry?.effort) {
          effortMap.set(entry.sectionKey, entry.effort);
        }
      });
      effortMap.set(sectionKey, effortId);
      const nextEfforts = buildSectionEffortList(workoutSectionKeys, effortMap);
      return {
        ...prev,
        routeMode: prev.routeMode ?? "fixed-sections",
        sectionEfforts: nextEfforts,
      };
    });
    setIsDirty(true);
  };

  const handleClearSectionEffort = (sectionKey: string) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      const effortMap = new Map<string, string>();
      const existing = Array.isArray(prev.sectionEfforts) ? prev.sectionEfforts : [];
      existing.forEach((entry) => {
        if (entry?.sectionKey && entry?.effort && entry.sectionKey !== sectionKey) {
          effortMap.set(entry.sectionKey, entry.effort);
        }
      });
      const nextEfforts = buildSectionEffortList(workoutSectionKeys, effortMap);
      return {
        ...prev,
        sectionEfforts: nextEfforts,
      };
    });
    setIsDirty(true);
  };

  const handleInsertAfterBlock = (tier: TierLabel, blockIndex: number, effortBlockId: string) => {
    if (!ensureDraftForBuilder()) return;
    const instance: WorkoutBlockInstance = {
      id: `${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      effortBlockId,
      duration: null,
      rest: null,
      reps: null,
      notes: null,
    };

    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const nextStructure = [...variant.structure];
      const insertIndex = Math.min(Math.max(blockIndex + 1, 0), nextStructure.length);
      nextStructure.splice(insertIndex, 0, buildSegmentFromBlock(instance));
      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleAddLadder = (tier: TierLabel, config: LadderConfig) => {
    if (!ensureDraftForBuilder()) return;
    const ladderSegments = buildLadderSegments(config);
    if (ladderSegments.length === 0) return;

    setCurrentWorkout((prev) => {
      const variant = normalizeTierVariant(prev, tier);
      const nextStructure = [...variant.structure, ...ladderSegments];
      return updateTierStructure(prev, tier, nextStructure);
    });
    setIsDirty(true);
  };

  const handleDropStrengthBlock = (payload: StrengthLibraryPayload) => {
    if (!ensureDraftForBuilder()) return;
    const block = createStrengthBlockFromPayload(payload);
    if (!block) return;
    setCurrentWorkout((prev) => {
      if ((prev.domain ?? "run") !== "strength") return prev;
      const nextStructure = [...normalizeStrengthStructure(prev), block];
      return { ...prev, strengthStructure: nextStructure };
    });
    setIsDirty(true);
  };

  const handleDeleteStrengthBlock = (blockId: string) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      if ((prev.domain ?? "run") !== "strength") return prev;
      const nextStructure = normalizeStrengthStructure(prev).filter((block) => block.id !== blockId);
      return { ...prev, strengthStructure: nextStructure };
    });
    setIsDirty(true);
  };

  const handleUpdateStrengthBlock = (blockId: string, updates: StrengthBlock) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      if ((prev.domain ?? "run") !== "strength") return prev;
      const nextStructure = normalizeStrengthStructure(prev).map((block) =>
        block.id === blockId ? updates : block
      );
      return { ...prev, strengthStructure: nextStructure };
    });
    setIsDirty(true);
  };

  const handleReorderStrengthBlocks = (nextBlocks: StrengthBlock[]) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => {
      if ((prev.domain ?? "run") !== "strength") return prev;
      return { ...prev, strengthStructure: nextBlocks };
    });
    setIsDirty(true);
  };

  const handleStrengthTypeChange = (nextType: StrengthWorkoutType) => {
    if (!ensureDraftForBuilder()) return;
    setCurrentWorkout((prev) => ({ ...prev, strengthType: nextType }));
    setIsDirty(true);
  };

  const handleRouteSelection = (routeId: string) => {
    if (!ensureDraftForBuilder()) return;
    const trimmed = routeId.trim();
    const nextRouteId = trimmed.length > 0 ? trimmed : null;
    setCurrentWorkout((prev) => ({
      ...prev,
      routeId: nextRouteId,
      routeMode: nextRouteId ? "fixed-sections" : null,
      sectionEfforts: nextRouteId ? prev.sectionEfforts ?? [] : [],
    }));
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    if (mode !== "builder") return;
    if (!ensureDraftForBuilder()) return;
    try {
      const draftPayload = sanitizeWorkoutRoute({ ...currentWorkout, status: "draft", version: 0 });
      const response = await fetch(buildStudioApiUrl("/workouts/upsert"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      await refreshWorkouts();
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save workout draft.", error);
    }
  };

  const handlePublish = () => {
    if (mode !== "builder") return;
    if (!ensureDraftForBuilder()) return;
    setShowPublishOverlay(true);
  };

  const confirmPublish = async () => {
    if (!ensureDraftForBuilder()) return;
    try {
      if (workoutRouteValidation) {
        window.alert(`Workout route invalid:\n${workoutRouteValidation}`);
        return;
      }
      const publishPayload = sanitizeWorkoutRoute(currentWorkout);
      const response = await fetch(buildStudioApiUrl("/workouts/publish"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout: publishPayload }),
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      const published = (await response.json()) as Workout;
      await refreshWorkouts();
      setPreviewWorkout(published);
      setMode("preview");
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to publish workout.", error);
    } finally {
      setShowPublishOverlay(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (mode === "builder") {
        await fetch(buildStudioApiUrl(`/workouts/draft/${currentWorkout.workoutId}`), { method: "DELETE" });
        await refreshWorkouts();
        setCurrentWorkout(createDraftWorkout(activeDomain));
        setIsDirty(false);
        setMode("library");
        return;
      }

      if (mode === "preview" && previewWorkout) {
        await fetch(buildStudioApiUrl("/workouts/archive"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutId: previewWorkout.workoutId, version: previewWorkout.version }),
        });
        await refreshWorkouts();
        setPreviewWorkout(null);
        setMode("library");
      }
    } catch {
      return;
    }
  };

  const handleLibrary = () => {
    if (!confirmDiscardIfDirty()) return;
    setMode("library");
  };

  const handleDomainChange = (nextDomain: WorkoutDomain) => {
    if (nextDomain === activeDomain) return;
    if (!confirmDiscardIfDirty()) return;
    setCurrentWorkout(createDraftWorkout(nextDomain));
    setPreviewWorkout(null);
    setMode("builder");
    setSelectedDomain(nextDomain);
    setIsDirty(false);
  };

  const handleNewWorkout = () => {
    if (!confirmDiscardIfDirty()) return;
    setCurrentWorkout(createDraftWorkout(activeDomain));
    setPreviewWorkout(null);
    setMode("builder");
    setIsDirty(false);
  };

  const handleDuplicate = async () => {
    const source = mode === "preview" ? previewWorkout : currentWorkout;
    if (!source) return;
    const normalizedSource = normalizeWorkoutDomain(source);
    const duplicate: Workout = {
      ...normalizedSource,
      workoutId: createWorkoutId(),
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    setCurrentWorkout(duplicate);
    setMode("builder");
    setIsDirty(true);
    await fetch(buildStudioApiUrl("/workouts/upsert"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    });
    await refreshWorkouts();
  };

  const handleEditAsDraft = async () => {
    if (!previewWorkout) return;
    if (!confirmDiscardIfDirty()) return;
    const normalized = normalizeWorkoutDomain(previewWorkout);
    const draft: Workout = {
      ...normalized,
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch(buildStudioApiUrl("/workouts/upsert"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    await refreshWorkouts();
    setCurrentWorkout(draft);
    setMode("builder");
    setIsDirty(true);
  };

  const handleDuplicateFromLibrary = async (workout: Workout) => {
    const normalized = normalizeWorkoutDomain(workout);
    const duplicate: Workout = {
      ...normalized,
      workoutId: createWorkoutId(),
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch(buildStudioApiUrl("/workouts/upsert"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    });
    await refreshWorkouts();
    setCurrentWorkout(duplicate);
    setMode("builder");
    setIsDirty(true);
  };

  const handleEditAsDraftFromLibrary = async (workout: Workout) => {
    const normalized = normalizeWorkoutDomain(workout);
    const draft: Workout = {
      ...normalized,
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch(buildStudioApiUrl("/workouts/upsert"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    await refreshWorkouts();
    setCurrentWorkout(draft);
    setMode("builder");
    setIsDirty(true);
  };

  const handleArchiveFromLibrary = async (workout: Workout) => {
    await fetch(buildStudioApiUrl("/workouts/archive"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId: workout.workoutId, version: workout.version }),
    });
    await refreshWorkouts();
  };

  const handleDeleteDraftFromLibrary = async (workout: Workout) => {
    if (workout.status !== "draft") return;
    await fetch(buildStudioApiUrl(`/workouts/draft/${workout.workoutId}`), { method: "DELETE" });
    await refreshWorkouts();
  };

  const handleDeleteArchivedFromLibrary = async (workout: Workout) => {
    if (workout.status !== "archived") return;
    await fetch(
      buildStudioApiUrl(`/workouts/archive/${workout.workoutId}/${workout.version}`),
      { method: "DELETE" }
    );
    await refreshWorkouts();
  };

  const handleSelectDraft = (workout: Workout) => {
    if (!confirmDiscardIfDirty()) return;
    setCurrentWorkout(workout);
    setSelectedDomain(workout.domain ?? "run");
    setMode("builder");
    setIsDirty(false);
  };

  const handleSelectPublished = (workout: Workout) => {
    if (!confirmDiscardIfDirty()) return;
    setPreviewWorkout(workout);
    setSelectedDomain(workout.domain ?? "run");
    setMode("preview");
    setIsDirty(false);
  };

  const runWorkoutView = useMemo(() => {
    if (activeDomain !== "run") return null;
    return workoutToView(activeWorkout);
  }, [activeDomain, activeWorkout]);

  const strengthBlocks = useMemo(() => {
    if (activeDomain !== "strength") return [];
    return normalizeStrengthStructure(activeWorkout);
  }, [activeDomain, activeWorkout]);

  const namesByTier = useMemo(() => {
    if (!runWorkoutView) {
      return { MED: "", LRG: "", XL: "", XXL: "" };
    }
    return generateWorkoutNameByTier(runWorkoutView.tiers, effortLookup);
  }, [runWorkoutView, effortLookup]);

  const libraryGroups = useMemo(() => {
    const filtered = workouts.filter(
      (workout) =>
        (workout.domain ?? "run") === selectedDomain &&
        workout.status !== "archived"
    );
    return groupWorkouts(filtered);
  }, [workouts, selectedDomain]);

  if (mode === "builder" && currentWorkout.status !== "draft") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d1117",
          color: "#f5f5f5",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>
            Builder blocked: non-draft workout detected.
          </div>
          <div style={{ fontSize: "12px", color: "#c9c9c9" }}>
            Published workouts must be forked into a draft before editing.
          </div>
          <button
            type="button"
            onClick={handleEditAsDraft}
            style={previewActionStyle}
          >
            Fork as Draft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0d1117",
      }}
    >
      <ActionBar
        onNewWorkout={handleNewWorkout}
        onLibrary={handleLibrary}
        onDuplicate={handleDuplicate}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={handleDelete}
        domain={activeDomain}
        onDomainChange={handleDomainChange}
        domainLocked={isPreview}
      />

      {mode === "library" ? (
        <div style={{ padding: "24px", color: "#f5f5f5" }}>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Workout Library</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {libraryGroups.map((group) => {
              const draft = group.draft;
              const published = group.published[0];
              const archived = group.archived[0];
              const display = draft ?? published ?? archived;
              const status = draft ? "Draft" : published ? "Published" : "Archived";
              const isStrength = (display?.domain ?? "run") === "strength";
              const preview = display && !isStrength ? workoutToView(display) : null;
              const previewNames = preview ? generateWorkoutNameByTier(preview.tiers, effortLookup) : null;
              const strengthCount = display ? normalizeStrengthStructure(display).length : 0;
              return (
                <div key={group.workoutId} style={libraryCardStyle}>
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>{display?.name ?? "Untitled Workout"}</div>
                  <div style={{ fontSize: "11px", color: "#c9c9c9" }}>{status}</div>
                  <div style={{ fontSize: "10px", color: "#8f8f8f" }}>Latest v{display?.version ?? 0}</div>
                  {isStrength && (
                    <div style={{ fontSize: "10px", color: "#b5b5b5", marginTop: "6px" }}>
                      {resolveStrengthTypeLabel(display?.strengthType)} · {strengthCount} blocks
                    </div>
                  )}
                  {previewNames && (
                    <div style={{ fontSize: "10px", color: "#b5b5b5", display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                      {Object.entries(previewNames).map(([tier, name]) => (
                        <div key={tier}>
                          <strong>{tier}:</strong> {name}
                        </div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const duplicateSource = display;
                    return duplicateSource ? (
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        {published && (
                          <button type="button" onClick={() => handleEditAsDraftFromLibrary(published)} style={libraryActionStyle}>
                            Edit as Draft
                          </button>
                        )}
                        {published && (
                          <button type="button" onClick={() => handleArchiveFromLibrary(published)} style={libraryActionStyle}>
                            Archive
                          </button>
                        )}
                        {draft && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("Delete this draft workout?")) return;
                              handleDeleteDraftFromLibrary(draft);
                            }}
                            style={libraryActionStyle}
                          >
                            Delete Draft
                          </button>
                        )}
                        {archived && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("Delete this archived workout? This cannot be undone.")) return;
                              handleDeleteArchivedFromLibrary(archived);
                            }}
                            style={libraryActionStyle}
                          >
                            Delete Archive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicateFromLibrary(duplicateSource)}
                          style={libraryActionStyle}
                        >
                          Duplicate
                        </button>
                      </div>
                    ) : null;
                  })()}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {draft && (
                      <button type="button" onClick={() => handleSelectDraft(draft)} style={libraryActionStyle}>
                        Open Draft
                      </button>
                    )}
                    {published && (
                      <button type="button" onClick={() => handleSelectPublished(published)} style={libraryActionStyle}>
                        Open Published
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1 }}>
          {mode === "builder" && activeDomain === "run" && <BlockLibrarySidebar />}
          {mode === "builder" && activeDomain === "strength" && (
            <StrengthBlockLibrarySidebar
              activeType={activeWorkout.strengthType ?? "strength_general"}
              onTypeChange={handleStrengthTypeChange}
              isLocked={isLocked}
            />
          )}

          <main
            style={{
              flex: 1,
              padding: "24px",
              backgroundColor: "#0b0f17",
            }}
          >
            <div
              style={{
                border: "1px solid #2a2f3a",
                borderRadius: "16px",
                padding: "20px",
                backgroundColor: "#0f1522",
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {mode === "preview" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #2a2f3a",
                    backgroundColor: "#101522",
                    color: "#f5f5f5",
                    fontSize: "12px",
                  }}
                >
                  <div>Preview mode: published workout</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={handleEditAsDraft} style={previewActionStyle}>
                      Edit as Draft
                    </button>
                    <button type="button" onClick={handleDuplicate} style={previewActionStyle}>
                      Duplicate as New
                    </button>
                  </div>
                </div>
              )}

              <WorkoutMetadata
                name={activeWorkout.name ?? null}
                description={activeWorkout.description ?? null}
                tags={activeWorkout.focus ?? []}
                isLocked={isLocked}
                onNameChange={(value) => {
                  if (!ensureDraftForBuilder()) return;
                  setCurrentWorkout((prev) => ({ ...prev, name: value }));
                  setIsDirty(true);
                }}
                onDescriptionChange={(value) => {
                  if (!ensureDraftForBuilder()) return;
                  setCurrentWorkout((prev) => ({ ...prev, description: value }));
                  setIsDirty(true);
                }}
                onTagsChange={(value) => {
                  if (!ensureDraftForBuilder()) return;
                  const trimmed = value.trim();
                  const nextTags = trimmed == "" ? [] : value.split(",").map((tag) => tag.trim());
                  setCurrentWorkout((prev) => ({ ...prev, focus: nextTags }));
                  setIsDirty(true);
                }}
              />

              {activeDomain === "run" && (
                <section
                  style={{
                    border: "1px solid #2a2f3a",
                    borderRadius: "14px",
                    padding: "12px",
                    backgroundColor: "#0f1115",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#e5e7eb" }}>
                        Workout Route (optional)
                      </div>
                      <div style={{ fontSize: "11px", color: "#9aa1ad", marginTop: "4px" }}>
                        Select a route group with workout POIs to enable the Workout Route tab.
                      </div>
                    </div>
                    <select
                      value={activeWorkout.routeId ?? ""}
                      onChange={(event) => handleRouteSelection(event.target.value)}
                      disabled={isLocked}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #2b2b2b",
                        backgroundColor: "#0b0b0b",
                        color: "#f5f5f5",
                        fontSize: "12px",
                        minWidth: "220px",
                      }}
                    >
                      <option value="">No route selected</option>
                      {routeGroups.map((group) => (
                        <option key={group.routeGroupId} value={group.routeGroupId}>
                          {group.routeGroupId} - {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeWorkout.routeId && (
                    <div style={{ fontSize: "11px", color: "#7e8798" }}>
                      {routePoisLoading
                        ? "Loading workout POIs..."
                        : routePoisError
                          ? `Route POIs error: ${routePoisError}`
                          : workoutRoutePois.length > 0
                            ? `${workoutRoutePois.length} workout POIs detected.`
                            : "No workout POIs found for this route yet."}
                      {routeContext.status === "ready" && routeContext.variant && (
                        <div style={{ marginTop: "4px", color: "#6b7280" }}>
                          Preview variant: {routeContext.variant}
                        </div>
                      )}
                    </div>
                  )}
                  {workoutRouteValidation && (
                    <div style={{ fontSize: "11px", color: "#ff9c9c" }}>{workoutRouteValidation}</div>
                  )}
                </section>
              )}

              {activeDomain === "run" && workoutRouteAvailable && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setWorkoutTab("standard")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      border:
                        workoutTab === "standard" ? "1px solid #4b6bff" : "1px solid #2b2b2b",
                      background: workoutTab === "standard" ? "#1a2240" : "#0b0f17",
                      color: "#f5f5f5",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Standard Workout
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutTab("route")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      border:
                        workoutTab === "route" ? "1px solid #4b6bff" : "1px solid #2b2b2b",
                      background: workoutTab === "route" ? "#1a2240" : "#0b0f17",
                      color: "#f5f5f5",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Workout Route
                  </button>
                </div>
              )}

              {activeDomain === "run" && runWorkoutView && workoutTab === "standard" && (
                <>
                  <WorkoutChart
                    draft={runWorkoutView}
                    effortLookup={effortLookup}
                    showXXL={false}
                  />
                  <TierColumns
                    showXXL={false}
                    tierBlocks={runWorkoutView.tiers}
                    effortLookup={effortLookup}
                  availableEffortBlocks={effortBlocks}
                  onDropEffortBlock={handleDropEffortBlock}
                  onAddLadder={handleAddLadder}
                  onDeleteBlock={handleDeleteBlock}
                  onUpdateBlock={handleUpdateBlock}
                  onInsertAfterBlock={handleInsertAfterBlock}
                  onReorderBlocks={handleReorderBlocks}
                    onMoveBlocks={handleMoveBlocks}
                    onCopyBlock={handleCopyBlock}
                    onCopyTier={handleCopyTier}
                    isLocked={isLocked}
                  />
                </>
              )}
              {activeDomain === "run" && workoutTab === "route" && workoutRouteAvailable && (
                <div style={{ display: "grid", gap: "18px" }}>
                  <div style={{ fontSize: "11px", color: "#7e8798" }}>
                    Section length is determined by the route.
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#9aa1ad",
                      }}
                    >
                      Effort
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: sectionTemplate, gap: "6px" }}>
                      {workoutSectionKeys.map((sectionKey, index) => {
                        const effortId = sectionEffortMap.get(sectionKey);
                        const effort = effortId ? effortLookup[effortId] : null;
                        const accent = effort?.accent ?? "#334155";
                        const background = effort ? `${accent}22` : "#0b0f17";
                        const isSelected = selectedSectionIndex === index;
                        return (
                          <div
                            key={`${sectionKey}-${index}`}
                            onClick={() => setSelectedSectionIndex(index)}
                            onMouseEnter={() => setHoveredSectionIndex(index)}
                            onMouseLeave={() => setHoveredSectionIndex(null)}
                            onDragOver={(event) => {
                              if (isLocked) return;
                              event.preventDefault();
                              setHoveredSectionIndex(index);
                            }}
                            onDrop={(event) => {
                              if (isLocked) return;
                              event.preventDefault();
                              const payload = parseEffortDropPayload(event);
                              if (!payload) return;
                              handleAssignSectionEffort(sectionKey, payload.effortBlockId);
                              setHoveredSectionIndex(null);
                            }}
                            style={{
                              minHeight: "70px",
                              borderRadius: "10px",
                              border: `1px solid ${isSelected ? "#38bdf8" : effort ? accent : "#243043"}`,
                              background,
                              padding: "8px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "6px",
                              textAlign: "center",
                              cursor: "pointer",
                              boxShadow: isSelected ? "0 0 0 1px rgba(56, 189, 248, 0.35)" : undefined,
                            }}
                          >
                            <div style={{ fontSize: "10px", color: "#9aa1ad" }}>{sectionKey}</div>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#f5f5f5" }}>
                              {effort ? effort.label : "Drop effort"}
                            </div>
                            {effort && !isLocked && (
                              <button
                                type="button"
                                onClick={() => handleClearSectionEffort(sectionKey)}
                                style={{
                                  alignSelf: "center",
                                  padding: "2px 6px",
                                  borderRadius: "999px",
                                  border: "1px solid #2b2b2b",
                                  background: "#0b0f17",
                                  color: "#cbd5f5",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "#9aa1ad",
                      }}
                    >
                      Context Preview
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                        gridTemplateColumns: "minmax(0, 1fr)",
                      }}
                    >
                      <RouteMapPreview
                        track={routeContext.track}
                        pois={workoutRoutePois}
                        highlightedRange={highlightedRange}
                      />
                      <RouteElevationPreview
                        track={routeContext.track}
                        poiMarkers={workoutRoutePois}
                        highlightedRange={highlightedRange}
                      />
                    </div>
                    {routeContext.status === "error" && (
                      <div style={{ fontSize: "11px", color: "#ff9c9c" }}>
                        Route preview error: {routeContext.error}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: "#7e8798" }}>
                      This is an approximate preview for authoring. Final section geometry and elevation are
                      computed after publish. Elevation and section metrics are finalized after publish.
                    </div>
                  </div>
                </div>
              )}
              {activeDomain === "strength" && (
                <>
                  <StrengthWorkoutPreview blocks={strengthBlocks} />
                  <StrengthColumns
                    blocks={strengthBlocks}
                    isLocked={isLocked}
                    onDropStrengthBlock={handleDropStrengthBlock}
                    onDeleteBlock={handleDeleteStrengthBlock}
                    onUpdateBlock={handleUpdateStrengthBlock}
                    onReorderBlocks={handleReorderStrengthBlocks}
                  />
                </>
              )}
            </div>
          </main>

          {activeDomain === "run" && runWorkoutView && (
            <SummarySidebar draft={runWorkoutView} effortLookup={effortLookup} />
          )}
          {activeDomain === "strength" && <StrengthSummarySidebar blocks={strengthBlocks} />}
        </div>
      )}

      {showPublishOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(4, 8, 16, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#0f1522",
              borderRadius: "16px",
              border: "1px solid #2a2f3a",
              padding: "20px",
              color: "#f5f5f5",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Publish Workout</div>
            <div style={{ fontSize: "12px", color: "#c9c9c9" }}>Confirm this draft is ready to publish.</div>
            <div style={{ fontSize: "12px" }}>
              <div><strong>Name:</strong> {currentWorkout.name ?? "Untitled Workout"}</div>
              <div><strong>Tags:</strong> {currentWorkout.focus.length > 0 ? currentWorkout.focus.join(", ") : "None"}</div>
              <div><strong>Description:</strong> {currentWorkout.description ?? ""}</div>
            </div>
            {activeDomain === "run" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(namesByTier).map(([tier, name]) => (
                  <div key={tier} style={{ fontSize: "12px" }}>
                    <strong>{tier}:</strong> {name}
                  </div>
                ))}
              </div>
            )}
            {activeDomain === "strength" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "12px" }}>
                  <strong>Type:</strong> {resolveStrengthTypeLabel(currentWorkout.strengthType)}
                </div>
                <div style={{ fontSize: "12px" }}>
                  <strong>Blocks:</strong> {normalizeStrengthStructure(currentWorkout).length}
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" onClick={() => setShowPublishOverlay(false)} style={previewActionStyle}>
                Cancel
              </button>
              <button type="button" onClick={confirmPublish} style={previewActionStyle}>
                Confirm Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const libraryCardStyle: React.CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #2a2f3a",
  backgroundColor: "#0f1522",
  padding: "14px",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const libraryActionStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid #3a3a3a",
  backgroundColor: "transparent",
  color: "#f5f5f5",
  fontSize: "10px",
  cursor: "pointer",
};

const previewActionStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #3a3a3a",
  backgroundColor: "#101522",
  color: "#f5f5f5",
  fontSize: "12px",
  cursor: "pointer",
};
