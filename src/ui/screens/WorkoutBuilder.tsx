import { useEffect, useMemo, useState } from "react";
import ActionBar from "./WorkoutBuilder/ActionBar";
import BlockLibrarySidebar from "./WorkoutBuilder/BlockLibrarySidebar";
import SummarySidebar from "./WorkoutBuilder/SummarySidebar";
import WorkoutMetadata from "./WorkoutBuilder/WorkoutMetadata";
import WorkoutChart from "./WorkoutBuilder/WorkoutChart";
import TierColumns from "./WorkoutBuilder/TierColumns";
import { effortBlocks } from "./WorkoutBuilder/effortBlocks";
import type { EffortBlockDefinition } from "./WorkoutBuilder/effortBlocks";
import type {
  EffortBlockDragPayload,
  TierLabel,
  WorkoutBlockInstance,
  WorkoutBuilderWorkout,
} from "./WorkoutBuilder/builderTypes";
import { generateWorkoutNameByTier } from "./WorkoutBuilder/workoutName";
import type { IntervalSegment, IntervalTarget, TierVariant, Workout, WorkoutsMaster } from "../types";

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

const createDraftWorkout = (): Workout => {
  const now = new Date().toISOString();
  return {
    workoutId: createWorkoutId(),
    version: 0,
    status: "draft",
    name: "Untitled Workout",
    description: "",
    focus: [],
    coachNotes: "",
    tiers: {},
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
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

const resolveEffortBlockId = (target?: IntervalTarget | null): string => {
  const zoneNumber = target?.zone ? parseZoneNumber(target.zone) : null;
  return effortIdFromZone(zoneNumber ?? 1);
};

const targetFromEffortBlockId = (effortBlockId: string): IntervalTarget => {
  const effort = effortBlocks.find((block) => block.id === effortBlockId);
  const zoneNumber = effort ? parseZoneNumber(effort.target) : 1;
  return {
    type: "pace",
    zone: `Z${zoneNumber ?? 1}`,
  };
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

  const refreshWorkouts = async () => {
    const response = await fetch("/api/workouts");
    if (!response.ok) {
      throw new Error("Failed to load workouts");
    }
    const data = (await response.json()) as WorkoutsMaster;
    setWorkouts(Array.isArray(data.workouts) ? data.workouts : []);
    return data.workouts ?? [];
  };

  useEffect(() => {
    const load = async () => {
      try {
        const list = await refreshWorkouts();
        const drafts = list.filter((workout) => workout.status === "draft");
        const published = list.filter((workout) => workout.status === "published");
        if (drafts.length > 0) {
          const latestDraft = drafts.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
          setCurrentWorkout(latestDraft);
          setMode("builder");
        } else if (published.length > 0) {
          const latestPublished = published.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
          setPreviewWorkout(latestPublished);
          setMode("preview");
        } else {
          setCurrentWorkout(createDraftWorkout());
          setMode("builder");
        }
        setIsDirty(false);
      } catch {
        setCurrentWorkout(createDraftWorkout());
        setMode("builder");
      }
    };

    load();
  }, []);

  const effortLookup = useMemo<Record<string, EffortBlockDefinition>>(() => {
    return Object.fromEntries(effortBlocks.map((block) => [block.id, block]));
  }, []);

  const isPreview = mode === "preview";
  const isLocked = isPreview;

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

  const handleSaveDraft = async () => {
    if (mode !== "builder") return;
    if (!ensureDraftForBuilder()) return;
    try {
      const response = await fetch("/api/workouts/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentWorkout, status: "draft", version: 0 }),
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
      const response = await fetch("/api/workouts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout: currentWorkout }),
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
        await fetch(`/api/workouts/draft/${currentWorkout.workoutId}`, { method: "DELETE" });
        await refreshWorkouts();
        setCurrentWorkout(createDraftWorkout());
        setIsDirty(false);
        setMode("library");
        return;
      }

      if (mode === "preview" && previewWorkout) {
        await fetch("/api/workouts/archive", {
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

  const handleDuplicate = async () => {
    const source = mode === "preview" ? previewWorkout : currentWorkout;
    if (!source) return;
    const duplicate: Workout = {
      ...source,
      workoutId: createWorkoutId(),
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    setCurrentWorkout(duplicate);
    setMode("builder");
    setIsDirty(true);
    await fetch("/api/workouts/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    });
    await refreshWorkouts();
  };

  const handleEditAsDraft = async () => {
    if (!previewWorkout) return;
    if (!confirmDiscardIfDirty()) return;
    const draft: Workout = {
      ...previewWorkout,
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch("/api/workouts/upsert", {
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
    const duplicate: Workout = {
      ...workout,
      workoutId: createWorkoutId(),
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch("/api/workouts/upsert", {
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
    const draft: Workout = {
      ...workout,
      status: "draft",
      version: 0,
      publishedAt: null,
    };
    await fetch("/api/workouts/upsert", {
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
    await fetch("/api/workouts/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId: workout.workoutId, version: workout.version }),
    });
    await refreshWorkouts();
  };

  const handleSelectDraft = (workout: Workout) => {
    if (!confirmDiscardIfDirty()) return;
    setCurrentWorkout(workout);
    setMode("builder");
    setIsDirty(false);
  };

  const handleSelectPublished = (workout: Workout) => {
    if (!confirmDiscardIfDirty()) return;
    setPreviewWorkout(workout);
    setMode("preview");
    setIsDirty(false);
  };

  const workoutView = useMemo(() => workoutToView(mode === "preview" && previewWorkout ? previewWorkout : currentWorkout), [
    mode,
    previewWorkout,
    currentWorkout,
  ]);

  const namesByTier = useMemo(() => {
    return generateWorkoutNameByTier(workoutView.tiers, effortLookup);
  }, [workoutView.tiers, effortLookup]);

  const libraryGroups = useMemo(() => groupWorkouts(workouts), [workouts]);

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
        onLibrary={handleLibrary}
        onDuplicate={handleDuplicate}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={handleDelete}
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
              const preview = display ? workoutToView(display) : null;
              const previewNames = preview ? generateWorkoutNameByTier(preview.tiers, effortLookup) : null;
              return (
                <div key={group.workoutId} style={libraryCardStyle}>
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>{display?.name ?? "Untitled Workout"}</div>
                  <div style={{ fontSize: "11px", color: "#c9c9c9" }}>{status}</div>
                  <div style={{ fontSize: "10px", color: "#8f8f8f" }}>Latest v{display?.version ?? 0}</div>
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
          {mode === "builder" && <BlockLibrarySidebar />}

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
                name={workoutView.name}
                description={workoutView.description}
                tags={workoutView.tags}
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

              <WorkoutChart
                draft={workoutView}
                effortLookup={effortLookup}
                showXXL={false}
              />
              <TierColumns
                showXXL={false}
                tierBlocks={workoutView.tiers}
                effortLookup={effortLookup}
                availableEffortBlocks={effortBlocks}
                onDropEffortBlock={handleDropEffortBlock}
                onDeleteBlock={handleDeleteBlock}
                onUpdateBlock={handleUpdateBlock}
                onReorderBlocks={handleReorderBlocks}
                onMoveBlocks={handleMoveBlocks}
                onCopyBlock={handleCopyBlock}
                onCopyTier={handleCopyTier}
                isLocked={isLocked}
              />
            </div>
          </main>

          <SummarySidebar draft={workoutView} effortLookup={effortLookup} />
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
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Object.entries(namesByTier).map(([tier, name]) => (
                <div key={tier} style={{ fontSize: "12px" }}>
                  <strong>{tier}:</strong> {name}
                </div>
              ))}
            </div>
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
