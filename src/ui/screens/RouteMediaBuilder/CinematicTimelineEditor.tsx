import { useEffect, useMemo, useRef, useState } from "react";
import type { CinematicSegment, CinematicTimeline } from "../../../../../suc-shared-data/src/cinematic-timeline-primitives/types";
import { normalizeSegments } from "../../../../../suc-shared-data/src/cinematic-timeline-primitives/timelineUtils.js";

const MIN_SEGMENT_MS = 1000;

type DragMode = "move" | "resize-start" | "resize-end" | "scrub";

type DragState = {
  segmentId: string | null;
  mode: DragMode;
  startX: number;
  startStartMs: number;
  startEndMs: number;
};

type TimelinePreset = {
  presetId: string;
  name: string;
  timeline: CinematicTimeline;
  readonly?: boolean;
};

type TimelineEditorProps = {
  timeline: CinematicTimeline;
  currentTimeMs: number;
  overlayModel: {
    pois?: Array<{ id?: string; title?: string; label?: string }>;
  };
  presets: TimelinePreset[];
  onTimeChange: (timeMs: number) => void;
  onTimelineChange: (timeline: CinematicTimeline) => void;
  onResetTimeline: () => void;
  onSaveTimeline: () => void;
  onExportTimeline: () => void;
  onPresetSave: (name: string) => void;
  onPresetLoad: (presetId: string) => boolean;
  onPresetDelete: (presetId: string) => void;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatSeconds(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 100) / 10);
  return `${sec.toFixed(1)}s`;
}

function resolveCameraMode(value: string): CinematicSegment["cameraMode"] {
  if (value === "static" || value === "follow" || value === "flyover") return value;
  return "follow";
}

function buildDefaultSegment(durationMs: number): CinematicSegment {
  return {
    id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    startMs: 0,
    endMs: Math.max(MIN_SEGMENT_MS, Math.round(durationMs)),
    cameraMode: "follow",
    overlay: { showElevation: true, showMetrics: true, showPoiCallouts: true },
  };
}

function enforceNoOverlap(segments: CinematicSegment[], durationMs: number): CinematicSegment[] | null {
  const normalized = normalizeSegments(segments, durationMs);
  const ordered = [...normalized].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  let previousEnd = 0;
  for (const segment of ordered) {
    if (segment.startMs < previousEnd - 1e-3) return null;
    previousEnd = segment.endMs;
  }
  return normalized;
}

