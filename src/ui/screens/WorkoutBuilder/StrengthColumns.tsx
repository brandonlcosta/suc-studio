import { closestCenter, DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import type { StrengthBlock } from "../../types";
import StrengthBlockCard from "./StrengthBlockCard";
import StrengthSortableBlock from "./StrengthSortableBlock";

export type StrengthLibraryPayload =
  | { domain: "strength"; type: "strength_exercise"; name: string }
  | { domain: "strength"; type: "circuit_block"; rounds?: number }
  | { domain: "strength"; type: "mobility_block"; name?: string; duration?: string }
  | {
      domain: "strength";
      type: "crosstrain_block";
      modality?: "bike" | "row" | "swim" | "elliptical" | "hike";
      duration?: string;
    };

interface StrengthColumnsProps {
  blocks: StrengthBlock[];
  isLocked: boolean;
  onReorderBlocks: (nextBlocks: StrengthBlock[]) => void;
  onDropStrengthBlock: (payload: StrengthLibraryPayload) => void;
  onDeleteBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: StrengthBlock) => void;
}

export default function StrengthColumns({
  blocks,
  isLocked,
  onReorderBlocks,
  onDropStrengthBlock,
  onDeleteBlock,
  onUpdateBlock,
}: StrengthColumnsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeBlock = useMemo(() => blocks.find((block) => block.id === activeId) ?? null, [blocks, activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id === "string") {
      setActiveId(event.active.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderBlocks(arrayMove(blocks, oldIndex, newIndex));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isLocked) return;
    event.preventDefault();
    const raw =
      event.dataTransfer.getData("application/x-suc-strength-block") ||
      event.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as StrengthLibraryPayload;
      if (payload.domain !== "strength") return;
      onDropStrengthBlock(payload);
    } catch {
      return;
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isLocked) return;
    event.preventDefault();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {blocks.map((block) => (
              <StrengthSortableBlock
                key={block.id}
                block={block}
                isLocked={isLocked}
                onDelete={onDeleteBlock}
                onUpdate={onUpdateBlock}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeBlock ? (
            <div style={{ width: "100%" }}>
              <StrengthBlockCard
                block={activeBlock}
                isLocked={true}
                onDelete={() => {}}
                onUpdate={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
