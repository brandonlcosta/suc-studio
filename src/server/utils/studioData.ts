import fs from "fs/promises";
import path from "path";
import { BLOCKS_PATH, CHALLENGES_PATH, SEASONS_PATH, WEEKS_PATH } from "./paths.js";
import type { Block, Challenge, Season, Week } from "../types.js";

async function ensureJsonFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]\n", "utf8");
  }
}

export async function readSeasons(): Promise<Season[]> {
  await ensureJsonFile(SEASONS_PATH);
  const raw = await fs.readFile(SEASONS_PATH, "utf8");
  return JSON.parse(raw) as Season[];
}

export async function writeSeasons(data: Season[]): Promise<void> {
  await ensureJsonFile(SEASONS_PATH);
  await fs.writeFile(SEASONS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readBlocks(): Promise<Block[]> {
  await ensureJsonFile(BLOCKS_PATH);
  const raw = await fs.readFile(BLOCKS_PATH, "utf8");
  return JSON.parse(raw) as Block[];
}

export async function writeBlocks(data: Block[]): Promise<void> {
  await ensureJsonFile(BLOCKS_PATH);
  await fs.writeFile(BLOCKS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readWeeks(): Promise<Week[]> {
  await ensureJsonFile(WEEKS_PATH);
  const raw = await fs.readFile(WEEKS_PATH, "utf8");
  return JSON.parse(raw) as Week[];
}

export async function writeWeeks(data: Week[]): Promise<void> {
  await ensureJsonFile(WEEKS_PATH);
  await fs.writeFile(WEEKS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readChallenges(): Promise<Challenge[]> {
  await ensureJsonFile(CHALLENGES_PATH);
  const raw = await fs.readFile(CHALLENGES_PATH, "utf8");
  return JSON.parse(raw) as Challenge[];
}

export async function writeChallenges(data: Challenge[]): Promise<void> {
  await ensureJsonFile(CHALLENGES_PATH);
  await fs.writeFile(CHALLENGES_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
