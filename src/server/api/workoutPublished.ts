import express from "express";
import {
  loadWorkoutsMaster,
  saveWorkoutsMaster,
} from "../utils/sharedData.js";
import type { Workout } from "../types.js";

const router = express.Router();

const nowISO = () => new Date().toISOString();

const loadPublished = (): Workout[] => {
  const master = loadWorkoutsMaster();
  return master.workouts.filter((workout) => workout.status === "published");
};

const upsertPublished = (workout: Workout): Workout => {
  const master = loadWorkoutsMaster();
  const now = nowISO();
  const next: Workout = {
    ...workout,
    status: "published",
    version: workout.version > 0 ? workout.version : 1,
    createdAt: workout.createdAt || now,
    updatedAt: now,
    publishedAt: workout.publishedAt || now,
  };

  const index = master.workouts.findIndex(
    (entry) =>
      entry.workoutId === workout.workoutId &&
      entry.status === "published" &&
      entry.version === next.version
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
 * GET /api/workout-published
 * Deprecated wrapper: return latest published from workouts.master.json
 */
router.get("/", (_req, res) => {
  try {
    const published = loadPublished();
    if (published.length === 0) {
      return res.status(404).json({ error: "Workout published not found" });
    }
    const latest = published.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
    return res.json(latest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load workout published error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/workout-published
 * Deprecated wrapper: upsert published into workouts.master.json
 */
router.post("/", (req, res) => {
  console.log("Incoming workout payload:", JSON.stringify(req.body, null, 2));
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Workout published payload is required." });
    }

    const payload = req.body as Workout;
    if (payload.name === null || payload.name === "" || payload.name === undefined) {
      payload.name = "Untitled Workout";
    }
    const next = upsertPublished(payload);
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
      return res.status(400).json({ error: "Workout published payload is required." });
    }

    const payload = req.body as Workout;
    if (payload.name === null || payload.name === "" || payload.name === undefined) {
      payload.name = "Untitled Workout";
    }
    const next = upsertPublished(payload);
    return res.status(200).json(next);
  } catch (error) {
    console.error("Workout API error:", error);
    return res.status(500).json({ error: String(error) });
  }
});

/**
 * DELETE /api/workout-published
 * Deprecated wrapper: delete latest published from workouts.master.json
 */
router.delete("/", (_req, res) => {
  try {
    const master = loadWorkoutsMaster();
    const published = master.workouts.filter((workout) => workout.status === "published");
    if (published.length > 0) {
      const latest = published.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
      master.workouts = master.workouts.filter(
        (workout) =>
          !(
            workout.workoutId === latest.workoutId &&
            workout.status === "published" &&
            workout.version === latest.version
          )
      );
      saveWorkoutsMaster(master);
    }
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete workout published error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
