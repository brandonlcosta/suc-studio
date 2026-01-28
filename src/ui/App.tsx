import { useState } from "react";
import NavigationBar from "./components/NavigationBar";
import RouteManager from "./screens/RouteManager";
import EventBuilder from "./screens/EventBuilder";
import WorkoutBuilder from "./screens/WorkoutBuilder";

type Screen = "routes" | "events" | "workouts";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("routes");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <NavigationBar activeScreen={activeScreen} onNavigate={setActiveScreen} />

      {activeScreen === "routes" && <RouteManager />}
      {activeScreen === "events" && <EventBuilder />}
      {activeScreen === "workouts" && <WorkoutBuilder />}
    </div>
  );
}
