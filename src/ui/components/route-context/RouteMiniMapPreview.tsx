import { useMemo } from "react";
import type { HighlightRange, TrackPoint } from "./routeContextTypes";
import { normalizeHighlightRange, projectTrack } from "./routeContextUtils";

interface RouteMiniMapPreviewProps {
  track: TrackPoint[];
  highlightedRange: HighlightRange | null;
}

export default function RouteMiniMapPreview({ track, highlightedRange }: RouteMiniMapPreviewProps) {
  const normalizedRange = useMemo(
    () => normalizeHighlightRange(highlightedRange, track.length),
    [highlightedRange, track.length]
  );

  const slicedTrack = useMemo(() => {
    if (!normalizedRange) return [];
    return track.slice(normalizedRange.startIndex, normalizedRange.endIndex + 1);
  }, [track, normalizedRange]);

  const { points } = useMemo(() => projectTrack(slicedTrack), [slicedTrack]);

  if (!normalizedRange || !slicedTrack.length) {
    return (
      <div
        style={{
          height: 80,
          borderRadius: "8px",
          border: "1px dashed #2a2f3a",
          background: "#0c111c",
          color: "#7e8798",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
        }}
      >
        Preview unavailable.
      </div>
    );
  }

  return (
    <div
      style={{
        height: 80,
        borderRadius: "10px",
        border: "1px solid #1f2937",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.85), rgba(5, 8, 16, 0.95))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
        <polyline
          points={points}
          fill="none"
          stroke="rgba(56, 189, 248, 0.95)"
          strokeWidth={2.4}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 8,
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#cbd5f5",
        }}
      >
        Preview
      </div>
    </div>
  );
}
