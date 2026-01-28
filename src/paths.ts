import path from "path";

export const SHARED_DATA_ROOT = path.resolve(__dirname, "../../suc-shared-data");
export const WORKOUTS_MASTER_PATH = path.join(
  SHARED_DATA_ROOT,
  "workouts",
  "workouts.master.json"
);
