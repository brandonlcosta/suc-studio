import express from "express";
import {
  loadWorkoutsMaster,
  saveWorkoutsMaster,
} from "../utils/sharedData.js";
import type { WorkoutsMaster } from "../types.js";

const router = express.Router();

/**
 * GET /api/workouts
 * Read workouts.master.json
 */
router.get("/", (_req, res) => {
  try {
    const workoutsMaster = loadWorkoutsMaster();
    return res.json(workoutsMaster);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load workouts error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/workouts
 * Update workouts.master.json
 */
router.post("/", (req, res) => {
  try {
    const body = req.body as WorkoutsMaster;

    // Validate
    if (!body.version || !Array.isArray(body.workouts)) {
      return res.status(400).json({ error: "Invalid workouts data" });
    }

    saveWorkoutsMaster(body);

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save workouts error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
