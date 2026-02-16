import fs from "fs/promises";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { ROUTE_MEDIA_SCHEMA_PATH } from "./paths.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let schemaCache: unknown | null = null;
let validatorCache: ValidateFunction | null = null;

function mapErrors(errors: ErrorObject[] | null | undefined): Array<{ field: string; message: string }> {
  if (!errors || errors.length === 0) return [];
  return errors.map((error) => {
    const field = error.instancePath ? error.instancePath.replace(/^\//, "").replace(/\//g, ".") : "form";
    return {
      field: field || "form",
      message: error.message || "is invalid",
    };
  });
}

async function loadSchemaFromDisk(): Promise<unknown> {
  const raw = await fs.readFile(ROUTE_MEDIA_SCHEMA_PATH, "utf8");
  return JSON.parse(raw);
}

export async function getRouteMediaSchema(): Promise<unknown> {
  if (!schemaCache) {
    schemaCache = await loadSchemaFromDisk();
  }
  return schemaCache;
}

async function getRouteMediaValidator(): Promise<ValidateFunction> {
  if (!validatorCache) {
    const schema = await getRouteMediaSchema();
    validatorCache = ajv.compile(schema as Record<string, unknown>);
  }
  return validatorCache;
}

export async function validateRouteMediaPayload(data: unknown): Promise<
  { ok: true } | { ok: false; errors: Array<{ field: string; message: string }> }
> {
  const validator = await getRouteMediaValidator();
  const valid = validator(data);
  if (valid) return { ok: true };
  return { ok: false, errors: mapErrors(validator.errors) };
}
