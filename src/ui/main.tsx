import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import StudioHome from "../studio/StudioHome";
import SeasonBuilder from "../studio/SeasonBuilder";
import WorkoutBuilder from "./screens/WorkoutBuilder";
import RouteManager from "./screens/RouteManager";
import EventBuilder from "./screens/EventBuilder";

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
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
    color: isActive ? "#111827" : "#4b5563",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #e5e7eb",
        background: "#f9fafb",
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
        Seasons
      </NavLink>
    </nav>
  );
}

// Render app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudioNav />
      <Routes>
        <Route path="/" element={<StudioHome />} />
        <Route path="/studio/workouts" element={<WorkoutBuilder />} />
        <Route path="/studio/routes" element={<RouteManager />} />
        <Route path="/studio/events" element={<EventBuilder />} />
        <Route path="/studio/seasons" element={<SeasonBuilder />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
