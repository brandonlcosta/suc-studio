import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDraftSeason,
  ensureDraftSeason,
  mutateDraftSeason,
  publishSeason,
  DAY_KEYS,
  type DayAssignment,
  type DayKey,
  type WeekDays,
  type Season,
  type SeasonMutation,
  type WeekInstance,
} from "../../../season";
import { loadWorkoutsMaster } from "../../utils/api";
import { useEvents } from "../../hooks/useEvents";
import type { Workout } from "../../types";
import BlockList from "./BlockList";
import SeasonHeader from "./SeasonHeader";
import SeasonMarkers from "./SeasonMarkers";
import InspectorPanel from "./InspectorPanel";
import SeasonTimelineStrip from "./SeasonTimelineStrip";
import SeasonWeekRail from "./SeasonWeekRail";
import SeasonWarnings from "./SeasonWarnings";
import BlockPresetLibrary from "./BlockPresetLibrary";
import SeasonIntensityChart from "./SeasonIntensityChart";
import { BLOCK_TEMPLATES, WEEK_PRESETS, buildBlockTemplate, type BlockTemplate, type WeekPreset } from "./presets";
import { formatSUCWeekLabel, formatSUCWeekRange, getSUCWeekBounds, getSUCWeekId } from "../../utils/sucWeek";
import { useStudioWeek } from "../../context/StudioWeekContext";
import type { WeekWithIndex } from "./weekTypes";

type ActionKey = "load" | "createDraft" | "publish" | "mutate" | "addMarker" | "moveMarker" | "removeMarker";

type BlockDragIntent = {
  template: BlockTemplate;
  targetBlockId: string | null;
} | null;

type WeekDragIntent = {
  preset: WeekPreset;
  targetWeekId: string | null;
} | null;

const initialLoading: Record<ActionKey, boolean> = {
  load: false,
  createDraft: false,
  publish: false,
  mutate: false,
  addMarker: false,
  moveMarker: false,
  removeMarker: false,
};

function toMutation(action: SeasonMutation["action"], args: SeasonMutation["args"]): SeasonMutation {
  return { action, args } as SeasonMutation;
}

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date.getTime());
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);
  parsed.setHours(0, 0, 0, 0);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== monthIndex || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}

