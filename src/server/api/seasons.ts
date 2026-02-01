import express from "express";
import { readSeasons, writeSeasons } from "../utils/studioData.js";
import type { Season } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await readSeasons();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load seasons error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body as Season[];
    await writeSeasons(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save seasons error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
