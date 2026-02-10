import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { BlockInstance, DayAssignment, DayKey, WeekInstance } from "../../../season";
import type { EventSummary } from "../../hooks/useEvents";

const intensityMap: Record<string, number> = {
  "low": 0,
  "low-med": 1,
  "med": 2,
  "med-high": 3,
  "high": 4,
  "very-high": 5,
};

type InspectorPanelProps = {
  selectedBlock: BlockInstance | null;
  selectedWeek: WeekInstance | null;
  selectedWeekIndex: number | null;
  selectedWeekStartDate: Date | null;
  selectedDayKey: DayKey | null;
  workoutOptions: Array<{ workoutId: string; name: string }>;
  eventOptions: EventSummary[];
  isLoadingEvents: boolean;
  onUpdateDay: (dayKey: DayKey, patch: Partial<DayAssignment>) => void;
  onClearDay: (dayKey: DayKey) => void;
  onUpdateWeekEvents: (eventIds: string[]) => void;
};

function computeWeekScore(week: WeekInstance): number {
  const stress = intensityMap[week.stress] ?? 0;
  const volume = intensityMap[week.volume] ?? 0;
  const intensity = intensityMap[week.intensity] ?? 0;
  return (stress + volume + intensity) / 3;
}

function computeBlockAverage(weeks: WeekInstance[]): number {
  if (weeks.length === 0) return 0;
  const sum = weeks.reduce((acc, week) => acc + computeWeekScore(week), 0);
  return sum / weeks.length;
}

