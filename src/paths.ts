import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SHARED_DATA_ROOT = path.resolve(__dirname, "../../suc-shared-data");
export const WORKOUTS_MASTER_PATH = path.join(
  SHARED_DATA_ROOT,
  "workouts",
  "workouts.master.json"
);
