/**
 * Draft types for mobile capture → desktop approval workflow.
 *
 * Uses DraftEnvelope pattern: _draftMeta + data (canonical payload).
 * This ensures draft metadata never pollutes canonical schemas and is
 * stripped cleanly on publish.
 */

import type { TrainingContent } from "../utils/trainingContentData.js";

// Draft metadata wrapper - never touches canonical data
export interface DraftMeta {
  draftId: string;
  draftStatus: "pending" | "approved" | "rejected";
  draftSource: "mobile" | "desktop";
  draftCreatedAt: string;
  draftUpdatedAt: string;
}

// Envelope pattern: _draftMeta + data (canonical payload)
export interface DraftEnvelope<T> {
  _draftMeta: DraftMeta;
  data: T;
}

// Training content draft wraps canonical TrainingContent
export type TrainingContentDraft = DraftEnvelope<TrainingContent>;

// Route intel caption - SIMPLIFIED for mobile capture
// Desktop maps this to full RouteIntel schema during approval
export interface RouteIntelCaptionData {
  eventId: string;
  routeId: string;
  caption: string; // Main coach notes
  sectionCaptions?: Record<string, string>; // Optional per-section notes keyed by sectionKey
}

export type RouteIntelCaptionDraft = DraftEnvelope<RouteIntelCaptionData>;

// Union type for all draft types
export type AnyDraft = TrainingContentDraft | RouteIntelCaptionDraft;

// Draft type discriminator
export type DraftType = "training-content" | "route-intel";
