export default function WorkoutBuilder() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "calc(100vh - 60px)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏋️</div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#111827" }}>
        Workout Builder
      </h2>
      <p style={{ fontSize: "1rem", color: "#666", maxWidth: "500px" }}>
        The workout builder is coming soon. This will allow you to create and manage
        workouts that reference route groups, edit workouts.master.json, and more.
      </p>
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "6px",
          fontSize: "0.875rem",
          color: "#555",
        }}
      >
        Scaffold placeholder for Phase 3
      </div>
    </div>
  );
}
