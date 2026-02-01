import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SHARED_DATA_ROOT = path.resolve(__dirname, "../../../../suc-shared-data");
export const ROUTES_ROOT = path.join(SHARED_DATA_ROOT, "routes");
export const EVENTS_ROOT = path.join(SHARED_DATA_ROOT, "events");
export const WORKOUTS_ROOT = path.join(SHARED_DATA_ROOT, "workouts");
export const ROSTER_ROOT = path.join(SHARED_DATA_ROOT, "roster");
export const STUDIO_DATA_ROOT = path.join(SHARED_DATA_ROOT, "data");
export const SEASONS_ROOT = path.join(SHARED_DATA_ROOT, "seasons");

export const EVENTS_MASTER_PATH = path.join(EVENTS_ROOT, "events.master.json");
export const EVENTS_SELECTION_PATH = path.join(EVENTS_ROOT, "events.selection.json");
export const WORKOUTS_MASTER_PATH = path.join(WORKOUTS_ROOT, "workouts.master.json");
export const WORKOUT_DRAFT_PATH = path.join(WORKOUTS_ROOT, "workout.draft.json");
export const WORKOUT_PUBLISHED_PATH = path.join(WORKOUTS_ROOT, "workout.published.json");
export const ROSTER_PATH = path.join(ROSTER_ROOT, "roster.json");
export const SEASONS_PATH = path.join(STUDIO_DATA_ROOT, "seasons.json");
export const BLOCKS_PATH = path.join(STUDIO_DATA_ROOT, "blocks.json");
export const WEEKS_PATH = path.join(STUDIO_DATA_ROOT, "weeks.json");
export const CHALLENGES_PATH = path.join(STUDIO_DATA_ROOT, "challenges.json");
export const SEASON_DRAFT_PATH = path.join(SEASONS_ROOT, "season.draft.json");
export const SEASON_PUBLISHED_PATH = path.join(SEASONS_ROOT, "season.published.json");
