import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import trainingContentSchema from "../../../../suc-shared-data/schemas/training-content.schema.json";
import footwearReviewSchema from "../../../../suc-shared-data/schemas/footwear-review.schema.json";
import gearReviewSchema from "../../../../suc-shared-data/schemas/gear-review.schema.json";
import raceRecapSchema from "../../../../suc-shared-data/schemas/race-recap.schema.json";
import crewRunRecapSchema from "../../../../suc-shared-data/schemas/crew-run-recap.schema.json";
import routeIntelSchema from "../../../schemas/route-intel.schema.json";

export type ValidationError = { field: string; message: string };
export type ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const trainingTipValidator = ajv.compile(trainingContentSchema as unknown);
const footwearReviewValidator = ajv.compile(footwearReviewSchema as unknown);
const gearReviewValidator = ajv.compile(gearReviewSchema as unknown);
const raceRecapValidator = ajv.compile(raceRecapSchema as unknown);
const crewRunRecapValidator = ajv.compile(crewRunRecapSchema as unknown);
const routeIntelValidator = ajv.compile(routeIntelSchema as unknown);

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

const runValidation = (validator: ValidateFunction, data: unknown): ValidationResult => {
  try {
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
};

export const toErrorMap = (errors: ValidationError[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const { field, message } of errors) {
    const topLevel = field.split(/[.[\]]/).filter(Boolean)[0] || "form";
    if (!map[topLevel]) {
      map[topLevel] = message;
    }
  }
  return map;
};

export const validateTrainingTip = (data: unknown): ValidationResult =>
  runValidation(trainingTipValidator, data);

export const validateFootwearReview = (data: unknown): ValidationResult =>
  runValidation(footwearReviewValidator, data);

export const validateGearReview = (data: unknown): ValidationResult =>
  runValidation(gearReviewValidator, data);

export const validateRaceRecap = (data: unknown): ValidationResult =>
  runValidation(raceRecapValidator, data);

export const validateCrewRunRecap = (data: unknown): ValidationResult =>
  runValidation(crewRunRecapValidator, data);

export const validateRouteIntel = (data: unknown): ValidationResult =>
  runValidation(routeIntelValidator, data);
