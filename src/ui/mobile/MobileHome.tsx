import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
    maxWidth: "400px",
    margin: "0 auto",
    paddingTop: "1rem",
  },
  actionButton: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1.5rem",
    background: "#1a1f28",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "background 0.2s, border-color 0.2s",
    minHeight: "120px",
  },
  actionIcon: {
    fontSize: "2rem",
  },
  actionLabel: {
    fontSize: "1rem",
    fontWeight: 500,
    color: "#f5f5f5",
  },
  actionDescription: {
    fontSize: "0.875rem",
    color: "#999",
    textAlign: "center" as const,
  },
  divider: {
    height: "1px",
    background: "#2a2a2a",
    margin: "0.5rem 0",
  },
};

export default function MobileHome() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <button
        style={styles.actionButton}
        onClick={() => navigate("/mobile/training-tip")}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#242a35";
          e.currentTarget.style.borderColor = "#3a3a3a";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#1a1f28";
          e.currentTarget.style.borderColor = "#2a2a2a";
        }}
      >
        <span style={styles.actionIcon}>📝</span>
        <span style={styles.actionLabel}>New Training Tip</span>
        <span style={styles.actionDescription}>
          Create a quick training tip draft
        </span>
      </button>

      <button
        style={styles.actionButton}
        onClick={() => navigate("/mobile/route-intel")}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#242a35";
          e.currentTarget.style.borderColor = "#3a3a3a";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#1a1f28";
          e.currentTarget.style.borderColor = "#2a2a2a";
        }}
      >
        <span style={styles.actionIcon}>🗺️</span>
        <span style={styles.actionLabel}>New Route Intel</span>
        <span style={styles.actionDescription}>
          Add caption notes for a route
        </span>
      </button>

      <div style={styles.divider} />

      <button
        style={styles.actionButton}
        onClick={() => navigate("/mobile/drafts")}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#242a35";
          e.currentTarget.style.borderColor = "#3a3a3a";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#1a1f28";
          e.currentTarget.style.borderColor = "#2a2a2a";
        }}
      >
        <span style={styles.actionIcon}>📋</span>
        <span style={styles.actionLabel}>View My Drafts</span>
        <span style={styles.actionDescription}>
          See and edit pending drafts
        </span>
      </button>
    </div>
  );
}
