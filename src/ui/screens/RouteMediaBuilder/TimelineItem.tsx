type TimelineItemProps = {
  id: string;
  label: string;
  topPx: number;
  leftPx: number;
  widthPx: number;
  laneColor: string;
  selected: boolean;
  hovered: boolean;
  previewActive?: boolean;
  invalid: boolean;
  invalidMessage?: string;
  attached?: boolean;
  locked?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onPointerDown: (id: string, clientX: number) => void;
  onResizeStart?: (id: string, clientX: number) => void;
  onResizeEnd?: (id: string, clientX: number) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
};

export default function TimelineItem({
  id,
  label,
  topPx,
  leftPx,
  widthPx,
  laneColor,
  selected,
  hovered,
  previewActive = false,
  invalid,
  invalidMessage,
  attached = false,
  locked = false,
  onSelect,
  onHover,
  onPointerDown,
  onResizeStart,
  onResizeEnd,
  onContextMenu,
}: TimelineItemProps) {
  const active = selected || hovered || previewActive;
  const border = invalid ? "1px solid #ef4444" : active ? `1px solid ${laneColor}` : "1px solid #334155";
  const background = invalid ? "#3f1d1d" : active ? "#1d3a5f" : "#122032";
  const opacity = locked ? 0.55 : 1;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onPointerDown={(event) => {
        if (locked) return;
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(id, event.clientX);
      }}
      onContextMenu={(event) => {
        if (!onContextMenu) return;
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(id, event.clientX, event.clientY);
      }}
      data-timeline-item="true"
      style={{
        position: "absolute",
        top: `${topPx}px`,
        left: `${leftPx}px`,
        width: `${Math.max(36, widthPx)}px`,
        height: "24px",
        borderRadius: "8px",
        border,
        background,
        color: "#f8fafc",
        cursor: locked ? "not-allowed" : "grab",
        textAlign: "left",
        padding: "0.1rem 0.35rem",
        fontSize: "0.68rem",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        opacity,
      }}
      title={invalidMessage ? `${label} - ${invalidMessage}` : label}
      aria-label={`Timeline item ${label}`}
    >
      {attached ? `@ ${label}` : label}
      {!locked && (
        <>
          <div
            data-timeline-handle="start"
            style={resizeHandleStyle("left")}
            onPointerDown={(event) => {
              if (!onResizeStart) return;
              event.preventDefault();
              event.stopPropagation();
              onResizeStart(id, event.clientX);
            }}
          />
          <div
            data-timeline-handle="end"
            style={resizeHandleStyle("right")}
            onPointerDown={(event) => {
              if (!onResizeEnd) return;
              event.preventDefault();
              event.stopPropagation();
              onResizeEnd(id, event.clientX);
            }}
          />
        </>
      )}
    </button>
  );
}

function resizeHandleStyle(side: "left" | "right") {
  return {
    position: "absolute",
    top: "3px",
    [side]: "3px",
    width: "6px",
    height: "18px",
    borderRadius: "999px",
    background: "rgba(226, 232, 240, 0.8)",
    cursor: "ew-resize",
  } as const;
}
