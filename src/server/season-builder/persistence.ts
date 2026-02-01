import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { SEASON_DRAFT_PATH, SEASON_PUBLISHED_PATH } from "../utils/paths.js";
import type { BlockInstance, Season, WeekInstance } from "./types.js";
import { assertSeasonForSave } from "./validation.js";

const JSON_INDENT = 2;

async function ensureParentDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT") {
        return null;
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read JSON: ${filePath} (${message})`);
  }
}

async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  await ensureParentDir(filePath);
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  const payload = `${JSON.stringify(data, null, JSON_INDENT)}\n`;
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, filePath);
}

function createBlankWeek(): WeekInstance {
  return {
    weekId: randomUUID(),
    focus: null,
    stress: "low",
    volume: "low",
    intensity: "low",
  };
}

function createBlankBlock(): BlockInstance {
  return {
    blockId: randomUUID(),
    name: "Blank Block",
    tags: [],
    weeks: [createBlankWeek()],
  };
}

export async function loadDraftSeason(): Promise<Season | null> {
  const data = await readJsonFile<Season>(SEASON_DRAFT_PATH);
  if (data) {
    assertSeasonForSave(data, "draft");
  }
  return data;
}

export async function loadPublishedSeason(): Promise<Season | null> {
  const data = await readJsonFile<Season>(SEASON_PUBLISHED_PATH);
  if (data) {
    assertSeasonForSave(data, "published");
  }
  return data;
}

export async function saveDraftSeason(season: Season): Promise<void> {
  assertSeasonForSave(season, "draft");
  await writeJsonFileAtomic(SEASON_DRAFT_PATH, season);
}

export async function createNewDraftSeason(): Promise<Season> {
  const season: Season = {
    seasonId: randomUUID(),
    status: "draft",
    blocks: [createBlankBlock()],
    seasonMarkers: [],
  };

  await writeJsonFileAtomic(SEASON_DRAFT_PATH, season);
  return season;
}

export async function publishDraftSeason(): Promise<Season> {
  const draft = await loadDraftSeason();
  if (!draft) {
    throw new Error("No draft season exists to publish.");
  }

  const published: Season = {
    ...draft,
    status: "published",
  };

  assertSeasonForSave(published, "published");
  await writeJsonFileAtomic(SEASON_PUBLISHED_PATH, published);

  await fs.rm(SEASON_DRAFT_PATH, { force: true });
  return published;
}
