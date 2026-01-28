import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SHARED_DATA_ROOT = path.resolve(__dirname, "../../../../suc-shared-data");
export const ROUTES_ROOT = path.join(SHARED_DATA_ROOT, "routes");
export const EVENTS_ROOT = path.join(SHARED_DATA_ROOT, "events");
export const WORKOUTS_ROOT = path.join(SHARED_DATA_ROOT, "workouts");

export const EVENTS_MASTER_PATH = path.join(EVENTS_ROOT, "events.master.json");
export const EVENTS_SELECTION_PATH = path.join(EVENTS_ROOT, "events.selection.json");
export const WORKOUTS_MASTER_PATH = path.join(WORKOUTS_ROOT, "workouts.master.json");
