import express from "express";
import {
  listRouteIntel,
  readRouteIntel,
  writeRouteIntel,
  deleteRouteIntel,
} from "../utils/routeIntelData.js";
import type { RouteIntelDoc } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await listRouteIntel();
    return res.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load route intel error:", error);
    return res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await readRouteIntel(id);
    return res.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Read route intel error:", error);
    return res.status(404).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body as RouteIntelDoc;

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid route intel payload." });
    }
    if (!body.id || body.type !== "route-intel") {
      return res.status(400).json({ error: "Route intel requires id and type=route-intel." });
    }

    await writeRouteIntel(body);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save route intel error:", error);
    return res.status(500).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id?.trim()) {
      return res.status(400).json({ error: "Route intel id is required." });
    }
    await deleteRouteIntel(id);
    return res.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete route intel error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
