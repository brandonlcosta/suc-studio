import express from "express";
import {
  listRouteMedia,
  readRouteMedia,
  writeRouteMedia
} from "../utils/routeMediaData.js";
import { getRouteMediaSchema, validateRouteMediaPayload } from "../utils/routeMediaSchema.js";
import type { RouteMediaDoc } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await listRouteMedia();
    return res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load route media error:", error);
    return res.status(500).json({ error: message });
  }
});

router.get("/schema", async (_req, res) => {
  try {
    const schema = await getRouteMediaSchema();
    return res.json(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load route media schema error:", error);
    return res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await readRouteMedia(id);
    return res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Read route media error:", error);
    return res.status(404).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body as RouteMediaDoc;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid route media payload." });
    }
    if (!body.id || body.type !== "route-media") {
      return res.status(400).json({ error: "Route media requires id and type=route-media." });
    }

    const validation = await validateRouteMediaPayload(body);
    if (!validation.ok) {
      return res.status(400).json({
        error: "Route media schema validation failed.",
        details: validation.errors,
      });
    }

    await writeRouteMedia(body);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save route media error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
