import { useEffect, useMemo, useState } from "react";
import { formatSUCWeekRange, isValidSUCWeekId } from "../../utils/sucWeek";
import { useStudioWeek } from "../../context/StudioWeekContext";

const DATALIST_ID = "studio-suc-week-options";

export default function GlobalWeekSelector() {
  const {
    selectedWeekId,
    selectedWeekOption,
    weekOptions,
    setSelectedWeekId,
    selectThisWeek,
  } = useStudioWeek();
  const [draftWeekId, setDraftWeekId] = useState(selectedWeekId);

  useEffect(() => {
    setDraftWeekId(selectedWeekId);
  }, [selectedWeekId]);

  const selectedRange = useMemo(
    () => selectedWeekOption?.rangeLabel || formatSUCWeekRange(selectedWeekId) || "Week unavailable",
    [selectedWeekId, selectedWeekOption?.rangeLabel]
  );

  function commitDraft(value: string) {
    const normalized = String(value || "").trim().toUpperCase();
    if (!normalized) {
      setDraftWeekId(selectedWeekId);
      return;
    }
    if (!isValidSUCWeekId(normalized)) {
      setDraftWeekId(selectedWeekId);
      return;
    }
    setSelectedWeekId(normalized);
  }

  return (
    <div style={{ display: "grid", gap: "0.25rem", minWidth: "260px", marginLeft: "auto" }}>
      <span style={{ fontSize: "0.66rem", color: "#7d8596", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        SUC Week
      </span>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="button"
          onClick={selectThisWeek}
          style={{
            border: "1px solid #334155",
            backgroundColor: "#111827",
            color: "#e5e7eb",
            borderRadius: "8px",
            fontSize: "0.72rem",
            padding: "0.35rem 0.55rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          This Week
        </button>
        <input
          list={DATALIST_ID}
          value={draftWeekId}
          onChange={(event) => setDraftWeekId(event.target.value.toUpperCase())}
          onBlur={() => commitDraft(draftWeekId)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitDraft(draftWeekId);
          }}
          placeholder="YYYY-WK-NN"
          style={{
            flex: 1,
            border: "1px solid #334155",
            backgroundColor: "#020617",
            color: "#f5f5f5",
            borderRadius: "8px",
            fontSize: "0.78rem",
            padding: "0.35rem 0.55rem",
          }}
        />
        <datalist id={DATALIST_ID}>
          {weekOptions.map((option) => (
            <option key={option.weekId} value={option.weekId}>
              {option.label}
            </option>
          ))}
        </datalist>
      </div>
      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
        {selectedWeekId} - {selectedRange}
      </span>
    </div>
  );
}

