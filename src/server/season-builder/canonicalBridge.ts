import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import type { Season, WeekInstance, BlockInstance, DayAssignment } from "./types.js";
import { DAY_KEYS } from "./types.js";
import { SHARED_DATA_ROOT } from "../utils/paths.js";

const execFileAsync = promisify(execFile);

type CanonicalSeason = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  blocks: string[];
  startDate?: string;
};

type CanonicalBlock = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  weeks: string[];
};

type CanonicalWeek = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  focus: string | null;
  stress: "low" | "med" | "med-high" | "high";
  volume: "low" | "low-med" | "med" | "med-high" | "high";
  intensity: "low" | "med" | "high";
  workouts: string[];
  eventIds?: string[];
  eventRoles?: Record<string, "goal" | "tuneup" | "simulation" | "social">;
};

type CanonicalWorkout = {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  type: string;
  duration?: number;
  distance?: number;
  steps?: { label: string; details: string }[];
};

type SeasonMarker = {
  markerId: string;
  label: string;
  weekIndex: number;
};

type WorkoutMasterEntry = {
  workoutId?: string;
  name?: string;
  description?: string;
  focus?: string[];
};

type WorkoutsMasterDoc = {
  version?: number;
  workouts?: WorkoutMasterEntry[];
};

const INTENSITY_MAP: Record<string, "low" | "med" | "med-high" | "high"> = {
  low: "low",
  "low-med": "med",
  med: "med",
  "med-high": "med-high",
  high: "high",
  "very-high": "high",
};

const VOLUME_MAP: Record<string, "low" | "low-med" | "med" | "med-high" | "high"> = {
  low: "low",
  "low-med": "low-med",
  med: "med",
  "med-high": "med-high",
  high: "high",
  "very-high": "high",
};

const INTENSITY_SIMPLE_MAP: Record<string, "low" | "med" | "high"> = {
  low: "low",
  "low-med": "med",
  med: "med",
  "med-high": "high",
  high: "high",
  "very-high": "high",
};

const CANONICAL_ROOT = SHARED_DATA_ROOT;
const CANONICAL_SEASONS_ROOT = path.join(CANONICAL_ROOT, "seasons");
const CANONICAL_BLOCKS_ROOT = path.join(CANONICAL_ROOT, "blocks");
const CANONICAL_WEEKS_ROOT = path.join(CANONICAL_ROOT, "weeks");
const CANONICAL_WORKOUTS_ROOT = path.join(CANONICAL_ROOT, "workouts");
const WORKOUTS_MASTER_PATH = path.join(CANONICAL_WORKOUTS_ROOT, "workouts.master.json");

function stableWorkoutId(seed: string): string {
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 12);
  return `workout-${hash}`;
}

function mapIntensity(value: string): "low" | "med" | "med-high" | "high" {
  return INTENSITY_MAP[value] ?? "med";
}

function mapVolume(value: string): "low" | "low-med" | "med" | "med-high" | "high" {
  return VOLUME_MAP[value] ?? "med";
}

function mapIntensitySimple(value: string): "low" | "med" | "high" {
  return INTENSITY_SIMPLE_MAP[value] ?? "med";
}

async function readWorkoutsMaster(): Promise<Map<string, WorkoutMasterEntry>> {
  try {
    const raw = await fs.readFile(WORKOUTS_MASTER_PATH, "utf8");
    const parsed = JSON.parse(raw) as WorkoutsMasterDoc;
    const entries = Array.isArray(parsed.workouts) ? parsed.workouts : [];
    const map = new Map<string, WorkoutMasterEntry>();
    for (const entry of entries) {
      if (entry && typeof entry.workoutId === "string" && entry.workoutId.trim().length > 0) {
        map.set(entry.workoutId, entry);
      }
    }
    return map;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT") {
        return new Map();
      }
    }
    throw error;
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, filePath);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveDayAssignmentWorkoutIds(
  assignment: DayAssignment | undefined,
  seed: string
): { ids: string[]; notesById: Map<string, string> } {
  const notesById = new Map<string, string>();
  if (!assignment) {
    return { ids: [], notesById };
  }
  if (Array.isArray(assignment.workoutIds)) {
    const cleaned = assignment.workoutIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean)
      .slice(0, 2);
    if (cleaned.length > 0) {
      return { ids: cleaned, notesById };
    }
  }
  if (assignment.workoutId && assignment.workoutId.trim().length > 0) {
    return { ids: [assignment.workoutId.trim()], notesById };
  }
  if (assignment.notes && assignment.notes.trim().length > 0) {
    const id = stableWorkoutId(seed);
    notesById.set(id, assignment.notes.trim());
    return { ids: [id], notesById };
  }
  return { ids: [], notesById };
}

