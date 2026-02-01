import express from "express";
import {
  loadWorkoutsMaster,
  saveWorkoutsMaster,
} from "../utils/sharedData.js";
import type { Workout } from "../types.js";

const router = express.Router();

const nowISO = () => new Date().toISOString();

const loadDrafts = (): Workout[] => {
  const master = loadWorkoutsMaster();
  return master.workouts.filter((workout) => workout.status === "draft");
};

const upsertDraft = (workout: Workout): Workout => {
  const master = loadWorkoutsMaster();
  const now = nowISO();
  const next: Workout = {
    ...workout,
    status: "draft",
    version: 0,
    createdAt: workout.createdAt || now,
    updatedAt: now,
    publishedAt: null,
  };

  const index = master.workouts.findIndex(
    (entry) =>
      entry.workoutId === workout.workoutId &&
      entry.status === "draft"
  );
  if (index >= 0) {
    master.workouts[index] = next;
  } else {
    master.workouts.push(next);
  }

  saveWorkoutsMaster(master);
  return next;
};

/**
 * GET /api/workout-draft
 * Deprecated wrapper: return latest draft from workouts.master.json
 */
router.get("/", (_req, res) => {
  try {
    const drafts = loadDrafts();
    if (drafts.length === 0) {
      return res.status(404).json({ error: "Workout draft not found" });
    }
    const latest = drafts.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
    return res.json(latest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load workout draft error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/workout-draft
 * Deprecated wrapper: upsert draft into workouts.master.json
 */
router.post("/", (req, res) => {
  console.log("Incoming workout payload:", JSON.stringify(req.body, null, 2));
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Workout draft payload is required." });
    }
    const next = upsertDraft(req.body as Workout);
    return res.status(200).json(next);
  } catch (error) {
    console.error("Workout API error:", error);
    return res.status(500).json({ error: String(error) });
  }
});

router.put("/", (req, res) => {
  console.log("Incoming workout payload:", JSON.stringify(req.body, null, 2));
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Workout draft payload is required." });
    }
    const next = upsertDraft(req.body as Workout);
    return res.status(200).json(next);
  } catch (error) {
    console.error("Workout API error:", error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * DELETE /api/workout-draft
 * Deprecated wrapper: delete latest draft from workouts.master.json
 */
router.delete("/", (_req, res) => {
  try {
    const master = loadWorkoutsMaster();
    const drafts = master.workouts.filter((workout) => workout.status === "draft");
    if (drafts.length > 0) {
      const latest = drafts.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
      master.workouts = master.workouts.filter(
        (workout) => !(workout.workoutId === latest.workoutId && workout.status === "draft")
      );
      saveWorkoutsMaster(master);
    }
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete workout draft error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
