import express from "express";
import { readContent, upsertContent, archiveContent } from "../utils/contentData.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await readContent("race-recaps");
    return res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load race recaps error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = req.body;

    if (!item.id || !item.raceName || !item.distance) {
      return res.status(400).json({ error: "ID, race name, and distance are required." });
    }

    await upsertContent("race-recaps", item);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save race recap error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/archive", async (req, res) => {
  try {
    const { id } = req.body as { id: string };

    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    await archiveContent("race-recaps", id);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Archive race recap error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