function weekWorkoutsFromDays(
  seasonId: string,
  blockId: string,
  week: WeekInstance,
  weekIndex: number
): { workouts: string[]; notesByWorkoutId: Map<string, string> } {
  const workouts: string[] = [];
  const notesByWorkoutId = new Map<string, string>();

  for (const [dayIndex, dayKey] of DAY_KEYS.entries()) {
    const assignment = week.days?.[dayKey];
    const seed = `${seasonId}:${blockId}:${week.weekId}:${weekIndex}:${dayIndex}:${dayKey}:${assignment?.notes ?? ""}`;
    const resolved = resolveDayAssignmentWorkoutIds(assignment, seed);
    if (resolved.ids.length === 0) {
      continue;
    }
    resolved.ids.forEach((id) => workouts.push(id));
    for (const [id, note] of resolved.notesById.entries()) {
      notesByWorkoutId.set(id, note);
    }
  }

  return { workouts, notesByWorkoutId };
}

function buildCanonicalSeason(season: Season, timestamp: string): CanonicalSeason {
  const blocks = season.blocks.map((block) => block.blockId);
  const canonical: CanonicalSeason = {
    id: season.seasonId,
    title: season.seasonId,
    status: "published",
    createdAt: timestamp,
    updatedAt: timestamp,
    blocks,
  };
  if (season.startDate) {
    canonical.startDate = season.startDate;
  }
  return canonical;
}

function buildCanonicalBlock(block: BlockInstance, timestamp: string): CanonicalBlock {
  return {
    id: block.blockId,
    title: block.name,
    status: "published",
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: block.tags ?? [],
    weeks: block.weeks.map((week) => week.weekId),
  };
}

function buildCanonicalWeek(
  week: WeekInstance,
  timestamp: string,
  workouts: string[]
): CanonicalWeek {
  const eventIds = Array.isArray(week.eventIds)
    ? week.eventIds.map((id) => String(id).trim()).filter(Boolean)
    : undefined;
  const eventRoles =
    week.eventRoles && typeof week.eventRoles === "object" ? week.eventRoles : undefined;
  return {
    id: week.weekId,
    title: week.weekId,
    status: "published",
    createdAt: timestamp,
    updatedAt: timestamp,
    focus: week.focus ?? null,
    stress: mapIntensity(week.stress),
    volume: mapVolume(week.volume),
    intensity: mapIntensitySimple(week.intensity),
    workouts,
    ...(eventIds && eventIds.length ? { eventIds } : {}),
    ...(eventRoles ? { eventRoles } : {}),
  };
}

function workoutFromMaster(
  id: string,
  timestamp: string,
  master?: WorkoutMasterEntry,
  note?: string
): CanonicalWorkout {
  const description = master?.description ?? note ?? "Workout created from season builder publish.";
  const title = master?.name ?? id;
  const tags = Array.isArray(master?.focus) ? master?.focus : undefined;
  return {
    id,
    title,
    description,
    tags,
    status: "published",
    createdAt: timestamp,
    updatedAt: timestamp,
    type: "run",
  };
}