function countWeekFocus(weeks: WeekInstance[]): Record<string, number> {
  const counts: Record<string, number> = {};
  weeks.forEach((week) => {
    const key = week.focus ?? "none";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function InspectorPanel({
  selectedBlock,
  selectedWeek,
  selectedWeekIndex,
  selectedWeekStartDate,
  selectedDayKey,
  workoutOptions,
  eventOptions,
  isLoadingEvents,
  onUpdateDay,
  onClearDay,
  onUpdateWeekEvents,
}: InspectorPanelProps) {
  const weekDateRange = selectedWeekStartDate
    ? `${formatDate(selectedWeekStartDate)} - ${formatDate(addDays(selectedWeekStartDate, 6))}`
    : "-";

  const selectedDayAssignment =
    selectedWeek && selectedDayKey ? selectedWeek.days?.[selectedDayKey] ?? {} : null;
  const selectedWorkoutIds = useMemo(() => {
    if (!selectedDayAssignment) return [] as string[];
    if (Array.isArray(selectedDayAssignment.workoutIds)) {
      return selectedDayAssignment.workoutIds.filter((id) => typeof id === "string" && id.trim().length > 0);
    }
    if (selectedDayAssignment.workoutId) {
      return [selectedDayAssignment.workoutId];
    }
    return [];
  }, [selectedDayAssignment]);

  const dayLabel = selectedDayKey
    ? `${selectedDayKey.charAt(0).toUpperCase()}${selectedDayKey.slice(1)}`
    : null;

  const [eventSearch, setEventSearch] = useState("");
  const selectedEventIds = selectedWeek?.eventIds ?? [];

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    if (!query) return eventOptions;
    return eventOptions.filter((event) => {
      return (
        event.eventName.toLowerCase().includes(query) ||
        event.eventId.toLowerCase().includes(query)
      );
    });
  }, [eventOptions, eventSearch]);

  return (
    <aside style={panelStyle}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>Inspector</div>
      {!selectedBlock && !selectedWeek && (
        <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
          Select a block or week to see details.
        </div>
      )}

      {selectedBlock && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={sectionTitleStyle}>Block</div>
          <div style={valueStyle}>{selectedBlock.name}</div>
          <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
            {selectedBlock.weeks.length} weeks
          </div>
          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.25rem" }}>
            {Object.entries(countWeekFocus(selectedBlock.weeks)).map(([focus, count]) => (
              <div key={focus} style={pillStyle}>
                {focus === "none" ? "No Focus" : focus} - {count}
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
            Avg load: {computeBlockAverage(selectedBlock.weeks).toFixed(1)} / 5
          </div>
        </div>
      )}

      {selectedWeek && (
        <div>
          <div style={sectionTitleStyle}>Week</div>
          <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.85rem" }}>
            <div>
              <span style={labelStyle}>Index</span>
              {selectedWeekIndex !== null ? `Week ${selectedWeekIndex + 1}` : "-"}
            </div>
            <div>
              <span style={labelStyle}>Dates</span>
              {weekDateRange}
            </div>
            <div>
              <span style={labelStyle}>Focus</span>
              {selectedWeek.focus ?? "None"}
            </div>
            <div>
              <span style={labelStyle}>Stress</span>
              {selectedWeek.stress}
            </div>
            <div>
              <span style={labelStyle}>Volume</span>
              {selectedWeek.volume}
            </div>
            <div>
              <span style={labelStyle}>Intensity</span>
              {selectedWeek.intensity}
            </div>
            <div>
              <span style={labelStyle}>Score</span>
              {computeWeekScore(selectedWeek).toFixed(1)} / 5
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div style={sectionTitleStyle}>Linked Events</div>
            {isLoadingEvents && (
              <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Loading events...</div>
            )}
            {!isLoadingEvents && eventOptions.length === 0 && (
              <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>No events available.</div>
            )}
            {!isLoadingEvents && eventOptions.length > 0 && (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <input
                  value={eventSearch}
                  onChange={(event) => setEventSearch(event.target.value)}
                  placeholder="Search events..."
                  style={{
                    padding: "0.4rem 0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #1f2937",
                    backgroundColor: "#0f172a",
                    color: "#f5f5f5",
                    fontSize: "0.8rem",
                  }}
                />
                <div style={{ display: "grid", gap: "0.35rem", maxHeight: "160px", overflowY: "auto" }}>
                  {filteredEvents.map((event) => {
                    const checked = selectedEventIds.includes(event.eventId);
                    return (
                      <label
                        key={event.eventId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.8rem",
                          color: "#e5e7eb",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? selectedEventIds.filter((id) => id !== event.eventId)
                              : [...selectedEventIds, event.eventId];
                            onUpdateWeekEvents(next);
                          }}
                        />
                        <span>
                          {event.eventName} {event.eventDate ? `· ${event.eventDate}` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {selectedEventIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateWeekEvents([])}
                    style={{
                      padding: "0.35rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #374151",
                      backgroundColor: "#111827",
                      color: "#f5f5f5",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      width: "fit-content",
                    }}
                  >
                    Clear linked events
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div style={sectionTitleStyle}>Day</div>
            {!selectedDayKey && (
              <div style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                Select a day to assign a workout.
              </div>
            )}
            {selectedDayKey && (
              <div style={{ display: "grid", gap: "0.6rem", fontSize: "0.85rem" }}>
                <div>
                  <span style={labelStyle}>Day</span>
                  {dayLabel}
                </div>
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Assigned Workouts</label>
                  <select
                    value={selectedWorkoutIds[0] ?? ""}
                    onChange={(event) => {
                      const primary = event.target.value || "";
                      const next = [primary, selectedWorkoutIds[1]].filter(Boolean).slice(0, 2);
                      onUpdateDay(selectedDayKey, { workoutIds: next });
                    }}
                    style={{
                      padding: "0.4rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #1f2937",
                      backgroundColor: "#0f172a",
                      color: "#f5f5f5",
                    }}
                  >
                    <option value="">No workout assigned</option>
                    {workoutOptions.map((option) => (
                      <option key={option.workoutId} value={option.workoutId}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedWorkoutIds[1] ?? ""}
                    onChange={(event) => {
                      const secondary = event.target.value || "";
                      const next = [selectedWorkoutIds[0], secondary].filter(Boolean).slice(0, 2);
                      onUpdateDay(selectedDayKey, { workoutIds: next });
                    }}
                    style={{
                      padding: "0.4rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #1f2937",
                      backgroundColor: "#0f172a",
                      color: "#f5f5f5",
                    }}
                  >
                    <option value="">No second workout</option>
                    {workoutOptions.map((option) => (
                      <option key={option.workoutId} value={option.workoutId}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onClearDay(selectedDayKey)}
                    disabled={
                      !selectedDayAssignment ||
                      (selectedWorkoutIds.length === 0 && !selectedDayAssignment.notes)
                    }
                    style={{
                      padding: "0.35rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #374151",
                      backgroundColor: "#111827",
                      color: "#f5f5f5",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      width: "fit-content",
                    }}
                  >
                    Clear assignment
                  </button>
                </div>
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Notes</label>
                  <textarea
                    value={selectedDayAssignment?.notes ?? ""}
                    onChange={(event) => onUpdateDay(selectedDayKey, { notes: event.target.value })}
                    placeholder="Optional coach notes for this day"
                    rows={3}
                    style={{
                      padding: "0.45rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #1f2937",
                      backgroundColor: "#0f172a",
                      color: "#f5f5f5",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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

const sectionTitleStyle: CSSProperties = {
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "0.3rem",
};

const valueStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
};

const labelStyle: CSSProperties = {
  display: "inline-block",
  width: "80px",
  color: "#9ca3af",
};

const pillStyle: CSSProperties = {
  padding: "0.2rem 0.5rem",
  borderRadius: "999px",
  border: "1px solid #1f2937",
  backgroundColor: "#0f172a",
  color: "#e5e7eb",
  fontSize: "0.75rem",
  width: "fit-content",
};


