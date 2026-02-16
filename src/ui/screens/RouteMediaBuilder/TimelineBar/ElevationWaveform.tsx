import { memo, useEffect, useRef } from "react";
import type { ElevationAnchor, ElevationColumn } from "../timelineElevation";

type ElevationWaveformProps = {
  width: number;
  height: number;
  columns: ElevationColumn[];
  cursorX: number | null;
  anchorXs: Array<{ kind: ElevationAnchor["kind"]; x: number }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function elevationColorForGrade(gradeDelta: number): string {
  if (gradeDelta > 0.01) return "rgba(248, 113, 113, 0.58)";
  if (gradeDelta < -0.01) return "rgba(125, 211, 252, 0.58)";
  return "rgba(148, 163, 184, 0.52)";
}

function ElevationWaveformInner({ width, height, columns, cursorX, anchorXs }: ElevationWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    canvas.width = Math.floor(safeWidth * dpr);
    canvas.height = Math.floor(safeHeight * dpr);
    canvas.style.width = `${safeWidth}px`;
    canvas.style.height = `${safeHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    raf = window.requestAnimationFrame(() => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, safeWidth, safeHeight);
      ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
      ctx.fillRect(0, 0, safeWidth, safeHeight);

      if (!columns.length) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("Elevation unavailable for this route variant.", safeWidth / 2, safeHeight / 2);
        return;
      }

      let minElevation = Number.POSITIVE_INFINITY;
      let maxElevation = Number.NEGATIVE_INFINITY;
      for (const column of columns) {
        minElevation = Math.min(minElevation, column.minElevation);
        maxElevation = Math.max(maxElevation, column.maxElevation);
      }

      const elevationSpan = Math.max(1e-6, maxElevation - minElevation);
      const topPadding = 10;
      const bottomPadding = 20;
      const drawableHeight = Math.max(1, safeHeight - topPadding - bottomPadding);

      const toY = (elevation: number) => {
        const normalized = (elevation - minElevation) / elevationSpan;
        return topPadding + (1 - normalized) * drawableHeight;
      };

      // Draw bucket min/max vertical columns with grade tint.
      for (const column of columns) {
        const x = clamp(column.x, 0, safeWidth - 1);
        const yMin = toY(column.minElevation);
        const yMax = toY(column.maxElevation);
        ctx.strokeStyle = elevationColorForGrade(column.gradeDelta);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yMin);
        ctx.lineTo(x + 0.5, yMax);
        ctx.stroke();
      }

      // Draw a smoothed centerline over the bucket range.
      const centerPoints = columns.map((column) => ({
        x: clamp(column.x, 0, safeWidth - 1),
        y: toY((column.minElevation + column.maxElevation) / 2),
      }));
      if (centerPoints.length > 1) {
        ctx.strokeStyle = "rgba(241, 245, 249, 0.52)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(centerPoints[0].x, centerPoints[0].y);
        for (let index = 1; index < centerPoints.length; index += 1) {
          const prev = centerPoints[index - 1];
          const curr = centerPoints[index];
          const cx = (prev.x + curr.x) / 2;
          const cy = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
        }
        const last = centerPoints[centerPoints.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      // Draw snap anchors.
      for (const anchor of anchorXs) {
        const x = clamp(anchor.x, 0, safeWidth - 1);
        ctx.strokeStyle =
          anchor.kind === "summit" ? "rgba(251, 113, 133, 0.65)" : "rgba(125, 211, 252, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 2);
        ctx.lineTo(x + 0.5, safeHeight - 2);
        ctx.stroke();
      }

      if (cursorX !== null && Number.isFinite(cursorX)) {
        const x = clamp(cursorX, 0, safeWidth - 1);
        ctx.strokeStyle = "rgba(250, 204, 21, 0.92)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, safeHeight);
        ctx.stroke();
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [width, height, columns, cursorX, anchorXs]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}

const ElevationWaveform = memo(ElevationWaveformInner);
export default ElevationWaveform;