async function writeCanonicalFiles(
  season: CanonicalSeason,
  blocks: CanonicalBlock[],
  weeks: CanonicalWeek[],
  workouts: CanonicalWorkout[],
  markers: SeasonMarker[]
): Promise<Array<{ path: string; previous: string | null }>> {
  const backups: Array<{ path: string; previous: string | null }> = [];

  async function writeWithBackup(filePath: string, data: unknown, allowOverwrite = true): Promise<void> {
    const exists = await fileExists(filePath);
    if (exists && !allowOverwrite) {
      return;
    }
    const previous = exists ? await fs.readFile(filePath, "utf8") : null;
    backups.push({ path: filePath, previous });
    await writeJsonFileAtomic(filePath, data);
  }

  const seasonPath = path.join(CANONICAL_SEASONS_ROOT, `season.${season.id}.json`);
  await writeWithBackup(seasonPath, season);

  for (const block of blocks) {
    const blockPath = path.join(CANONICAL_BLOCKS_ROOT, `block.${block.id}.json`);
    await writeWithBackup(blockPath, block);
  }

  for (const week of weeks) {
    const weekPath = path.join(CANONICAL_WEEKS_ROOT, `week.${week.id}.json`);
    await writeWithBackup(weekPath, week);
  }

  for (const workout of workouts) {
    const workoutPath = path.join(CANONICAL_WORKOUTS_ROOT, `workout.${workout.id}.json`);
    await writeWithBackup(workoutPath, workout, false);
  }

  const markersPath = path.join(CANONICAL_SEASONS_ROOT, `${season.id}.markers.json`);
  await writeWithBackup(markersPath, {
    seasonId: season.id,
    markers,
  });

  return backups;
}

async function validateCanonical(): Promise<void> {
  await execFileAsync(process.execPath, ["scripts/validate-canonical.js"], {
    cwd: CANONICAL_ROOT,
  });
}

export async function publishCanonicalTrainingData(season: Season): Promise<{
  seasonId: string;
  blocks: number;
  weeks: number;
  workouts: number;
}> {
  const timestamp = new Date().toISOString();
  const workoutsMaster = await readWorkoutsMaster();

  const canonicalSeason = buildCanonicalSeason(season, timestamp);
  const canonicalBlocks: CanonicalBlock[] = [];
  const canonicalWeeks: CanonicalWeek[] = [];
  const workoutMap = new Map<string, CanonicalWorkout>();
  if (season.blocks.length === 0) {
    throw new Error(`Season ${season.seasonId} has no blocks; cannot publish canonical data.`);
  }

  for (const block of season.blocks) {
    canonicalBlocks.push(buildCanonicalBlock(block, timestamp));

    for (const [weekIndex, week] of block.weeks.entries()) {
      const { workouts, notesByWorkoutId } = weekWorkoutsFromDays(
        season.seasonId,
        block.blockId,
        week,
        weekIndex
      );

      if (workouts.length === 0) {
        throw new Error(
          `Week ${week.weekId} has no workouts assigned; cannot publish canonical data.`
        );
      }

      canonicalWeeks.push(buildCanonicalWeek(week, timestamp, workouts));

      for (const workoutId of workouts) {
        if (workoutMap.has(workoutId)) {
          continue;
        }
        const master = workoutsMaster.get(workoutId);
        const note = notesByWorkoutId.get(workoutId);
        workoutMap.set(workoutId, workoutFromMaster(workoutId, timestamp, master, note));
      }
    }

    if (block.weeks.length === 0) {
      throw new Error(`Block ${block.blockId} has no weeks; cannot publish canonical data.`);
    }
  }

  const backups = await writeCanonicalFiles(
    canonicalSeason,
    canonicalBlocks,
    canonicalWeeks,
    Array.from(workoutMap.values()),
    season.seasonMarkers
  );

  try {
    await validateCanonical();
  } catch (error) {
    for (const backup of backups.reverse()) {
      if (backup.previous === null) {
        await fs.rm(backup.path, { force: true });
      } else {
        await fs.writeFile(backup.path, backup.previous, "utf8");
      }
    }
    throw error;
  }

  console.log("[Canonical] Published season:", canonicalSeason.id);
  console.log("[Canonical] Blocks:", canonicalBlocks.length);
  console.log("[Canonical] Weeks:", canonicalWeeks.length);
  console.log("[Canonical] Workouts:", workoutMap.size);

  return {
    seasonId: canonicalSeason.id,
    blocks: canonicalBlocks.length,
    weeks: canonicalWeeks.length,
    workouts: workoutMap.size,
  };
}
