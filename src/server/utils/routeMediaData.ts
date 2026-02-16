import fs from "fs/promises";
import path from "path";
import { ROUTE_MEDIA_ROOT } from "./paths.js";
import type { RouteMediaDoc } from "../types.js";

async function ensureRouteMediaRoot(): Promise<void> {
  await fs.mkdir(ROUTE_MEDIA_ROOT, { recursive: true });
}

function resolveRouteMediaPath(id: string): string {
  return path.join(ROUTE_MEDIA_ROOT, `${id}.json`);
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareByNumberThenId(
  leftNumber: number,
  rightNumber: number,
  leftId: string,
  rightId: string,
  leftTiebreaker = 0,
  rightTiebreaker = 0
): number {
  const primaryDelta = leftNumber - rightNumber;
  if (primaryDelta !== 0) return primaryDelta;
  const tiebreakerDelta = leftTiebreaker - rightTiebreaker;
  if (tiebreakerDelta !== 0) return tiebreakerDelta;
  return leftId.localeCompare(rightId);
}

function stableSortTimeline(timeline: RouteMediaDoc["timeline"]): RouteMediaDoc["timeline"] {
  return [...timeline].sort((a, b) =>
    compareByNumberThenId(
      toFiniteNumber(a.startMi, 0),
      toFiniteNumber(b.startMi, 0),
      String(a.id || ""),
      String(b.id || ""),
      toFiniteNumber(a.endMi, 0),
      toFiniteNumber(b.endMi, 0)
    )
  );
}

function stableSortSubtitles(subtitles: RouteMediaDoc["subtitles"]): RouteMediaDoc["subtitles"] {
  return [...subtitles].sort((a, b) =>
    compareByNumberThenId(
      toFiniteNumber(a.startSec, 0),
      toFiniteNumber(b.startSec, 0),
      String(a.id || ""),
      String(b.id || ""),
      toFiniteNumber(a.endSec, 0),
      toFiniteNumber(b.endSec, 0)
    )
  );
}

function stableSortMarkers(markers: RouteMediaDoc["markers"]): RouteMediaDoc["markers"] {
  return [...markers].sort((a, b) =>
    compareByNumberThenId(
      toFiniteNumber(a.atMi, 0),
      toFiniteNumber(b.atMi, 0),
      String(a.id || ""),
      String(b.id || "")
    )
  );
}

function orderObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => orderObjectKeys(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    const child = record[key];
    if (typeof child === "undefined") continue;
    ordered[key] = orderObjectKeys(child);
  }
  return ordered;
}

export function canonicalizeRouteMediaDoc(doc: RouteMediaDoc): RouteMediaDoc {
  return {
    ...doc,
    timeline: stableSortTimeline(Array.isArray(doc.timeline) ? doc.timeline : []),
    subtitles: stableSortSubtitles(Array.isArray(doc.subtitles) ? doc.subtitles : []),
    markers: stableSortMarkers(Array.isArray(doc.markers) ? doc.markers : []),
  };
}

export function serializeRouteMediaDoc(doc: RouteMediaDoc): string {
  const canonical = canonicalizeRouteMediaDoc(doc);
  const ordered = orderObjectKeys(canonical);
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

export async function listRouteMedia(): Promise<RouteMediaDoc[]> {
  await ensureRouteMediaRoot();
  const entries = await fs.readdir(ROUTE_MEDIA_ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const items: RouteMediaDoc[] = [];
  for (const file of files) {
    const filePath = path.join(ROUTE_MEDIA_ROOT, file);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RouteMediaDoc;
    items.push(parsed);
  }

  return items;
}

export async function readRouteMedia(id: string): Promise<RouteMediaDoc> {
  await ensureRouteMediaRoot();
  const filePath = resolveRouteMediaPath(id);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as RouteMediaDoc;
}

export async function writeRouteMedia(doc: RouteMediaDoc): Promise<void> {
  await ensureRouteMediaRoot();
  const filePath = resolveRouteMediaPath(doc.id);
  await fs.writeFile(filePath, serializeRouteMediaDoc(doc), "utf8");
}
