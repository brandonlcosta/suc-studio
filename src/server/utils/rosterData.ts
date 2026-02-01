import fs from "fs/promises";
import path from "path";
import { ROSTER_PATH } from "./paths.js";
import type { RosterMember } from "../types.js";

async function ensureRosterFile(): Promise<void> {
  const dir = path.dirname(ROSTER_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(ROSTER_PATH);
  } catch {
    await fs.writeFile(ROSTER_PATH, "[]\n", "utf8");
  }
}

export async function readRoster(): Promise<RosterMember[]> {
  await ensureRosterFile();
  const raw = await fs.readFile(ROSTER_PATH, "utf8");
  return JSON.parse(raw) as RosterMember[];
}

export async function writeRoster(data: RosterMember[]): Promise<void> {
  await ensureRosterFile();
  await fs.writeFile(ROSTER_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
