import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ElevationWaveform from "./TimelineBar/ElevationWaveform";
import {
  detectElevationAnchors,
  downsampleElevationByPixel,
  maybeSnapMileToElevationAnchor,
  type ElevationPoint,
} from "./timelineElevation";
import {
  getTimelineLaneDefinitions,
  maybeSnapToLaneEdge,
  findNearestPoiOverlayEntryId,
  type LaneOverlapIssue,
  type TimelineLaneBlock,
  type TimelineLaneId,
} from "./timelineLanes";
import { resolveTimelineKeyboardAction } from "./timelineKeyboard";
import TimelineItem from "./TimelineItem";
import { MIN_TIMELINE_SPAN_MI } from "../../utils/routeMediaTimelineGuardrails";
import type { Overlay, OverlayType } from "./overlays";

type DragState = {
  entryId: string;
  laneId: TimelineLaneId;
  startX: number;
  startStartMile: number;
  startEndMile: number;
  mode: "move" | "resize-start" | "resize-end";
};

type ScrubState = { active: boolean };

type LaneUiFlags = {
  collapsed: boolean;
  locked: boolean;
  solo: boolean;
};

type TimelineBarProps = {
  overlays: Overlay[];
  laneBlocks: Record<TimelineLaneId, TimelineLaneBlock[]>;
  laneOverlapIssues: LaneOverlapIssue[];
  titleAttachments: Record<string, string>;
  previewActiveEntryIds?: ReadonlySet<string>;
  elevationPoints: ElevationPoint[];
  routeLengthMiles: number;
  cursorMile: number | null;
  selectedEntryId: string | null;
  hoveredEntryId: string | null;
  onEntrySelect: (entryId: string) => void;
  onEntryHover: (entryId: string | null) => void;
  onEntryMove: (entryId: string, mile: number) => void;
  onEntryResize: (entryId: string, startMi: number, endMi: number) => void;
  onCursorMileChange: (mile: number) => void;
  onSetTitleAttachment: (titleEntryId: string, poiEntryId: string | null) => void;
  onSplitSelectedAtMile: (mile: number) => void;
  onDuplicateSelected: () => void;
  onDuplicateEntry: (entryId: string) => void;
  onDeleteSelected: () => void;
  onDeleteEntry: (entryId: string) => void;
  onNudgeSelected: (startDeltaMi: number, endDeltaMi: number) => void;
  onCreateOverlay: (type: OverlayType, mile: number) => void;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

function makeInitialLaneFlags(): Record<TimelineLaneId, LaneUiFlags> {
  return {
    title: { collapsed: false, locked: false, solo: false },
    poi: { collapsed: false, locked: false, solo: false },
    camera: { collapsed: false, locked: false, solo: false },
    speed: { collapsed: false, locked: false, solo: false },
  };
}

function clampRangeToLane(
  startMi: number,
  endMi: number,
  laneBlocks: TimelineLaneBlock[],
  entryId: string
): { startMi: number; endMi: number } {
  const span = Math.max(MIN_TIMELINE_SPAN_MI, endMi - startMi);
  let lowerBound = 0;
  let upperBound = Number.POSITIVE_INFINITY;

  for (const block of laneBlocks) {
    if (block.entryId === entryId) continue;
    if (block.endMi <= startMi) {
      lowerBound = Math.max(lowerBound, block.endMi);
    } else if (block.startMi >= endMi) {
      upperBound = Math.min(upperBound, block.startMi);
    } else {
      lowerBound = Math.max(lowerBound, block.endMi);
      upperBound = Math.min(upperBound, block.startMi);
    }
  }

  const clampedStart = clamp(startMi, lowerBound, Math.max(lowerBound, upperBound - span));
  const clampedEnd = clamp(clampedStart + span, clampedStart + MIN_TIMELINE_SPAN_MI, upperBound);
  return { startMi: clampedStart, endMi: clampedEnd };
}

export default function TimelineBar({
  overlays,
  laneBlocks,
  laneOverlapIssues,
  titleAttachments,
  previewActiveEntryIds,
  elevationPoints,
  routeLengthMiles,
  cursorMile,
  selectedEntryId,
  hoveredEntryId,
  onEntrySelect,
  onEntryHover,
  onEntryMove,
  onEntryResize,
  onCursorMileChange,
  onSetTitleAttachment,
  onSplitSelectedAtMile,
  onDuplicateSelected,
  onDuplicateEntry,
  onDeleteSelected,
  onDeleteEntry,
  onNudgeSelected,
  onCreateOverlay,
}: TimelineBarProps) {
  const laneDefinitions = useMemo(() => getTimelineLaneDefinitions(), []);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [scrubState, setScrubState] = useState<ScrubState | null>(null);
  const [activeLaneId, setActiveLaneId] = useState<TimelineLaneId>("camera");
  const [laneUiFlags, setLaneUiFlags] = useState<Record<TimelineLaneId, LaneUiFlags>>(
    makeInitialLaneFlags()
  );
  const [contextMenu, setContextMenu] = useState<
    | { kind: "overlay"; x: number; y: number; entryId: string; overlayType: OverlayType; attached: boolean }
    | { kind: "create"; x: number; y: number; mile: number }
    | null
  >(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(900);

  const safeRouteMiles = Math.max(0.1, toFinite(routeLengthMiles, 0.1));
  const enableScroll = safeRouteMiles > 31;
  const pixelsPerMile = routeLengthMiles > 0 ? 80 : 140;
  const fitWidth = Math.max(760, Math.round(viewportWidth - 24));
  const trackWidth = enableScroll ? Math.max(fitWidth, safeRouteMiles * pixelsPerMile) : fitWidth;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || viewport.clientWidth || 900;
      setViewportWidth(width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const rowLayout = useMemo(() => {
    const topOffset = 8;
    let y = topOffset;
    const rows: Record<TimelineLaneId, { top: number; height: number; itemTop: number }> = {
      title: { top: y, height: 30, itemTop: y + 3 },
      poi: { top: y, height: 30, itemTop: y + 3 },
      camera: { top: y, height: 30, itemTop: y + 3 },
      speed: { top: y, height: 30, itemTop: y + 3 },
    };

    for (const lane of laneDefinitions) {
      const flags = laneUiFlags[lane.id];
      const height = flags?.collapsed ? 20 : lane.blockHeight + 10;
      rows[lane.id] = { top: y, height, itemTop: y + 3 };
      y += height + 4;
    }
    return { rows, trackHeight: y + 8, topOffset };
  }, [laneDefinitions, laneUiFlags]);

  const anchors = useMemo(() => detectElevationAnchors(elevationPoints), [elevationPoints]);
  const anchorSnapThresholdPx = 8;
  const anchorXs = useMemo(
    () =>
      anchors.map((anchor) => ({
        kind: anchor.kind,
        x: (anchor.mile / safeRouteMiles) * Math.max(1, trackWidth - 1),
      })),
    [anchors, safeRouteMiles, trackWidth]
  );

  const downsampledWaveform = useMemo(
    () =>
      downsampleElevationByPixel(elevationPoints, safeRouteMiles, Math.max(1, Math.floor(trackWidth))),
    [elevationPoints, safeRouteMiles, trackWidth]
  );

  const cursorX = useMemo(() => {
    if (cursorMile === null || !Number.isFinite(cursorMile)) return null;
    return (clamp(cursorMile, 0, safeRouteMiles) / safeRouteMiles) * Math.max(1, trackWidth - 1);
  }, [cursorMile, safeRouteMiles, trackWidth]);

  const resolveMileAtClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clamp(clientX - rect.left, 0, Math.max(1, trackWidth));
    return clamp((x / Math.max(1, trackWidth)) * safeRouteMiles, 0, safeRouteMiles);
  };

  const issuesByLaneEntry = useMemo(() => {
    const map = new Map<string, LaneOverlapIssue[]>();
    for (const issue of laneOverlapIssues) {
      const key = `${issue.laneId}:${issue.entryId}`;
      const existing = map.get(key) || [];
      existing.push(issue);
      map.set(key, existing);
    }
    return map;
  }, [laneOverlapIssues]);

  const poiAnchorMiles = useMemo(
    () => overlays.filter((overlay) => overlay.type === "poi").map((overlay) => overlay.startMile),
    [overlays]
  );

  const maybeSnapToPoiAnchor = (rawMile: number): number => {
    const safeRouteMiles = Math.max(0.001, toFinite(routeLengthMiles, 0.001));
    const safeWidth = Math.max(1, toFinite(trackWidth, 1));
    const rawX = (Math.max(0, Math.min(safeRouteMiles, rawMile)) / safeRouteMiles) * safeWidth;
    let bestMile = rawMile;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const anchor of poiAnchorMiles) {
      const anchorX = (anchor / safeRouteMiles) * safeWidth;
      const distance = Math.abs(anchorX - rawX);
      if (distance > 7 || distance >= bestDistance) continue;
      bestDistance = distance;
      bestMile = anchor;
    }
    return bestMile;
  };

  useEffect(() => {
    if (!dragState && !scrubState?.active) return;

    const handleMove = (event: PointerEvent) => {
      if (dragState) {
        const milesPerPixel = safeRouteMiles / Math.max(1, trackWidth);
        const deltaMiles = (event.clientX - dragState.startX) * milesPerPixel;
        const laneEdges = laneBlocks[dragState.laneId] || [];
        const span = Math.max(MIN_TIMELINE_SPAN_MI, dragState.startEndMile - dragState.startStartMile);

        let nextStart = dragState.startStartMile;
        let nextEnd = dragState.startEndMile;

        if (dragState.mode === "move") {
          const rawStart = clamp(dragState.startStartMile + deltaMiles, 0, Math.max(0, routeLengthMiles));
          const snappedAnchor = maybeSnapMileToElevationAnchor(
            rawStart,
            anchors,
            anchorSnapThresholdPx,
            trackWidth,
            safeRouteMiles
          );
          const snappedPoi = maybeSnapToPoiAnchor(snappedAnchor);
          const snappedEdge = maybeSnapToLaneEdge(
            snappedPoi,
            laneEdges,
            dragState.entryId,
            7,
            trackWidth,
            safeRouteMiles
          );
          nextStart = snappedEdge;
          nextEnd = snappedEdge + span;
        } else if (dragState.mode === "resize-start") {
          const rawStart = clamp(dragState.startStartMile + deltaMiles, 0, dragState.startEndMile);
          const snappedAnchor = maybeSnapMileToElevationAnchor(
            rawStart,
            anchors,
            anchorSnapThresholdPx,
            trackWidth,
            safeRouteMiles
          );
          const snappedPoi = maybeSnapToPoiAnchor(snappedAnchor);
          nextStart = snappedPoi;
          nextEnd = dragState.startEndMile;
        } else if (dragState.mode === "resize-end") {
          const rawEnd = clamp(dragState.startEndMile + deltaMiles, dragState.startStartMile, Math.max(0, routeLengthMiles));
          const snappedAnchor = maybeSnapMileToElevationAnchor(
            rawEnd,
            anchors,
            anchorSnapThresholdPx,
            trackWidth,
            safeRouteMiles
          );
          const snappedPoi = maybeSnapToPoiAnchor(snappedAnchor);
          nextStart = dragState.startStartMile;
          nextEnd = snappedPoi;
        }

        const clamped = clampRangeToLane(nextStart, nextEnd, laneEdges, dragState.entryId);
        if (dragState.mode === "move") {
          onEntryMove(dragState.entryId, clamped.startMi);
          onCursorMileChange(clamped.startMi);
        } else {
          onEntryResize(dragState.entryId, clamped.startMi, clamped.endMi);
          onCursorMileChange(clamped.startMi);
        }
        return;
      }

      if (scrubState?.active) {
        const nextMile = resolveMileAtClientX(event.clientX);
        onCursorMileChange(nextMile);
      }
    };

    const handleUp = () => {
      setDragState(null);
      setScrubState(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [
    anchors,
    dragState,
    laneBlocks,
    onCursorMileChange,
    onEntryMove,
    onEntryResize,
    routeLengthMiles,
    safeRouteMiles,
    scrubState?.active,
    trackWidth,
    poiAnchorMiles,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const laneFlags = laneUiFlags[activeLaneId];
      const action = resolveTimelineKeyboardAction({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        hasSelection: Boolean(selectedEntryId),
        laneLocked: laneFlags?.locked === true,
        editableTarget: isEditableTarget(event.target),
      });
      if (!action) return;
      event.preventDefault();

      if (action.kind === "delete") {
        onDeleteSelected();
        return;
      }
      if (action.kind === "duplicate") {
        onDuplicateSelected();
        return;
      }
      if (action.kind === "split") {
        const activeBlock =
          (laneBlocks[activeLaneId] || []).find((block) => block.entryId === selectedEntryId) || null;
        const splitMile = cursorMile ?? (activeBlock ? (activeBlock.startMi + activeBlock.endMi) / 2 : 0);
        onSplitSelectedAtMile(splitMile);
        return;
      }
      if (action.kind === "nudge") {
        onNudgeSelected(action.startDeltaMi, action.endDeltaMi);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeLaneId,
    cursorMile,
    laneBlocks,
    laneUiFlags,
    onDeleteSelected,
    onDuplicateSelected,
    onNudgeSelected,
    onSplitSelectedAtMile,
    selectedEntryId,
  ]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("blur", handleClose);
    window.addEventListener("contextmenu", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("blur", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, [contextMenu]);

  const tickStepMi = routeLengthMiles > 24 ? 4 : routeLengthMiles > 10 ? 2 : 1;
  const ticks = useMemo(() => {
    if (!Number.isFinite(routeLengthMiles) || routeLengthMiles <= 0) return [0];
    const points: number[] = [];
    for (let mile = 0; mile <= routeLengthMiles + 0.001; mile += tickStepMi) {
      points.push(Number(mile.toFixed(2)));
    }
    if (points[points.length - 1] !== routeLengthMiles) {
      points.push(Number(routeLengthMiles.toFixed(2)));
    }
    return points;
  }, [routeLengthMiles, tickStepMi]);

  const nearestPoiByTitleOverlayId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const overlay of overlays) {
      if (overlay.type !== "title") continue;
      map.set(overlay.id, findNearestPoiOverlayEntryId(overlay, overlays, 0.25));
    }
    return map;
  }, [overlays]);

  const toggleLaneFlag = (laneId: TimelineLaneId, key: keyof LaneUiFlags) => {
    setLaneUiFlags((prev) => ({
      ...prev,
      [laneId]: { ...prev[laneId], [key]: !prev[laneId][key] },
    }));
  };

  const hasAnyBlocks = useMemo(
    () =>
      laneDefinitions.some((lane) => Array.isArray(laneBlocks[lane.id]) && laneBlocks[lane.id].length > 0),
    [laneBlocks, laneDefinitions]
  );

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid #1f2937",
        background: "#0d1626",
        overflowX: enableScroll ? "auto" : "hidden",
        overflowY: "hidden",
        padding: "0.7rem 0.6rem",
        height: "100%",
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: "0.5rem",
      }}
      ref={viewportRef}
    >
      <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
        Multi-Lane Timeline (single route)
      </div>

      <div
        style={{
          position: "relative",
          width: `${trackWidth}px`,
          height: "64px",
          borderRadius: "10px",
          border: "1px solid #334155",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)",
          overflow: "hidden",
        }}
      >
        <ElevationWaveform
          width={trackWidth}
          height={64}
          columns={downsampledWaveform}
          cursorX={cursorX}
          anchorXs={anchorXs}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.35rem", marginBottom: "0.45rem" }}>
        {laneDefinitions.map((lane) => {
          const flags = laneUiFlags[lane.id];
          return (
            <div
              key={`lane-controls-${lane.id}`}
              style={{
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "0.3rem 0.4rem",
                background: "#0b1220",
                display: "grid",
                gap: "0.25rem",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: lane.color, fontWeight: 700 }}>{lane.label}</div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => onCreateOverlay(lane.id, cursorMile ?? 0)}
                  style={laneControlButton(false)}
                  title={`Add ${lane.label}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => toggleLaneFlag(lane.id, "collapsed")}
                  style={laneControlButton(flags.collapsed)}
                >
                  {flags.collapsed ? "Expand" : "Collapse"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLaneFlag(lane.id, "locked")}
                  style={laneControlButton(flags.locked)}
                >
                  {flags.locked ? "Unlock" : "Lock"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLaneFlag(lane.id, "solo")}
                  style={laneControlButton(flags.solo)}
                  title="Solo is a future behavior stub in this phase."
                >
                  Solo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {laneOverlapIssues.length > 0 && (
        <div
          style={{
            marginBottom: "0.5rem",
            padding: "0.45rem 0.55rem",
            borderRadius: "8px",
            border: "1px solid #7f1d1d",
            background: "#2a1212",
            color: "#fecaca",
            fontSize: "0.72rem",
          }}
        >
          Lane overlap detected. Intra-lane overlap is blocked; cross-lane overlap is allowed.
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: `${trackWidth}px`,
          height: `${rowLayout.trackHeight}px`,
          borderRadius: "10px",
          border: "1px solid #334155",
          background:
            "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)",
          overflow: "hidden",
        }}
        ref={trackRef}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-timeline-item='true']")) return;
          const nextMile = resolveMileAtClientX(event.clientX);
          setScrubState({ active: true });
          onCursorMileChange(nextMile);
        }}
        onContextMenu={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-timeline-item='true']")) return;
          event.preventDefault();
          event.stopPropagation();
          const nextMile = resolveMileAtClientX(event.clientX);
          setContextMenu({ kind: "create", x: event.clientX, y: event.clientY, mile: nextMile });
        }}
      >

        <div style={{ position: "absolute", inset: "0", pointerEvents: "none" }}>
          {ticks.map((mile) => {
            const x = (mile / safeRouteMiles) * trackWidth;
            return (
              <div key={`tick-${mile}`} style={{ position: "absolute", left: `${x}px`, top: 0 }}>
                <div style={{ width: "1px", height: "20px", background: "rgba(51,65,85,0.9)" }} />
                <div style={{ transform: "translateX(-50%)", fontSize: "0.66rem", color: "#64748b" }}>
                  {mile.toFixed(1)} mi
                </div>
              </div>
            );
          })}
        </div>

        {laneDefinitions.map((lane) => {
          const flags = laneUiFlags[lane.id];
          const row = rowLayout.rows[lane.id];
          const blocks = laneBlocks[lane.id] || [];
          return (
            <div
              key={`lane-row-${lane.id}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${row.top}px`,
                height: `${row.height}px`,
                borderTop: "1px dashed rgba(51,65,85,0.6)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "6px",
                  top: "2px",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: lane.color,
                  background: "rgba(2,6,23,0.8)",
                  border: "1px solid rgba(51,65,85,0.6)",
                  borderRadius: "6px",
                  padding: "0.08rem 0.3rem",
                }}
              >
                {lane.label}
              </div>

              {!flags.collapsed &&
                blocks.map((block) => {
                  const startMi = clamp(toFinite(block.startMi, 0), 0, safeRouteMiles);
                  const endMi = clamp(toFinite(block.endMi, startMi), startMi, safeRouteMiles);
                  const spanMi = Math.max(0.03, endMi - startMi);
                  const leftPx = (startMi / safeRouteMiles) * trackWidth;
                  const widthPx = (spanMi / safeRouteMiles) * trackWidth;
                  const issueKey = `${lane.id}:${block.entryId}`;
                  const issue = issuesByLaneEntry.get(issueKey)?.[0];
                  const attached = lane.id === "title" && Boolean(titleAttachments[block.entryId]);
                  const nearestPoiEntryId = nearestPoiByTitleOverlayId.get(block.overlayId) ?? null;
                  const attachedPoiEntryId = titleAttachments[block.entryId] ?? null;
                  const isSelected = selectedEntryId === block.entryId;
                  const isPreviewActive = previewActiveEntryIds?.has(block.entryId) ?? false;

                  return (
                    <div key={block.blockId}>
                      {lane.id === "poi" && row.top > rowLayout.topOffset && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${leftPx + Math.max(18, widthPx / 2)}px`,
                            top: `${rowLayout.topOffset}px`,
                            height: `${Math.max(0, row.top - rowLayout.topOffset)}px`,
                            borderLeft: "1px solid rgba(245, 158, 11, 0.58)",
                            pointerEvents: "none",
                          }}
                        />
                      )}

                      {lane.id === "title" && isSelected && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (flags.locked) return;
                            if (attachedPoiEntryId) {
                              onSetTitleAttachment(block.entryId, null);
                            } else if (nearestPoiEntryId) {
                              onSetTitleAttachment(block.entryId, nearestPoiEntryId);
                            }
                          }}
                          style={{
                            position: "absolute",
                            left: `${leftPx}px`,
                            top: `${Math.max(0, row.itemTop - 18)}px`,
                            height: "14px",
                            borderRadius: "6px",
                            border: "1px solid #334155",
                            background: attachedPoiEntryId ? "#113125" : "#1e293b",
                            color: attachedPoiEntryId ? "#86efac" : "#cbd5e1",
                            fontSize: "0.58rem",
                            padding: "0 0.3rem",
                            cursor: flags.locked ? "not-allowed" : "pointer",
                          }}
                          title={
                            attachedPoiEntryId
                              ? "Detach title from POI"
                              : nearestPoiEntryId
                                ? "Attach title to nearest POI"
                                : "No POI in range to attach"
                          }
                        >
                          {attachedPoiEntryId ? "Attached" : "Attach POI"}
                        </button>
                      )}

                      <TimelineItem
                        id={block.entryId}
                        label={block.label}
                        topPx={row.itemTop}
                        leftPx={leftPx}
                        widthPx={widthPx}
                        laneColor={lane.color}
                        selected={isSelected && activeLaneId === lane.id}
                        hovered={hoveredEntryId === block.entryId}
                        previewActive={isPreviewActive}
                        invalid={Boolean(issue)}
                        invalidMessage={issue?.message}
                        attached={attached}
                        locked={flags.locked}
                        onSelect={(entryId) => {
                          setActiveLaneId(lane.id);
                          onEntrySelect(entryId);
                        }}
                        onHover={onEntryHover}
                        onPointerDown={(entryId, clientX) => {
                          if (flags.locked) return;
                          setActiveLaneId(lane.id);
                          setDragState({
                            entryId,
                            laneId: lane.id,
                            startX: clientX,
                            startStartMile: startMi,
                            startEndMile: endMi,
                            mode: "move",
                          });
                          onEntrySelect(entryId);
                          onCursorMileChange(startMi);
                        }}
                        onResizeStart={(entryId, clientX) => {
                          if (flags.locked) return;
                          setActiveLaneId(lane.id);
                          setDragState({
                            entryId,
                            laneId: lane.id,
                            startX: clientX,
                            startStartMile: startMi,
                            startEndMile: endMi,
                            mode: "resize-start",
                          });
                          onEntrySelect(entryId);
                        }}
                        onResizeEnd={(entryId, clientX) => {
                          if (flags.locked) return;
                          setActiveLaneId(lane.id);
                          setDragState({
                            entryId,
                            laneId: lane.id,
                            startX: clientX,
                            startStartMile: startMi,
                            startEndMile: endMi,
                            mode: "resize-end",
                          });
                          onEntrySelect(entryId);
                        }}
                        onContextMenu={(entryId, clientX, clientY) => {
                          const overlayType = block.overlayType;
                          setContextMenu({
                            kind: "overlay",
                            x: clientX,
                            y: clientY,
                            entryId,
                            overlayType,
                            attached: Boolean(attachedPoiEntryId),
                          });
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          );
        })}

        {!hasAnyBlocks && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#64748b",
              fontSize: "0.85rem",
            }}
          >
            Click the route on the map to create your first cinematic beat.
          </div>
        )}
      </div>
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: "#0b1220",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "0.4rem",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.5)",
            zIndex: 20,
            display: "grid",
            gap: "0.3rem",
            minWidth: "160px",
          }}
        >
          {contextMenu.kind === "create" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onCreateOverlay("title", contextMenu.mile);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Add Title
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateOverlay("poi", contextMenu.mile);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Add POI
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateOverlay("camera", contextMenu.mile);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Add Camera Keyframe
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateOverlay("speed", contextMenu.mile);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Add Speed Change
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onEntrySelect(contextMenu.entryId);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onDuplicateEntry(contextMenu.entryId);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(contextMenu.entryId);
                  setContextMenu(null);
                }}
                style={contextMenuButton}
              >
                Delete
              </button>
              {contextMenu.overlayType === "title" && contextMenu.attached && (
                <button
                  type="button"
                  onClick={() => {
                    onSetTitleAttachment(contextMenu.entryId, null);
                    setContextMenu(null);
                  }}
                  style={contextMenuButton}
                >
                  Detach From POI
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function laneControlButton(active: boolean): CSSProperties {
  return {
    height: "20px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: active ? "#1d4ed8" : "#0f172a",
    color: "#dbeafe",
    fontSize: "0.6rem",
    padding: "0 0.35rem",
    cursor: "pointer",
  };
}

const contextMenuButton: CSSProperties = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: "6px",
  padding: "0.3rem 0.5rem",
  fontSize: "0.68rem",
  textAlign: "left",
  cursor: "pointer",
};
