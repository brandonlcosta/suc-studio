import type { Season } from "../../../season";

type SeasonHeaderProps = {
  season: Season | null;
  isCreating: boolean;
  isPublishing: boolean;
  onCreateDraft: () => void;
  onPublish: () => void;
  onUpdateStartDate: (value: string | null) => void;
};

export default function SeasonHeader({
  season,
  isCreating,
  isPublishing,
  onCreateDraft,
  onPublish,
  onUpdateStartDate,
}: SeasonHeaderProps) {
  const startDateValue = season?.startDate ?? "";
  const publishDisabled = !season || isPublishing || !season.startDate;

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" }}>
      {!season && (
        <button
          onClick={onCreateDraft}
          disabled={isCreating}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "1px solid #2b2f36",
            backgroundColor: "#1f2937",
            color: "#f5f5f5",
            cursor: "pointer",
          }}
        >
          Create Draft
        </button>
      )}
      <button
        onClick={onPublish}
        disabled={publishDisabled}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          border: "1px solid #2b2f36",
          backgroundColor: "#111827",
          color: "#f5f5f5",
          cursor: publishDisabled ? "not-allowed" : "pointer",
        }}
      >
        Publish Season
      </button>
      {season && (
        <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.75rem", color: "#9ca3af" }}>
          Start Date
          <input
            type="date"
            value={startDateValue}
            onChange={(event) => {
              const value = event.target.value || null;
              onUpdateStartDate(value);
            }}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid #2b2f36",
              backgroundColor: "#0f172a",
              color: "#f5f5f5",
            }}
          />
        </label>
      )}
      <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
        {season ? `Draft loaded (${season.status})` : "No draft loaded"}
      </div>
    </div>
  );
}
