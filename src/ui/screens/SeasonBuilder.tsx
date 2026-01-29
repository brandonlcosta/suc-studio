import { useEffect, useMemo, useRef, useState } from "react";
import type { Block, Season, Week } from "../types/studio";
import { loadJson, saveJson, exportJson } from "../utils/storage";
import { assertBlocks, assertSeasons, assertWeeks } from "../utils/studioValidation";
import { addWeeks, compareWeekKey, rangeWeeks } from "../utils/weekKey";

type DragState = {
  blockId: string;
  startX: number;
  startLength: number;
};

const SEASONS_FILE = "seasons.json";
const BLOCKS_FILE = "blocks.json";
const WEEKS_FILE = "weeks.json";

function buildWeekId(blockId: string, weekKey: string): string {
  return `w-${blockId}-${weekKey}`;
}

function reconcileBlockWeeks(block: Block, existingWeeks: Week[]): Week[] {
  const currentWeeks = existingWeeks.filter((week) => week.blockId === block.id);
  const currentByKey = new Map(currentWeeks.map((week) => [week.weekKey, week]));
  const nextWeeks: Week[] = [];

  for (let index = 0; index < block.lengthWeeks; index += 1) {
    const weekKey = addWeeks(block.startWeek, index);
    const existing = currentByKey.get(weekKey);
    nextWeeks.push({
      id: existing?.id ?? buildWeekId(block.id, weekKey),
      blockId: block.id,
      weekKey,
      indexInBlock: index + 1,
      title: existing?.title ?? `Week ${index + 1}`,
      focusTags: existing?.focusTags ?? [...block.focusTags],
      notes: existing?.notes,
    });
  }

  const remainingWeeks = existingWeeks.filter((week) => week.blockId !== block.id);
  return [...remainingWeeks, ...nextWeeks];
}

