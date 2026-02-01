import express from "express";
import { readBlocks, writeBlocks } from "../utils/studioData.js";
import type { Block } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await readBlocks();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load blocks error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body as Block[];
    await writeBlocks(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save blocks error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
