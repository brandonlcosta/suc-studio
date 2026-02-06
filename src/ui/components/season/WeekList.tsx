import type { DayKey, Season, WeekInstance } from "../../../season";
import type { WeekPreset } from "./presets";
import WeekCard from "./WeekCard";

type WeekWithIndex = {
  blockId: string;
  week: WeekInstance;
  globalWeekIndex: number;
  weekStartDate: Date;
};

type WeekListProps = {
  weeksWithIndex: WeekWithIndex[];
  markersByWeek: Map<number, Season["seasonMarkers"]>;
  isBusy: boolean;
  selectedWeekId: string | null;
  selectedDayKey: DayKey | null;
  onSelectWeek: (weekId: string) => void;
  onSelectDay: (weekId: string, dayKey: DayKey) => void;
  onRemoveWeek: (weekId: string) => void;
  onUpdateWeek: (weekId: string, patch: Partial<WeekInstance>) => void;
  quickEdit: boolean;
  workoutLabels: Record<string, string>;
  weekPresetDrag: WeekPreset | null;
  weekPresetTargetId: string | null;
  isWeekPresetDragActive: boolean;
  onDragOverWeekPreset: (weekId: string) => void;
  onDropWeekPreset: (weekId: string) => void;
  getPresetLabelForWeek: (week: WeekInstance) => string | null;
};

export default function WeekList({
  weeksWithIndex,
  markersByWeek,
  isBusy,
  selectedWeekId,
  selectedDayKey,
  onSelectWeek,
  onSelectDay,
  onRemoveWeek,
  onUpdateWeek,
  quickEdit,
  workoutLabels,
  weekPresetDrag,
  weekPresetTargetId,
  isWeekPresetDragActive,
  onDragOverWeekPreset,
  onDropWeekPreset,
  getPresetLabelForWeek,
}: WeekListProps) {
  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
      {weeksWithIndex.map(({ week, globalWeekIndex, weekStartDate }) => (
        <WeekCard
          key={week.weekId}
          week={week}
          globalWeekIndex={globalWeekIndex}
          weekStartDate={weekStartDate}
          markers={markersByWeek.get(globalWeekIndex) ?? []}
          isBusy={isBusy}
          isSelected={selectedWeekId === week.weekId}
          selectedDayKey={selectedWeekId === week.weekId ? selectedDayKey : null}
          onSelect={() => onSelectWeek(week.weekId)}
          onSelectDay={(dayKey) => onSelectDay(week.weekId, dayKey)}
          onRemove={() => onRemoveWeek(week.weekId)}
          onUpdate={(patch) => onUpdateWeek(week.weekId, patch)}
          quickEdit={quickEdit}
          workoutLabels={workoutLabels}
          presetDragActive={isWeekPresetDragActive}
          presetDragTargeted={weekPresetTargetId === week.weekId}
          dragPreset={weekPresetDrag}
          onDragOverPreset={() => onDragOverWeekPreset(week.weekId)}
          onDropPreset={() => onDropWeekPreset(week.weekId)}
          presetLabel={getPresetLabelForWeek(week)}
        />
      ))}
    </div>
  );
}
