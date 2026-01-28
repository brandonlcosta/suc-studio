import express from "express";
import multer from "multer";
import { parseGPXText } from "../utils/gpxParser.js";
import {
  listRouteGroups,
  getRouteGroup,
  saveRouteGroup,
} from "../utils/sharedData.js";
import type { SaveRouteGroupRequest, RouteMeta } from "../types.js";

const router = express.Router();

// Configure multer for GPX file uploads (memory storage for parsing)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/routes/import
 * Parse GPX file and return route data for preview (does NOT save to disk).
 */
router.post("/import", upload.single("gpx"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No GPX file uploaded" });
    }

    const xmlStr = req.file.buffer.toString("utf8");
    const fileName = req.file.originalname;

    const parsed = parseGPXText(xmlStr, fileName);

    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GPX import error:", error);
    return res.status(400).json({ error: message });
  }
});

/**
 * GET /api/routes
 * List all route groups.
 */
router.get("/", (_req, res) => {
  try {
    const routeGroups = listRouteGroups();
    return res.json({ routeGroups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List route groups error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/routes/:groupId
 * Get a specific route group.
 */
router.get("/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    const routeGroup = getRouteGroup(groupId);

    if (!routeGroup) {
      return res.status(404).json({ error: "Route group not found" });
    }

    return res.json(routeGroup);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get route group error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/routes/:groupId
 * Save a route group to suc-shared-data/routes/:groupId/
 */
router.post("/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    const body = req.body as SaveRouteGroupRequest;

    // Validate request
    if (!body.name || !body.location || !body.variants || body.variants.length === 0) {
      return res.status(400).json({ error: "Invalid route group data" });
    }

    // Build metadata
    const meta: RouteMeta = {
      routeGroupId: groupId,
      name: body.name,
      location: body.location,
      source: body.source || "SUC",
      notes: body.notes || "",
      variants: body.variants.map((v) => v.label),
    };

    // Save to suc-shared-data
    saveRouteGroup(groupId, meta, body.variants);

    return res.json({
      success: true,
      routeGroupId: groupId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save route group error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
