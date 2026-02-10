import fs from "fs/promises";
import path from "path";
import { ROUTE_INTEL_ROOT } from "./paths.js";
import type { RouteIntelDoc } from "../types.js";

async function ensureRouteIntelRoot(): Promise<void> {
  await fs.mkdir(ROUTE_INTEL_ROOT, { recursive: true });
}

function resolveRouteIntelPath(id: string): string {
  return path.join(ROUTE_INTEL_ROOT, `${id}.json`);
}

export async function listRouteIntel(): Promise<RouteIntelDoc[]> {
  await ensureRouteIntelRoot();
  const entries = await fs.readdir(ROUTE_INTEL_ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const items: RouteIntelDoc[] = [];
  for (const file of files) {
    const filePath = path.join(ROUTE_INTEL_ROOT, file);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RouteIntelDoc;
    items.push(parsed);
  }

  return items;
}

export async function readRouteIntel(id: string): Promise<RouteIntelDoc> {
  await ensureRouteIntelRoot();
  const filePath = resolveRouteIntelPath(id);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as RouteIntelDoc;
}

export async function writeRouteIntel(doc: RouteIntelDoc): Promise<void> {
  await ensureRouteIntelRoot();
  const filePath = resolveRouteIntelPath(doc.id);
  await fs.writeFile(filePath, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

export async function deleteRouteIntel(id: string): Promise<void> {
  await ensureRouteIntelRoot();
  const filePath = resolveRouteIntelPath(id);
  await fs.unlink(filePath);
}
