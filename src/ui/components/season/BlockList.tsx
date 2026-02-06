import type { DragEvent } from "react";
import { useState } from "react";
import type { BlockInstance, DayKey, Season, WeekInstance } from "../../../season";
import BlockCard from "./BlockCard";
import type { BlockTemplate, WeekPreset } from "./presets";

type WeekWithIndex = {
  blockId: string;
  week: WeekInstance;
  globalWeekIndex: number;
  weekStartDate: Date;
};

type DragPosition = "above" | "below" | null;

type BlockListProps = {
  blocks: BlockInstance[];
  allWeeks: WeekWithIndex[];
  markersByWeek: Map<number, Season["seasonMarkers"]>;
  isBusy: boolean;
  selectedBlockId: string | null;
  selectedWeekId: string | null;
  selectedDayKey: DayKey | null;
  collapsedBlockIds: Set<string>;
  onToggleCollapse: (blockId: string) => void;
  quickEditWeeks: boolean;
  registerBlockRef: (blockId: string, element: HTMLDivElement | null) => void;
  onSelectBlock: (blockId: string) => void;
  onSelectWeek: (blockId: string, weekId: string) => void;
  onSelectDay: (blockId: string, weekId: string, dayKey: DayKey) => void;
  onAddBlockAfter: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, newIndex: number) => void;
  onAddWeek: (blockId: string) => void;
  onRemoveWeek: (blockId: string, weekId: string) => void;
  onExtendBlock: (blockId: string) => void;
  onShrinkBlock: (blockId: string) => void;
  onUpdateWeek: (blockId: string, weekId: string, patch: Partial<WeekInstance>) => void;
  onApplyTemplate: (blockId: string) => void;
  onRenameBlock: (blockId: string, name: string) => void;
  dragTemplate: BlockTemplate | null;
  dragTargetBlockId: string | null;
  onDragOverTemplate: (blockId: string) => void;
  onDropTemplate: () => void;
  dragTemplateActive: boolean;
  weekPresetDrag: WeekPreset | null;
  weekPresetTargetId: string | null;
  isWeekPresetDragActive: boolean;
  onDragOverWeekPreset: (weekId: string) => void;
  onDropWeekPreset: (weekId: string) => void;
  getPresetLabelForWeek: (week: WeekInstance) => string | null;
  workoutLabels: Record<string, string>;
};

export default function BlockList({
  blocks,
  allWeeks,
  markersByWeek,
  isBusy,
  selectedBlockId,
  selectedWeekId,
  selectedDayKey,
  collapsedBlockIds,
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
  onExtendBlock,
  onShrinkBlock,
  onUpdateWeek,
  onApplyTemplate,
  onRenameBlock,
  dragTemplate,
  dragTargetBlockId,
  onDragOverTemplate,
  onDropTemplate,
  dragTemplateActive,
  weekPresetDrag,
  weekPresetTargetId,
  isWeekPresetDragActive,
  onDragOverWeekPreset,
  onDropWeekPreset,
  getPresetLabelForWeek,
  workoutLabels,
}: BlockListProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPosition>(null);

  const handleDragStart = (blockId: string) => {
    if (isBusy || dragTemplateActive || isWeekPresetDragActive) return;
    setDraggingId(blockId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDragOver = (blockId: string, event: DragEvent<HTMLDivElement>) => {
    if (dragTemplateActive) {
      event.preventDefault();
      onDragOverTemplate(blockId);
      return;
    }
    if (isBusy || draggingId === null || draggingId === blockId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = event.clientY < midpoint ? "above" : "below";
    setDragOverId(blockId);
    setDragPosition(position);
  };

  const handleDrop = (blockId: string) => {
    if (dragTemplateActive) {
      onDropTemplate();
      return;
    }
    if (isBusy || draggingId === null) return;
    if (draggingId === blockId) {
      handleDragEnd();
      return;
    }

    const fromIndex = blocks.findIndex((block) => block.blockId === draggingId);
    const toIndexRaw = blocks.findIndex((block) => block.blockId === blockId);
    if (fromIndex < 0 || toIndexRaw < 0) {
      handleDragEnd();
      return;
    }

    let toIndex = dragPosition === "below" ? toIndexRaw + 1 : toIndexRaw;
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    if (fromIndex !== toIndex) {
      onMoveBlock(draggingId, toIndex);
    }

    handleDragEnd();
  };

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      {blocks.map((block, blockIndex) => (
        <BlockCard
          key={block.blockId}
          block={block}
          blockIndex={blockIndex}
          totalBlocks={blocks.length}
          weeksWithIndex={allWeeks.filter((item) => item.blockId === block.blockId)}
          markersByWeek={markersByWeek}
          isBusy={isBusy}
          isSelected={selectedBlockId === block.blockId}
          selectedWeekId={selectedWeekId}
          selectedDayKey={selectedDayKey}
          isCollapsed={collapsedBlockIds.has(block.blockId)}
          onToggleCollapse={() => onToggleCollapse(block.blockId)}
          quickEditWeeks={quickEditWeeks}
          registerBlockRef={(element) => registerBlockRef(block.blockId, element)}
          onSelectBlock={() => onSelectBlock(block.blockId)}
          onSelectWeek={(weekId) => onSelectWeek(block.blockId, weekId)}
          onSelectDay={(weekId, dayKey) => onSelectDay(block.blockId, weekId, dayKey)}
          onAddBlockAfter={() => onAddBlockAfter(block.blockId)}
          onDeleteBlock={() => onDeleteBlock(block.blockId)}
          onMoveBlock={(newIndex) => onMoveBlock(block.blockId, newIndex)}
          onAddWeek={() => onAddWeek(block.blockId)}
          onRemoveWeek={(weekId) => onRemoveWeek(block.blockId, weekId)}
          onExtend={() => onExtendBlock(block.blockId)}
          onShrink={() => onShrinkBlock(block.blockId)}
          onUpdateWeek={(weekId, patch) => onUpdateWeek(block.blockId, weekId, patch)}
          onApplyTemplate={() => onApplyTemplate(block.blockId)}
          onRenameBlock={(name) => onRenameBlock(block.blockId, name)}
          isDragging={draggingId === block.blockId}
          dragOverPosition={dragOverId === block.blockId ? dragPosition : null}
          onDragStart={() => handleDragStart(block.blockId)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOver(block.blockId, event)}
          onDrop={() => handleDrop(block.blockId)}
          dragTemplate={dragTemplate}
          dragTemplateTargeted={dragTargetBlockId === block.blockId}
          dragTemplateActive={dragTemplateActive}
          weekPresetDrag={weekPresetDrag}
          weekPresetTargetId={weekPresetTargetId}
          isWeekPresetDragActive={isWeekPresetDragActive}
          onDragOverWeekPreset={onDragOverWeekPreset}
          onDropWeekPreset={onDropWeekPreset}
          getPresetLabelForWeek={getPresetLabelForWeek}
          workoutLabels={workoutLabels}
        />
      ))}
    </section>
  );
}
