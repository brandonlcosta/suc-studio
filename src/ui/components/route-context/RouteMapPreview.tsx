import { useMemo } from "react";
import type { HighlightRange, RoutePoiMarker, TrackPoint } from "./routeContextTypes";
import { normalizeHighlightRange, projectTrack } from "./routeContextUtils";
import { getPoiIconMarkup } from "./poiIcons";

interface RouteMapPreviewProps {
  track: TrackPoint[];
  pois: RoutePoiMarker[];
  highlightedRange: HighlightRange | null;
  height?: number;
  sectionAnchorPoiIds?: string[];
}

export default function RouteMapPreview({
  track,
  pois,
  highlightedRange,
  height = 160,
  sectionAnchorPoiIds = [],
}: RouteMapPreviewProps) {
  const { points, coords } = useMemo(() => projectTrack(track), [track]);
  const normalizedRange = useMemo(
    () => normalizeHighlightRange(highlightedRange, track.length),
    [highlightedRange, track.length]
  );
  const anchorSet = useMemo(() => new Set(sectionAnchorPoiIds), [sectionAnchorPoiIds]);

  const highlightPoints = useMemo(() => {
    if (!normalizedRange || coords.length === 0) return "";
    const slice = coords.slice(normalizedRange.startIndex, normalizedRange.endIndex + 1);
    return slice.map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`).join(" ");
  }, [coords, normalizedRange]);

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
        Route preview unavailable.
      </div>
    );
  }

  const hasHighlight = Boolean(normalizedRange);
  const baseOpacity = hasHighlight ? 0.2 : 0.9;

  return (
    <div
      style={{
        height,
        borderRadius: "12px",
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
          stroke="rgba(148, 163, 184, 0.9)"
          strokeWidth={2}
          opacity={baseOpacity}
        />
        {hasHighlight && highlightPoints && (
          <polyline
            points={highlightPoints}
            fill="none"
            stroke="rgba(56, 189, 248, 0.95)"
            strokeWidth={3}
          />
        )}
        {pois.map((poi, index) => {
          const pointIndex = Math.floor(Number(poi.routePointIndex));
          if (!Number.isFinite(pointIndex) || pointIndex < 0 || pointIndex >= coords.length) return null;
          const coord = coords[pointIndex];
          const isHighlighted =
            normalizedRange &&
            pointIndex >= normalizedRange.startIndex &&
            pointIndex <= normalizedRange.endIndex;
          const isAnchor = anchorSet.has(poi.id);
          const label = String(poi.title || poi.label || poi.id);
          const iconMarkup = getPoiIconMarkup(poi.type);
          const labelFontSize = isAnchor ? 8.8 : 7.4;
          const labelOpacity = isAnchor ? 0.95 : 0.55;
          const labelYOffset = isAnchor ? -4 : -2;
          const labelX = Math.max(4, Math.min(96, coord.x + 4));
          const labelY = Math.max(6, Math.min(56, coord.y + labelYOffset - (index % 3) * 2));
          return (
            <g key={poi.id} opacity={isAnchor ? 1 : 0.6}>
              <circle
                cx={coord.x}
                cy={coord.y}
                r={isHighlighted ? 2.8 : isAnchor ? 2.5 : 2.1}
                fill={isAnchor ? "#38bdf8" : "#64748b"}
                stroke={isHighlighted ? "#f8fafc" : "#0f172a"}
                strokeWidth={isHighlighted ? 1.2 : 0.6}
              />
              <g transform={`translate(${coord.x - 4.5}, ${coord.y - 4.5})`} opacity={isAnchor ? 1 : 0.55}>
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
                  x={labelX - 3}
                  y={labelY - 7}
                  width={Math.min(42, Math.max(18, label.length * 4.2 + 8))}
                  height={10}
                  rx={4}
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke="rgba(148, 163, 184, 0.25)"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={labelFontSize}
                  fill="#e2e8f0"
                  textAnchor="start"
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}
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
        Route Map
      </div>
    </div>
  );
}
