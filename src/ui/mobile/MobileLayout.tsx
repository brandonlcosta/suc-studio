import { Outlet, useNavigate, useLocation } from "react-router-dom";

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#0a0e14",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
    borderBottom: "1px solid #2a2a2a",
    background: "#0f1115",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#999",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: "1rem",
    overflowY: "auto" as const,
  },
};

const ROUTE_TITLES: Record<string, string> = {
  "/mobile": "SUC Studio Mobile",
  "/mobile/training-tip": "New Training Tip",
  "/mobile/route-intel": "New Route Intel",
  "/mobile/drafts": "My Drafts",
};

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/mobile";
  const title = ROUTE_TITLES[location.pathname] || "SUC Studio Mobile";

  const handleBack = () => {
    if (location.pathname.startsWith("/mobile/training-tip/") ||
        location.pathname.startsWith("/mobile/route-intel/")) {
      navigate("/mobile/drafts");
    } else {
      navigate("/mobile");
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        {!isHome && (
          <button style={styles.backButton} onClick={handleBack} aria-label="Go back">
            ←
          </button>
        )}
        <h1 style={styles.title}>{title}</h1>
      </header>
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
