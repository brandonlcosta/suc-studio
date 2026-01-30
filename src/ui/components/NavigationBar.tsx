type Screen = "routes" | "events" | "workouts" | "season" | "roster" | "challenges";

interface NavigationBarProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function NavigationBar({ activeScreen, onNavigate }: NavigationBarProps) {
  const screens: Array<{ id: Screen; label: string }> = [
    { id: "season", label: "Season Builder" },
    { id: "roster", label: "Roster Builder" },
    { id: "challenges", label: "Challenge Builder" },
    { id: "routes", label: "Route Manager" },
    { id: "events", label: "Event Builder" },
    { id: "workouts", label: "Workout Builder" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.5rem",
        padding: "1rem",
        backgroundColor: "#111827",
        borderBottom: "1px solid #374151",
      }}
    >
      <div style={{ color: "white", fontWeight: "700", marginRight: "1rem" }}>
        SUC Studio
      </div>

      {screens.map((screen) => {
        const isActive = activeScreen === screen.id;
        return (
          <button
            key={screen.id}
            onClick={() => onNavigate(screen.id)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: isActive ? "#374151" : "transparent",
              color: isActive ? "white" : "#9CA3AF",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: isActive ? "600" : "400",
              transition: "all 0.2s ease",
            }}
          >
            {screen.label}
          </button>
        );
      })}
    </nav>
  );
}
