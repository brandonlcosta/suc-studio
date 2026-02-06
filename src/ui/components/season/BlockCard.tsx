import type { DragEvent } from "react";
import type { BlockInstance, DayKey, Season, WeekInstance } from "../../../season";
import BlockHeader from "./BlockHeader";
import WeekList from "./WeekList";
import GhostBlockPreview from "./GhostBlockPreview";
import type { BlockTemplate, WeekPreset } from "./presets";

type WeekWithIndex = {
  blockId: string;
  week: WeekInstance;
  globalWeekIndex: number;
  weekStartDate: Date;
};

type DragPosition = "above" | "below" | null;

type BlockCardProps = {
  block: BlockInstance;
  blockIndex: number;
  totalBlocks: number;
  weeksWithIndex: WeekWithIndex[];
  markersByWeek: Map<number, Season["seasonMarkers"]>;
  isBusy: boolean;
  isSelected: boolean;
  selectedWeekId: string | null;
  selectedDayKey: DayKey | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  quickEditWeeks: boolean;
  registerBlockRef: (element: HTMLDivElement | null) => void;
  onSelectBlock: () => void;
  onSelectWeek: (weekId: string) => void;
  onSelectDay: (weekId: string, dayKey: DayKey) => void;
  onAddBlockAfter: () => void;
  onDeleteBlock: () => void;
  onMoveBlock: (newIndex: number) => void;
  onAddWeek: () => void;
  onRemoveWeek: (weekId: string) => void;
  onExtend: () => void;
  onShrink: () => void;
  onUpdateWeek: (weekId: string, patch: Partial<WeekInstance>) => void;
  onApplyTemplate: () => void;
  onRenameBlock: (name: string) => void;
  isDragging: boolean;
  dragOverPosition: DragPosition;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
  dragTemplate: BlockTemplate | null;
  dragTemplateTargeted: boolean;
  dragTemplateActive: boolean;
  weekPresetDrag: WeekPreset | null;
  weekPresetTargetId: string | null;
  isWeekPresetDragActive: boolean;
  onDragOverWeekPreset: (weekId: string) => void;
  onDropWeekPreset: (weekId: string) => void;
  getPresetLabelForWeek: (week: WeekInstance) => string | null;
  workoutLabels: Record<string, string>;
};

export default function BlockCard({
  block,
  blockIndex,
  totalBlocks,
  weeksWithIndex,
  markersByWeek,
  isBusy,
  isSelected,
  selectedWeekId,
  selectedDayKey,
  isCollapsed,
  onToggleCollapse,
  quickEditWeeks,
  registerBlockRef,
  onSelectBlock,
  onSelectWeek,
  onSelectDay,
  onAddBlockAfter,
  onDeleteBlock,
  onMoveBlock,
  onAddWeek,
  onRemoveWeek,
  onExtend,
  onShrink,
  onUpdateWeek,
  onApplyTemplate,
  onRenameBlock,
  isDragging,
  dragOverPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  dragTemplate,
  dragTemplateTargeted,
  dragTemplateActive,
  weekPresetDrag,
  weekPresetTargetId,
  isWeekPresetDragActive,
  onDragOverWeekPreset,
  onDropWeekPreset,
  getPresetLabelForWeek,
  workoutLabels,
}: BlockCardProps) {
  return (
    <div
      ref={registerBlockRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragEnd}
      style={{
        border: isSelected ? "1px solid #4b5563" : "1px solid #2f3642",
        borderRadius: "16px",
        padding: "1.25rem",
        backgroundColor: "#0f141c",
        boxShadow: isSelected ? "0 0 0 1px #4b5563 inset" : "0 0 0 1px #141a23 inset",
        position: "relative",
        opacity: isDragging ? 0.8 : 1,
      }}
    >
      {(dragOverPosition || dragTemplateTargeted) && (
        <div
          style={{
            position: "absolute",
            left: "12px",
            right: "12px",
            height: "2px",
            backgroundColor: "#60a5fa",
            top: dragOverPosition === "above" ? "6px" : "auto",
            bottom: dragOverPosition === "below" ? "6px" : "auto",
          }}
        />
      )}
      <BlockHeader
        block={block}
        blockIndex={blockIndex}
        totalBlocks={totalBlocks}
        isBusy={isBusy}
        isSelected={isSelected}
        onSelect={onSelectBlock}
        onAddBlockAfter={onAddBlockAfter}
        onDeleteBlock={onDeleteBlock}
        onMoveBlock={onMoveBlock}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        isDragging={isDragging}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onApplyTemplate={onApplyTemplate}
        onRenameBlock={onRenameBlock}
        dragTemplateActive={dragTemplateActive}
      />
      <div
        style={{
          height: "1px",
          margin: "1rem 0",
          backgroundColor: "#1f2733",
        }}
      />
      {dragTemplateTargeted && dragTemplate && (
        <GhostBlockPreview template={dragTemplate} widthWeeks={dragTemplate.weeks.length} />
      )}
      {!isCollapsed && (
        <>
          <WeekList
            weeksWithIndex={weeksWithIndex}
            markersByWeek={markersByWeek}
            isBusy={isBusy}
            selectedWeekId={selectedWeekId}
            selectedDayKey={selectedDayKey}
            onSelectWeek={onSelectWeek}
            onSelectDay={onSelectDay}
            onRemoveWeek={onRemoveWeek}
            onUpdateWeek={onUpdateWeek}
            quickEdit={quickEditWeeks}
            workoutLabels={workoutLabels}
            weekPresetDrag={weekPresetDrag}
            weekPresetTargetId={weekPresetTargetId}
            isWeekPresetDragActive={isWeekPresetDragActive}
            onDragOverWeekPreset={onDragOverWeekPreset}
            onDropWeekPreset={onDropWeekPreset}
            getPresetLabelForWeek={getPresetLabelForWeek}
          />
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={onShrink}
              disabled={isBusy}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#111827",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              - Week
            </button>
            <button
              onClick={onExtend}
              disabled={isBusy}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#111827",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              + Week
            </button>
            <button
              onClick={onAddWeek}
              disabled={isBusy}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#111827",
                color: "#f5f5f5",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              + Add Week
            </button>
          </div>
        </>
      )}
    </div>
  );
}
