import { useDroppable } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { EffortBlockDragPayload, TierLabel, WorkoutBlockInstance } from "./builderTypes";
import SortableBlock from "./SortableBlock";

const tierAccents: Record<TierLabel, { border: string; text: string }> = {
  MED: { border: "#7cdb53", text: "#7cdb53" },
  LRG: { border: "#33d0ff", text: "#33d0ff" },
  XL: { border: "#bb63ff", text: "#bb63ff" },
  XXL: { border: "#f7c948", text: "#f7c948" },
};

interface TierColumnProps {
  label: TierLabel;
  isHidden?: boolean;
  blocks: WorkoutBlockInstance[];
  effortLookup: Record<string, EffortBlockDefinition>;
  availableEffortBlocks: EffortBlockDefinition[];
  onDropEffortBlock: (tier: TierLabel, payload: EffortBlockDragPayload) => void;
  onDeleteBlock: (tier: TierLabel, id: string) => void;
  onUpdateBlock: (tier: TierLabel, id: string, updates: Partial<WorkoutBlockInstance>) => void;
  onReorderBlocks: (tier: TierLabel, nextBlocks: WorkoutBlockInstance[]) => void;
  onCopyBlock: (sourceTier: TierLabel, blockIndex: number, targetTiers: TierLabel[]) => void;
  onCopyTier: (sourceTier: TierLabel, targetTiers: TierLabel[]) => void;
  nextTier: TierLabel | null;
  allNextTiers: TierLabel[];
  isLocked: boolean;
  containerId: string;
}

export default function TierColumn({
  label,
  isHidden,
  blocks,
  effortLookup,
  availableEffortBlocks,
  onDropEffortBlock,
  onDeleteBlock,
  onUpdateBlock,
  onReorderBlocks,
  onCopyBlock,
  onCopyTier,
  nextTier,
  allNextTiers,
  isLocked,
  containerId,
}: TierColumnProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { containerId: label },
    disabled: isLocked,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddMenu]);

  const handleAddBlock = (effortBlockId: string) => {
    const effortBlock = availableEffortBlocks.find((block) => block.id === effortBlockId);
    if (!effortBlock) return;

    onDropEffortBlock(label, {
      effortBlockId: effortBlock.id,
      label: effortBlock.label,
      target: effortBlock.target,
      accent: effortBlock.accent,
    });
    setShowAddMenu(false);
  };

  const handleCopyTierNext = () => {
    if (nextTier) {
      onCopyTier(label, [nextTier]);
    }
  };

  const handleCopyTierAll = () => {
    if (allNextTiers.length > 0) {
      onCopyTier(label, allNextTiers);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isLocked) return;
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isLocked) return;
    event.preventDefault();
    const rawPayload =
      event.dataTransfer.getData("application/x-suc-effort-block") ||
      event.dataTransfer.getData("application/json");
    if (!rawPayload) return;

    try {
      const payload = JSON.parse(rawPayload) as EffortBlockDragPayload;
      if (!payload.effortBlockId) return;
      onDropEffortBlock(label, payload);
    } catch {
      return;
    }
  };

  return (
    <div
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minWidth: "220px",
        border: "1px solid #2a2f3a",
        borderRadius: "16px",
        backgroundColor: "#0f1115",
        display: isHidden ? "none" : "flex",
        flexDirection: "column",
        padding: "10px",
        boxShadow: isOver ? "0 0 0 1px rgba(255,255,255,0.2)" : "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "8px 0 12px" }}>
        <div
          style={{
            padding: "6px 18px",
            borderRadius: "999px",
            border: `2px solid ${tierAccents[label].border}`,
            color: tierAccents[label].text,
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.6px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {!isLocked && allNextTiers.length > 0 && (
          <div style={{ display: "flex", gap: "6px" }}>
            {nextTier && (
              <button
                type="button"
                onClick={handleCopyTierNext}
                style={tierCopyButtonStyle}
              >
                Copy Next
              </button>
            )}
            {allNextTiers.length > 1 && (
              <button
                type="button"
                onClick={handleCopyTierAll}
                style={tierCopyButtonStyle}
              >
                Copy All
              </button>
            )}
          </div>
        )}
        {(isLocked || allNextTiers.length === 0) && label == "XL" && (
          <div style={{ height: "18px" }} />
        )}
      </div>
      <div
        style={{
          padding: "4px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {blocks.map((block, index) => {
          const effort = effortLookup[block.effortBlockId];
          if (!effort) return null;
          return (
            <SortableBlock
              key={block.id}
              instance={block}
              effort={effort}
              onDelete={(id) => onDeleteBlock(label, id)}
              onUpdate={(id, updates) => onUpdateBlock(label, id, updates)}
              onCopyBlock={onCopyBlock}
              blockIndex={index}
              currentTier={label}
              nextTier={nextTier}
              allNextTiers={allNextTiers}
              isLocked={isLocked}
              containerId={label}
            />
          );
        })}

        {!isLocked && (
          <div ref={menuRef} style={{ display: "flex", justifyContent: "center", marginTop: "8px", position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid #3a3a3a",
                backgroundColor: "transparent",
                color: "#888",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = tierAccents[label].border;
                e.currentTarget.style.color = tierAccents[label].text;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.color = "#888";
              }}
              title="Add block"
            >
              +
            </button>

            {showAddMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "40px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  padding: "8px",
                  minWidth: "180px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                }}
              >
                {availableEffortBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => handleAddBlock(block.id)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#f5f5f5",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "6px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#2a2a2a";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: block.accent,
                      }}
                    />
                    {block.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const tierCopyButtonStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: "999px",
  border: "1px solid #3a3a3a",
  backgroundColor: "transparent",
  color: "#b3b3b3",
  fontSize: "9px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};
