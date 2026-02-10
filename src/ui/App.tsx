import { useState } from "react";
import NavigationBar from "./components/NavigationBar";
import RouteManager from "./screens/RouteManager";
import EventBuilder from "./screens/EventBuilder";
import WorkoutBuilder from "./screens/WorkoutBuilder";
import SeasonBuilder from "./screens/SeasonBuilder";
import RosterBuilder from "./screens/RosterBuilder";
import ChallengeBuilder from "./screens/ChallengeBuilder";
import TipsManager from "./screens/TipsManager";
import RouteIntelBuilder from "./screens/RouteIntelBuilder/RouteIntelBuilder";

type Screen =
  | "routes"
  | "events"
  | "workouts"
  | "season"
  | "roster"
  | "challenges"
  | "tips"
  | "route-intel";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("season");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <NavigationBar activeScreen={activeScreen} onNavigate={setActiveScreen} />

      {activeScreen === "routes" && <RouteManager />}
      {activeScreen === "events" && <EventBuilder />}
      {activeScreen === "workouts" && <WorkoutBuilder />}
      {activeScreen === "season" && <SeasonBuilder />}
      {activeScreen === "roster" && <RosterBuilder />}
      {activeScreen === "challenges" && <ChallengeBuilder />}
      {activeScreen === "tips" && <TipsManager />}
      {activeScreen === "route-intel" && <RouteIntelBuilder />}
    </div>
  );
}
