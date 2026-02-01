import express from "express";
import cors from "cors";
import routesRouter from "./api/routes.js";
import eventsRouter from "./api/events.js";
import workoutsRouter from "./api/workouts.js";
import workoutDraftRouter from "./api/workoutDraft.js";
import workoutPublishedRouter from "./api/workoutPublished.js";
import rosterRouter from "./api/roster.js";
import seasonsRouter from "./api/seasons.js";
import blocksRouter from "./api/blocks.js";
import weeksRouter from "./api/weeks.js";
import challengesRouter from "./api/challenges.js";
import seasonBuilderRouter from "./api/seasonBuilder.js";
import { SHARED_DATA_ROOT } from "./utils/paths.js";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  return next();
});

// Log shared data root on startup
console.log("[Studio Server] Starting...");
console.log(`[Studio Server] Shared data root: ${SHARED_DATA_ROOT}`);

// API Routes
app.use("/api/routes", routesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/workout-draft", workoutDraftRouter);
app.use("/api/workout-published", workoutPublishedRouter);
app.use("/api/roster", rosterRouter);
app.use("/api/seasons", seasonsRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/weeks", weeksRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/season", seasonBuilderRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    sharedDataRoot: SHARED_DATA_ROOT,
    apis: [
      "/api/routes",
      "/api/events",
      "/api/events/selection",
      "/api/workouts",
      "/api/workout-draft",
      "/api/workout-published",
      "/api/roster",
      "/api/seasons",
      "/api/blocks",
      "/api/weeks",
      "/api/challenges",
      "/api/season",
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Studio Server] Listening on http://localhost:${PORT}`);
  console.log(`[Studio Server] API available at http://localhost:${PORT}/api`);
});
