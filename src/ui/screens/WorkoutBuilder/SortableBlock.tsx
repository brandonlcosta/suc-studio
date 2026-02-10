import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { TierLabel, WorkoutBlockInstance } from "./builderTypes";
import WorkoutBlockInstanceCard from "./WorkoutBlockInstanceCard";

interface SortableBlockProps {
  instance: WorkoutBlockInstance;
  effort: EffortBlockDefinition;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<WorkoutBlockInstance>) => void;
  onInsertAfter: (blockIndex: number, effortBlockId: string) => void;
  insertAfterIndex?: number;
  showLadderControls?: boolean;
  ladderDirection?: "up" | "down" | "updown";
  onChangeLadderDirection?: (direction: "up" | "down" | "updown") => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  isHidden?: boolean;
  isLadderChild?: boolean;
  onCopyBlock: (sourceTier: TierLabel, blockIndex: number, targetTiers: TierLabel[]) => void;
  blockIndex: number;
  currentTier: TierLabel;
  nextTier: TierLabel | null;
  allNextTiers: TierLabel[];
  isLocked: boolean;
  containerId: TierLabel;
}

export default function SortableBlock({
  instance,
  effort,
  onDelete,
  onUpdate,
  onInsertAfter,
  insertAfterIndex,
  showLadderControls,
  ladderDirection,
  onChangeLadderDirection,
  onToggleExpand,
  isExpanded,
  isHidden = false,
  isLadderChild = false,
  onCopyBlock,
  blockIndex,
  currentTier,
  nextTier,
  allNextTiers,
  isLocked,
  containerId,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: instance.id,
    disabled: isLocked,
    data: { containerId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? "0 12px 26px rgba(0, 0, 0, 0.35)" : "none",
    zIndex: isDragging ? 50 : "auto",
    position: "relative",
    display: isHidden ? "none" : "block",
    marginLeft: isLadderChild ? "14px" : undefined,
    borderLeft: isLadderChild ? "2px solid rgba(255,255,255,0.08)" : undefined,
    paddingLeft: isLadderChild ? "10px" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ boxShadow: isOver && !isDragging ? "0 -2px 0 0 rgba(255,255,255,0.35)" : "none" }}>
        <WorkoutBlockInstanceCard
          instance={instance}
          effort={effort}
          blockIndex={blockIndex}
          nextTier={nextTier}
          allNextTiers={allNextTiers}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onInsertAfter={onInsertAfter}
          insertAfterIndex={insertAfterIndex}
          showLadderControls={showLadderControls}
          ladderDirection={ladderDirection}
          onChangeLadderDirection={onChangeLadderDirection}
          onToggleExpand={onToggleExpand}
          isExpanded={isExpanded}
          onCopyBlock={(index, tiers) => onCopyBlock(currentTier, index, tiers)}
          isLocked={isLocked}
          dragHandleProps={{ ...attributes, ...listeners }}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}
