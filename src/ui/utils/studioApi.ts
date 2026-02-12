import { apiUrl } from "../lib/api";

const STUDIO_API_BASE = "/api";

export function buildStudioApiUrl(path: string): string {
  if (typeof path !== "string") {
    throw new Error("[STUDIO] buildStudioApiUrl expects a string path.");
  }
  if (!path.startsWith("/")) {
    throw new Error("[STUDIO] buildStudioApiUrl expects a leading slash, e.g. /routes.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = `${STUDIO_API_BASE}${normalizedPath}`;
  if (
    fullPath.startsWith("/api/render") ||
    fullPath.startsWith("/api/compile") ||
    fullPath.startsWith("/api/preview")
  ) {
    throw new Error("[STUDIO] Broadcast actions are no longer supported in Studio.");
  }
  return apiUrl(normalizedPath);
}
