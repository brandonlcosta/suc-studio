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
export const TRAINING_CONTENT_ROOT = path.join(SHARED_DATA_ROOT, "training-content");
export const ROUTE_INTEL_ROOT = path.join(SHARED_DATA_ROOT, "route-intel");
export const FOOTWEAR_REVIEWS_ROOT = path.join(SHARED_DATA_ROOT, "footwear-reviews");
export const GEAR_REVIEWS_ROOT = path.join(SHARED_DATA_ROOT, "gear-reviews");
export const RACE_RECAPS_ROOT = path.join(SHARED_DATA_ROOT, "race-recaps");
export const CREW_RUN_RECAPS_ROOT = path.join(SHARED_DATA_ROOT, "crew-run-recaps");

// Draft directories (mobile capture → desktop approval workflow)
export const DRAFTS_ROOT = path.join(SHARED_DATA_ROOT, "drafts");
export const TRAINING_CONTENT_DRAFTS_ROOT = path.join(DRAFTS_ROOT, "training-content");
export const ROUTE_INTEL_DRAFTS_ROOT = path.join(DRAFTS_ROOT, "route-intel");

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
export const TRAINING_CONTENT_MASTER_PATH = path.join(TRAINING_CONTENT_ROOT, "training-content.master.json");
export const FOOTWEAR_REVIEWS_MASTER_PATH = path.join(FOOTWEAR_REVIEWS_ROOT, "footwear-reviews.master.json");
export const GEAR_REVIEWS_MASTER_PATH = path.join(GEAR_REVIEWS_ROOT, "gear-reviews.master.json");
export const RACE_RECAPS_MASTER_PATH = path.join(RACE_RECAPS_ROOT, "race-recaps.master.json");
export const CREW_RUN_RECAPS_MASTER_PATH = path.join(CREW_RUN_RECAPS_ROOT, "crew-run-recaps.master.json");
