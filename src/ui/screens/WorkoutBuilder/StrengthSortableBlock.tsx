import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StrengthBlock } from "../../types";
import StrengthBlockCard from "./StrengthBlockCard";

interface StrengthSortableBlockProps {
  block: StrengthBlock;
  isLocked: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: StrengthBlock) => void;
}

export default function StrengthSortableBlock({
  block,
  isLocked,
  onDelete,
  onUpdate,
}: StrengthSortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StrengthBlockCard
        block={block}
        isLocked={isLocked}
        onDelete={onDelete}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