export default function SeasonBuilder() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [seasonsData, blocksData, weeksData] = await Promise.all([
          loadJson<Season[]>(SEASONS_FILE, assertSeasons),
          loadJson<Block[]>(BLOCKS_FILE, assertBlocks),
          loadJson<Week[]>(WEEKS_FILE, assertWeeks),
        ]);
        setSeasons(seasonsData);
        setBlocks(blocksData);
        setWeeks(weeksData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load season data: ${msg}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: MouseEvent) => {
      if (!gridRef.current) return;
      const season = seasons[0];
      if (!season) return;
      const totalWeeks = rangeWeeks(season.startWeek, season.endWeek).length;
      const gridWidth = gridRef.current.getBoundingClientRect().width;
      const columnWidth = gridWidth / totalWeeks;
      const deltaWeeks = Math.round((event.clientX - dragState.startX) / columnWidth);
      const block = blocks.find((item) => item.id === dragState.blockId);
      if (!block) return;
      const maxLength = rangeWeeks(block.startWeek, season.endWeek).length;
      const nextLength = Math.min(
        Math.max(1, dragState.startLength + deltaWeeks),
        maxLength
      );
      setBlocks((prev) =>
        prev.map((item) =>
          item.id === block.id ? { ...item, lengthWeeks: nextLength } : item
        )
      );
      setWeeks((prev) => reconcileBlockWeeks({ ...block, lengthWeeks: nextLength }, prev));
    };

    const handleUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [blocks, dragState, seasons]);

  const season = seasons[0];
  const seasonWeeks = useMemo(() => {
    if (!season) return [];
    return rangeWeeks(season.startWeek, season.endWeek);
  }, [season]);

  const blocksForSeason = useMemo(() => {
    if (!season) return [];
    return blocks
      .filter((block) => block.seasonId === season.id)
      .sort((a, b) => compareWeekKey(a.startWeek, b.startWeek));
  }, [blocks, season]);

  const milestonesByWeek = useMemo(() => {
    const map = new Map<string, Block["milestones"]>();
    blocksForSeason.forEach((block) => {
      block.milestones.forEach((milestone) => {
        const current = map.get(milestone.week) ?? [];
        current.push(milestone);
        map.set(milestone.week, current);
      });
    });
    return map;
  }, [blocksForSeason]);

  const weeksByKey = useMemo(() => {
    const map = new Map<string, Week>();
    weeks.forEach((week) => {
      map.set(week.weekKey, week);
    });
    return map;
  }, [weeks]);

  const handleStartEdit = (week: Week) => {
    setEditingWeekId(week.id);
    setDraftTitle(week.title);
    setMessage(null);
    setError(null);
  };

  const handleSaveWeekTitle = async () => {
    if (!editingWeekId) return;
    const updatedWeeks = weeks.map((week) =>
      week.id === editingWeekId ? { ...week, title: draftTitle.trim() || week.title } : week
    );
    setWeeks(updatedWeeks);
    setEditingWeekId(null);
    setDraftTitle("");
    setIsSaving(true);
    setError(null);
    try {
      await saveJson(WEEKS_FILE, updatedWeeks, assertWeeks);
      setMessage("Week title saved to weeks.json.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save weeks: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBlocks = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveJson(BLOCKS_FILE, blocks, assertBlocks);
      await saveJson(WEEKS_FILE, weeks, assertWeeks);
      setMessage("Blocks and weeks saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save blocks: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: "2rem" }}>Loading season builder...</div>;
  }

  if (!season) {
    return <div style={{ padding: "2rem" }}>No season data found.</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>{season.name}</h2>
        <div style={{ color: "#6b7280" }}>{season.description}</div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          onClick={handleSaveBlocks}
          disabled={isSaving}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#111827",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Save Blocks & Weeks
        </button>
        <button
          onClick={() => exportJson(BLOCKS_FILE, blocks)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#e5e7eb",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export Blocks JSON
        </button>
        <button
          onClick={() => exportJson(WEEKS_FILE, weeks)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#e5e7eb",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export Weeks JSON
        </button>
        <button
          onClick={() => exportJson(SEASONS_FILE, seasons)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export Seasons JSON
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#ecfdf3",
            border: "1px solid #bbf7d0",
            borderRadius: "4px",
            color: "#166534",
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "4px",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${seasonWeeks.length}, minmax(120px, 1fr))`,
            gap: "0.75rem",
            alignItems: "stretch",
          }}
        >
          {blocksForSeason.map((block) => {
            const startIndex = seasonWeeks.findIndex((weekKey) => weekKey === block.startWeek);
            if (startIndex < 0) {
              return null;
            }
            const gridColumn = `${startIndex + 1} / span ${block.lengthWeeks}`;
            return (
              <div
                key={block.id}
                style={{
                  gridColumn,
                  backgroundColor: "#111827",
                  color: "white",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  position: "relative",
                  minHeight: "120px",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{block.name}</div>
                <div style={{ fontSize: "0.85rem", color: "#d1d5db" }}>{block.intent}</div>
                <div
                  onMouseDown={(event) =>
                    setDragState({
                      blockId: block.id,
                      startX: event.clientX,
                      startLength: block.lengthWeeks,
                    })
                  }
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "10px",
                    height: "100%",
                    cursor: "ew-resize",
                    backgroundColor: "#374151",
                  }}
                  title="Drag to adjust block length"
                />
              </div>
            );
          })}

          {seasonWeeks.map((weekKey) => {
            const week = weeksByKey.get(weekKey);
            const milestones = milestonesByWeek.get(weekKey) ?? [];
            const isEditing = week?.id === editingWeekId;
            return (
              <div
                key={weekKey}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  minHeight: "130px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{weekKey}</div>
                {week ? (
                  <>
                    {isEditing ? (
                      <>
                        <input
                          value={draftTitle}
                          onChange={(event) => setDraftTitle(event.target.value)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            border: "1px solid #d1d5db",
                            fontSize: "0.85rem",
                          }}
                        />
                        <button
                          onClick={handleSaveWeekTitle}
                          disabled={isSaving}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "#111827",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                          }}
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(week)}
                        style={{
                          border: "none",
                          background: "none",
                          textAlign: "left",
                          padding: 0,
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#111827",
                        }}
                      >
                        {week.title}
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                    Unassigned week
                  </div>
                )}
                {milestones.length > 0 && (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    {milestones.map((milestone, index) => (
                      <span
                        key={`${milestone.type}-${index}`}
                        title={milestone.label ?? milestone.type}
                        style={{
                          fontSize: "1rem",
                        }}
                      >
                        {milestone.type === "race" ? "🏁" : "📍"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
