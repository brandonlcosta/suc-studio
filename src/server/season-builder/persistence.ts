import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { SEASON_DRAFT_PATH, SEASON_PUBLISHED_PATH, SEASONS_ROOT } from "../utils/paths.js";
import type { BlockInstance, Season, WeekInstance } from "./types.js";
import { assertSeasonForSave } from "./validation.js";
import { publishCanonicalTrainingData } from "./canonicalBridge.js";

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

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  const data = await readJsonFile<T>(filePath);
  return data ?? fallback;
}

async function upsertPublishedSeasonIntoMaster(published: Season): Promise<void> {
  const masterPath = path.join(SEASONS_ROOT, "seasons.master.json");
  const master = await readJsonIfExists<{ version?: number; seasons?: Season[] }>(masterPath, {
    version: 1,
    seasons: [],
  });

  const seasons = Array.isArray(master.seasons) ? [...master.seasons] : [];
  const index = seasons.findIndex((season) => season?.seasonId === published.seasonId);
  if (index >= 0) {
    seasons[index] = published;
  } else {
    seasons.push(published);
  }

  const payload = {
    version: typeof master.version === "number" ? master.version : 1,
    seasons,
  };

  await writeJsonFileAtomic(masterPath, payload);
  console.log("[Publish] Updated seasons.master.json:", masterPath);
  console.log("[Publish] Published seasons:", seasons.map((season) => season.seasonId));
  console.log(
    "[Publish] Published blocks:",
    seasons.flatMap((season) => season.blocks?.map((block) => block.blockId) ?? [])
  );
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
    startDate: null,
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
  if (!draft.startDate) {
    throw new Error("Season startDate must be set before publish.");
  }

  const published: Season = {
    ...draft,
    status: "published",
  };

  assertSeasonForSave(published, "published");

  await publishCanonicalTrainingData(published);

  await writeJsonFileAtomic(SEASON_PUBLISHED_PATH, published);
  console.log("[Publish] Writing canonical data to:", SEASONS_ROOT);
  console.log("[Publish] Published season file:", SEASON_PUBLISHED_PATH);
  await upsertPublishedSeasonIntoMaster(published);

  await fs.rm(SEASON_DRAFT_PATH, { force: true });
  return published;
}
