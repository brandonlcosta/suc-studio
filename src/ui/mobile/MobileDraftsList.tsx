import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildStudioApiUrl } from "../utils/studioApi";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  sectionTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  card: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    padding: "1rem",
    background: "#1a1f28",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s, border-color 0.2s",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#f5f5f5",
  },
  cardMeta: {
    fontSize: "0.75rem",
    color: "#666",
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  badge: {
    display: "inline-block",
    padding: "0.125rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.625rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },
  pendingBadge: {
    background: "rgba(234, 179, 8, 0.2)",
    color: "#eab308",
  },
  approvedBadge: {
    background: "rgba(34, 197, 94, 0.2)",
    color: "#22c55e",
  },
  rejectedBadge: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
  },
  mobileBadge: {
    background: "rgba(59, 130, 246, 0.2)",
    color: "#3b82f6",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "2rem",
    color: "#666",
  },
  loading: {
    textAlign: "center" as const,
    padding: "2rem",
    color: "#999",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.875rem",
    padding: "0.75rem",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: "8px",
  },
  deleteButton: {
    alignSelf: "flex-end",
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    background: "transparent",
    border: "1px solid #4a4a4a",
    borderRadius: "4px",
    color: "#999",
    cursor: "pointer",
  },
};

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
    title: string;
    summary: string;
    topics: string[];
  };
};

type RouteIntelDraft = {
  _draftMeta: DraftMeta;
  data: {
    eventId: string;
    routeId: string;
    caption: string;
  };
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const badgeStyle =
    status === "approved"
      ? styles.approvedBadge
      : status === "rejected"
      ? styles.rejectedBadge
      : styles.pendingBadge;

  return <span style={{ ...styles.badge, ...badgeStyle }}>{status}</span>;
}

export default function MobileDraftsList() {
  const navigate = useNavigate();

  const [trainingDrafts, setTrainingDrafts] = useState<TrainingContentDraft[]>([]);
  const [routeIntelDrafts, setRouteIntelDrafts] = useState<RouteIntelDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDeleteTrainingDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this draft?")) return;

    try {
      const url = buildStudioApiUrl(`/drafts/training-content/${draftId}`);
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete draft");
      }
      setTrainingDrafts((prev) => prev.filter((d) => d._draftMeta.draftId !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    }
  };

  const handleDeleteRouteIntelDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this draft?")) return;

    try {
      const url = buildStudioApiUrl(`/drafts/route-intel/${draftId}`);
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete draft");
      }
      setRouteIntelDrafts((prev) => prev.filter((d) => d._draftMeta.draftId !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    }
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading drafts...</div>;
  }

  const hasNoDrafts = trainingDrafts.length === 0 && routeIntelDrafts.length === 0;

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}

      {hasNoDrafts ? (
        <div style={styles.emptyState}>
          <p>No drafts yet.</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Create a new training tip or route intel caption to get started.
          </p>
        </div>
      ) : (
        <>
          {trainingDrafts.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Training Tips</h2>
              {trainingDrafts.map((draft) => (
                <div
                  key={draft._draftMeta.draftId}
                  style={styles.card}
                  onClick={() => navigate(`/mobile/training-tip/${draft._draftMeta.draftId}`)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#242a35";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#1a1f28";
                    e.currentTarget.style.borderColor = "#2a2a2a";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={styles.cardTitle}>{draft.data.title || "Untitled"}</span>
                    <button
                      style={styles.deleteButton}
                      onClick={(e) => handleDeleteTrainingDraft(draft._draftMeta.draftId, e)}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={styles.cardMeta}>
                    <StatusBadge status={draft._draftMeta.draftStatus} />
                    {draft._draftMeta.draftSource === "mobile" && (
                      <span style={{ ...styles.badge, ...styles.mobileBadge }}>mobile</span>
                    )}
                    <span>{formatDate(draft._draftMeta.draftUpdatedAt)}</span>
                    {draft.data.topics?.[0] && <span>{draft.data.topics[0]}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {routeIntelDrafts.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Route Intel</h2>
              {routeIntelDrafts.map((draft) => (
                <div
                  key={draft._draftMeta.draftId}
                  style={styles.card}
                  onClick={() => navigate(`/mobile/route-intel/${draft._draftMeta.draftId}`)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#242a35";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#1a1f28";
                    e.currentTarget.style.borderColor = "#2a2a2a";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={styles.cardTitle}>
                      {draft.data.caption?.slice(0, 50) || "Route caption"}
                      {draft.data.caption?.length > 50 ? "..." : ""}
                    </span>
                    <button
                      style={styles.deleteButton}
                      onClick={(e) => handleDeleteRouteIntelDraft(draft._draftMeta.draftId, e)}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={styles.cardMeta}>
                    <StatusBadge status={draft._draftMeta.draftStatus} />
                    {draft._draftMeta.draftSource === "mobile" && (
                      <span style={{ ...styles.badge, ...styles.mobileBadge }}>mobile</span>
                    )}
                    <span>{formatDate(draft._draftMeta.draftUpdatedAt)}</span>
                    <span>Route: {draft.data.routeId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
