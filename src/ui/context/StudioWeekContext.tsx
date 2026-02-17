import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { formatSUCWeekRange, getCurrentSUCWeekId } from "../utils/sucWeek";

export type StudioWeekOption = {
  weekId: string;
  label: string;
  rangeLabel: string;
  blockId?: string | null;
  seasonId?: string | null;
  weekOrdinal?: number | null;
};

type StudioWeekContextValue = {
  selectedWeekId: string;
  selectedWeekOption: StudioWeekOption | null;
  weekOptions: StudioWeekOption[];
  setSelectedWeekId: (weekId: string) => void;
  selectThisWeek: () => void;
  registerWeekOptions: (options: StudioWeekOption[]) => void;
};

const StudioWeekContext = createContext<StudioWeekContextValue | null>(null);

function normalizeWeekId(weekId: string): string {
  return String(weekId || "").trim().toUpperCase();
}

function mergeWeekOptions(existing: StudioWeekOption[], incoming: StudioWeekOption[]): StudioWeekOption[] {
  const byId = new Map<string, StudioWeekOption>();
  for (const option of existing) {
    byId.set(option.weekId, option);
  }
  for (const option of incoming) {
    byId.set(option.weekId, {
      ...(byId.get(option.weekId) ?? {}),
      ...option,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.weekId.localeCompare(b.weekId));
}

export function StudioWeekProvider({ children }: { children: ReactNode }) {
  const [selectedWeekId, setSelectedWeekIdState] = useState(() => getCurrentSUCWeekId() ?? "");
  const [weekOptions, setWeekOptions] = useState<StudioWeekOption[]>([]);

  const setSelectedWeekId = useCallback((weekId: string) => {
    const normalized = normalizeWeekId(weekId);
    if (!normalized) return;
    setSelectedWeekIdState(normalized);
  }, []);

  const selectThisWeek = useCallback(() => {
    const current = getCurrentSUCWeekId();
    if (!current) return;
    setSelectedWeekIdState(current);
  }, []);

  const registerWeekOptions = useCallback((options: StudioWeekOption[]) => {
    if (!Array.isArray(options) || options.length === 0) return;
    const normalized = options
      .map((option) => {
        const weekId = normalizeWeekId(option.weekId);
        if (!weekId) return null;
        const rangeLabel = option.rangeLabel || formatSUCWeekRange(weekId) || weekId;
        return {
          ...option,
          weekId,
          rangeLabel,
          label: option.label || `${weekId} - ${rangeLabel}`,
        } as StudioWeekOption;
      })
      .filter(Boolean) as StudioWeekOption[];
    if (!normalized.length) return;
    setWeekOptions((previous) => mergeWeekOptions(previous, normalized));
  }, []);

  const selectedWeekOption = useMemo(
    () => weekOptions.find((entry) => entry.weekId === selectedWeekId) ?? null,
    [selectedWeekId, weekOptions]
  );

  const value = useMemo<StudioWeekContextValue>(
    () => ({
      selectedWeekId,
      selectedWeekOption,
      weekOptions,
      setSelectedWeekId,
      selectThisWeek,
      registerWeekOptions,
    }),
    [registerWeekOptions, selectThisWeek, selectedWeekId, selectedWeekOption, setSelectedWeekId, weekOptions]
  );

  return <StudioWeekContext.Provider value={value}>{children}</StudioWeekContext.Provider>;
}

export function useStudioWeek(): StudioWeekContextValue {
  const context = useContext(StudioWeekContext);
  if (!context) {
    throw new Error("useStudioWeek must be used within StudioWeekProvider.");
  }
  return context;
}

