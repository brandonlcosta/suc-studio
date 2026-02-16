import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { getRouteMediaSchema } from "./api";
import type { ValidationError, ValidationResult } from "./validation";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let validatorPromise: Promise<ValidateFunction> | null = null;

const formatInstancePath = (instancePath: string): string => {
  if (!instancePath) return "";
  const parts = instancePath.split("/").filter(Boolean);
  let result = "";
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      result += `[${part}]`;
    } else {
      result += result ? `.${part}` : part;
    }
  }
  return result;
};

const getErrorField = (error: ErrorObject): string => {
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    const base = formatInstancePath(error.instancePath);
    if (missing) {
      return base ? `${base}.${missing}` : missing;
    }
  }

  const path = formatInstancePath(error.instancePath);
  return path || "form";
};

const toValidationError = (error: ErrorObject): ValidationError => ({
  field: getErrorField(error),
  message: error.message ? error.message : "is invalid",
});

async function getValidator(): Promise<ValidateFunction> {
  if (!validatorPromise) {
    validatorPromise = (async () => {
      const schema = await getRouteMediaSchema();
      return ajv.compile(schema as Record<string, unknown>);
    })();
  }
  return validatorPromise;
}

export async function validateRouteMedia(data: unknown): Promise<ValidationResult> {
  try {
    const validator = await getValidator();
    const valid = validator(data);
    if (valid) return { ok: true };

    const errors = (validator.errors || []).map(toValidationError);
    if (errors.length === 0) {
      return { ok: false, errors: [{ field: "form", message: "Validation failed" }] };
    }
    return { ok: false, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return { ok: false, errors: [{ field: "form", message }] };
  }
}
