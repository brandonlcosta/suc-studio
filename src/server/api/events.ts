import express from "express";
import {
  loadEventsMaster,
  saveEventsMaster,
  loadEventsSelection,
  saveEventsSelection,
} from "../utils/sharedData.js";
import type { EventsMaster, EventsSelection } from "../types.js";

const router = express.Router();

/**
 * GET /api/events
 * Read events.master.json
 */
router.get("/", (_req, res) => {
  try {
    const eventsMaster = loadEventsMaster();
    return res.json(eventsMaster);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load events error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/events
 * Update events.master.json
 */
router.post("/", (req, res) => {
  try {
    const body = req.body as EventsMaster;

    // Validate
    if (!body.version || !Array.isArray(body.events)) {
      return res.status(400).json({ error: "Invalid events data" });
    }

    saveEventsMaster(body);

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save events error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/events/selection
 * Read events.selection.json
 */
router.get("/selection", (_req, res) => {
  try {
    const eventsSelection = loadEventsSelection();
    return res.json(eventsSelection);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load events selection error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/events/selection
 * Update events.selection.json
 */
router.post("/selection", (req, res) => {
  try {
    const body = req.body as EventsSelection;

    // Validate
    if (!body.version || !Array.isArray(body.selectedEventIds)) {
      return res.status(400).json({ error: "Invalid selection data" });
    }

    saveEventsSelection(body);

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save events selection error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
