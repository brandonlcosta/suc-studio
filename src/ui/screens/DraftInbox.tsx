import { useState, useEffect } from "react";
import { buildStudioApiUrl } from "../utils/studioApi";

type DraftMeta = {
  draftId: string;
  draftStatus: "pending" | "approved" | "rejected";
  draftSource: "mobile" | "desktop";
  draftCreatedAt: string;
  draftUpdatedAt: string;
};

type TrainingContentDraft = {
  _draftMeta: DraftMeta;
  data: {
    id: string;
    type: string;
    title: string;
    summary: string;
    body: string;
    topics: string[];
    tier: string;
    author: string;
  };
};

type RouteIntelDraft = {
  _draftMeta: DraftMeta;
  data: {
    eventId: string;
    routeId: string;
    caption: string;
    sectionCaptions?: Record<string, string>;
  };
};

type DraftItem =
  | { type: "training-content"; draft: TrainingContentDraft }
  | { type: "route-intel"; draft: RouteIntelDraft };

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "rgba(234, 179, 8, 0.2)", text: "#eab308" },
    approved: { bg: "rgba(34, 197, 94, 0.2)", text: "#22c55e" },
    rejected: { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444" },
  };
  const { bg, text } = colors[status] || colors.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.625rem",
        fontWeight: 600,
        textTransform: "uppercase",
        background: bg,
        color: text,
      }}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isMobile = source === "mobile";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.625rem",
        fontWeight: 600,
        textTransform: "uppercase",
        background: isMobile ? "rgba(59, 130, 246, 0.2)" : "rgba(156, 163, 175, 0.2)",
        color: isMobile ? "#3b82f6" : "#9ca3af",
      }}
    >
      {source}
    </span>
  );
}

