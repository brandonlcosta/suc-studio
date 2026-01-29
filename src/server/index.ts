import express from "express";
import cors from "cors";
import routesRouter from "./api/routes.js";
import eventsRouter from "./api/events.js";
import workoutsRouter from "./api/workouts.js";
import studioDataRouter from "./api/studioData.js";
import { SHARED_DATA_ROOT } from "./utils/paths.js";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Log shared data root on startup
console.log("[Studio Server] Starting...");
console.log(`[Studio Server] Shared data root: ${SHARED_DATA_ROOT}`);

// API Routes
app.use("/api/routes", routesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/studio-data", studioDataRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", sharedDataRoot: SHARED_DATA_ROOT });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Studio Server] Listening on http://localhost:${PORT}`);
  console.log(`[Studio Server] API available at http://localhost:${PORT}/api`);
});
