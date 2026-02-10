import { useEffect, useMemo, useState } from "react";
import WorkoutChart from "./WorkoutBuilder/WorkoutChart";
import { effortBlocks } from "./WorkoutBuilder/effortBlocks";
import type { TierLabel, WorkoutBlockInstance, WorkoutBuilderWorkout } from "./WorkoutBuilder/builderTypes";
import type { IntervalSegment, IntervalTarget, TierVariant, Workout } from "../types";
import { calendarByDate, DEFAULT_TIME_ZONE, type CalendarDay } from "../utils/calendarSelectors";

type ViewerTier = "MED" | "LRG" | "XL";

type CalendarBlock = {
  blockId: string;
  name: string;
  intent: string;
};

type CalendarWeek = {
  weekId: string;
  index: number;
  startDate: string;
};

type ResolvedWorkoutOfDay = {
  workout: Workout;
  tiers: Record<ViewerTier, TierVariant>;
  tierSources: Record<ViewerTier, ViewerTier>;
  block: { blockId: string; name: string; intent: string };
  week: { weekId: string; index: number; startDate: string };
};

type WeekContext = {
  block: CalendarBlock | null;
  week: CalendarWeek;
  index: number;
};

const VIEWER_TIERS: ViewerTier[] = ["MED", "LRG", "XL"];

const containerStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "24px 16px 80px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #1e2430",
  background: "#0f1115",
  padding: "16px",
};

const mutedText: React.CSSProperties = {
  color: "#8f95a3",
  fontSize: "13px",
};

function formatPacificDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    ...options,
  }).format(date);
}

function getPacificDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  });
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  });
  const utcTime = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );
  return utcTime - date.getTime();
}

function getNextPacificMidnight(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  });
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const utcGuess = Date.UTC(year, month - 1, day + 1, 0, 0, 0);
  const guessDate = new Date(utcGuess);
  const offset = getTimeZoneOffset(guessDate, DEFAULT_TIME_ZONE);
  const candidate = new Date(utcGuess - offset);
  const offset2 = getTimeZoneOffset(candidate, DEFAULT_TIME_ZONE);
  if (offset2 !== offset) {
    return new Date(utcGuess - offset2);
  }
  return candidate;
}

function msUntilNextPacificMidnight(now: Date): number {
  const next = getNextPacificMidnight(now).getTime();
  return Math.max(1000, next - now.getTime());
}

function toNoon(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseZoneNumber(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/Z(\d+)/i) || value.match(/Zone\s*(\d+)/i);
  if (!match) return null;
  const zone = parseInt(match[1], 10);
  return Number.isNaN(zone) ? null : zone;
}

function effortIdFromZone(zone: number | null): string {
  if (!zone || zone <= 1) return "recovery";
  if (zone === 2) return "aerobic";
  if (zone === 3) return "tempo";
  if (zone === 4) return "threshold";
  return "interval";
}

function isStrideTarget(target?: IntervalTarget | null): boolean {
  if (!target) return false;
  const extended = target as IntervalTarget & { paceTag?: string };
  if (typeof extended.paceTag === "string" && extended.paceTag.toLowerCase() === "strides") {
    return true;
  }
  return typeof target.zone === "string" && /stride/i.test(target.zone);
}

function resolveEffortBlockId(target?: IntervalTarget | null): string {
  if (isStrideTarget(target)) return "strides";
  const zoneNumber = target?.zone ? parseZoneNumber(target.zone) : null;
  return effortIdFromZone(zoneNumber ?? 1);
}

function resolveEffortDefinition(target?: IntervalTarget | null) {
  const effortId = resolveEffortBlockId(target);
  return effortBlocks.find((block) => block.id === effortId) ?? effortBlocks[0];
}

function buildBlockFromSegment(segment: IntervalSegment, tier: TierLabel, index: number): WorkoutBlockInstance {
  return {
    id: `${tier}-${index}`,
    sourceIndex: index,
    effortBlockId: resolveEffortBlockId(segment.work?.target),
    duration: segment.work?.duration ?? null,
    rest: segment.rest?.duration ?? null,
    reps: segment.reps ?? null,
    notes: segment.work?.cues?.[0] ?? null,
  };
}

