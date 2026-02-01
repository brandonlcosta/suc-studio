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
          onCopyBlock={(index, tiers) => onCopyBlock(currentTier, index, tiers)}
          isLocked={isLocked}
          dragHandleProps={{ ...attributes, ...listeners }}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}
