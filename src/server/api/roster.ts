import express from "express";
import { readRoster, writeRoster } from "../utils/rosterData.js";
import type { RosterMember } from "../types.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const data = await readRoster();
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load roster error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body as RosterMember[];
    await writeRoster(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save roster error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