function parseEventDate(value?: string): Date | null {
  if (!value) return null;
  const iso = parseIsoLocalDate(value);
  if (iso) return iso;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isWeekMatchingPreset(week: WeekInstance, preset: WeekPreset): boolean {
  return (
    week.focus === preset.focus &&
    week.stress === preset.stress &&
    week.volume === preset.volume &&
    week.intensity === preset.intensity
  );
}

export default function SeasonLayout() {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState<Record<ActionKey, boolean>>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey | null>(null);
  const [selectedBlockTemplateId, setSelectedBlockTemplateId] = useState<string | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [quickEditWeeks, setQuickEditWeeks] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [blockDragIntent, setBlockDragIntent] = useState<BlockDragIntent>(null);
  const [weekDragIntent, setWeekDragIntent] = useState<WeekDragIntent>(null);
  const [calendarCursorIndex, setCalendarCursorIndex] = useState<number | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [workoutOptions, setWorkoutOptions] = useState<Array<{ workoutId: string; name: string }>>([]);
  const { selectedWeekId: selectedSUCWeekId, setSelectedWeekId: setSelectedSUCWeekId, registerWeekOptions } =
    useStudioWeek();
  const { events: eventOptions, isLoading: isLoadingEvents } = useEvents();
  const eventLookup = useMemo(() => {
    return eventOptions.reduce<Record<string, (typeof eventOptions)[number]>>((acc, event) => {
      acc[event.eventId] = event;
      return acc;
    }, {});
  }, [eventOptions]);

  const setActionLoading = useCallback((key: ActionKey, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const load = async () => {
      setActionLoading("load", true);
      setError(null);
      try {
        const draft = await ensureDraftSeason();
        setSeason(draft);
        setSelectedDayKey(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setActionLoading("load", false);
      }
    };

    load();
  }, [setActionLoading]);

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const master = await loadWorkoutsMaster();
        const list = Array.isArray(master.workouts) ? master.workouts : [];
        const byId = new Map<string, Workout>();
        const rank = (workout: Workout) => {
          if (workout.status === "published") return 3;
          if (workout.status === "draft") return 2;
          return 1;
        };
        for (const workout of list) {
          if (!workout?.workoutId) continue;
          const existing = byId.get(workout.workoutId);
          if (!existing) {
            byId.set(workout.workoutId, workout);
            continue;
          }
          const existingRank = rank(existing);
          const nextRank = rank(workout);
          if (nextRank > existingRank) {
            byId.set(workout.workoutId, workout);
            continue;
          }
          if (nextRank === existingRank && (workout.version ?? 0) > (existing.version ?? 0)) {
            byId.set(workout.workoutId, workout);
          }
        }
        const options = Array.from(byId.values())
          .map((workout) => ({
            workoutId: workout.workoutId,
            name: workout.name || workout.workoutId,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setWorkoutOptions(options);
      } catch {
        setWorkoutOptions([]);
      }
    };

    loadWorkouts();
  }, []);

  const anchorMonday = useMemo(() => {
    const seasonStart = parseIsoLocalDate(season?.startDate ?? null);
    if (seasonStart) {
      return startOfWeekMonday(seasonStart);
    }
    return startOfWeekMonday(new Date());
  }, [season?.seasonId, season?.startDate]);

  const startMarkerIndex = useMemo(() => {
    if (!season) return 0;
    const startMarkers = season.seasonMarkers
      .filter((marker) => marker.label.toLowerCase().includes("start"))
      .sort((a, b) => a.weekIndex - b.weekIndex);
    return startMarkers[0]?.weekIndex ?? 0;
  }, [season]);

  const weekStartDateForIndex = useCallback(
    (globalIndex: number) => addDays(anchorMonday, (globalIndex - startMarkerIndex) * 7),
    [anchorMonday, startMarkerIndex]
  );

  const allWeeks = useMemo(() => {
    if (!season) return [] as WeekWithIndex[];
    const flattened: WeekWithIndex[] = [];
    let index = 0;
    season.blocks.forEach((block) => {
      block.weeks.forEach((week) => {
        const weekStartDate = weekStartDateForIndex(index);
        const fallbackSUCWeekId = `${weekStartDate.getFullYear()}-WK-${String(index + 1).padStart(2, "0")}`;
        const sucWeekId = getSUCWeekId(weekStartDate) ?? fallbackSUCWeekId;
        const computedBounds = getSUCWeekBounds(sucWeekId) ?? {
          monday: weekStartDate,
          sunday: addDays(weekStartDate, 6),
        };
        const weekBoundsIso = {
          monday: toIsoDate(computedBounds.monday),
          sunday: toIsoDate(computedBounds.sunday),
        };
        const weekRangeLabel = formatSUCWeekRange(sucWeekId) ?? `${weekBoundsIso.monday}-${weekBoundsIso.sunday}`;
        const weekLabel = formatSUCWeekLabel(sucWeekId) ?? `${sucWeekId} - ${weekRangeLabel}`;
        const linkedEventNames = (week.eventIds ?? [])
          .map((eventId) => eventLookup[eventId]?.eventName || eventId)
          .filter(Boolean);
        const datedEventNames = eventOptions
          .filter((event) => {
            const parsedDate = parseEventDate(event.eventDate);
            if (!parsedDate) return false;
            const dateKey = toLocalIsoDate(parsedDate);
            return dateKey >= weekBoundsIso.monday && dateKey <= weekBoundsIso.sunday;
          })
          .map((event) => event.eventName);
        const eventBadgeNames = Array.from(new Set([...linkedEventNames, ...datedEventNames])).slice(0, 4);
        flattened.push({
          blockId: block.blockId,
          week,
          globalWeekIndex: index,
          weekStartDate,
          sucWeekId,
          weekLabel,
          weekRangeLabel,
          weekBounds: computedBounds,
          weekBoundsIso,
          eventBadgeNames,
        });
        index += 1;
      });
    });
    return flattened;
  }, [eventLookup, eventOptions, season, weekStartDateForIndex]);

  const markersByWeek = useMemo(() => {
    const map = new Map<number, Season["seasonMarkers"]>();
    if (!season) return map;
    season.seasonMarkers.forEach((marker) => {
      const current = map.get(marker.weekIndex) ?? [];
      map.set(marker.weekIndex, [...current, marker]);
    });
    return map;
  }, [season]);

  const blockNameById = useMemo(() => {
    if (!season) return {} as Record<string, string>;
    return season.blocks.reduce<Record<string, string>>((acc, block) => {
      acc[block.blockId] = block.name;
      return acc;
    }, {});
  }, [season]);

  const selectedBlock = useMemo(() => {
    if (!season || !selectedBlockId) return null;
    return season.blocks.find((block) => block.blockId === selectedBlockId) ?? null;
  }, [season, selectedBlockId]);

  const selectedWeek = useMemo(() => {
    if (!season || !selectedWeekId) return null;
    for (const block of season.blocks) {
      const match = block.weeks.find((week) => week.weekId === selectedWeekId);
      if (match) return match;
    }
    return null;
  }, [season, selectedWeekId]);

  const selectedWeekEntry = useMemo(() => {
    if (!selectedWeekId) return null;
    return allWeeks.find((entry) => entry.week.weekId === selectedWeekId) ?? null;
  }, [allWeeks, selectedWeekId]);

  const selectedWeekIndex = useMemo(() => {
    return selectedWeekEntry ? selectedWeekEntry.globalWeekIndex : null;
  }, [selectedWeekEntry]);

  const selectedWeekStartDate = useMemo(() => {
    return selectedWeekEntry?.weekStartDate ?? null;
  }, [selectedWeekEntry]);

  const workoutLabels = useMemo(() => {
    const map: Record<string, string> = {};
    workoutOptions.forEach((option) => {
      map[option.workoutId] = option.name;
    });
    return map;
  }, [workoutOptions]);

  const normalizeWeekDays = useCallback((days?: WeekDays): WeekDays => {
    const base: WeekDays = {
      mon: {},
      tue: {},
      wed: {},
      thu: {},
      fri: {},
      sat: {},
      sun: {},
    };
    if (!days) return base;
    const next: WeekDays = { ...base };
    for (const key of DAY_KEYS) {
      next[key] = { ...base[key], ...(days[key] ?? {}) };
    }
    return next;
  }, []);

  const runMutation = useCallback(
    async (mutation: SeasonMutation, actionKey: ActionKey = "mutate") => {
      if (!season) return null;
      setActionLoading(actionKey, true);
      setError(null);
      setStatus(null);
      try {
        const next = await mutateDraftSeason(mutation);
        setSeason(next);
        setStatus("Season updated.");
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setActionLoading(actionKey, false);
      }
    },
    [season, setActionLoading]
  );

  const handleCreateDraft = useCallback(async () => {
    setActionLoading("createDraft", true);
    setError(null);
    setStatus(null);
    try {
      const next = await createDraftSeason();
      setSeason(next);
      setStatus("Draft created.");
      setSelectedDayKey(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActionLoading("createDraft", false);
    }
  }, [setActionLoading]);

  const handlePublish = useCallback(async () => {
    if (!season) return;
    if (!season.startDate) {
      setError("Start date is required before publishing.");
      return;
    }
    setActionLoading("publish", true);
    setError(null);
    setStatus(null);
    try {
      const published = await publishSeason();
      setSeason(published);
      setStatus("Season published.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setActionLoading("publish", false);
    }
  }, [season, setActionLoading]);

  const handleUpdateStartDate = useCallback(
    async (value: string | null) => {
      if (!season) return;
      await runMutation(
        toMutation("updateSeason", {
          partialUpdate: { startDate: value },
        }),
        "mutate"
      );
    },
    [runMutation, season]
  );

  const handleInsertBlockTemplate = useCallback(
    async (template: BlockTemplate, targetBlockId?: string | null) => {
      if (!season || season.blocks.length === 0) return;
      if (loading.mutate) return;

      const targetId = targetBlockId ?? selectedBlockId ?? season.blocks[season.blocks.length - 1]?.blockId;
      if (!targetId) return;

      const built = buildBlockTemplate(template);

      const added = await runMutation(
        toMutation("addBlockAfter", { targetBlockId: targetId, blockTemplate: built }),
        "mutate"
      );
      if (!added) return;

      const targetIndex = added.blocks.findIndex((block) => block.blockId === targetId);
      const newBlock = added.blocks[targetIndex + 1];
      if (!newBlock) return;

      setSelectedBlockId(newBlock.blockId);
      setSelectedWeekId(null);
      setSelectedDayKey(null);

      let current = added;
      const desiredCount = template.weeks.length;
      const diff = desiredCount - newBlock.weeks.length;
      if (diff > 0) {
        const extended = await runMutation(
          toMutation("extendBlock", { blockId: newBlock.blockId, count: diff }),
          "mutate"
        );
        if (!extended) return;
        current = extended;
      }

      const updatedBlock = current.blocks.find((block) => block.blockId === newBlock.blockId);
      if (!updatedBlock) return;

      for (let index = 0; index < updatedBlock.weeks.length; index += 1) {
        const templateWeek = template.weeks[Math.min(index, template.weeks.length - 1)];
        const weekId = updatedBlock.weeks[index]?.weekId;
        if (!weekId) continue;
        const updatedSeason = await runMutation(
          toMutation("updateWeek", {
            blockId: newBlock.blockId,
            weekId,
            partialUpdate: templateWeek,
          }),
          "mutate"
        );
        if (!updatedSeason) return;
        current = updatedSeason;
      }

      setStatus(`${template.name} inserted.`);
    },
    [runMutation, season, selectedBlockId, loading.mutate]
  );

  const handleApplyTemplate = useCallback(
    async (blockId: string, templateId: string | null) => {
      if (!season || !templateId) return;
      const template = BLOCK_TEMPLATES.find((entry) => entry.id === templateId);
      if (!template) return;
      const block = season.blocks.find((entry) => entry.blockId === blockId);
      if (!block) return;
      if (!window.confirm(`Apply ${template.name} template to ${block.name}?`)) return;

      for (let index = 0; index < block.weeks.length; index += 1) {
        const templateWeek = template.weeks[Math.min(index, template.weeks.length - 1)];
        const weekId = block.weeks[index]?.weekId;
        if (!weekId) continue;
        const updatedSeason = await runMutation(
          toMutation("updateWeek", {
            blockId: block.blockId,
            weekId,
            partialUpdate: templateWeek,
          }),
          "mutate"
        );
        if (!updatedSeason) return;
      }
    },
    [season, runMutation]
  );

  const handleRenameBlock = useCallback(
    async (blockId: string, name: string) => {
      if (loading.mutate) return;
      await runMutation(
        toMutation("updateBlock", {
          blockId,
          partialUpdate: { name },
        })
      );
    },
    [loading.mutate, runMutation]
  );

  const handleApplyWeekPreset = useCallback(
    async (weekId: string, preset: WeekPreset) => {
      if (!season) return;
      if (loading.mutate) return;
      const target = allWeeks.find((entry) => entry.week.weekId === weekId);
      if (!target) return;

      const updated = await runMutation(
        toMutation("updateWeek", {
          blockId: target.blockId,
          weekId,
          partialUpdate: {
            focus: preset.focus,
            stress: preset.stress,
            volume: preset.volume,
            intensity: preset.intensity,
          },
        }),
        "mutate"
      );
      if (!updated) return;

      setSelectedBlockId(target.blockId);
      setSelectedWeekId(weekId);
      setSelectedDayKey(null);
      setStatus(`${preset.name} applied.`);
    },
    [allWeeks, loading.mutate, runMutation, season]
  );

  const handleDismissWarning = useCallback((id: string) => {
    setDismissedWarnings((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSelectBlock = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    setSelectedWeekId(null);
    setSelectedDayKey(null);
  }, []);

  const handleSelectWeek = useCallback((blockId: string, weekId: string) => {
    setSelectedBlockId(blockId);
    setSelectedWeekId(weekId);
    setSelectedDayKey(null);
    const match = allWeeks.find((entry) => entry.week.weekId === weekId);
    if (match) {
      setCalendarCursorIndex(match.globalWeekIndex);
      setSelectedSUCWeekId(match.sucWeekId);
    }
  }, [allWeeks, setSelectedSUCWeekId]);

  const handleSelectDay = useCallback((blockId: string, weekId: string, dayKey: DayKey) => {
    setSelectedBlockId(blockId);
    setSelectedWeekId(weekId);
    setSelectedDayKey(dayKey);
    const match = allWeeks.find((entry) => entry.week.weekId === weekId);
    if (match) {
      setCalendarCursorIndex(match.globalWeekIndex);
      setSelectedSUCWeekId(match.sucWeekId);
    }
  }, [allWeeks, setSelectedSUCWeekId]);

  const handleUpdateDay = useCallback(
    async (dayKey: DayKey, patch: Partial<DayAssignment>) => {
      if (!season || !selectedWeekId) return;
      const target = allWeeks.find((entry) => entry.week.weekId === selectedWeekId);
      if (!target) return;
      const baseDays = normalizeWeekDays(target.week.days);
      const nextDay = { ...baseDays[dayKey], ...patch };
      if ("workoutId" in patch && !("workoutIds" in patch)) {
        const workoutId = patch.workoutId && patch.workoutId.trim().length > 0 ? patch.workoutId.trim() : undefined;
        if (workoutId) {
          nextDay.workoutIds = [workoutId];
        } else {
          delete nextDay.workoutIds;
        }
        delete nextDay.workoutId;
      }
      if (Array.isArray(nextDay.workoutIds)) {
        const cleaned = nextDay.workoutIds.map((id) => id.trim()).filter(Boolean).slice(0, 2);
        if (cleaned.length > 0) {
          nextDay.workoutIds = cleaned;
          delete nextDay.workoutId;
        } else {
          delete nextDay.workoutIds;
        }
      }
      if (nextDay.workoutId === "") {
        delete nextDay.workoutId;
      }
      const nextDays: WeekDays = {
        ...baseDays,
        [dayKey]: nextDay,
      };
      await runMutation(
        toMutation("updateWeek", {
          blockId: target.blockId,
          weekId: target.week.weekId,
          partialUpdate: { days: nextDays },
        }),
        "mutate"
      );
    },
    [allWeeks, normalizeWeekDays, runMutation, season, selectedWeekId]
  );

  const handleClearDay = useCallback(
    async (dayKey: DayKey) => {
      if (!season || !selectedWeekId) return;
      const target = allWeeks.find((entry) => entry.week.weekId === selectedWeekId);
      if (!target) return;
      const baseDays = normalizeWeekDays(target.week.days);
      const nextDays: WeekDays = {
        ...baseDays,
        [dayKey]: {},
      };
      await runMutation(
        toMutation("updateWeek", {
          blockId: target.blockId,
          weekId: target.week.weekId,
          partialUpdate: { days: nextDays },
        }),
        "mutate"
      );
    },
    [allWeeks, normalizeWeekDays, runMutation, season, selectedWeekId]
  );

  const handleUpdateWeekEvents = useCallback(
    async (eventIds: string[]) => {
      if (!season || !selectedWeekId) return;
      const target = allWeeks.find((entry) => entry.week.weekId === selectedWeekId);
      if (!target) return;
      await runMutation(
        toMutation("updateWeek", {
          blockId: target.blockId,
          weekId: target.week.weekId,
          partialUpdate: { eventIds },
        }),
        "mutate"
      );
    },
    [allWeeks, runMutation, season, selectedWeekId]
  );

  const handleScrollToBlock = useCallback((blockId: string) => {
    const target = blockRefs.current[blockId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleToggleCollapse = useCallback((blockId: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  const handleBlockTemplateDragStart = useCallback(
    (template: BlockTemplate) => {
      setBlockDragIntent({ template, targetBlockId: selectedBlockId });
    },
    [selectedBlockId]
  );

  const handleBlockTemplateDragEnd = useCallback(() => {
    setBlockDragIntent(null);
  }, []);

  const handleBlockTemplateDragOver = useCallback(
    (blockId: string) => {
      if (!blockDragIntent) return;
      setBlockDragIntent((prev) => (prev ? { ...prev, targetBlockId: blockId } : prev));
    },
    [blockDragIntent]
  );

  const handleBlockTemplateDrop = useCallback(async () => {
    if (!blockDragIntent) return;
    await handleInsertBlockTemplate(blockDragIntent.template, blockDragIntent.targetBlockId);
    setBlockDragIntent(null);
  }, [blockDragIntent, handleInsertBlockTemplate]);

  const handleWeekPresetDragStart = useCallback(
    (preset: WeekPreset) => {
      setWeekDragIntent({ preset, targetWeekId: selectedWeekId });
    },
    [selectedWeekId]
  );

  const handleWeekPresetDragEnd = useCallback(() => {
    setWeekDragIntent(null);
  }, []);

  const handleWeekPresetDragOver = useCallback(
    (weekId: string) => {
      if (!weekDragIntent) return;
      setWeekDragIntent((prev) => (prev ? { ...prev, targetWeekId: weekId } : prev));
    },
    [weekDragIntent]
  );

  const handleWeekPresetDrop = useCallback(
    async (weekId: string) => {
      if (!weekDragIntent) return;
      await handleApplyWeekPreset(weekId, weekDragIntent.preset);
      setWeekDragIntent(null);
    },
    [handleApplyWeekPreset, weekDragIntent]
  );

  const weekPresetTargetSUCWeekId = useMemo(() => {
    if (!weekDragIntent?.targetWeekId) return null;
    const match = allWeeks.find((entry) => entry.week.weekId === weekDragIntent.targetWeekId);
    return match?.sucWeekId ?? null;
  }, [allWeeks, weekDragIntent?.targetWeekId]);

  const handleSelectSUCWeek = useCallback(
    (sucWeekId: string) => {
      const target = allWeeks.find((entry) => entry.sucWeekId === sucWeekId);
      if (!target) return;
      setSelectedBlockId(target.blockId);
      setSelectedWeekId(target.week.weekId);
      setSelectedDayKey(null);
      setCalendarCursorIndex(target.globalWeekIndex);
      setSelectedSUCWeekId(target.sucWeekId);
    },
    [allWeeks, setSelectedSUCWeekId]
  );

  const handleWeekPresetDragOverSUCWeek = useCallback(
    (sucWeekId: string) => {
      const target = allWeeks.find((entry) => entry.sucWeekId === sucWeekId);
      if (!target) return;
      handleWeekPresetDragOver(target.week.weekId);
    },
    [allWeeks, handleWeekPresetDragOver]
  );

  const handleWeekPresetDropSUCWeek = useCallback(
    (sucWeekId: string) => {
      const target = allWeeks.find((entry) => entry.sucWeekId === sucWeekId);
      if (!target) return;
      void handleWeekPresetDrop(target.week.weekId);
    },
    [allWeeks, handleWeekPresetDrop]
  );

  const getPresetLabelForWeek = useCallback(
    (week: WeekInstance) => {
      const match = WEEK_PRESETS.find((preset) => isWeekMatchingPreset(week, preset));
      return match ? match.name : null;
    },
    []
  );

  const isBusy = Object.values(loading).some(Boolean);

  useEffect(() => {
    if (!allWeeks.length) return;
    registerWeekOptions(
      allWeeks.map((entry) => ({
        weekId: entry.sucWeekId,
        label: `${entry.sucWeekId} - ${entry.weekRangeLabel}`,
        rangeLabel: entry.weekRangeLabel,
        blockId: entry.blockId,
        weekOrdinal: entry.globalWeekIndex + 1,
      }))
    );
  }, [allWeeks, registerWeekOptions]);

  useEffect(() => {
    if (!selectedSUCWeekId || !allWeeks.length) return;
    const match = allWeeks.find((entry) => entry.sucWeekId === selectedSUCWeekId);
    if (!match) return;
    if (selectedWeekId !== match.week.weekId) {
      setSelectedBlockId(match.blockId);
      setSelectedWeekId(match.week.weekId);
      setSelectedDayKey(null);
    }
    if (calendarCursorIndex !== match.globalWeekIndex) {
      setCalendarCursorIndex(match.globalWeekIndex);
    }
  }, [allWeeks, calendarCursorIndex, selectedSUCWeekId, selectedWeekId]);

  useEffect(() => {
    if (!selectedWeekEntry) return;
    if (selectedWeekEntry.sucWeekId !== selectedSUCWeekId) {
      setSelectedSUCWeekId(selectedWeekEntry.sucWeekId);
    }
  }, [selectedSUCWeekId, selectedWeekEntry, setSelectedSUCWeekId]);

  useEffect(() => {
    if (!season) return;
    if (calendarCursorIndex === null) {
      setCalendarCursorIndex(startMarkerIndex);
    }
  }, [season, calendarCursorIndex, startMarkerIndex]);

  useEffect(() => {
    if (calendarCursorIndex === null) return;
    const element = document.getElementById(`season-week-${calendarCursorIndex}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [calendarCursorIndex, season]);

  const handleCalendarShift = useCallback(
    (direction: "past" | "future") => {
      if (!season) return;
      const totalWeeks = allWeeks.length;
      if (totalWeeks === 0) return;
      const currentIndex = calendarCursorIndex ?? 0;
      const delta = direction === "past" ? -4 : 4;
      const nextIndex = Math.max(0, Math.min(totalWeeks - 1, currentIndex + delta));
      setCalendarCursorIndex(nextIndex);
      const target = allWeeks[nextIndex];
      if (target) {
        setSelectedBlockId(target.blockId);
        setSelectedWeekId(target.week.weekId);
        setSelectedDayKey(null);
        setSelectedSUCWeekId(target.sucWeekId);
      }
    },
    [allWeeks, calendarCursorIndex, season, setSelectedSUCWeekId]
  );

  return (
    <div style={{ padding: "1.5rem", minHeight: "100%", backgroundColor: "#0b0f14", color: "#f5f5f5" }}>
      <SeasonHeader
        season={season}
        isCreating={loading.createDraft}
        isPublishing={loading.publish}
        onCreateDraft={handleCreateDraft}
        onPublish={handlePublish}
        onUpdateStartDate={handleUpdateStartDate}
      />

      <SeasonWarnings season={season} dismissedIds={dismissedWarnings} onDismiss={handleDismissWarning} />

      {status && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            borderRadius: "6px",
            backgroundColor: "#112219",
            border: "1px solid #14532d",
            color: "#86efac",
          }}
        >
          {status}
        </div>
      )}
      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            borderRadius: "6px",
            backgroundColor: "#2b1414",
            border: "1px solid #7f1d1d",
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {!season ? (
        <div style={{ padding: "2rem", border: "1px dashed #374151", borderRadius: "8px" }}>
          Create a draft to begin building the season timeline.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr) 300px",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <BlockPresetLibrary
            weekPresets={WEEK_PRESETS}
            blockTemplates={BLOCK_TEMPLATES}
            selectedBlockTemplateId={selectedBlockTemplateId}
            onSelectBlockTemplate={setSelectedBlockTemplateId}
            onInsertBlockTemplate={handleInsertBlockTemplate}
            onDragStartBlockTemplate={handleBlockTemplateDragStart}
            onDragEndBlockTemplate={handleBlockTemplateDragEnd}
            onDragStartWeekPreset={handleWeekPresetDragStart}
            onDragEndWeekPreset={handleWeekPresetDragEnd}
            isBusy={isBusy}
          />
          <div style={{ display: "grid", gap: "1rem" }}>
            <SeasonIntensityChart blocks={season.blocks} />
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <SeasonTimelineStrip
                  blocks={season.blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={handleSelectBlock}
                  onScrollToBlock={handleScrollToBlock}
                  dragTemplate={blockDragIntent?.template ?? null}
                  dragTargetBlockId={blockDragIntent?.targetBlockId ?? null}
                  onDragOverBlock={handleBlockTemplateDragOver}
                  onDropTemplate={handleBlockTemplateDrop}
                />
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={quickEditWeeks}
                    onChange={(event) => setQuickEditWeeks(event.target.checked)}
                  />
                  Quick Edit Weeks
                </label>
              </div>
              <SeasonWeekRail
                weeks={allWeeks}
                blockNameById={blockNameById}
                selectedSUCWeekId={selectedWeekEntry?.sucWeekId ?? selectedSUCWeekId}
                isWeekPresetDragActive={!!weekDragIntent}
                weekPresetDrag={weekDragIntent?.preset ?? null}
                weekPresetTargetSUCWeekId={weekPresetTargetSUCWeekId}
                onSelectWeek={handleSelectSUCWeek}
                onDragOverWeek={handleWeekPresetDragOverSUCWeek}
                onDropWeek={handleWeekPresetDropSUCWeek}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleCalendarShift("past")}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  backgroundColor: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                {"<"} Past Weeks
              </button>
              <button
                onClick={() => handleCalendarShift("future")}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  backgroundColor: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Future Weeks {">"}
              </button>
            </div>
            <SeasonMarkers
              markers={season.seasonMarkers}
              isBusy={isBusy}
              onAdd={(weekIndex, label) =>
                runMutation(toMutation("addSeasonMarker", { weekIndex, label }), "addMarker")
              }
              onMove={(markerId, newWeekIndex) =>
                runMutation(
                  toMutation("moveSeasonMarker", { markerId, newWeekIndex }),
                  "moveMarker"
                )
              }
              onRemove={(markerId) =>
                runMutation(
                  toMutation("removeSeasonMarker", { markerId }),
                  "removeMarker"
                )
              }
              setError={setError}
            />

            <BlockList
              blocks={season.blocks}
              markersByWeek={markersByWeek}
              allWeeks={allWeeks}
              isBusy={isBusy}
              selectedBlockId={selectedBlockId}
              selectedWeekId={selectedWeekId}
              selectedDayKey={selectedDayKey}
              collapsedBlockIds={collapsedBlocks}
              onToggleCollapse={handleToggleCollapse}
              quickEditWeeks={quickEditWeeks}
              registerBlockRef={(blockId, element) => {
                blockRefs.current[blockId] = element;
              }}
              onSelectBlock={handleSelectBlock}
              onSelectWeek={handleSelectWeek}
              onSelectDay={handleSelectDay}
              onAddBlockAfter={(blockId) =>
                runMutation(toMutation("addBlockAfter", { targetBlockId: blockId }))
              }
              onDeleteBlock={(blockId) =>
                runMutation(toMutation("removeBlock", { blockId }))
              }
              onMoveBlock={(blockId, newIndex) =>
                runMutation(toMutation("moveBlock", { blockId, newIndex }))
              }
              onAddWeek={(blockId) =>
                runMutation(toMutation("addWeekToBlock", { blockId }))
              }
              onRemoveWeek={(blockId, weekId) =>
                runMutation(toMutation("removeWeekFromBlock", { blockId, weekId }))
              }
              onExtendBlock={(blockId) =>
                runMutation(toMutation("extendBlock", { blockId }))
              }
              onShrinkBlock={(blockId) =>
                runMutation(toMutation("shrinkBlock", { blockId }))
              }
              onUpdateWeek={(blockId, weekId, patch) =>
                runMutation(
                  toMutation("updateWeek", {
                    blockId,
                    weekId,
                    partialUpdate: patch,
                  })
                )
              }
              onApplyTemplate={(blockId) => handleApplyTemplate(blockId, selectedBlockTemplateId)}
              onRenameBlock={handleRenameBlock}
              dragTemplate={blockDragIntent?.template ?? null}
              dragTargetBlockId={blockDragIntent?.targetBlockId ?? null}
              onDragOverTemplate={handleBlockTemplateDragOver}
              onDropTemplate={handleBlockTemplateDrop}
              dragTemplateActive={!!blockDragIntent}
              weekPresetDrag={weekDragIntent?.preset ?? null}
              weekPresetTargetId={weekDragIntent?.targetWeekId ?? null}
              isWeekPresetDragActive={!!weekDragIntent}
              onDragOverWeekPreset={handleWeekPresetDragOver}
              onDropWeekPreset={handleWeekPresetDrop}
              getPresetLabelForWeek={getPresetLabelForWeek}
              workoutLabels={workoutLabels}
              eventLookup={eventLookup}
            />
          </div>
          <InspectorPanel
            selectedBlock={selectedBlock}
            selectedWeek={selectedWeek}
            selectedWeekIndex={selectedWeekIndex}
            selectedWeekStartDate={selectedWeekStartDate}
            selectedSUCWeekId={selectedWeekEntry?.sucWeekId ?? selectedSUCWeekId}
            selectedSUCWeekRange={selectedWeekEntry?.weekRangeLabel ?? null}
            selectedDayKey={selectedDayKey}
            workoutOptions={workoutOptions}
            eventOptions={eventOptions}
            isLoadingEvents={isLoadingEvents}
            onUpdateDay={handleUpdateDay}
            onClearDay={handleClearDay}
            onUpdateWeekEvents={handleUpdateWeekEvents}
          />
        </div>
      )}
    </div>
  );
}

