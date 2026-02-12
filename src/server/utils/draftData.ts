/**
 * Draft CRUD utilities for mobile capture → desktop approval workflow.
 *
 * Drafts are stored as individual JSON files in:
 * - suc-shared-data/drafts/training-content/draft-{uuid}.json
 * - suc-shared-data/drafts/route-intel/draft-{uuid}.json
 */

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  DRAFTS_ROOT,
  TRAINING_CONTENT_DRAFTS_ROOT,
  ROUTE_INTEL_DRAFTS_ROOT,
} from "./paths.js";
import type {
  DraftMeta,
  DraftType,
  TrainingContentDraft,
  RouteIntelCaptionDraft,
} from "../types/drafts.js";

// Ensure draft directories exist
export async function ensureDraftDirectories(): Promise<void> {
  await fs.mkdir(DRAFTS_ROOT, { recursive: true });
  await fs.mkdir(TRAINING_CONTENT_DRAFTS_ROOT, { recursive: true });
  await fs.mkdir(ROUTE_INTEL_DRAFTS_ROOT, { recursive: true });
}

// Get the root path for a draft type
function getDraftRoot(type: DraftType): string {
  switch (type) {
    case "training-content":
      return TRAINING_CONTENT_DRAFTS_ROOT;
    case "route-intel":
      return ROUTE_INTEL_DRAFTS_ROOT;
  }
}

// Get the file path for a specific draft
function getDraftPath(type: DraftType, draftId: string): string {
  return path.join(getDraftRoot(type), `draft-${draftId}.json`);
}

// Create new draft metadata
export function createDraftMeta(source: "mobile" | "desktop"): DraftMeta {
  const now = new Date().toISOString();
  return {
    draftId: randomUUID(),
    draftStatus: "pending",
    draftSource: source,
    draftCreatedAt: now,
    draftUpdatedAt: now,
  };
}

// List all drafts of a given type
export async function listTrainingContentDrafts(): Promise<TrainingContentDraft[]> {
  await ensureDraftDirectories();
  const files = await fs.readdir(TRAINING_CONTENT_DRAFTS_ROOT);
  const drafts: TrainingContentDraft[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const filePath = path.join(TRAINING_CONTENT_DRAFTS_ROOT, file);
      const raw = await fs.readFile(filePath, "utf8");
      const draft = JSON.parse(raw) as TrainingContentDraft;
      drafts.push(draft);
    } catch (err) {
      console.error(`Failed to read draft ${file}:`, err);
    }
  }

  // Sort by updatedAt descending (most recent first)
  return drafts.sort(
    (a, b) =>
      new Date(b._draftMeta.draftUpdatedAt).getTime() -
      new Date(a._draftMeta.draftUpdatedAt).getTime()
  );
}

export async function listRouteIntelDrafts(): Promise<RouteIntelCaptionDraft[]> {
  await ensureDraftDirectories();
  const files = await fs.readdir(ROUTE_INTEL_DRAFTS_ROOT);
  const drafts: RouteIntelCaptionDraft[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const filePath = path.join(ROUTE_INTEL_DRAFTS_ROOT, file);
      const raw = await fs.readFile(filePath, "utf8");
      const draft = JSON.parse(raw) as RouteIntelCaptionDraft;
      drafts.push(draft);
    } catch (err) {
      console.error(`Failed to read draft ${file}:`, err);
    }
  }

  return drafts.sort(
    (a, b) =>
      new Date(b._draftMeta.draftUpdatedAt).getTime() -
      new Date(a._draftMeta.draftUpdatedAt).getTime()
  );
}

// Read a specific draft
export async function readTrainingContentDraft(
  draftId: string
): Promise<TrainingContentDraft | null> {
  const filePath = getDraftPath("training-content", draftId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as TrainingContentDraft;
  } catch {
    return null;
  }
}

export async function readRouteIntelDraft(
  draftId: string
): Promise<RouteIntelCaptionDraft | null> {
  const filePath = getDraftPath("route-intel", draftId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as RouteIntelCaptionDraft;
  } catch {
    return null;
  }
}

// Write a draft (create or update)
export async function writeTrainingContentDraft(
  draft: TrainingContentDraft
): Promise<void> {
  await ensureDraftDirectories();
  const filePath = getDraftPath("training-content", draft._draftMeta.draftId);

  // Update the updatedAt timestamp
  draft._draftMeta.draftUpdatedAt = new Date().toISOString();

  // Atomic write: write to temp file, then rename
  const tempPath = filePath + ".tmp";
  await fs.writeFile(tempPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, filePath);
}

export async function writeRouteIntelDraft(
  draft: RouteIntelCaptionDraft
): Promise<void> {
  await ensureDraftDirectories();
  const filePath = getDraftPath("route-intel", draft._draftMeta.draftId);

  // Update the updatedAt timestamp
  draft._draftMeta.draftUpdatedAt = new Date().toISOString();

  // Atomic write: write to temp file, then rename
  const tempPath = filePath + ".tmp";
  await fs.writeFile(tempPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, filePath);
}

// Delete a draft
export async function deleteTrainingContentDraft(draftId: string): Promise<boolean> {
  const filePath = getDraftPath("training-content", draftId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteRouteIntelDraft(draftId: string): Promise<boolean> {
  const filePath = getDraftPath("route-intel", draftId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// Update draft status (for reject action)
export async function updateTrainingContentDraftStatus(
  draftId: string,
  status: "pending" | "approved" | "rejected"
): Promise<boolean> {
  const draft = await readTrainingContentDraft(draftId);
  if (!draft) return false;

  draft._draftMeta.draftStatus = status;
  await writeTrainingContentDraft(draft);
  return true;
}

export async function updateRouteIntelDraftStatus(
  draftId: string,
  status: "pending" | "approved" | "rejected"
): Promise<boolean> {
  const draft = await readRouteIntelDraft(draftId);
  if (!draft) return false;

  draft._draftMeta.draftStatus = status;
  await writeRouteIntelDraft(draft);
  return true;
}
