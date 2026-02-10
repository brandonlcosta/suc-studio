import express from "express";
import { readContent, upsertContent, archiveContent } from "../utils/contentData.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await readContent("crew-run-recaps");
    return res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load crew run recaps error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = req.body;

    if (!item.id || !item.eventName || !item.eventDate) {
      return res.status(400).json({ error: "ID, event name, and event date are required." });
    }

    await upsertContent("crew-run-recaps", item);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save crew run recap error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/archive", async (req, res) => {
  try {
    const { id } = req.body as { id: string };

    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    await archiveContent("crew-run-recaps", id);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Archive crew run recap error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