function buildChartDraft(workout: Workout, tiers: Record<ViewerTier, TierVariant>): WorkoutBuilderWorkout {
  const chartTiers: TierLabel[] = ["MED", "LRG", "XL", "XXL"];
  const tierBlocks: Record<TierLabel, WorkoutBlockInstance[]> = {
    MED: [],
    LRG: [],
    XL: [],
    XXL: [],
  };

  (["MED", "LRG", "XL"] as ViewerTier[]).forEach((tier) => {
    const variant = tiers[tier];
    if (!variant) return;
    tierBlocks[tier] = variant.structure.map((segment, index) => buildBlockFromSegment(segment, tier, index));
  });

  chartTiers.forEach((tier) => {
    if (!tierBlocks[tier]) {
      tierBlocks[tier] = [];
    }
  });

  return {
    id: workout.workoutId,
    name: workout.name ?? null,
    description: workout.description ?? null,
    tags: workout.focus ?? [],
    tiers: tierBlocks,
    status: workout.status,
  };
}

function formatTargetDetail(target?: IntervalTarget | null): string {
  if (!target) return "";
  const entries: string[] = [];
  if (target.zone) {
    entries.push(target.zone);
  }
  const extended = target as IntervalTarget & { rpe?: number; hrPct?: number; paceTag?: string };
  if (typeof extended.rpe === "number") {
    entries.push(`RPE ${extended.rpe}`);
  }
  if (typeof extended.hrPct === "number") {
    entries.push(`${extended.hrPct}% HR`);
  }
  if (extended.paceTag) {
    entries.push(extended.paceTag);
  }
  return entries.join(" - ");
}