export default function CinematicTimelineEditor({
  timeline,
  currentTimeMs,
  overlayModel,
  presets,
  onTimeChange,
  onTimelineChange,
  onResetTimeline,
  onSaveTimeline,
  onExportTimeline,
  onPresetSave,
  onPresetLoad,
  onPresetDelete,
}: TimelineEditorProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("default");
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(800);

  const totalDurationMs = Math.max(0, Math.round(toFinite(timeline.totalDurationMs, 0)));
  const segments = useMemo(
    () => normalizeSegments(timeline.segments || [], totalDurationMs),
    [timeline.segments, totalDurationMs]
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 800;
      setTrackWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (segments.length === 0) setSelectedSegmentId(null);
    if (!selectedSegmentId) return;
    const exists = segments.some((segment) => segment.id === selectedSegmentId);
    if (!exists) setSelectedSegmentId(null);
  }, [segments, selectedSegmentId]);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || totalDurationMs <= 0) return;
      const deltaX = event.clientX - dragState.startX;
      const msPerPx = totalDurationMs / Math.max(1, rect.width);
      const deltaMs = deltaX * msPerPx;

      if (dragState.mode === "scrub") {
        const nextTime = clamp((event.clientX - rect.left) * msPerPx, 0, totalDurationMs);
        onTimeChange(nextTime);
        return;
      }

      const target = segments.find((segment) => segment.id === dragState.segmentId);
      if (!target) return;

      let nextStart = dragState.startStartMs;
      let nextEnd = dragState.startEndMs;

      if (dragState.mode === "move") {
        const span = dragState.startEndMs - dragState.startStartMs;
        nextStart = clamp(dragState.startStartMs + deltaMs, 0, totalDurationMs - MIN_SEGMENT_MS);
        nextEnd = clamp(nextStart + span, nextStart + MIN_SEGMENT_MS, totalDurationMs);
      } else if (dragState.mode === "resize-start") {
        nextStart = clamp(dragState.startStartMs + deltaMs, 0, dragState.startEndMs - MIN_SEGMENT_MS);
      } else if (dragState.mode === "resize-end") {
        nextEnd = clamp(dragState.startEndMs + deltaMs, dragState.startStartMs + MIN_SEGMENT_MS, totalDurationMs);
      }

      const updated = segments.map((segment) =>
        segment.id === target.id
          ? { ...segment, startMs: Math.round(nextStart), endMs: Math.round(nextEnd) }
          : segment
      );
      const nextTimelineSegments = enforceNoOverlap(updated, totalDurationMs);
      if (!nextTimelineSegments) {
        setError("Segments cannot overlap.");
        return;
      }
      setError(null);
      onTimelineChange({ ...timeline, totalDurationMs, segments: nextTimelineSegments });
    };

    const handleUp = () => setDragState(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState, segments, totalDurationMs, onTimelineChange, timeline, onTimeChange]);

  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId) || null;
  const playheadX = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * trackWidth : 0;

  const updateSegment = (segmentId: string, updates: Partial<CinematicSegment>) => {
    const nextSegments = segments.map((segment) =>
      segment.id === segmentId ? { ...segment, ...updates } : segment
    );
    const normalized = enforceNoOverlap(nextSegments, totalDurationMs);
    if (!normalized) {
      setError("Segments cannot overlap.");
      return;
    }
    setError(null);
    onTimelineChange({ ...timeline, totalDurationMs, segments: normalized });
  };

  const handleAddSegment = () => {
    const base = buildDefaultSegment(Math.min(5000, totalDurationMs || 5000));
    const startMs = clamp(currentTimeMs, 0, Math.max(0, totalDurationMs - MIN_SEGMENT_MS));
    const endMs = clamp(startMs + 5000, startMs + MIN_SEGMENT_MS, totalDurationMs || startMs + 5000);
    const nextSegment = { ...base, startMs: Math.round(startMs), endMs: Math.round(endMs) };
    const nextSegments = [...segments, nextSegment];
    const normalized = enforceNoOverlap(nextSegments, totalDurationMs);
    if (!normalized) {
      setError("No room to add a segment without overlap.");
      return;
    }
    setError(null);
    setSelectedSegmentId(nextSegment.id);
    onTimelineChange({ ...timeline, totalDurationMs, segments: normalized });
  };

  const handleDuplicate = () => {
    if (!selectedSegment) return;
    const span = selectedSegment.endMs - selectedSegment.startMs;
    const startMs = clamp(selectedSegment.endMs + 250, 0, Math.max(0, totalDurationMs - MIN_SEGMENT_MS));
    const endMs = clamp(startMs + span, startMs + MIN_SEGMENT_MS, totalDurationMs);
    const duplicate = {
      ...selectedSegment,
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startMs: Math.round(startMs),
      endMs: Math.round(endMs),
    };
    const nextSegments = [...segments, duplicate];
    const normalized = enforceNoOverlap(nextSegments, totalDurationMs);
    if (!normalized) {
      setError("No room to duplicate without overlap.");
      return;
    }
    setError(null);
    setSelectedSegmentId(duplicate.id);
    onTimelineChange({ ...timeline, totalDurationMs, segments: normalized });
  };

  const handleDelete = () => {
    if (!selectedSegment) return;
    const nextSegments = segments.filter((segment) => segment.id !== selectedSegment.id);
    onTimelineChange({ ...timeline, totalDurationMs, segments: nextSegments });
    setSelectedSegmentId(null);
  };

  const availablePois = Array.isArray(overlayModel?.pois) ? overlayModel.pois : [];
  const activePoiSet = useMemo(
    () => new Set(selectedSegment?.activePoiIds || []),
    [selectedSegment?.activePoiIds]
  );

  const togglePoiSelection = (poiId: string) => {
    if (!selectedSegment) return;
    const next = new Set(selectedSegment.activePoiIds || []);
    if (next.has(poiId)) next.delete(poiId);
    else next.add(poiId);
    updateSegment(selectedSegment.id, { activePoiIds: Array.from(next) });
  };

  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "12px",
        background: "#0b1220",
        padding: "0.85rem",
        display: "grid",
        gap: "0.85rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>
          Cinematic Timeline
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedPresetId}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedPresetId(value);
              if (value) onPresetLoad(value);
            }}
            style={{
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#e2e8f0",
              borderRadius: "6px",
              padding: "0.2rem 0.4rem",
              fontSize: "0.68rem",
            }}
          >
            {presets.map((preset) => (
              <option key={preset.presetId} value={preset.presetId}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("Preset name");
              if (!name) return;
              onPresetSave(name);
              setSelectedPresetId(name.toLowerCase().replace(/\s+/g, "-"));
            }}
            style={toolbarButtonStyle}
          >
            Save Preset
          </button>
          <button
            type="button"
            onClick={() => onPresetDelete(selectedPresetId)}
            style={toolbarButtonStyle}
            disabled={presets.find((preset) => preset.presetId === selectedPresetId)?.readonly}
          >
            Delete Preset
          </button>
          <button type="button" onClick={handleAddSegment} style={toolbarButtonStyle}>
            Add Segment
          </button>
          <button type="button" onClick={handleDuplicate} style={toolbarButtonStyle}>
            Duplicate
          </button>
          <button type="button" onClick={handleDelete} style={toolbarButtonStyle}>
            Delete
          </button>
          <button type="button" onClick={onResetTimeline} style={toolbarButtonStyle}>
            Reset
          </button>
          <button type="button" onClick={onSaveTimeline} style={toolbarButtonStyle}>
            Save
          </button>
          <button type="button" onClick={onExportTimeline} style={toolbarButtonStyle}>
            Export
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #7f1d1d",
            background: "#2a1212",
            color: "#fecaca",
            borderRadius: "8px",
            padding: "0.4rem 0.6rem",
            fontSize: "0.72rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: "72px",
          borderRadius: "10px",
          border: "1px solid #334155",
          background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
          overflow: "hidden",
        }}
        onPointerDown={(event) => {
          const rect = trackRef.current?.getBoundingClientRect();
          if (!rect || totalDurationMs <= 0) return;
          if ((event.target as HTMLElement | null)?.closest("[data-segment='true']")) return;
          const nextTime = clamp(((event.clientX - rect.left) / rect.width) * totalDurationMs, 0, totalDurationMs);
          setDragState({
            segmentId: null,
            mode: "scrub",
            startX: event.clientX,
            startStartMs: nextTime,
            startEndMs: nextTime,
          });
          onTimeChange(nextTime);
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${playheadX}px`,
            width: "2px",
            background: "#38bdf8",
            boxShadow: "0 0 8px rgba(56,189,248,0.7)",
          }}
        />

        {segments.map((segment) => {
          const left = totalDurationMs > 0 ? (segment.startMs / totalDurationMs) * trackWidth : 0;
          const width = totalDurationMs > 0 ? ((segment.endMs - segment.startMs) / totalDurationMs) * trackWidth : 0;
          const selected = segment.id === selectedSegmentId;
          return (
            <div
              key={segment.id}
              data-segment="true"
              style={{
                position: "absolute",
                top: "12px",
                left: `${left}px`,
                width: `${Math.max(6, width)}px`,
                height: "42px",
                borderRadius: "8px",
                background: selected ? "rgba(56,189,248,0.4)" : "rgba(59,130,246,0.2)",
                border: selected ? "1px solid #38bdf8" : "1px solid rgba(59,130,246,0.5)",
                color: "#e2e8f0",
                fontSize: "0.68rem",
                padding: "0.2rem 0.35rem",
                display: "grid",
                gridTemplateRows: "auto auto",
                gap: "0.2rem",
                cursor: "grab",
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedSegmentId(segment.id);
                setDragState({
                  segmentId: segment.id,
                  mode: "move",
                  startX: event.clientX,
                  startStartMs: segment.startMs,
                  startEndMs: segment.endMs,
                });
              }}
            >
              <div style={{ fontWeight: 600 }}>{segment.cameraMode}</div>
              <div style={{ color: "#94a3b8" }}>
                {formatSeconds(segment.startMs)} – {formatSeconds(segment.endMs)}
              </div>
              <div
                style={resizeHandleStyle("left")}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelectedSegmentId(segment.id);
                  setDragState({
                    segmentId: segment.id,
                    mode: "resize-start",
                    startX: event.clientX,
                    startStartMs: segment.startMs,
                    startEndMs: segment.endMs,
                  });
                }}
              />
              <div
                style={resizeHandleStyle("right")}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelectedSegmentId(segment.id);
                  setDragState({
                    segmentId: segment.id,
                    mode: "resize-end",
                    startX: event.clientX,
                    startStartMs: segment.startMs,
                    startEndMs: segment.endMs,
                  });
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          border: "1px solid #1f2937",
          borderRadius: "10px",
          background: "#0f172a",
          padding: "0.65rem",
          display: "grid",
          gap: "0.55rem",
        }}
      >
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700 }}>
          Segment Inspector
        </div>
        {!selectedSegment ? (
          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Select a segment to edit.</div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={labelStyle}>Camera Mode</label>
              <select
                value={selectedSegment.cameraMode}
                onChange={(event) =>
                  updateSegment(selectedSegment.id, {
                    cameraMode: resolveCameraMode(event.target.value),
                  })
                }
                style={selectStyle}
              >
                <option value="static">Static</option>
                <option value="follow">Follow</option>
                <option value="flyover">Flyover</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={labelStyle}>Overlay Toggles</label>
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={selectedSegment.overlay.showElevation !== false}
                  onChange={(event) =>
                    updateSegment(selectedSegment.id, {
                      overlay: {
                        ...selectedSegment.overlay,
                        showElevation: event.target.checked,
                      },
                    })
                  }
                />
                <span>Show elevation</span>
              </label>
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={selectedSegment.overlay.showMetrics !== false}
                  onChange={(event) =>
                    updateSegment(selectedSegment.id, {
                      overlay: {
                        ...selectedSegment.overlay,
                        showMetrics: event.target.checked,
                      },
                    })
                  }
                />
                <span>Show metrics</span>
              </label>
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={selectedSegment.overlay.showPoiCallouts !== false}
                  onChange={(event) =>
                    updateSegment(selectedSegment.id, {
                      overlay: {
                        ...selectedSegment.overlay,
                        showPoiCallouts: event.target.checked,
                      },
                    })
                  }
                />
                <span>Show POI callouts</span>
              </label>
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={labelStyle}>Caption / Subtitle</label>
              <textarea
                value={selectedSegment.caption || ""}
                onChange={(event) =>
                  updateSegment(selectedSegment.id, { caption: event.target.value })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.35rem",
                  borderRadius: "6px",
                  border: "1px solid #334155",
                  background: "#0b1220",
                  color: "#e2e8f0",
                  fontSize: "0.7rem",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <label style={labelStyle}>POI Callouts</label>
              {availablePois.length === 0 ? (
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>No POIs available.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                  {availablePois.map((poi) => {
                    const id = String(poi.id || "");
                    const label = poi.title || poi.label || id;
                    const active = activePoiSet.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => togglePoiSelection(id)}
                        style={{
                          border: active ? "1px solid #38bdf8" : "1px solid #334155",
                          background: active ? "rgba(56,189,248,0.2)" : "#0b1220",
                          color: active ? "#e2e8f0" : "#94a3b8",
                          borderRadius: "999px",
                          padding: "0.15rem 0.5rem",
                          fontSize: "0.66rem",
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
              Duration: {formatSeconds(selectedSegment.endMs - selectedSegment.startMs)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const toolbarButtonStyle = {
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#e2e8f0",
  borderRadius: "6px",
  padding: "0.25rem 0.55rem",
  fontSize: "0.68rem",
  cursor: "pointer",
} as const;

const labelStyle = {
  fontSize: "0.68rem",
  color: "#94a3b8",
} as const;

const selectStyle = {
  width: "100%",
  padding: "0.35rem",
  borderRadius: "6px",
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#e2e8f0",
  fontSize: "0.7rem",
} as const;

const checkboxRowStyle = {
  display: "flex",
  gap: "0.4rem",
  alignItems: "center",
  fontSize: "0.7rem",
  color: "#cbd5f5",
} as const;

function resizeHandleStyle(side: "left" | "right") {
  return {
    position: "absolute",
    top: "6px",
    [side]: "4px",
    width: "6px",
    height: "30px",
    borderRadius: "999px",
    background: "rgba(226,232,240,0.65)",
    cursor: "ew-resize",
  } as const;
}

