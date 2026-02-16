import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import StudioHome from "../studio/StudioHome";
import SeasonBuilder from "./screens/SeasonBuilder";
import WorkoutBuilder from "./screens/WorkoutBuilder";
import RouteManager from "./screens/RouteManager";
import EventBuilder from "./screens/EventBuilder";
import RosterBuilder from "./screens/RosterBuilder";
import ChallengeBuilder from "./screens/ChallengeBuilder";
import TipsManager from "./screens/TipsManager";
import RouteIntelBuilder from "./screens/RouteIntelBuilder/RouteIntelBuilder";
import RouteMediaBuilder from "./screens/RouteMediaBuilder/RouteMediaBuilder";

// Desktop screens
import DraftInbox from "./screens/DraftInbox";

// Mobile components
import MobileLayout from "./mobile/MobileLayout";
import MobileHome from "./mobile/MobileHome";
import MobileTrainingTipForm from "./mobile/MobileTrainingTipForm";
import MobileRouteIntelForm from "./mobile/MobileRouteIntelForm";
import MobileDraftsList from "./mobile/MobileDraftsList";

console.log("[STUDIO] VITE_API_BASE =", import.meta.env.VITE_API_BASE);

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    background-color: #0a0e14;
    color: #f5f5f5;
    height: 100%;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    font-family: inherit;
  }

  input, textarea {
    font-family: inherit;
  }
`;

// Inject global styles
const styleElement = document.createElement("style");
styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

function StudioNav() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "0.5rem 0.75rem",
    color: isActive ? "#f5f5f5" : "#999999",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #2a2a2a",
        background: "#0f1115",
      }}
    >
      <NavLink to="/" style={linkStyle}>
        Home
      </NavLink>
      <NavLink to="/studio/workouts" style={linkStyle}>
        Workouts
      </NavLink>
      <NavLink to="/studio/routes" style={linkStyle}>
        Routes
      </NavLink>
      <NavLink to="/studio/events" style={linkStyle}>
        Events
      </NavLink>
      <NavLink to="/studio/seasons" style={linkStyle}>
        Blocks
      </NavLink>
      <NavLink to="/studio/roster" style={linkStyle}>
        Roster
      </NavLink>
      <NavLink to="/studio/challenges" style={linkStyle}>
        Challenges
      </NavLink>
      <NavLink to="/studio/route-intel" style={linkStyle}>
        Route Intel
      </NavLink>
      <NavLink to="/route-media" style={linkStyle}>
        Cinematic
      </NavLink>
      <NavLink to="/tips" style={linkStyle}>
        Tips
      </NavLink>
      <NavLink to="/drafts" style={linkStyle}>
        Drafts
      </NavLink>
    </nav>
  );
}

// Render app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>
);

function AppShell() {
  return (
    <>
      <StudioNav />
      <Routes>
        <Route path="/" element={<StudioHome />} />
        <Route path="/studio/workouts" element={<WorkoutBuilder />} />
        <Route path="/workouts/:id" element={<WorkoutBuilder />} />
        <Route path="/studio/routes" element={<RouteManager />} />
        <Route path="/studio/events" element={<EventBuilder />} />
        <Route path="/studio/seasons" element={<SeasonBuilder />} />
        <Route path="/seasons" element={<SeasonBuilder />} />
        <Route path="/studio/roster" element={<RosterBuilder />} />
        <Route path="/studio/challenges" element={<ChallengeBuilder />} />
        <Route path="/studio/route-intel" element={<RouteIntelBuilder />} />
        <Route path="/route-media" element={<RouteMediaBuilder />} />
        <Route path="/studio/route-media" element={<RouteMediaBuilder />} />
        <Route path="/tips" element={<TipsManager />} />
        <Route path="/drafts" element={<DraftInbox />} />

        {/* Mobile routes */}
        <Route path="/mobile" element={<MobileLayout />}>
          <Route index element={<MobileHome />} />
          <Route path="training-tip" element={<MobileTrainingTipForm />} />
          <Route path="training-tip/:id" element={<MobileTrainingTipForm />} />
          <Route path="route-intel" element={<MobileRouteIntelForm />} />
          <Route path="route-intel/:id" element={<MobileRouteIntelForm />} />
          <Route path="drafts" element={<MobileDraftsList />} />
        </Route>
      </Routes>
    </>
  );
}