export default function WorkoutViewer() {
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [selectedTier, setSelectedTier] = useState<ViewerTier>("MED");
  const [pinnedDate, setPinnedDate] = useState<Date | null>(null);

  useEffect(() => {
    let timeoutId: number | null = null;

    const schedule = () => {
      const delay = msUntilNextPacificMidnight(new Date());
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };

    schedule();
    const handleVisibility = () => {
      if (!document.hidden) {
        setNow(new Date());
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const hasCalendarData = Object.keys(calendarByDate).length > 0;

  const resolveCalendarDay = (date: Date): CalendarDay | null => {
    const key = getPacificDateKey(date);
    return calendarByDate[key] ?? null;
  };

  const toResolvedWorkout = (entry: CalendarDay | null): ResolvedWorkoutOfDay | null => {
    if (!entry?.workout || !entry.tiers || !entry.tierSources || !entry.block || !entry.week) {
      return null;
    }
    return {
      workout: entry.workout,
      tiers: entry.tiers as Record<ViewerTier, TierVariant>,
      tierSources: entry.tierSources as Record<ViewerTier, ViewerTier>,
      block: entry.block,
      week: entry.week,
    };
  };

  const activeDate = pinnedDate ?? now;
  const activeEntry = useMemo(() => resolveCalendarDay(activeDate), [activeDate]);
  const resolvedResult = useMemo(() => {
    return toResolvedWorkout(activeEntry);
  }, [activeEntry]);

  const weekContext: WeekContext | null = useMemo(() => {
    if (!activeEntry?.week) return null;
    return {
      block: activeEntry.block ?? null,
      week: activeEntry.week,
      index: activeEntry.week.index,
    };
  }, [activeEntry]);

  const chartDraft = useMemo(() => {
    if (!resolvedResult) return null;
    return buildChartDraft(resolvedResult.workout, resolvedResult.tiers);
  }, [resolvedResult]);

  const selectedTierVariant = resolvedResult?.tiers[selectedTier] ?? null;
  const tierSource = resolvedResult?.tierSources[selectedTier] ?? selectedTier;

  const isViewingToday = getPacificDateKey(activeDate) === getPacificDateKey(now);

  const upcomingItems = useMemo(() => {
    const base = toNoon(now);
    const items: Array<{
      date: Date;
      workoutName: string;
      blockName: string;
      isRest: boolean;
    }> = [];

    for (let offset = 1; offset <= 7; offset += 1) {
      const date = addDays(base, offset);
      const entry = resolveCalendarDay(date);
      const result = toResolvedWorkout(entry);
      if (result) {
        items.push({
          date,
          workoutName: result.workout.name || "Workout",
          blockName: result.block.name,
          isRest: false,
        });
        continue;
      }

      items.push({
        date,
        workoutName: "Rest Day",
        blockName: entry?.block?.name ?? "Recovery",
        isRest: true,
      });
    }

    return items;
  }, [now]);

  const tierFallbackNote =
    resolvedResult && tierSource !== selectedTier
      ? `Showing ${tierSource} variant for ${selectedTier}`
      : null;

  if (!hasCalendarData) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>Calendar data is unavailable.</div>
      </main>
    );
  }

  if (!resolvedResult && !weekContext) {
    return (
      <main style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>No active season</div>
          <div style={{ ...mutedText, marginTop: "6px" }}>
            Workout data is not available for the current date.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <section style={{ display: "flex", gap: "12px" }}>
        <TabButton isActive={activeTab === "today"} onClick={() => setActiveTab("today")}>
          Workout
        </TabButton>
        <TabButton isActive={activeTab === "upcoming"} onClick={() => setActiveTab("upcoming")}>
          Upcoming
        </TabButton>
      </section>

      {activeTab === "today" ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: "1 1 auto" }}>
                <DateBlock date={activeDate} isToday={isViewingToday} />
                <div>
                <div style={{ fontSize: "24px", fontWeight: 700 }}>
                  {resolvedResult ? resolvedResult.workout.name || "Workout" : "Rest Day"}
                </div>
                <div style={{ ...mutedText, marginTop: "6px" }}>
                  {formatPacificDate(activeDate, { weekday: "long", month: "short", day: "numeric" })}
                  {!isViewingToday && (
                    <span style={{ marginLeft: "8px", color: "#cfd3dd" }}>- Viewing</span>
                  )}
                </div>
                <div style={{ ...mutedText, marginTop: "8px" }}>
                  {resolvedResult
                    ? `Week ${resolvedResult.week.index + 1} - ${resolvedResult.block.name}`
                    : weekContext
                      ? `Week ${weekContext.index + 1} - ${weekContext.block?.name ?? "Block"}`
                      : ""}
                </div>
                <div style={{ ...mutedText, marginTop: "4px" }}>
                  {resolvedResult?.block.intent ?? weekContext?.block?.intent ?? ""}
                </div>
                </div>
              </div>

              {!isViewingToday && (
                <button
                  type="button"
                  onClick={() => setPinnedDate(null)}
                  style={{
                    alignSelf: "flex-start",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "1px solid #2a2f3a",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Back to today
                </button>
              )}
            </div>
          </section>

          {resolvedResult ? (
            <>
              <section style={cardStyle}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>Tier</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {VIEWER_TIERS.map((tier) => (
                    <TierPill
                      key={tier}
                      tier={tier}
                      isActive={tier === selectedTier}
                      onClick={() => setSelectedTier(tier)}
                    />
                  ))}
                </div>
                {tierFallbackNote && <div style={{ ...mutedText, marginTop: "10px" }}>{tierFallbackNote}</div>}
              </section>

              {chartDraft && (
                <WorkoutChart draft={chartDraft} effortLookup={effortLookup} visibleTiers={[selectedTier]} />
              )}

              <section style={cardStyle}>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Workout Steps</div>
                {selectedTierVariant && selectedTierVariant.structure.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {selectedTierVariant.structure.map((segment, index) => (
                      <StepCard key={`${segment.type}-${index}`} segment={segment} index={index} />
                    ))}
                  </div>
                ) : (
                  <div style={mutedText}>No structured steps available.</div>
                )}
              </section>
            </>
          ) : (
            <section style={cardStyle}>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>Rest Day</div>
              <div style={{ ...mutedText, marginTop: "8px" }}>
                Take it easy. Tomorrow will be ready for you.
              </div>
            </section>
          )}
        </>
      ) : (
        <section style={cardStyle}>
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Upcoming</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {upcomingItems.map((item) => (
              <button
                key={item.date.toISOString()}
                type="button"
                onClick={() => {
                  setPinnedDate(item.date);
                  setActiveTab("today");
                }}
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #1f2430",
                  background: "#0b0f17",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "13px", color: "#9aa1ad" }}>
                  {formatPacificDate(item.date, { weekday: "short", month: "short", day: "numeric" })}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600, marginTop: "4px" }}>
                  {item.workoutName}
                </div>
                <div style={{ ...mutedText, marginTop: "4px" }}>{item.blockName}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: "999px",
        border: `1px solid ${isActive ? "#6ee7ff" : "#1f2430"}`,
        background: isActive ? "rgba(110, 231, 255, 0.1)" : "transparent",
        color: isActive ? "#e5f7ff" : "#9aa1ad",
        fontWeight: 600,
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function DateBlock({ date, isToday }: { date: Date; isToday: boolean }) {
  const month = formatPacificDate(date, { month: "short" }).toUpperCase();
  const day = formatPacificDate(date, { day: "2-digit" });
  return (
    <div
      style={{
        width: "96px",
        height: "96px",
        borderRadius: "16px",
        border: "1px solid #1f2430",
        background: "#0b0f17",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        color: "#e5e7eb",
        flex: "0 0 96px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "0.6px" }}>
        {month} {day}
      </div>
      {isToday && (
        <div style={{ fontSize: "11px", letterSpacing: "1.6px", color: "#9aa1ad" }}>TODAY</div>
      )}
    </div>
  );
}

function TierPill({
  tier,
  isActive,
  onClick,
}: {
  tier: ViewerTier;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "999px",
        border: `1px solid ${isActive ? "#7cdb53" : "#2a2f3a"}`,
        background: isActive ? "rgba(124, 219, 83, 0.12)" : "transparent",
        color: isActive ? "#d7fbd0" : "#9aa1ad",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {tier}
    </button>
  );
}

function StepCard({ segment, index }: { segment: IntervalSegment; index: number }) {
  const effort = resolveEffortDefinition(segment.work?.target);
  const workTarget = formatTargetDetail(segment.work?.target);
  const restTarget = formatTargetDetail(segment.rest?.target);
  const reps = segment.reps && segment.reps > 1 ? segment.reps : 1;
  const workDuration = segment.work?.duration ?? "";
  const restDuration = segment.rest?.duration ?? "";
  const workLine = reps > 1
    ? `${reps} x ${workDuration}${workTarget ? ` @ ${workTarget}` : ""}`
    : `${workDuration}${workTarget ? ` @ ${workTarget}` : ""}`;

  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1px solid ${effort.accent}`,
        padding: "12px 14px",
        background: "#0b0f17",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 auto" }}>
          <div
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: effort.accent,
            }}
          >
            {effort.label} - Step {index + 1}
          </div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>{workLine}</div>
          {segment.rest && restDuration ? (
            <div style={{ fontSize: "13px", color: "#9aa1ad" }}>
              Rest {restDuration}{restTarget ? ` - ${restTarget}` : ""}
            </div>
          ) : null}
          {segment.work?.cues && segment.work.cues.length > 0 && (
            <div style={{ fontSize: "12px", color: "#b8bfcc" }}>
              {segment.work.cues.join(" - ")}
            </div>
          )}
        </div>
      <EffortStack target={segment.work?.target} effortTarget={effort.target} />
      </div>
    </div>
  );
}

function parseEffortTarget(target?: string) {
  if (!target) return { zone: null, hr: null, rpe: null };
  const parts = target.split("|").map((part) => part.trim());
  let zone: string | null = null;
  let hr: string | null = null;
  let rpe: string | null = null;

  parts.forEach((part) => {
    if (/rpe/i.test(part)) {
      rpe = part.replace(/rpe/i, "").trim();
      return;
    }
    if (/hr/i.test(part)) {
      hr = part.replace(/max\s*hr/i, "").replace(/hr/i, "").trim();
      return;
    }
    if (/zone/i.test(part)) {
      zone = part.replace(/zone/i, "").trim();
    }
  });

  return { zone, hr, rpe };
}

function EffortStack({
  target,
  effortTarget,
}: {
  target?: IntervalTarget | null;
  effortTarget?: string;
}) {
  if (!target && !effortTarget) return null;
  const extended = target as IntervalTarget & {
    rpe?: number | string;
    maxHrPercent?: number | string;
    hrPct?: number | string;
  };
  const fallback = parseEffortTarget(effortTarget);
  const lines: string[] = [];

  const zoneValue = extended.zone ?? fallback.zone;
  if (zoneValue) {
    lines.push(`ZONE ${zoneValue}`);
  }
  const rpeValue = extended.rpe ?? fallback.rpe;
  if (rpeValue !== undefined && rpeValue !== null && `${rpeValue}` !== "") {
    lines.push(`RPE ${rpeValue}`);
  }

  const hrValue = extended.maxHrPercent ?? extended.hrPct ?? fallback.hr;
  if (hrValue !== undefined && hrValue !== null && `${hrValue}` !== "") {
    const hrText = `${hrValue}`.trim();
    lines.push(`HR ${hrText.includes("%") ? hrText : `${hrText}%`}`);
  }

  if (lines.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        fontSize: "12px",
        color: "#9aa1ad",
        letterSpacing: "0.3px",
        textAlign: "right",
        minWidth: "92px",
      }}
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

const effortLookup = Object.fromEntries(effortBlocks.map((block) => [block.id, block]));
