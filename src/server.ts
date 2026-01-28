import http from "http";
import fs from "fs";
import path from "path";
import { WORKOUTS_MASTER_PATH } from "./paths";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_ROOT = path.join(__dirname, "..", "public");

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Workout = Record<string, JsonValue>;

const durationPattern =
  /^\d+(\.\d+)?(s|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|m|meter|meters|km|kilometer|kilometers|mi|mile|miles|yd|yard|yards)$/;

function readWorkoutsMaster(): Workout[] {
  if (!fs.existsSync(WORKOUTS_MASTER_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(WORKOUTS_MASTER_PATH, "utf8");
  const parsed = JSON.parse(raw) as { workouts?: Workout[] };
  return Array.isArray(parsed.workouts) ? parsed.workouts : [];
}

function writeWorkoutsMaster(workouts: Workout[]): void {
  const dir = path.dirname(WORKOUTS_MASTER_PATH);
  if (!fs.existsSync(dir)) {
    throw new Error(`Shared data directory missing: ${dir}`);
  }
  const payload = JSON.stringify({ workouts }, null, 2);
  fs.writeFileSync(WORKOUTS_MASTER_PATH, `${payload}\n`, "utf8");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumberInRange(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1;
}

function validateTarget(target: unknown, path: string, errors: string[]): void {
  if (!target || typeof target !== "object") {
    errors.push(`${path} must be an object.`);
    return;
  }
  const typedTarget = target as Record<string, unknown>;
  const type = typedTarget.type;
  if (type === "hr") {
    const percentMax = typedTarget.percentMax;
    if (!Array.isArray(percentMax) || percentMax.length !== 2) {
      errors.push(`${path}.percentMax must be an array of two numbers.`);
    } else if (!isNumberInRange(percentMax[0]) || !isNumberInRange(percentMax[1])) {
      errors.push(`${path}.percentMax values must be between 0 and 1.`);
    }
    if (typedTarget.zone && !isNonEmptyString(typedTarget.zone)) {
      errors.push(`${path}.zone must be a non-empty string.`);
    }
    return;
  }
  if (type === "pace") {
    if (!isNonEmptyString(typedTarget.zone)) {
      errors.push(`${path}.zone is required for pace targets.`);
    }
    return;
  }
  if (type === "percent") {
    const range = typedTarget.range;
    if (!Array.isArray(range) || range.length !== 2) {
      errors.push(`${path}.range must be an array of two numbers.`);
    } else if (!isNumberInRange(range[0]) || !isNumberInRange(range[1])) {
      errors.push(`${path}.range values must be between 0 and 1.`);
    }
    return;
  }
  errors.push(`${path}.type must be one of hr, pace, or percent.`);
}

function validateCues(cues: unknown, path: string, errors: string[]): void {
  if (cues === undefined) {
    return;
  }
  if (!Array.isArray(cues)) {
    errors.push(`${path} must be an array of strings.`);
    return;
  }
  cues.forEach((cue, index) => {
    if (!isNonEmptyString(cue)) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
    }
  });
}

function validateIntervalBlock(block: unknown, path: string, errors: string[]): void {
  if (!block || typeof block !== "object") {
    errors.push(`${path} must be an object.`);
    return;
  }
  const typedBlock = block as Record<string, unknown>;
  if (!isNonEmptyString(typedBlock.duration) || !durationPattern.test(typedBlock.duration)) {
    errors.push(`${path}.duration must be a valid duration string.`);
  }
  validateTarget(typedBlock.target, `${path}.target`, errors);
  validateCues(typedBlock.cues, `${path}.cues`, errors);
}

function validateSection(section: unknown, index: number, errors: string[]): void {
  if (!section || typeof section !== "object") {
    errors.push(`structure[${index}] must be an object.`);
    return;
  }
  const typedSection = section as Record<string, unknown>;
  const type = typedSection.type;
  const basePath = `structure[${index}]`;
  if (
    ![
      "warmup",
      "steady",
      "interval",
      "progression",
      "cooldown",
      "free"
    ].includes(String(type))
  ) {
    errors.push(`${basePath}.type is invalid.`);
    return;
  }
  if (typedSection.label !== undefined && !isNonEmptyString(typedSection.label)) {
    errors.push(`${basePath}.label must be a non-empty string.`);
  }
  validateCues(typedSection.cues, `${basePath}.cues`, errors);

  if (type === "interval") {
    if (!Number.isInteger(typedSection.reps) || (typedSection.reps as number) < 1) {
      errors.push(`${basePath}.reps must be an integer >= 1.`);
    }
    validateIntervalBlock(typedSection.work, `${basePath}.work`, errors);
    validateIntervalBlock(typedSection.rest, `${basePath}.rest`, errors);
    return;
  }

  if (type === "free") {
    if (typedSection.duration !== undefined) {
      if (!isNonEmptyString(typedSection.duration) || !durationPattern.test(typedSection.duration)) {
        errors.push(`${basePath}.duration must be a valid duration string.`);
      }
    }
    if (typedSection.target !== undefined) {
      validateTarget(typedSection.target, `${basePath}.target`, errors);
    }
    return;
  }

  if (!isNonEmptyString(typedSection.duration) || !durationPattern.test(typedSection.duration)) {
    errors.push(`${basePath}.duration must be a valid duration string.`);
  }
  validateTarget(typedSection.target, `${basePath}.target`, errors);
}

function validateWorkout(workout: Workout): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(workout.workoutId)) {
    errors.push("workoutId must be a non-empty string.");
  }
  if (!isNonEmptyString(workout.name)) {
    errors.push("name must be a non-empty string.");
  }
  validateCues(workout.cues, "cues", errors);
  if (!Array.isArray(workout.structure) || workout.structure.length === 0) {
    errors.push("structure must be a non-empty array.");
  } else {
    workout.structure.forEach((section, index) => {
      validateSection(section, index, errors);
    });
  }
  return errors;
}

