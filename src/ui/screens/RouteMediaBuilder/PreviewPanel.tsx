import type { PreviewCameraState, PreviewOverlayState } from "./previewEngine";
import type { PreviewFrameMetrics } from "./usePreviewPlayback";

type PreviewPanelProps = {
  isPlaying: boolean;
  progress: number;
  playbackSpeed: number;
  durationSeconds: number;
  currentSeconds: number;
  camera: PreviewCameraState | null;
  overlays: PreviewOverlayState;
  overlayFlags?: { showElevation?: boolean; showMetrics?: boolean; showPoiCallouts?: boolean };
  metrics: PreviewFrameMetrics;
  onPlayPause: () => void;
  onSeekProgress: (progress: number) => void;
  onReset: () => void;
  onStepFrame: () => void;
  onSetPlaybackSpeed: (speed: number) => void;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function PreviewPanel({
  isPlaying,
  progress,
  playbackSpeed,
  durationSeconds,
  currentSeconds,
  camera,
  overlays,
  overlayFlags,
  metrics,
  onPlayPause,
  onSeekProgress,
  onReset,
  onStepFrame,
  onSetPlaybackSpeed,
}: PreviewPanelProps) {
  const normalizedProgress = clamp01(progress);
  const activeCaption = overlays.activeCaptions?.[0] || null;

  return (
    <aside
      style={{
        width: "320px",
        minWidth: "320px",
        border: "1px solid #1f2937",
        borderRadius: "12px",
        background: "#0b1220",
        padding: "0.75rem",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr",
        gap: "0.65rem",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#e2e8f0" }}>
        Preview Engine (Simulation)
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button type="button" onClick={onPlayPause} style={buttonStyle("#1d4ed8", "#93c5fd")}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={onStepFrame} style={buttonStyle("#1e293b", "#cbd5e1")}>
            Step
          </button>
          <button type="button" onClick={onReset} style={buttonStyle("#1e293b", "#fca5a5")}>
            Reset
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={normalizedProgress}
          onChange={(event) => onSeekProgress(Number(event.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8" }}>
          <span>{formatTime(currentSeconds)}</span>
          <span>{formatTime(durationSeconds)}</span>
        </div>
        <div style={{ display: "grid", gap: "0.28rem" }}>
          <label style={{ fontSize: "0.65rem", color: "#64748b" }}>Playback Speed</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={playbackSpeed}
            onChange={(event) => onSetPlaybackSpeed(Number(event.target.value))}
          />
          <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{playbackSpeed.toFixed(1)}x</div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #1f2937",
          borderRadius: "8px",
          background: "#0f172a",
          padding: "0.5rem",
          fontSize: "0.69rem",
          color: "#cbd5e1",
          display: "grid",
          gap: "0.22rem",
        }}
      >
        <div>
          Camera: {camera?.mode || "n/a"} | zoom {camera?.zoom.toFixed(2) || "n/a"}
        </div>
        <div>
          Bearing: {camera?.bearing.toFixed(1) || "n/a"} | Pitch: {camera?.pitch.toFixed(1) || "n/a"}
        </div>
        <div>
          Overlays: Elevation {overlayFlags?.showElevation === false ? "OFF" : "ON"} · Metrics{" "}
          {overlayFlags?.showMetrics === false ? "OFF" : "ON"} · POIs{" "}
          {overlayFlags?.showPoiCallouts === false ? "OFF" : "ON"}
        </div>
        <div>Frame Avg: {metrics.avgFrameMs.toFixed(2)} ms</div>
      </div>

      <div
        style={{
          border: "1px solid #1f2937",
          borderRadius: "8px",
          background: "#020617",
          padding: "0.55rem",
          overflowY: "auto",
          display: "grid",
          alignContent: "start",
          gap: "0.55rem",
          position: "relative",
        }}
      >
        {activeCaption && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              alignSelf: "center",
              padding: "0.35rem 0.6rem",
              borderRadius: "10px",
              background: "rgba(2, 6, 23, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              color: "#f8fafc",
              fontSize: "0.72rem",
              textAlign: "center",
            }}
          >
            {activeCaption}
          </div>
        )}
        <div>
          <div style={sectionLabelStyle}>Active Titles</div>
          {overlays.activeTitles.length === 0 ? (
            <div style={emptyTextStyle}>No active title blocks</div>
          ) : (
            overlays.activeTitles.map((overlay) => (
              <div key={`title-${overlay.entryId}`} style={{ ...itemStyle, opacity: overlay.opacity }}>
                {overlay.text}
              </div>
            ))
          )}
        </div>

        <div>
          <div style={sectionLabelStyle}>POI Highlights</div>
          {overlays.activePois.length === 0 ? (
            <div style={emptyTextStyle}>No POIs in range</div>
          ) : (
            overlays.activePois.map((overlay) => (
              <div key={`poi-${overlay.entryId}`} style={{ ...itemStyle, opacity: overlay.opacity }}>
                {overlay.label} ({overlay.distanceMi.toFixed(2)} mi)
              </div>
            ))
          )}
        </div>

        <div>
          <div style={sectionLabelStyle}>Speed</div>
          {overlays.speedIndicator ? (
            <div style={itemStyle}>{overlays.speedIndicator.speedMiPerSec.toFixed(2)} mi/s</div>
          ) : (
            <div style={emptyTextStyle}>Default playback speed</div>
          )}
        </div>
      </div>
    </aside>
  );
}

function buttonStyle(background: string, color: string) {
  return {
    height: "28px",
    borderRadius: "7px",
    border: "1px solid #334155",
    background,
    color,
    fontSize: "0.72rem",
    padding: "0 0.6rem",
    cursor: "pointer",
  } as const;
}

const sectionLabelStyle = {
  fontSize: "0.66rem",
  color: "#94a3b8",
  marginBottom: "0.2rem",
} as const;

const itemStyle = {
  border: "1px solid #1e293b",
  borderRadius: "6px",
  background: "#0b1220",
  color: "#e2e8f0",
  fontSize: "0.7rem",
  padding: "0.3rem 0.35rem",
  marginBottom: "0.24rem",
} as const;

const emptyTextStyle = {
  color: "#64748b",
  fontSize: "0.67rem",
} as const;
