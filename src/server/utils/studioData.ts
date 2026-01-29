import fs from "fs";
import path from "path";
import { STUDIO_DATA_ROOT } from "./paths.js";

const ALLOWED_FILES = new Set([
  "seasons.json",
  "blocks.json",
  "weeks.json",
  "roster.json",
  "challenges.json",
]);

export function resolveStudioDataPath(fileName: string): string {
  if (!ALLOWED_FILES.has(fileName)) {
    throw new Error(`Unsupported studio data file: ${fileName}`);
  }
  return path.join(STUDIO_DATA_ROOT, fileName);
}

export function readStudioData(fileName: string): unknown {
  const filePath = resolveStudioDataPath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Studio data file not found: ${fileName}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export function writeStudioData(fileName: string, data: unknown): void {
  const filePath = resolveStudioDataPath(fileName);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
