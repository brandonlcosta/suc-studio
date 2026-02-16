import { useCallback, useEffect, useMemo, useState } from "react";
import MapCanvas from "./MapCanvas";
import MediaInspectorPanel from "./MediaInspectorPanel";
import PreviewPanel from "./PreviewPanel";
import TimelineBar from "./TimelineBar";
import CinematicTimelineEditor from "./CinematicTimelineEditor";
import { buildCameraKeyframes, buildPreviewOverlayLookup, samplePreviewFrame } from "./previewEngine";
import { usePreviewPlayback } from "./usePreviewPlayback";
import { useRouteMediaController } from "./useRouteMediaController";
import { buildRouteOverlayModel } from "../../../../../suc-shared-data/src/route-overlay-primitives.js";
import {
  buildCinematicTimeline,
  resolveActiveSegment,
  normalizeSegments,
  sampleTimeline,
} from "../../../../../suc-shared-data/src/cinematic-timeline-primitives/index.js";

export default function RouteMediaBuilder() {
  const controller = useRouteMediaController();

  const { draft } = controller;
  const baseDurationSeconds = useMemo(() => {
    const miles = Math.max(0, controller.activeRouteLengthMiles);
    const milesPerSecond = Math.max(0.05, Number(draft?.playback?.milesPerSecond || 1));
    const holdSeconds = Math.max(0, Number(draft?.playback?.holdSeconds || 0));
    return holdSeconds + miles / milesPerSecond;
  }, [controller.activeRouteLengthMiles, draft?.playback?.holdSeconds, draft?.playback?.milesPerSecond]);

  const baseDurationMs = Math.max(0, Math.round(baseDurationSeconds * 1000));

  const cameraKeyframes = useMemo(
    () =>
      buildCameraKeyframes(
        controller.overlays,
        draft?.camera || { mode: "third-person-follow" },
        controller.activeRouteLengthMiles
      ),
    [controller.activeRouteLengthMiles, controller.overlays, draft?.camera]
  );

  const overlayLookup = useMemo(
    () => buildPreviewOverlayLookup(controller.overlays),
    [controller.overlays]
  );

  const overlayModel = useMemo(() => {
    const stats = controller.activeRouteStats;
    const coords = stats?.coords || [];
    const elevations = stats?.elevations || [];
    const track = coords.map((coord, index) => ({
      lon: Number(coord?.[0] ?? 0),
      lat: Number(coord?.[1] ?? 0),
      ele: Number.isFinite(elevations[index]) ? elevations[index] : null,
    }));
    const poiMarkers = controller.timelineMarkers.map((marker) => {
      const idx = Math.max(0, Math.floor(Number(marker.routePointIndex || 0)));
      const coord = coords[idx];
      return {
        id: marker.id,
        title: marker.title,
        type: "poi",
        routePointIndex: idx,
        lat: coord ? coord[1] : 0,
        lon: coord ? coord[0] : 0,
      };
    });
    return buildRouteOverlayModel(track, poiMarkers, { routeId: draft?.routeId || "" });
  }, [controller.activeRouteStats, controller.timelineMarkers, draft?.routeId]);

  const defaultTimeline = useMemo(
    () =>
      buildCinematicTimeline({
        overlayModel,
        durationMs: baseDurationMs,
        mode: "route-intel-default",
      }),
    [baseDurationMs, overlayModel]
  );

  const timelineStorageKey = useMemo(() => {
    const routeId = draft?.routeId || "route";
    return `cinematicTimeline:${routeId}`;
  }, [draft?.routeId]);

  const presetStorageKey = useMemo(() => {
    const routeId = draft?.routeId || "route";
    return `cinematicTimelinePresets:${routeId}`;
  }, [draft?.routeId]);

  const [cinematicTimeline, setCinematicTimeline] = useState(defaultTimeline);
  const [userPresets, setUserPresets] = useState<
    Array<{ presetId: string; name: string; timeline: typeof defaultTimeline }>
  >([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(timelineStorageKey);
      if (!stored) {
        setCinematicTimeline(defaultTimeline);
        return;
      }
      const parsed = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.segments)) {
        setCinematicTimeline(defaultTimeline);
        return;
      }
      const normalizedSegments = normalizeSegments(parsed.segments, baseDurationMs);
      setCinematicTimeline({
        timelineId: parsed.timelineId || defaultTimeline.timelineId,
        totalDurationMs: baseDurationMs,
        segments: normalizedSegments,
      });
    } catch {
      setCinematicTimeline(defaultTimeline);
    }
  }, [baseDurationMs, defaultTimeline, timelineStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(presetStorageKey);
      if (!stored) {
        setUserPresets([]);
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        setUserPresets([]);
        return;
      }
      const sanitized = parsed
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          presetId: String(entry.presetId || entry.name || "").trim() || `preset-${Date.now()}`,
          name: String(entry.name || entry.presetId || "Preset"),
          timeline: {
            ...defaultTimeline,
            ...entry.timeline,
            totalDurationMs: baseDurationMs,
            segments: normalizeSegments(entry.timeline?.segments || [], baseDurationMs),
          },
        }));
      setUserPresets(sanitized);
    } catch {
      setUserPresets([]);
    }
  }, [baseDurationMs, defaultTimeline, presetStorageKey]);

  useEffect(() => {
    setCinematicTimeline((prev) => {
      if (!prev) return defaultTimeline;
      if (prev.totalDurationMs === baseDurationMs) return prev;
      return {
        ...prev,
        totalDurationMs: baseDurationMs,
        segments: normalizeSegments(prev.segments, baseDurationMs),
      };
    });
  }, [baseDurationMs, defaultTimeline]);

  useEffect(() => {
    setUserPresets((prev) =>
      prev.map((preset) => ({
        ...preset,
        timeline: {
          ...preset.timeline,
          totalDurationMs: baseDurationMs,
          segments: normalizeSegments(preset.timeline.segments || [], baseDurationMs),
        },
      }))
    );
  }, [baseDurationMs]);

  const previewPlayback = usePreviewPlayback({
    durationSeconds: Math.max(0, (cinematicTimeline.totalDurationMs || 0) / 1000),
    frameRate: Math.max(12, Math.round(Number(draft?.playback?.fps || 24))),
  });
  const {
    isPlaying: previewIsPlaying,
    progress: previewProgress,
    playbackSpeed,
    durationSeconds,
    currentTimeMs,
    metrics: previewMetrics,
    play: playPreview,
    pause: pausePreview,
    seek: seekPreview,
    stepFrame: stepPreviewFrame,
    reset: resetPreview,
    setPlaybackSpeed,
  } = previewPlayback;

  const activeSegment = useMemo(
    () => resolveActiveSegment(cinematicTimeline, currentTimeMs),
    [cinematicTimeline, currentTimeMs]
  );

  const previewFrame = useMemo(
    () =>
      samplePreviewFrame(
        previewProgress,
        controller.activeRouteStats,
        controller.elevationPoints,
        1200,
        cameraKeyframes,
        overlayLookup
      ),
    [
      cameraKeyframes,
      controller.activeRouteStats,
      controller.elevationPoints,
      overlayLookup,
      previewProgress,
    ]
  );

  const overlayFlags = activeSegment?.overlay;
  const previewOverlays = useMemo(() => {
    if (!overlayFlags) return previewFrame.overlays;
    let nextPois = previewFrame.overlays.activePois;
    if (overlayFlags.showPoiCallouts === false) {
      nextPois = [];
    } else if (Array.isArray(activeSegment?.activePoiIds) && activeSegment.activePoiIds.length > 0) {
      const allowed = new Set(activeSegment.activePoiIds);
      nextPois = (overlayModel?.pois || [])
        .filter((poi) => allowed.has(String(poi.id)))
        .map((poi) => ({
          entryId: String(poi.id),
          label: poi.title || poi.label || String(poi.id),
          distanceMi: Number(poi.distanceMi || 0),
          opacity: 1,
        }));
    }
    return {
      ...previewFrame.overlays,
      activePois: nextPois,
      activeCaptions: activeSegment?.caption ? [activeSegment.caption] : [],
    };
  }, [
    activeSegment?.activePoiIds,
    activeSegment?.caption,
    overlayFlags,
    overlayModel,
    previewFrame.overlays,
  ]);

  const previewCamera = useMemo(() => {
    if (!previewFrame.camera) return null;
    const mode = activeSegment?.cameraMode;
    if (!mode) return previewFrame.camera;
    const mappedMode =
      mode === "static" || mode === "flyover" ? "overview-lock" : "third-person-follow";
    return { ...previewFrame.camera, mode: mappedMode };
  }, [activeSegment?.cameraMode, previewFrame.camera]);

  const previewActiveEntryIds = useMemo(
    () => new Set(previewFrame.overlays.activeEntryIds),
    [previewFrame.overlays.activeEntryIds]
  );

  useEffect(() => {
    if (!previewIsPlaying) return;
    controller.setScrubMile(previewFrame.mapping.mile);
  }, [controller.setScrubMile, previewFrame.mapping.mile, previewIsPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        if (previewIsPlaying) {
          pausePreview();
        } else {
          playPreview();
        }
        return;
      }

      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
      if (isUndo) {
        event.preventDefault();
        if (event.shiftKey) {
          controller.redo();
        } else {
          controller.undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controller, pausePreview, playPreview, previewIsPlaying]);

  useEffect(() => {
    if (previewIsPlaying) return;
    const routeMiles = Math.max(0.001, controller.activeRouteLengthMiles);
    const nextProgress = Math.max(0, Math.min(1, controller.scrubMile / routeMiles));
    if (Math.abs(nextProgress - previewProgress) < 1e-4) return;
    seekPreview(nextProgress);
  }, [
    controller.activeRouteLengthMiles,
    controller.scrubMile,
    previewIsPlaying,
    previewProgress,
    seekPreview,
  ]);

  const handleCursorMileChange = useCallback(
    (mile: number) => {
      const routeMiles = Math.max(0.001, controller.activeRouteLengthMiles);
      const clampedMile = Math.max(0, Math.min(routeMiles, Number(mile) || 0));
      seekPreview(clampedMile / routeMiles);
      controller.setScrubMile(clampedMile);
    },
    [controller.activeRouteLengthMiles, controller.setScrubMile, seekPreview]
  );

  const handlePreviewSeekProgress = useCallback(
    (progress: number) => {
      const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
      seekPreview(safeProgress);
      controller.setScrubMile(safeProgress * Math.max(0, controller.activeRouteLengthMiles));
    },
    [controller.activeRouteLengthMiles, controller.setScrubMile, seekPreview]
  );

  const handleStepPreviewFrame = useCallback(() => {
    const fps = Math.max(12, Math.round(Number(draft?.playback?.fps || 24)));
    const safeDuration = Math.max(0.001, durationSeconds);
    const stepProgress = (1 / fps) * playbackSpeed / safeDuration;
    const nextProgress = Math.max(0, Math.min(1, previewProgress + stepProgress));
    stepPreviewFrame();
    controller.setScrubMile(nextProgress * Math.max(0, controller.activeRouteLengthMiles));
  }, [
    controller.activeRouteLengthMiles,
    controller.setScrubMile,
    draft?.playback?.fps,
    durationSeconds,
    playbackSpeed,
    previewProgress,
    stepPreviewFrame,
  ]);

  const handleTimelineTimeChange = useCallback(
    (timeMs: number) => {
      const safeDurationMs = Math.max(1, cinematicTimeline.totalDurationMs || 1);
      const clampedTime = Math.max(0, Math.min(safeDurationMs, Number(timeMs) || 0));
      const progress = clampedTime / safeDurationMs;
      seekPreview(progress);
      controller.setScrubMile(progress * Math.max(0, controller.activeRouteLengthMiles));
    },
    [cinematicTimeline.totalDurationMs, controller.activeRouteLengthMiles, controller.setScrubMile, seekPreview]
  );

  const handleTimelineChange = useCallback(
    (nextTimeline: typeof cinematicTimeline) => {
      setCinematicTimeline(nextTimeline);
    },
    []
  );

  const handleTimelineReset = useCallback(() => {
    setCinematicTimeline(defaultTimeline);
  }, [defaultTimeline]);

  const handleTimelineSave = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(timelineStorageKey, JSON.stringify(cinematicTimeline));
  }, [cinematicTimeline, timelineStorageKey]);

  const handleTimelineExport = useCallback(() => {
    if (typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(cinematicTimeline, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cinematicTimeline.timelineId || "cinematic-timeline"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [cinematicTimeline]);

  const presets = useMemo(() => {
    const sample = sampleTimeline();
    const defaultPreset = { presetId: "default", name: "Default", timeline: defaultTimeline, readonly: true };
    const samplePreset = {
      presetId: "sample",
      name: "Sample",
      timeline: { ...sample, totalDurationMs: baseDurationMs, segments: normalizeSegments(sample.segments, baseDurationMs) },
      readonly: true,
    };
    return [defaultPreset, samplePreset, ...userPresets];
  }, [baseDurationMs, defaultTimeline, userPresets]);

  const handlePresetSave = useCallback(
    (name: string) => {
      if (typeof window === "undefined") return;
      const trimmed = String(name || "").trim();
      if (!trimmed) return;
      const presetId = trimmed.toLowerCase().replace(/\s+/g, "-");
      const next = [
        ...userPresets.filter((preset) => preset.presetId !== presetId),
        { presetId, name: trimmed, timeline: cinematicTimeline },
      ];
      setUserPresets(next);
      window.localStorage.setItem(presetStorageKey, JSON.stringify(next));
    },
    [cinematicTimeline, presetStorageKey, userPresets]
  );

  const handlePresetLoad = useCallback(
    (presetId: string) => {
      const preset = presets.find((entry) => entry.presetId === presetId);
      if (!preset) return false;
      if (!confirm(`Load preset \"${preset.name}\"? This will replace the current timeline.`)) return false;
      setCinematicTimeline({
        ...preset.timeline,
        totalDurationMs: baseDurationMs,
        segments: normalizeSegments(preset.timeline.segments || [], baseDurationMs),
      });
      handleTimelineTimeChange(0);
      return true;
    },
    [baseDurationMs, handleTimelineTimeChange, presets]
  );

  const handlePresetDelete = useCallback(
    (presetId: string) => {
      const target = userPresets.find((entry) => entry.presetId === presetId);
      if (!target) return;
      if (!confirm(`Delete preset \"${target.name}\"?`)) return;
      const next = userPresets.filter((entry) => entry.presetId !== presetId);
      setUserPresets(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(presetStorageKey, JSON.stringify(next));
      }
    },
    [presetStorageKey, userPresets]
  );

  if (controller.isLoading) {
    return (
      <div style={{ padding: "2rem", backgroundColor: "#0a0e14", minHeight: "100%" }}>
        <div>Loading Route Media...</div>
      </div>
    );
  }

  if (!controller.draft) {
    return (
      <div style={{ padding: "1.8rem", backgroundColor: "#0a0e14", minHeight: "100%", color: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Cinematic Media Plans</h2>
            <div style={{ marginTop: "0.3rem", color: "#94a3b8", fontSize: "0.82rem" }}>
              Author route-media timelines with map-tagged POIs and subtitles.
            </div>
          </div>
          <button
            type="button"
            onClick={controller.startNew}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: "8px",
              border: "1px solid #16a34a",
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            New Media Plan
          </button>
        </div>

        {controller.error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #7f1d1d",
              background: "#2a1212",
              color: "#fecaca",
              fontSize: "0.8rem",
            }}
          >
            {controller.error}
          </div>
        )}

        {controller.items.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "10px",
              padding: "1.2rem",
              color: "#64748b",
              fontSize: "0.85rem",
            }}
          >
            No cinematic plans yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {controller.items.map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "0.8rem",
                  background: "#0f172a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{plan.id}</div>
                  <div style={{ marginTop: "0.2rem", color: "#94a3b8", fontSize: "0.76rem" }}>
                    Event: {plan.eventId || "-"} | Route: {plan.routeId || "-"} | Entries:{" "}
                    {plan.timeline?.length ?? 0}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => controller.loadPlan(plan.id)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "7px",
                    border: "1px solid #3b82f6",
                    background: "#172554",
                    color: "#dbeafe",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Open Builder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", background: "#0a0e14" }}>
      <aside
        style={{
          width: "360px",
          minWidth: "360px",
          maxWidth: "360px",
          borderRight: "1px solid #1f2937",
          background: "#0b1220",
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "grid", gap: "0.55rem", marginBottom: "0.9rem" }}>
          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button
              type="button"
              onClick={controller.closeDraft}
              style={{
                flex: 1,
                padding: "0.46rem 0.7rem",
                borderRadius: "8px",
                border: "1px solid #374151",
                background: "#111827",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Back To Plans
            </button>
            <button
              type="button"
              onClick={controller.save}
              disabled={controller.isSaving}
              style={{
                flex: 1,
                padding: "0.46rem 0.7rem",
                borderRadius: "8px",
                border: "1px solid #16a34a",
                background: controller.isSaving ? "#14532d" : "#16a34a",
                color: "#f0fdf4",
                cursor: controller.isSaving ? "not-allowed" : "pointer",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {controller.isSaving ? "Saving..." : "Save Plan"}
            </button>
          </div>

          <div style={{ fontSize: "0.73rem", color: "#64748b" }}>
            Click route to add entries. Drag markers on map or timeline to reposition.
          </div>
        </div>

        {controller.error && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.6rem",
              borderRadius: "8px",
              border: "1px solid #7f1d1d",
              background: "#2a1212",
              color: "#fecaca",
              fontSize: "0.78rem",
              display: "grid",
              gap: "0.25rem",
            }}
          >
            <div>{controller.error}</div>
            {controller.validationDetails.length > 0 &&
              controller.validationDetails.map((detail, index) => (
                <div key={`${detail.field}-${index}`} style={{ color: "#fda4af", fontSize: "0.72rem" }}>
                  {detail.field}: {detail.message}
                </div>
              ))}
          </div>
        )}

        {controller.success && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.6rem",
              borderRadius: "8px",
              border: "1px solid #14532d",
              background: "#102915",
              color: "#86efac",
              fontSize: "0.78rem",
            }}
          >
            {controller.success}
          </div>
        )}

        <MediaInspectorPanel
          draft={draft}
          events={controller.events}
          routeGroups={controller.routeGroups}
          availableVariants={controller.availableVariants}
          activeVariant={controller.activeVariant}
          selectedEntry={controller.selectedEntry}
          selectedSubtitle={controller.selectedSubtitle}
          selectedMarker={controller.selectedMarker}
          selectedEntryHoldSeconds={controller.selectedEntryHoldSeconds}
          validationErrors={controller.validationErrors}
          onSetDraftField={controller.setDraftField}
          onSetPlaybackField={controller.setPlaybackField}
          onSetCameraField={controller.setCameraField}
          onSetActiveVariant={controller.setActiveVariant}
          onClearSelection={() => controller.setSelectedEntryId(null)}
          onUpdateSelectedEntryField={controller.updateSelectedEntryField}
          onUpdateSelectedSubtitleText={controller.updateSelectedSubtitleText}
          onUpdateSelectedMarkerTitle={controller.updateSelectedMarkerTitle}
          onUpdateSelectedMarkerBody={controller.updateSelectedMarkerBody}
          onUpdateSelectedMarkerType={controller.updateSelectedMarkerType}
          onUpdateSelectedHoldSeconds={controller.updateSelectedHoldSeconds}
          onRemoveSelectedEntry={controller.removeSelectedEntry}
        />
      </aside>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          padding: "1rem",
          overflow: "hidden",
          background: "#0b0f17",
        }}
      >
        <section
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              minWidth: 0,
              border: "1px solid #1f2937",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#020617",
            }}
          >
            <MapCanvas
              routeGroupId={draft.routeId}
              activeVariant={controller.activeVariant}
              markers={controller.timelineMarkers}
              scrubIndicator={controller.scrubIndicator}
              previewCamera={previewIsPlaying ? previewCamera : null}
              selectedEntryId={controller.selectedEntryId}
              hoveredEntryId={controller.hoveredEntryId}
              onCreateOverlayAtMile={controller.createOverlayAtMile}
              onEntrySelect={controller.setSelectedEntryId}
              onEntryHover={controller.setHoveredEntryId}
              onEntryDrag={controller.moveEntryByMapDrag}
            />
          </div>

          <PreviewPanel
            isPlaying={previewIsPlaying}
            progress={previewProgress}
            playbackSpeed={playbackSpeed}
            durationSeconds={durationSeconds}
            currentSeconds={durationSeconds * previewProgress}
            camera={previewCamera}
            overlays={previewOverlays}
            overlayFlags={overlayFlags}
            metrics={previewMetrics}
            onPlayPause={() => {
              if (previewIsPlaying) {
                pausePreview();
                return;
              }
              playPreview();
            }}
            onSeekProgress={handlePreviewSeekProgress}
            onReset={() => {
              resetPreview();
              controller.setScrubMile(0);
            }}
            onStepFrame={handleStepPreviewFrame}
            onSetPlaybackSpeed={setPlaybackSpeed}
          />
        </section>

        <section style={{ height: "280px", minHeight: "280px" }}>
          <CinematicTimelineEditor
            timeline={cinematicTimeline}
            currentTimeMs={currentTimeMs}
            overlayModel={overlayModel}
            presets={presets}
            onTimeChange={handleTimelineTimeChange}
            onTimelineChange={handleTimelineChange}
            onResetTimeline={handleTimelineReset}
            onSaveTimeline={handleTimelineSave}
            onExportTimeline={handleTimelineExport}
            onPresetSave={handlePresetSave}
            onPresetLoad={handlePresetLoad}
            onPresetDelete={handlePresetDelete}
          />
        </section>

        <section style={{ height: "210px", minHeight: "210px" }}>
          <TimelineBar
            overlays={controller.overlays}
            laneBlocks={controller.laneBlocks}
            laneOverlapIssues={controller.laneOverlapIssues}
            titleAttachments={controller.titleAttachments}
            previewActiveEntryIds={previewActiveEntryIds}
            elevationPoints={controller.elevationPoints}
            routeLengthMiles={controller.activeRouteLengthMiles}
            cursorMile={controller.scrubMile}
            selectedEntryId={controller.selectedEntryId}
            hoveredEntryId={controller.hoveredEntryId}
            onEntrySelect={controller.setSelectedEntryId}
            onEntryHover={controller.setHoveredEntryId}
            onEntryMove={controller.moveEntryToMile}
            onEntryResize={controller.updateEntryRange}
            onCursorMileChange={handleCursorMileChange}
            onSetTitleAttachment={controller.setTitleAttachment}
            onSplitSelectedAtMile={controller.splitSelectedEntryAtMile}
            onDuplicateSelected={controller.duplicateSelectedEntry}
            onDuplicateEntry={controller.duplicateEntryById}
            onDeleteSelected={controller.removeSelectedEntry}
            onDeleteEntry={controller.removeEntryById}
            onNudgeSelected={controller.nudgeSelectedEntry}
            onCreateOverlay={controller.createOverlayAtMile}
          />
        </section>
      </main>
    </div>
  );
}
