import { useDroppable } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { EffortBlockDefinition } from "./effortBlocks";
import type { EffortBlockDragPayload, LadderConfig, LadderDirection, TierLabel, WorkoutBlockInstance } from "./builderTypes";
import SortableBlock from "./SortableBlock";
import DurationInput from "./DurationInput";

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
  onAddLadder: (tier: TierLabel, config: LadderConfig) => void;
  onDeleteBlock: (tier: TierLabel, id: string) => void;
  onUpdateBlock: (tier: TierLabel, id: string, updates: Partial<WorkoutBlockInstance>) => void;
  onInsertAfterBlock: (tier: TierLabel, blockIndex: number, effortBlockId: string) => void;
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
  onAddLadder,
  onDeleteBlock,
  onUpdateBlock,
  onInsertAfterBlock,
  onReorderBlocks,
  onCopyBlock,
  onCopyTier,
  nextTier,
  allNextTiers,
  isLocked,
  containerId,
}: TierColumnProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLadderForm, setShowLadderForm] = useState(false);
  const [ladderState, setLadderState] = useState<Record<string, { expanded: boolean; direction: LadderDirection }>>({});
  const defaultEffortId = availableEffortBlocks[0]?.id ?? "interval";
  const [ladderConfig, setLadderConfig] = useState<LadderConfig>({
    effortBlockId: defaultEffortId,
    steps: ["30sec", "60sec", "90sec"],
    direction: "up",
    stepRest: "60sec",
    setRest: "2min",
    sets: 3,
  });
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
        setShowLadderForm(false);
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
    setShowLadderForm(false);
  };

  const handleAddLadder = () => {
    const trimmedSteps = ladderConfig.steps.map((step) => step.trim()).filter(Boolean);
    if (trimmedSteps.length === 0) return;
    const normalized: LadderConfig = {
      ...ladderConfig,
      effortBlockId: ladderConfig.effortBlockId || defaultEffortId,
      steps: trimmedSteps,
      sets: Math.max(1, Number.isFinite(ladderConfig.sets) ? ladderConfig.sets : 1),
    };
    onAddLadder(label, normalized);
    setShowAddMenu(false);
    setShowLadderForm(false);
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

  const resolveLadderState = (id: string) => {
    const existing = ladderState[id];
    if (existing) return existing;
    return { expanded: true, direction: "up" as LadderDirection };
  };

  const setLadderExpanded = (id: string, expanded: boolean) => {
    setLadderState((prev) => ({ ...prev, [id]: { ...resolveLadderState(id), expanded } }));
  };

  const setLadderDirection = (id: string, direction: LadderDirection) => {
    setLadderState((prev) => ({ ...prev, [id]: { ...resolveLadderState(id), direction } }));
  };

  const ladderGroups = (() => {
    const groups: Array<{ start: number; end: number }> = [];
    let index = 0;
    while (index < blocks.length) {
      const block = blocks[index];
      if (block && block.effortBlockId === "ladder") {
        let end = index;
        while (end + 1 < blocks.length && blocks[end + 1]?.effortBlockId === "ladder") {
          end += 1;
        }
        groups.push({ start: index, end });
        index = end + 1;
      } else {
        index += 1;
      }
    }
    return groups;
  })();

  const findLadderGroup = (index: number) => ladderGroups.find((group) => index >= group.start && index <= group.end);

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
        {(() => {
          const rendered: React.ReactNode[] = [];
          let index = 0;
          while (index < blocks.length) {
            const block = blocks[index];
            if (!block) {
              index += 1;
              continue;
            }
            const effort = effortLookup[block.effortBlockId];
            if (!effort) {
              index += 1;
              continue;
            }

            if (block.effortBlockId !== "ladder") {
              rendered.push(
                <SortableBlock
                  key={block.id}
                  instance={block}
                  effort={effort}
                  onDelete={(id) => onDeleteBlock(label, id)}
                  onUpdate={(id, updates) => onUpdateBlock(label, id, updates)}
                  onInsertAfter={(blockIndex, effortBlockId) => onInsertAfterBlock(label, blockIndex, effortBlockId)}
                  onCopyBlock={onCopyBlock}
                  blockIndex={index}
                  currentTier={label}
                  nextTier={nextTier}
                  allNextTiers={allNextTiers}
                  isLocked={isLocked}
                  containerId={label}
                />
              );
              index += 1;
              continue;
            }

            const ladderGroup = findLadderGroup(index);
            const start = ladderGroup?.start ?? index;
            const end = ladderGroup?.end ?? index;
            const ladderKey = blocks[start]?.id ?? block.id;
            const ladderSettings = resolveLadderState(ladderKey);
            const headerBlock = blocks[start];
            const headerEffort = effortLookup[headerBlock.effortBlockId] ?? effort;

            rendered.push(
              <div key={`ladder-group-${ladderKey}`} style={ladderGroupStyle}>
                <SortableBlock
                  instance={headerBlock}
                  effort={headerEffort}
                  onDelete={(id) => onDeleteBlock(label, id)}
                  onUpdate={(id, updates) => onUpdateBlock(label, id, updates)}
                  onInsertAfter={(blockIndex, effortBlockId) => onInsertAfterBlock(label, blockIndex, effortBlockId)}
                  onCopyBlock={onCopyBlock}
                  blockIndex={start}
                  currentTier={label}
                  nextTier={nextTier}
                  allNextTiers={allNextTiers}
                  isLocked={isLocked}
                  containerId={label}
                  insertAfterIndex={end}
                  showLadderControls
                  ladderDirection={ladderSettings.direction}
                  onChangeLadderDirection={(direction) => setLadderDirection(ladderKey, direction)}
                  onToggleExpand={() => setLadderExpanded(ladderKey, !ladderSettings.expanded)}
                  isExpanded={ladderSettings.expanded}
                />
                {ladderSettings.expanded && (
                  <div style={ladderChildrenStyle}>
                    {blocks.slice(start + 1, end + 1).map((childBlock, childIndex) => {
                      const childEffort = effortLookup[childBlock.effortBlockId];
                      if (!childEffort) return null;
                      const absoluteIndex = start + 1 + childIndex;
                      return (
                        <div key={childBlock.id} style={ladderChildItemStyle}>
                          <SortableBlock
                            instance={childBlock}
                            effort={childEffort}
                            onDelete={(id) => onDeleteBlock(label, id)}
                            onUpdate={(id, updates) => onUpdateBlock(label, id, updates)}
                            onInsertAfter={(blockIndex, effortBlockId) => onInsertAfterBlock(label, blockIndex, effortBlockId)}
                            onCopyBlock={onCopyBlock}
                            blockIndex={absoluteIndex}
                            currentTier={label}
                            nextTier={nextTier}
                            allNextTiers={allNextTiers}
                            isLocked={isLocked}
                            containerId={label}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );

            index = end + 1;
          }

          return rendered;
        })()}

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
                <div style={{ height: "1px", backgroundColor: "#2a2a2a", margin: "6px 0" }} />
                <button
                  type="button"
                  onClick={() => setShowLadderForm((prev) => !prev)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #3a3a3a",
                    backgroundColor: showLadderForm ? "#262626" : "transparent",
                    color: "#f5f5f5",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: "6px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Ladder
                </button>
                {showLadderForm && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={menuLabelStyle}>Effort</label>
                      <select
                        value={ladderConfig.effortBlockId}
                        onChange={(event) =>
                          setLadderConfig((prev) => ({ ...prev, effortBlockId: event.target.value }))
                        }
                        style={menuSelectStyle}
                      >
                        {availableEffortBlocks.map((block) => (
                          <option key={`ladder-effort-${block.id}`} value={block.id}>
                            {block.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={menuLabelStyle}>Steps</label>
                      {ladderConfig.steps.map((step, index) => (
                        <div key={`ladder-step-${index}`} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={menuHintStyle}>Step {index + 1}</span>
                          <DurationInput
                            value={step || null}
                            onChange={(value) => {
                              setLadderConfig((prev) => {
                                const nextSteps = [...prev.steps];
                                nextSteps[index] = value ?? "";
                                return { ...prev, steps: nextSteps };
                              });
                            }}
                            allowNull
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={menuLabelStyle}>Direction</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          { value: "up", label: "Up" },
                          { value: "down", label: "Down" },
                          { value: "updown", label: "Up + Down" },
                        ].map((option) => (
                          <label key={`ladder-direction-${option.value}`} style={menuRadioLabelStyle}>
                            <input
                              type="radio"
                              name={`ladder-direction-${label}`}
                              value={option.value}
                              checked={ladderConfig.direction === option.value}
                              onChange={() =>
                                setLadderConfig((prev) => ({
                                  ...prev,
                                  direction: option.value as LadderDirection,
                                }))
                              }
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={menuLabelStyle}>Sets</label>
                      <input
                        type="number"
                        min={1}
                        value={ladderConfig.sets}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          setLadderConfig((prev) => ({
                            ...prev,
                            sets: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
                          }));
                        }}
                        style={menuInputStyle}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={menuLabelStyle}>Rest Between Steps</label>
                      <DurationInput
                        value={ladderConfig.stepRest}
                        onChange={(value) =>
                          setLadderConfig((prev) => ({ ...prev, stepRest: value }))
                        }
                        allowNull
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={menuLabelStyle}>Rest Between Sets</label>
                      <DurationInput
                        value={ladderConfig.setRest}
                        onChange={(value) =>
                          setLadderConfig((prev) => ({ ...prev, setRest: value }))
                        }
                        allowNull
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddLadder}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #7cdb53",
                        backgroundColor: "rgba(124, 219, 83, 0.12)",
                        color: "#d7fbd0",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Insert Ladder
                    </button>
                  </div>
                )}
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

const menuLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "#c9c9c9",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const menuHintStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#8f8f8f",
};

const menuSelectStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #2b2b2b",
  backgroundColor: "#0b0b0b",
  color: "#f5f5f5",
  fontSize: "12px",
};

const menuInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #2b2b2b",
  backgroundColor: "#0b0b0b",
  color: "#f5f5f5",
  fontSize: "12px",
};

const menuRadioLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  color: "#e5e7eb",
};

const ladderGroupStyle: React.CSSProperties = {
  borderRadius: "14px",
  border: "1px solid rgba(52, 211, 153, 0.35)",
  backgroundColor: "rgba(15, 23, 42, 0.35)",
  padding: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const ladderChildrenStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const ladderChildItemStyle: React.CSSProperties = {
  marginLeft: "16px",
  borderLeft: "2px solid rgba(52, 211, 153, 0.3)",
  paddingLeft: "10px",
};
