import { closestCenter, DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { EffortBlockDragPayload, TierLabel, WorkoutBlockInstance } from "./builderTypes";
import TierColumn from "./TierColumn";
import WorkoutBlockInstanceCard from "./WorkoutBlockInstanceCard";

interface TierColumnsProps {
  showXXL?: boolean;
  tierBlocks: Record<TierLabel, WorkoutBlockInstance[]>;
  effortLookup: Record<string, EffortBlockDefinition>;
  availableEffortBlocks: EffortBlockDefinition[];
  onDropEffortBlock: (tier: TierLabel, payload: EffortBlockDragPayload) => void;
  onDeleteBlock: (tier: TierLabel, id: string) => void;
  onUpdateBlock: (tier: TierLabel, id: string, updates: Partial<WorkoutBlockInstance>) => void;
  onReorderBlocks: (tier: TierLabel, nextBlocks: WorkoutBlockInstance[]) => void;
  onMoveBlocks: (
    sourceTier: TierLabel,
    targetTier: TierLabel,
    nextSourceBlocks: WorkoutBlockInstance[],
    nextTargetBlocks: WorkoutBlockInstance[]
  ) => void;
  onCopyBlock: (sourceTier: TierLabel, blockIndex: number, targetTiers: TierLabel[]) => void;
  onCopyTier: (sourceTier: TierLabel, targetTiers: TierLabel[]) => void;
  isLocked: boolean;
}

const tierOrder: TierLabel[] = ["MED", "LRG", "XL", "XXL"];

export default function TierColumns({
  showXXL = false,
  tierBlocks,
  effortLookup,
  availableEffortBlocks,
  onDropEffortBlock,
  onDeleteBlock,
  onUpdateBlock,
  onReorderBlocks,
  onMoveBlocks,
  onCopyBlock,
  onCopyTier,
  isLocked,
}: TierColumnsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const containerIdMap = useMemo(() => {
    return tierOrder.reduce<Record<string, TierLabel>>((acc, tier) => {
      acc[`tier-${tier}`] = tier;
      return acc;
    }, {});
  }, []);

  const availableTiers = showXXL ? tierOrder : tierOrder.filter((tier) => tier !== "XXL");

  const findContainer = (id: string) => {
    if (id in containerIdMap) {
      return containerIdMap[id];
    }

    for (const tier of tierOrder) {
      if (tierBlocks[tier].some((block) => block.id === id)) {
        return tier;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdValue = String(active.id);
    const overIdValue = String(over.id);

    const activeContainer = findContainer(activeIdValue);
    const overContainer = findContainer(overIdValue);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const activeIndex = tierBlocks[activeContainer].findIndex((block) => block.id === activeIdValue);
      const overIndex = tierBlocks[overContainer].findIndex((block) => block.id === overIdValue);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;
      onReorderBlocks(activeContainer, arrayMove(tierBlocks[activeContainer], activeIndex, overIndex));
      return;
    }

    const sourceBlocks = tierBlocks[activeContainer];
    const targetBlocks = tierBlocks[overContainer];
    const activeIndex = sourceBlocks.findIndex((block) => block.id === activeIdValue);
    if (activeIndex === -1) return;

    const movingBlock = sourceBlocks[activeIndex];
    const nextSource = sourceBlocks.filter((block) => block.id !== activeIdValue);

    const overIndex = targetBlocks.findIndex((block) => block.id === overIdValue);
    const insertIndex = overIndex === -1 ? targetBlocks.length : overIndex;
    const nextTarget = [...targetBlocks];
    nextTarget.splice(insertIndex, 0, movingBlock);

    onMoveBlocks(activeContainer, overContainer, nextSource, nextTarget);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeBlock = activeId
    ? tierOrder
        .flatMap((tier) => tierBlocks[tier])
        .find((block) => block.id === activeId)
    : null;
  const activeEffort = activeBlock ? effortLookup[activeBlock.effortBlockId] : null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <section
        style={{
          display: "flex",
          gap: "16px",
          width: "100%",
          alignItems: "flex-start",
          padding: "8px",
          minHeight: "420px",
        }}
      >
        {availableTiers.map((tier) => {
          const blocks = tierBlocks[tier];
          const tierIndex = availableTiers.indexOf(tier);
          const nextTier = tierIndex >= 0 && tierIndex < availableTiers.length - 1
            ? availableTiers[tierIndex + 1]
            : null;
          const allNextTiers = tierIndex >= 0 ? availableTiers.slice(tierIndex + 1) : [];

          return (
            <SortableContext key={tier} items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <TierColumn
                label={tier}
                blocks={blocks}
                effortLookup={effortLookup}
                availableEffortBlocks={availableEffortBlocks}
                onDropEffortBlock={onDropEffortBlock}
                onDeleteBlock={onDeleteBlock}
                onUpdateBlock={onUpdateBlock}
                onReorderBlocks={onReorderBlocks}
                onCopyBlock={onCopyBlock}
                onCopyTier={onCopyTier}
                nextTier={nextTier}
                allNextTiers={allNextTiers}
                isLocked={isLocked}
                containerId={`tier-${tier}`}
              />
            </SortableContext>
          );
        })}
      </section>

      <DragOverlay>
        {activeBlock && activeEffort ? (
          <div style={{ transform: "scale(1.02)", zIndex: 9999 }}>
            <WorkoutBlockInstanceCard
              instance={activeBlock}
              effort={activeEffort}
              onDelete={() => undefined}
              onUpdate={() => undefined}
              isLocked
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
