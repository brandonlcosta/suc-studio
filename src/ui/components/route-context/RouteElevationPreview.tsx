import { useMemo } from "react";
import type { HighlightRange, RoutePoiMarker, TrackPoint } from "./routeContextTypes";
import { normalizeHighlightRange } from "./routeContextUtils";
import { getPoiIconMarkup } from "./poiIcons";

interface RouteElevationPreviewProps {
  track: TrackPoint[];
  poiMarkers: RoutePoiMarker[];
  highlightedRange: HighlightRange | null;
  height?: number;
  sectionAnchorPoiIds?: string[];
}

export default function RouteElevationPreview({
  track,
  poiMarkers,
  highlightedRange,
  height = 120,
  sectionAnchorPoiIds = [],
}: RouteElevationPreviewProps) {
  const normalizedRange = useMemo(
    () => normalizeHighlightRange(highlightedRange, track.length),
    [highlightedRange, track.length]
  );
  const anchorSet = useMemo(() => new Set(sectionAnchorPoiIds), [sectionAnchorPoiIds]);

  const elevationMetrics = useMemo(() => {
    if (track.length === 0) {
      return { points: "", min: 0, max: 1, span: 1, elevations: [] as Array<number | null> };
    }
    const elevations = track.map((point) => (Number.isFinite(point.ele) ? Number(point.ele) : null));
    const numeric = elevations.filter((value): value is number => value != null);
    const hasElevation = numeric.length > 0;
    const min = hasElevation ? Math.min(...numeric) : 0;
    const max = hasElevation ? Math.max(...numeric) : 1;
    const span = max - min || 1;
    const width = 100;
    const padding = 4;
    const usableWidth = width - padding * 2;
    const usableHeight = 40;

    const points = elevations.map((value, index) => {
      const x = padding + (index / Math.max(1, track.length - 1)) * usableWidth;
      const normalized = value == null ? 0.5 : 1 - (value - min) / span;
      const y = 8 + normalized * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return { points: points.join(" "), min, max, span, elevations };
  }, [track]);

  if (!track.length) {
    return (
      <div
        style={{
          height,
          borderRadius: "10px",
          border: "1px dashed #2a2f3a",
          background: "#0c111c",
          color: "#7e8798",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
        }}
      >
        Elevation preview unavailable.
      </div>
    );
  }

  const hasHighlight = Boolean(normalizedRange);
  const highlightStart =
    normalizedRange && track.length > 1 ? normalizedRange.startIndex / (track.length - 1) : 0;
  const highlightEnd =
    normalizedRange && track.length > 1 ? normalizedRange.endIndex / (track.length - 1) : 0;
  const highlightWidth = Math.max(0, highlightEnd - highlightStart);

  return (
    <div
      style={{
        height,
        borderRadius: "12px",
        border: "1px solid #1f2937",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(5, 8, 16, 0.95))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
        {hasHighlight && (
          <rect
            x={highlightStart * 100}
            y={0}
            width={highlightWidth * 100}
            height={56}
            fill="rgba(56, 189, 248, 0.08)"
          />
        )}
        {poiMarkers.map((poi, index) => {
          const pointIndex = Math.floor(Number(poi.routePointIndex));
          if (!Number.isFinite(pointIndex) || pointIndex < 0 || pointIndex >= track.length) return null;
          const x = (pointIndex / Math.max(1, track.length - 1)) * 100;
          const elevationValue = elevationMetrics.elevations?.[pointIndex];
          const normalizedElevation =
            typeof elevationValue === "number"
              ? 1 - (elevationValue - elevationMetrics.min) / elevationMetrics.span
              : 0.5;
          const y = 8 + normalizedElevation * 40;
          const isHighlighted =
            normalizedRange &&
            pointIndex >= normalizedRange.startIndex &&
            pointIndex <= normalizedRange.endIndex;
          const isAnchor = anchorSet.has(poi.id);
          const label = String(poi.title || poi.label || poi.id);
          const labelFontSize = isAnchor ? 7.8 : 6.6;
          const labelOpacity = isAnchor ? 0.95 : 0.55;
          const labelX = Math.max(2, Math.min(96, x + 2));
          const labelY = Math.max(8, Math.min(52, 12 + (index % 3) * 6));
          const iconMarkup = getPoiIconMarkup(poi.type);
          return (
            <g key={poi.id} opacity={isAnchor ? 1 : 0.6}>
              <line
                x1={x}
                x2={x}
                y1={0}
                y2={56}
                stroke={isHighlighted ? "rgba(248, 250, 252, 0.5)" : "rgba(148, 163, 184, 0.25)"}
                strokeWidth={isHighlighted ? 1.6 : 1}
              />
              <g transform={`translate(${x - 4.5}, ${y - 4.5})`} opacity={isAnchor ? 1 : 0.55}>
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  stroke="#f8fafc"
                  fill="none"
                  strokeWidth={isAnchor ? 2 : 1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: iconMarkup }}
                />
              </g>
              <g opacity={labelOpacity}>
                <rect
                  x={labelX - 2}
                  y={labelY - 6}
                  width={Math.min(42, Math.max(18, label.length * 4.2 + 8))}
                  height={9}
                  rx={4}
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke="rgba(148, 163, 184, 0.25)"
                />
                <text x={labelX} y={labelY} fontSize={labelFontSize} fill="#e2e8f0" textAnchor="start">
                  {label}
                </text>
              </g>
            </g>
          );
        })}
        <polyline
          points={elevationMetrics.points}
          fill="none"
          stroke="rgba(148, 163, 184, 0.85)"
          strokeWidth={2}
          opacity={hasHighlight ? 0.35 : 0.95}
        />
        {hasHighlight && normalizedRange && (
          <polyline
            points={elevationMetrics.points
              .split(" ")
              .slice(normalizedRange.startIndex, normalizedRange.endIndex + 1)
              .join(" ")}
            fill="none"
            stroke="rgba(56, 189, 248, 0.95)"
            strokeWidth={2.6}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#94a3b8",
        }}
      >
        Elevation
      </div>
    </div>
  );
}
