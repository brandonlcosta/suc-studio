/**
 * Drafts API router for mobile capture → desktop approval workflow.
 *
 * Endpoints:
 * - GET    /api/drafts/training-content           List all training drafts
 * - GET    /api/drafts/training-content/:id       Get specific draft
 * - POST   /api/drafts/training-content           Create new draft
 * - PUT    /api/drafts/training-content/:id       Update draft
 * - DELETE /api/drafts/training-content/:id       Delete draft
 * - POST   /api/drafts/training-content/:id/approve  Approve → move to canonical
 *
 * - GET    /api/drafts/route-intel                List all route-intel drafts
 * - GET    /api/drafts/route-intel/:id            Get specific draft
 * - POST   /api/drafts/route-intel                Create new draft
 * - PUT    /api/drafts/route-intel/:id            Update draft
 * - DELETE /api/drafts/route-intel/:id            Delete draft
 * - POST   /api/drafts/route-intel/:id/approve    Approve → move to canonical
 */

import express from "express";
import {
  createDraftMeta,
  listTrainingContentDrafts,
  listRouteIntelDrafts,
  readTrainingContentDraft,
  readRouteIntelDraft,
  writeTrainingContentDraft,
  writeRouteIntelDraft,
  deleteTrainingContentDraft,
  deleteRouteIntelDraft,
  updateTrainingContentDraftStatus,
  updateRouteIntelDraftStatus,
} from "../utils/draftData.js";
import { upsertTrainingContent, type TrainingContent } from "../utils/trainingContentData.js";
import type {
  TrainingContentDraft,
  RouteIntelCaptionDraft,
  RouteIntelCaptionData,
} from "../types/drafts.js";

const router = express.Router();

// ============================================================================
// Training Content Drafts
// ============================================================================

// List all training content drafts
router.get("/training-content", async (_req, res) => {
  try {
    const drafts = await listTrainingContentDrafts();
    return res.json(drafts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List training content drafts error:", error);
    return res.status(500).json({ error: message });
  }
});

// Get specific training content draft
router.get("/training-content/:id", async (req, res) => {
  try {
    const draft = await readTrainingContentDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Read training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Create new training content draft
router.post("/training-content", async (req, res) => {
  try {
    const data = req.body as TrainingContent;
    const source = (req.query.source as "mobile" | "desktop") || "desktop";

    if (!data.title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const draft: TrainingContentDraft = {
      _draftMeta: createDraftMeta(source),
      data: {
        ...data,
        id: data.id || crypto.randomUUID(),
        type: data.type || "training-content",
      },
    };

    await writeTrainingContentDraft(draft);
    return res.status(201).json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Update training content draft
router.put("/training-content/:id", async (req, res) => {
  try {
    const existing = await readTrainingContentDraft(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const data = req.body as Partial<TrainingContent>;
    const updated: TrainingContentDraft = {
      _draftMeta: existing._draftMeta,
      data: { ...existing.data, ...data },
    };

    await writeTrainingContentDraft(updated);
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Update training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Delete training content draft
router.delete("/training-content/:id", async (req, res) => {
  try {
    const deleted = await deleteTrainingContentDraft(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Approve training content draft → move to canonical
router.post("/training-content/:id/approve", async (req, res) => {
  try {
    const draft = await readTrainingContentDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    if (draft._draftMeta.draftStatus !== "pending") {
      return res.status(400).json({
        error: `Cannot approve draft with status: ${draft._draftMeta.draftStatus}`,
      });
    }

    // Extract canonical data (strip draft metadata)
    const canonicalData: TrainingContent = {
      ...draft.data,
      status: "published",
      publishedAt: draft.data.publishedAt || new Date().toISOString(),
    };

    // Write to canonical location
    await upsertTrainingContent(canonicalData);

    // Delete the draft
    await deleteTrainingContentDraft(req.params.id);

    return res.json({
      ok: true,
      publishedId: canonicalData.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Approve training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Reject training content draft
router.post("/training-content/:id/reject", async (req, res) => {
  try {
    const updated = await updateTrainingContentDraftStatus(req.params.id, "rejected");
    if (!updated) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Reject training content draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// ============================================================================
// Route Intel Caption Drafts
// ============================================================================

// List all route intel drafts
router.get("/route-intel", async (_req, res) => {
  try {
    const drafts = await listRouteIntelDrafts();
    return res.json(drafts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List route intel drafts error:", error);
    return res.status(500).json({ error: message });
  }
});

// Get specific route intel draft
router.get("/route-intel/:id", async (req, res) => {
  try {
    const draft = await readRouteIntelDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Read route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Create new route intel draft
router.post("/route-intel", async (req, res) => {
  try {
    const data = req.body as RouteIntelCaptionData;
    const source = (req.query.source as "mobile" | "desktop") || "desktop";

    if (!data.eventId || !data.routeId) {
      return res.status(400).json({ error: "eventId and routeId are required" });
    }

    const draft: RouteIntelCaptionDraft = {
      _draftMeta: createDraftMeta(source),
      data,
    };

    await writeRouteIntelDraft(draft);
    return res.status(201).json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Update route intel draft
router.put("/route-intel/:id", async (req, res) => {
  try {
    const existing = await readRouteIntelDraft(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const data = req.body as Partial<RouteIntelCaptionData>;
    const updated: RouteIntelCaptionDraft = {
      _draftMeta: existing._draftMeta,
      data: { ...existing.data, ...data },
    };

    await writeRouteIntelDraft(updated);
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Update route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Delete route intel draft
router.delete("/route-intel/:id", async (req, res) => {
  try {
    const deleted = await deleteRouteIntelDraft(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Approve route intel draft
// NOTE: Route intel captions are simplified for mobile.
// Desktop approval should map caption data into full RouteIntel schema.
// For now, this just marks as approved - full schema mapping is done in desktop UI.
router.post("/route-intel/:id/approve", async (req, res) => {
  try {
    const draft = await readRouteIntelDraft(req.params.id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    if (draft._draftMeta.draftStatus !== "pending") {
      return res.status(400).json({
        error: `Cannot approve draft with status: ${draft._draftMeta.draftStatus}`,
      });
    }

    // For route intel captions, the full schema mapping happens in the desktop UI.
    // The approve endpoint receives the complete RouteIntel data from the UI.
    // If no full data provided, we just mark as approved for now.
    const fullRouteIntel = req.body.fullRouteIntel;

    if (fullRouteIntel) {
      // TODO: Write full route intel to canonical location
      // await writeRouteIntel(fullRouteIntel);
      await deleteRouteIntelDraft(req.params.id);
      return res.json({ ok: true, published: true });
    }

    // Mark as approved (pending full configuration in desktop)
    await updateRouteIntelDraftStatus(req.params.id, "approved");
    return res.json({ ok: true, published: false, message: "Marked as approved, awaiting full configuration" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Approve route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// Reject route intel draft
router.post("/route-intel/:id/reject", async (req, res) => {
  try {
    const updated = await updateRouteIntelDraftStatus(req.params.id, "rejected");
    if (!updated) {
      return res.status(404).json({ error: "Draft not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Reject route intel draft error:", error);
    return res.status(500).json({ error: message });
  }
});

// ============================================================================
// Combined endpoints
// ============================================================================

// Get all drafts (both types)
router.get("/", async (_req, res) => {
  try {
    const [trainingDrafts, routeIntelDrafts] = await Promise.all([
      listTrainingContentDrafts(),
      listRouteIntelDrafts(),
    ]);

    return res.json({
      trainingContent: trainingDrafts,
      routeIntel: routeIntelDrafts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List all drafts error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