function parseJsonBody(req: http.IncomingMessage): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as JsonValue) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: JsonValue): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function sendFile(res: http.ServerResponse, filePath: string, contentType: string): void {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

function validateWorkouts(workouts: Workout[]): Record<string, string[]> {
  const errorsById: Record<string, string[]> = {};
  workouts.forEach((workout) => {
    const workoutErrors = validateWorkout(workout);
    if (workoutErrors.length > 0) {
      const id = String(workout.workoutId ?? "unknown");
      errorsById[id] = workoutErrors;
    }
  });
  return errorsById;
}

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/api/workouts/validate") && req.method === "POST") {
    try {
      const body = (await parseJsonBody(req)) as { workouts?: Workout[] };
      const workouts = Array.isArray(body.workouts) ? body.workouts : [];
      const errorsById = validateWorkouts(workouts);
      const valid = Object.keys(errorsById).length === 0;
      sendJson(res, 200, { valid, errorsById });
    } catch (error) {
      sendJson(res, 400, { error: "Failed to parse validation payload." });
    }
    return;
  }

  if (url.startsWith("/api/workouts") && req.method === "GET") {
    const workouts = readWorkoutsMaster();
    sendJson(res, 200, { workouts });
    return;
  }

  if (url.startsWith("/api/workouts") && req.method === "PUT") {
    try {
      const body = (await parseJsonBody(req)) as { workouts?: Workout[] };
      const workouts = Array.isArray(body.workouts) ? body.workouts : [];
      const errorsById = validateWorkouts(workouts);
      if (Object.keys(errorsById).length > 0) {
        sendJson(res, 400, { error: "Schema validation failed.", errorsById });
        return;
      }
      writeWorkoutsMaster(workouts);
      sendJson(res, 200, { success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save workouts.";
      sendJson(res, 400, { error: message });
    }
    return;
  }

  if (url === "/" || url === "/index.html") {
    sendFile(res, path.join(PUBLIC_ROOT, "index.html"), "text/html");
    return;
  }

  if (url === "/styles.css") {
    sendFile(res, path.join(PUBLIC_ROOT, "styles.css"), "text/css");
    return;
  }

  if (url === "/app.js") {
    sendFile(res, path.join(PUBLIC_ROOT, "app.js"), "text/javascript");
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[Studio] Timeline editor running on http://localhost:${PORT}`);
});
