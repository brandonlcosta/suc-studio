import express from "express";
import path from "path";
import { spawn } from "child_process";
import {
  readTrainingContent,
  upsertTrainingContent,
  archiveTrainingContent,
  type TrainingContent,
} from "../utils/trainingContentData.js";

const router = express.Router();
const SHARED_DATA_ROOT = path.resolve(process.cwd(), "..", "suc-shared-data");
const BROADCAST_ROOT = path.resolve(process.cwd(), "..", "suc-broadcast");

type CommandResult = { ok: true; stdout: string; stderr: string } | { ok: false; error: string; stdout: string; stderr: string };

function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ ok: false, error: error.message, stdout, stderr });
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, stdout, stderr });
      } else {
        resolve({
          ok: false,
          error: `Command failed (${command} ${args.join(" ")}), exit ${code}`,
          stdout,
          stderr,
        });
      }
    });
  });
}

router.get("/", async (_req, res) => {
  try {
    const items = await readTrainingContent();
    return res.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load training content error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/upsert", async (req, res) => {
  try {
    const item = req.body as TrainingContent;

    if (!item.id || !item.title) {
      return res.status(400).json({ error: "ID and title are required." });
    }

    await upsertTrainingContent(item);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upsert training content error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/archive", async (req, res) => {
  try {
    const { id } = req.body as { id: string };

    if (!id) {
      return res.status(400).json({ error: "ID is required." });
    }

    await archiveTrainingContent(id);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Archive training content error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/publish", async (_req, res) => {
  try {
    const sharedBuild = await runCommand("npm", ["run", "build"], SHARED_DATA_ROOT);
    if (!sharedBuild.ok) {
      console.error("Training publish failed: shared-data build", sharedBuild);
      return res.status(500).json({ ok: false, error: sharedBuild.error, step: "shared-data build" });
    }

    const viewerBuild = await runCommand("npm", ["run", "viewer:build"], BROADCAST_ROOT);
    if (!viewerBuild.ok) {
      console.error("Training publish failed: broadcast viewer build", viewerBuild);
      return res.status(500).json({ ok: false, error: viewerBuild.error, step: "broadcast viewer build" });
    }

    return res.json({
      ok: true,
      steps: {
        sharedData: "built",
        viewer: "built",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Publish training content error:", error);
    return res.status(500).json({ ok: false, error: message });
  }
});

export default router;
