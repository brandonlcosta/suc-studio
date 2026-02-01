import express from "express";
import { readChallenges, writeChallenges } from "../utils/studioData.js";
import type { Challenge } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await readChallenges();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load challenges error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body as Challenge[];
    await writeChallenges(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save challenges error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