export default function DraftInbox() {
  const [trainingDrafts, setTrainingDrafts] = useState<TrainingContentDraft[]>([]);
  const [routeIntelDrafts, setRouteIntelDrafts] = useState<RouteIntelDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const loadDrafts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = buildStudioApiUrl("/drafts");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load drafts");
      }
      const data = await response.json();
      setTrainingDrafts(data.trainingContent || []);
      setRouteIntelDrafts(data.routeIntel || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  // Combine and filter drafts
  const allDrafts: DraftItem[] = [
    ...trainingDrafts.map((d) => ({ type: "training-content" as const, draft: d })),
    ...routeIntelDrafts.map((d) => ({ type: "route-intel" as const, draft: d })),
  ]
    .filter((item) => filter === "all" || item.draft._draftMeta.draftStatus === filter)
    .sort(
      (a, b) =>
        new Date(b.draft._draftMeta.draftUpdatedAt).getTime() -
        new Date(a.draft._draftMeta.draftUpdatedAt).getTime()
    );

  const handleApprove = async () => {
    if (!selectedDraft) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const draftId = selectedDraft.draft._draftMeta.draftId;
      const url = buildStudioApiUrl(`/drafts/${selectedDraft.type}/${draftId}/approve`);
      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to approve draft");
      }

      setSuccess("Draft approved and published!");
      setSelectedDraft(null);
      await loadDrafts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve draft");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDraft) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const draftId = selectedDraft.draft._draftMeta.draftId;
      const url = buildStudioApiUrl(`/drafts/${selectedDraft.type}/${draftId}/reject`);
      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to reject draft");
      }

      setSuccess("Draft rejected.");
      await loadDrafts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject draft");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDraft) return;
    if (!confirm("Delete this draft permanently?")) return;

    setIsProcessing(true);
    setError(null);

    try {
      const draftId = selectedDraft.draft._draftMeta.draftId;
      const url = buildStudioApiUrl(`/drafts/${selectedDraft.type}/${draftId}`);
      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete draft");
      }

      setSuccess("Draft deleted.");
      setSelectedDraft(null);
      await loadDrafts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    } finally {
      setIsProcessing(false);
    }
  };

  const getDraftTitle = (item: DraftItem): string => {
    if (item.type === "training-content") {
      return item.draft.data.title || "Untitled Training Tip";
    }
    const caption = item.draft.data.caption || "";
    return caption.length > 40 ? caption.slice(0, 40) + "..." : caption || "Route Intel Caption";
  };

  const getDraftSubtitle = (item: DraftItem): string => {
    if (item.type === "training-content") {
      return item.draft.data.topics?.join(" > ") || "No topic";
    }
    return `Event: ${item.draft.data.eventId} | Route: ${item.draft.data.routeId}`;
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left Sidebar - Draft List */}
      <div
        style={{
          width: "360px",
          borderRight: "1px solid var(--border-medium, #2a2a2a)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-secondary, #0f1115)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-medium, #2a2a2a)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Draft Inbox</h2>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid var(--border-medium, #2a2a2a)",
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary, #0a0e14)",
              color: "var(--text-primary, #f5f5f5)",
              fontSize: "0.875rem",
            }}
          >
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Drafts</option>
          </select>
        </div>

        {/* Draft List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>Loading...</div>
          ) : allDrafts.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
              No {filter === "all" ? "" : filter} drafts
            </div>
          ) : (
            allDrafts.map((item) => {
              const isSelected =
                selectedDraft?.draft._draftMeta.draftId === item.draft._draftMeta.draftId;
              return (
                <button
                  key={item.draft._draftMeta.draftId}
                  onClick={() => setSelectedDraft(item)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: isSelected ? "rgba(59, 130, 246, 0.1)" : "transparent",
                    color: "var(--text-primary, #f5f5f5)",
                    border: "none",
                    borderBottom: "1px solid var(--border-light, #1a1a1a)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <StatusBadge status={item.draft._draftMeta.draftStatus} />
                    <SourceBadge source={item.draft._draftMeta.draftSource} />
                    <span
                      style={{
                        fontSize: "0.625rem",
                        color: "#666",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {item.type === "training-content" ? "Tip" : "Intel"}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                    {getDraftTitle(item)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    {getDraftSubtitle(item)}
                  </div>
                  <div style={{ fontSize: "0.625rem", color: "#555", marginTop: "0.25rem" }}>
                    {formatDate(item.draft._draftMeta.draftUpdatedAt)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Draft Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Status Messages */}
        {(error || success) && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border-medium, #2a2a2a)",
              backgroundColor: error ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
              color: error ? "#ef4444" : "#22c55e",
              fontSize: "0.875rem",
            }}
          >
            {error || success}
          </div>
        )}

        {selectedDraft ? (
          <>
            {/* Action Bar */}
            <div
              style={{
                padding: "1rem",
                borderBottom: "1px solid var(--border-medium, #2a2a2a)",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {selectedDraft.draft._draftMeta.draftStatus === "pending" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isProcessing ? "wait" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      opacity: isProcessing ? 0.7 : 1,
                    }}
                  >
                    Approve & Publish
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "transparent",
                      color: "#ef4444",
                      border: "1px solid #ef4444",
                      borderRadius: "4px",
                      cursor: isProcessing ? "wait" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      opacity: isProcessing ? 0.7 : 1,
                    }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={handleDelete}
                disabled={isProcessing}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: "#999",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  cursor: isProcessing ? "wait" : "pointer",
                  fontSize: "0.875rem",
                  marginLeft: "auto",
                }}
              >
                Delete
              </button>
            </div>

            {/* Preview Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
              {selectedDraft.type === "training-content" ? (
                <TrainingContentPreview draft={selectedDraft.draft} />
              ) : (
                <RouteIntelPreview draft={selectedDraft.draft} />
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
            }}
          >
            Select a draft to preview
          </div>
        )}
      </div>
    </div>
  );
}

function TrainingContentPreview({ draft }: { draft: TrainingContentDraft }) {
  const { data } = draft;
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          {data.title || "Untitled"}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          {data.topics?.map((topic) => (
            <span
              key={topic}
              style={{
                padding: "0.25rem 0.5rem",
                background: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#666" }}>
          By {data.author} • Tier: {data.tier}
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#999", marginBottom: "0.5rem" }}>
          SUMMARY
        </h3>
        <p style={{ fontSize: "1rem", lineHeight: 1.6 }}>{data.summary}</p>
      </div>

      {data.body && (
        <div>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#999", marginBottom: "0.5rem" }}>
            CONTENT
          </h3>
          <div
            style={{
              padding: "1rem",
              background: "#1a1f28",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {data.body}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteIntelPreview({ draft }: { draft: RouteIntelDraft }) {
  const { data } = draft;
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Route Intel Caption
        </h1>
        <div style={{ fontSize: "0.875rem", color: "#666" }}>
          Event: <strong>{data.eventId}</strong> • Route: <strong>{data.routeId}</strong>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#999", marginBottom: "0.5rem" }}>
          CAPTION / NOTES
        </h3>
        <div
          style={{
            padding: "1rem",
            background: "#1a1f28",
            borderRadius: "8px",
            fontSize: "1rem",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {data.caption}
        </div>
      </div>

      {data.sectionCaptions && Object.keys(data.sectionCaptions).length > 0 && (
        <div>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#999", marginBottom: "0.5rem" }}>
            SECTION CAPTIONS
          </h3>
          {Object.entries(data.sectionCaptions).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: "0.75rem",
                background: "#1a1f28",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
                {key}
              </div>
              <div style={{ fontSize: "0.875rem" }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "rgba(234, 179, 8, 0.1)",
          borderRadius: "8px",
          border: "1px solid rgba(234, 179, 8, 0.3)",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "#eab308" }}>
          <strong>Note:</strong> This is a simplified mobile caption. Before publishing, you may want
          to configure the full route intel settings (distance variants, section mode, enabled POIs)
          in the Route Intel Builder.
        </p>
      </div>
    </div>
  );
}
