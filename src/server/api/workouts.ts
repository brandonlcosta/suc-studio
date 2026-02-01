import express from "express";
import {
  loadWorkoutsMaster,
  saveWorkoutsMaster,
} from "../utils/sharedData.js";
import type { Workout, WorkoutsMaster } from "../types.js";

const router = express.Router();

const nowISO = () => new Date().toISOString();

const loadMasterSafe = (): WorkoutsMaster => {
  try {
    const master = loadWorkoutsMaster();
    return {
      version: master.version ?? 1,
      workouts: Array.isArray(master.workouts) ? master.workouts : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("File not found")) {
      return { version: 1, workouts: [] };
    }
    throw error;
  }
};

const isWorkout = (value: unknown): value is Workout => {
  if (!value || typeof value !== "object") return false;
  const workout = value as Workout;
  return typeof workout.workoutId === "string" && typeof workout.status === "string";
};

const upsertWorkout = (incoming: Workout): Workout => {
  const master = loadMasterSafe();
  const now = nowISO();
  const index = master.workouts.findIndex((workout) =>
    workout.workoutId === incoming.workoutId &&
    workout.status === incoming.status &&
    workout.version === incoming.version
  );

  const createdAt = index >= 0 ? master.workouts[index].createdAt : incoming.createdAt || now;
  const next: Workout = {
    ...incoming,
    createdAt,
    updatedAt: now,
    publishedAt:
      incoming.status === "published"
        ? incoming.publishedAt ?? now
        : incoming.publishedAt ?? null,
  };

  if (index >= 0) {
    master.workouts[index] = next;
  } else {
    master.workouts.push(next);
  }

  saveWorkoutsMaster(master);
  return next;
};

const publishWorkout = (workoutId: string): Workout => {
  const master = loadMasterSafe();
  const draftIndex = master.workouts.findIndex(
    (workout) => workout.workoutId === workoutId && workout.status === "draft"
  );
  if (draftIndex < 0) {
    throw new Error(`Draft not found for workoutId: ${workoutId}`);
  }

  const draft = master.workouts[draftIndex];
  const maxPublishedVersion = master.workouts
    .filter((workout) => workout.workoutId === workoutId && workout.status === "published")
    .reduce((max, workout) => Math.max(max, workout.version ?? 0), 0);

  const now = nowISO();
  // Version increments only on publish; drafts stay at version 0.
  const published: Workout = {
    ...draft,
    status: "published",
    version: maxPublishedVersion + 1,
    publishedAt: now,
    updatedAt: now,
    createdAt: draft.createdAt || now,
  };

  master.workouts.splice(draftIndex, 1);
  master.workouts.push(published);
  saveWorkoutsMaster(master);
  return published;
};

const archiveWorkout = (workoutId: string, version?: number): Workout => {
  const master = loadMasterSafe();
  const candidates = master.workouts.filter(
    (workout) =>
      workout.workoutId === workoutId &&
      workout.status === "published" &&
      (version === undefined || workout.version === version)
  );
  if (candidates.length === 0) {
    throw new Error(`Published workout not found for workoutId: ${workoutId}`);
  }

  const target = candidates.sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  const index = master.workouts.findIndex(
    (workout) =>
      workout.workoutId === target.workoutId &&
      workout.status === "published" &&
      workout.version === target.version
  );

  const archived: Workout = {
    ...target,
    status: "archived",
    updatedAt: nowISO(),
  };

  master.workouts[index] = archived;
  saveWorkoutsMaster(master);
  return archived;
};

const deleteDraft = (workoutId: string): void => {
  const master = loadMasterSafe();
  const nextWorkouts = master.workouts.filter(
    (workout) => !(workout.workoutId === workoutId && workout.status === "draft")
  );
  master.workouts = nextWorkouts;
  saveWorkoutsMaster(master);
};

/**
 * GET /api/workouts
 * Read workouts.master.json
 */
router.get("/", (_req, res) => {
  try {
    const workoutsMaster = loadMasterSafe();
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

/**
 * POST /api/workouts/upsert
 * Upsert a single workout.
 */
router.post("/upsert", (req, res) => {
  try {
    if (!isWorkout(req.body)) {
      return res.status(400).json({ error: "Workout payload is required." });
    }
    const next = upsertWorkout(req.body);
    return res.json(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upsert workout error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/workouts/publish
 * Publish the latest draft for a workoutId (version increments on publish).
 */
router.post("/publish", (req, res) => {
  try {
    const body = req.body as { workoutId?: string; workout?: Workout };
    if (body?.workout && isWorkout(body.workout)) {
      upsertWorkout({ ...body.workout, status: "draft" });
    }
    const workoutId = body?.workoutId ?? body?.workout?.workoutId;
    if (!workoutId) {
      return res.status(400).json({ error: "workoutId is required." });
    }
    const published = publishWorkout(workoutId);
    return res.json(published);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Publish workout error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/workouts/archive
 * Archive a published workout.
 */
router.post("/archive", (req, res) => {
  try {
    const body = req.body as { workoutId?: string; version?: number };
    if (!body?.workoutId) {
      return res.status(400).json({ error: "workoutId is required." });
    }
    const archived = archiveWorkout(body.workoutId, body.version);
    return res.json(archived);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Archive workout error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/workouts/draft/:workoutId
 * Delete a draft workout.
 */
router.delete("/draft/:workoutId", (req, res) => {
  try {
    const workoutId = req.params.workoutId;
    if (!workoutId) {
      return res.status(400).json({ error: "workoutId is required." });
    }
    deleteDraft(workoutId);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete draft error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
