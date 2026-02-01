import type { Season } from "../../../season";

type SeasonHeaderProps = {
  season: Season | null;
  isCreating: boolean;
  isPublishing: boolean;
  onCreateDraft: () => void;
  onPublish: () => void;
};

export default function SeasonHeader({
  season,
  isCreating,
  isPublishing,
  onCreateDraft,
  onPublish,
}: SeasonHeaderProps) {
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
        disabled={!season || isPublishing}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          border: "1px solid #2b2f36",
          backgroundColor: "#111827",
          color: "#f5f5f5",
          cursor: season ? "pointer" : "not-allowed",
        }}
      >
        Publish Season
      </button>
      <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
        {season ? `Draft loaded (${season.status})` : "No draft loaded"}
      </div>
    </div>
  );
}
