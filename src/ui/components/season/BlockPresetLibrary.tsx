import type { CSSProperties } from "react";
import { useState } from "react";
import type { BlockTemplate, WeekPreset } from "./presets";
import TrainingBlockLibrary from "./TrainingBlockLibrary";
import WeekPresetLibrary from "./WeekPresetLibrary";

type BlockPresetLibraryProps = {
  weekPresets: WeekPreset[];
  blockTemplates: BlockTemplate[];
  selectedBlockTemplateId: string | null;
  onSelectBlockTemplate: (id: string) => void;
  onInsertBlockTemplate: (template: BlockTemplate) => void;
  onDragStartBlockTemplate: (template: BlockTemplate) => void;
  onDragEndBlockTemplate: () => void;
  onDragStartWeekPreset: (preset: WeekPreset) => void;
  onDragEndWeekPreset: () => void;
  isBusy: boolean;
};

export default function BlockPresetLibrary({
  weekPresets,
  blockTemplates,
  selectedBlockTemplateId,
  onSelectBlockTemplate,
  onInsertBlockTemplate,
  onDragStartBlockTemplate,
  onDragEndBlockTemplate,
  onDragStartWeekPreset,
  onDragEndWeekPreset,
  isBusy,
}: BlockPresetLibraryProps) {
  const [activeTab, setActiveTab] = useState<"weeks" | "blocks">("weeks");

  return (
    <aside style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>Library</div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("weeks")}
          style={{
            ...tabStyle,
            borderColor: activeTab === "weeks" ? "#e5e7eb" : "#1f2937",
            backgroundColor: activeTab === "weeks" ? "#111827" : "#0b1220",
          }}
        >
          Week Presets
        </button>
        <button
          onClick={() => setActiveTab("blocks")}
          style={{
            ...tabStyle,
            borderColor: activeTab === "blocks" ? "#e5e7eb" : "#1f2937",
            backgroundColor: activeTab === "blocks" ? "#111827" : "#0b1220",
          }}
        >
          Training Blocks
        </button>
      </div>
      <div style={{ marginTop: "0.75rem" }}>
        {activeTab === "weeks" ? (
          <WeekPresetLibrary
            presets={weekPresets}
            onDragStart={onDragStartWeekPreset}
            onDragEnd={onDragEndWeekPreset}
            isBusy={isBusy}
          />
        ) : (
          <TrainingBlockLibrary
            templates={blockTemplates}
            selectedId={selectedBlockTemplateId}
            onSelect={onSelectBlockTemplate}
            onInsert={onInsertBlockTemplate}
            onDragStart={onDragStartBlockTemplate}
            onDragEnd={onDragEndBlockTemplate}
            isBusy={isBusy}
          />
        )}
      </div>
    </aside>
  );
}

const panelStyle: CSSProperties = {
  backgroundColor: "#0a0f15",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  padding: "1rem",
  height: "fit-content",
  position: "sticky",
  top: "1.5rem",
};

const tabStyle: CSSProperties = {
  flex: 1,
  padding: "0.4rem 0.6rem",
  borderRadius: "8px",
  border: "1px solid #1f2937",
  backgroundColor: "#0b1220",
  color: "#f5f5f5",
  cursor: "pointer",
  fontSize: "0.75rem",
};

