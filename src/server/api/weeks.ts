import express from "express";
import { readWeeks, writeWeeks } from "../utils/studioData.js";
import type { Week } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await readWeeks();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load weeks error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body as Week[];
    await writeWeeks(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save weeks error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
