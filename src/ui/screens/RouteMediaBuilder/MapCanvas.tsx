import { lazy, Suspense, useEffect, useState } from "react";
import type { RouteLabel } from "../../types";
import type { PreviewCameraState } from "./previewEngine";
import type { OverlayType } from "./overlays";

const SimpleRouteMap = lazy(() => import("../../components/SimpleRouteMap"));

type TimelineMarkerPoi = {
  id: string;
  type: "workout";
  title: string;
  label: string;
  routePointIndex: number;
};

type MapCanvasProps = {
  routeGroupId: string;
  activeVariant: RouteLabel | null;
  markers: TimelineMarkerPoi[];
  scrubIndicator: { lat: number; lon: number } | null;
  previewCamera: PreviewCameraState | null;
  selectedEntryId: string | null;
  hoveredEntryId: string | null;
  onCreateOverlayAtMile: (type: OverlayType, mile: number) => void;
  onEntrySelect: (entryId: string) => void;
  onEntryHover: (entryId: string | null) => void;
  onEntryDrag: (entryId: string, lat: number, lon: number) => void;
};

export default function MapCanvas({
  routeGroupId,
  activeVariant,
  markers,
  scrubIndicator,
  previewCamera,
  selectedEntryId,
  hoveredEntryId,
  onCreateOverlayAtMile,
  onEntrySelect,
  onEntryHover,
  onEntryDrag,
}: MapCanvasProps) {
  const hasRouteContext = Boolean(routeGroupId && activeVariant);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; mile: number } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("blur", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("blur", handleClose);
    };
  }, [contextMenu]);

  return (
    <div style={{ height: "100%", minHeight: "420px", position: "relative" }}>
      <Suspense fallback={<div style={{ padding: "1rem", color: "#94a3b8" }}>Loading map...</div>}>
        <SimpleRouteMap
          routeGroupId={routeGroupId}
          variant={activeVariant ?? undefined}
          variants={activeVariant ? [activeVariant] : []}
          pois={markers}
          activePoiId={selectedEntryId}
          highlightedPoiId={hoveredEntryId}
          allowPoiDrag={hasRouteContext}
          basemap="topo"
          enableHoverHud={true}
          height="100%"
          minHeight="420px"
          onMapClick={(payload) => {
            if (!payload.snap) return;
            onCreateOverlayAtMile("poi", payload.snap.cumulativeMi);
          }}
          onMapContextMenu={(payload) => {
            if (!payload.snap) return;
            const screen = payload.screen || { x: 12, y: 12 };
            setContextMenu({
              x: screen.x,
              y: screen.y,
              mile: payload.snap.cumulativeMi,
            });
          }}
          onPoiSelect={onEntrySelect}
          onPoiHover={onEntryHover}
          snapIndicator={scrubIndicator}
          focusTarget={
            previewCamera
              ? {
                  lat: previewCamera.lat,
                  lon: previewCamera.lon,
                  zoom: previewCamera.zoom,
                  bearing: previewCamera.bearing,
                  pitch: previewCamera.pitch,
                  immediate: true,
                  id: `preview:${previewCamera.mile.toFixed(4)}`,
                }
              : null
          }
          onPoiDragEnd={(entryId, position) => {
            onEntryDrag(entryId, position.lat, position.lon);
          }}
        />
      </Suspense>
      {contextMenu && (
        <div
          style={{
            position: "absolute",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: "#0b1220",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "0.4rem",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.5)",
            zIndex: 10,
            display: "grid",
            gap: "0.3rem",
            minWidth: "150px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onCreateOverlayAtMile("poi", contextMenu.mile);
              setContextMenu(null);
            }}
            style={contextMenuButton}
          >
            Add POI Here
          </button>
          <button
            type="button"
            onClick={() => {
              onCreateOverlayAtMile("title", contextMenu.mile);
              setContextMenu(null);
            }}
            style={contextMenuButton}
          >
            Add Title Here
          </button>
          <button
            type="button"
            onClick={() => {
              onCreateOverlayAtMile("camera", contextMenu.mile);
              setContextMenu(null);
            }}
            style={contextMenuButton}
          >
            Add Camera Keyframe Here
          </button>
        </div>
      )}
      {!hasRouteContext && (
        <div
          style={{
            position: "absolute",
            inset: "0 auto auto 0",
            margin: "0.75rem",
            padding: "0.45rem 0.65rem",
            borderRadius: "8px",
            border: "1px solid #7c2d12",
            background: "rgba(28, 12, 4, 0.88)",
            color: "#fdba74",
            fontSize: "0.75rem",
            pointerEvents: "none",
          }}
        >
          Pick a route and variant to place cinematic markers.
        </div>
      )}
    </div>
  );
}

const contextMenuButton = {
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: "6px",
  padding: "0.3rem 0.5rem",
  fontSize: "0.68rem",
  textAlign: "left",
  cursor: "pointer",
} as const;
