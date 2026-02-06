import express from "express";
import {
  createNewDraftSeason,
  loadDraftSeason,
  loadPublishedSeason,
  publishDraftSeason,
  saveDraftSeason,
} from "../season-builder/persistence.js";
import { assertSeason } from "../season-builder/validation.js";
import {
  addBlockAfter,
  addSeasonMarker,
  addWeekToBlock,
  extendBlock,
  moveBlock,
  moveSeasonMarker,
  removeBlock,
  removeSeasonMarker,
  removeWeekFromBlock,
  shrinkBlock,
  updateSeason,
  updateBlock,
  updateWeek,
} from "../season-builder/mutations/seasonMutations.js";
import type { Season } from "../season-builder/types.js";

const router = express.Router();

function isJsonParseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof SyntaxError) return true;
  if ("message" in error && typeof error.message === "string") {
    return error.message.includes("Failed to read JSON") && error.message.includes("Unexpected");
  }
  return false;
}

type MutationAction =
  | "updateSeason"
  | "addBlockAfter"
  | "removeBlock"
  | "moveBlock"
  | "addWeekToBlock"
  | "removeWeekFromBlock"
  | "updateBlock"
  | "updateWeek"
  | "extendBlock"
  | "shrinkBlock"
  | "addSeasonMarker"
  | "moveSeasonMarker"
  | "removeSeasonMarker";

router.post("/draft/create", async (_req, res) => {
  try {
    try {
      await loadDraftSeason();
    } catch (error) {
      if (isJsonParseError(error)) {
        console.warn("Draft season JSON is corrupted. Overwriting with new draft.");
      } else if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code !== "ENOENT") {
          throw error;
        }
      } else {
        throw error;
      }
    }
    const season = await createNewDraftSeason();
    return res.status(201).json(season);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create season draft error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/draft/ensure", async (_req, res) => {
  try {
    let draft: Season | null = null;
    try {
      draft = await loadDraftSeason();
    } catch (error) {
      if (isJsonParseError(error)) {
        console.warn("Draft season JSON is corrupted. Overwriting with new draft.");
      } else if (error && typeof error === "object" && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code !== "ENOENT") {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (draft) {
      return res.status(200).json(draft);
    }

    const published = await loadPublishedSeason();
    if (published) {
      const next: Season = { ...published, status: "draft" };
      await saveDraftSeason(next);
      return res.status(201).json(next);
    }

    const season = await createNewDraftSeason();
    return res.status(201).json(season);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Ensure season draft error:", error);
    return res.status(500).json({ error: message });
  }
});

router.get("/draft", async (_req, res) => {
  try {
    const season = await loadDraftSeason();
    if (!season) {
      return res.status(404).json({ error: "Season draft not found" });
    }
    return res.json(season);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT") {
        return res.status(404).json({ error: "No draft season exists" });
      }
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load season draft error:", error);
    return res.status(500).json({ error: message });
  }
});

router.post("/draft/mutate", async (req, res) => {
  try {
    const body = req.body as { action?: MutationAction; args?: Record<string, unknown> };
    if (!body || typeof body.action !== "string") {
      return res.status(400).json({ error: "Mutation action is required." });
    }

    const draft = await loadDraftSeason();
    if (!draft) {
      return res.status(404).json({ error: "Season draft not found" });
    }

    const args = body.args ?? {};
    let next: Season;

    switch (body.action) {
      case "updateSeason":
        next = updateSeason(
          draft,
          args.partialUpdate as Partial<Pick<Season, "startDate">>
        );
        break;
      case "addBlockAfter":
        next = addBlockAfter(
          draft,
          args.targetBlockId as string,
          args.blockTemplate as unknown as Season["blocks"][number] | undefined
        );
        break;
      case "removeBlock":
        next = removeBlock(draft, args.blockId as string);
        break;
      case "moveBlock":
        next = moveBlock(draft, args.blockId as string, args.newIndex as number);
        break;
      case "addWeekToBlock":
        next = addWeekToBlock(draft, args.blockId as string, args.position as number | undefined);
        break;
      case "removeWeekFromBlock":
        next = removeWeekFromBlock(draft, args.blockId as string, args.weekId as string);
        break;
      case "updateBlock":
        next = updateBlock(
          draft,
          args.blockId as string,
          args.partialUpdate as Partial<Season["blocks"][number]>
        );
        break;
      case "updateWeek":
        next = updateWeek(
          draft,
          args.blockId as string,
          args.weekId as string,
          args.partialUpdate as Partial<Season["blocks"][number]["weeks"][number]>
        );
        break;
      case "extendBlock":
        next = extendBlock(draft, args.blockId as string, args.count as number | undefined);
        break;
      case "shrinkBlock":
        next = shrinkBlock(draft, args.blockId as string, args.count as number | undefined);
        break;
      case "addSeasonMarker":
        next = addSeasonMarker(draft, args.weekIndex as number, args.label as string);
        break;
      case "moveSeasonMarker":
        next = moveSeasonMarker(draft, args.markerId as string, args.newWeekIndex as number);
        break;
      case "removeSeasonMarker":
        next = removeSeasonMarker(draft, args.markerId as string);
        break;
      default:
        return res.status(400).json({ error: `Unknown mutation action: ${body.action}` });
    }

    assertSeason(next);
    await saveDraftSeason(next);
    return res.status(200).json(next);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Season draft mutation error:", error);
    return res.status(400).json({ error: message });
  }
});

router.post("/publish", async (_req, res) => {
  try {
    const published = await publishDraftSeason();
    return res.status(200).json(published);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Publish season error:", error);
    return res.status(500).json({ error: message });
  }
});

router.get("/published", async (_req, res) => {
  try {
    const season = await loadPublishedSeason();
    if (!season) {
      return res.status(404).json({ error: "Published season not found" });
    }
    return res.json(season);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Load published season error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
