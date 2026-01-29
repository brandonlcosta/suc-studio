import express from "express";
import { readStudioData, writeStudioData } from "../utils/studioData.js";

const router = express.Router();

router.get("/:fileName", (req, res) => {
  const { fileName } = req.params;
  try {
    const data = readStudioData(fileName);
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load studio data error:", error);
    return res.status(500).json({ error: message });
  }
});

router.put("/:fileName", (req, res) => {
  const { fileName } = req.params;
  try {
    const payload = req.body as unknown;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: "Payload must be an array." });
    }
    writeStudioData(fileName, payload);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save studio data error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
