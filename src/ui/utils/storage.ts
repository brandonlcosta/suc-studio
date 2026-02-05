import { buildStudioApiUrl } from "./studioApi";
type Validator<T> = (value: unknown) => asserts value is T;
type ValidatorFn = (value: unknown) => void;

const API_PATHS: Record<string, string> = {
  "seasons.json": "/seasons",
  "blocks.json": "/blocks",
  "weeks.json": "/weeks",
  "challenges.json": "/challenges",
};

function resolveApiPath(fileName: string): string {
  const path = API_PATHS[fileName];
  if (!path) {
    throw new Error(`Unsupported studio data file: ${fileName}`);
  }
  return buildStudioApiUrl(path);
}

/**
 * Load JSON from the API.
 * Validation errors are surfaced clearly and do NOT masquerade as transport errors.
 */
export async function loadJson<T>(
  fileName: string,
  validate?: Validator<T>
): Promise<T> {
  const response = await fetch(resolveApiPath(fileName));
  if (!response.ok) {
    let message = `Failed to load ${fileName}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Invalid JSON in ${fileName}`);
  }

  const validateFn: ValidatorFn | undefined = validate as ValidatorFn | undefined;
  if (validateFn) {
    try {
      validateFn(data);
    } catch (err) {
      console.error(`Validation failed for ${fileName}:`, err);
      throw err;
    }
  }

  return data as T;
}

/**
 * Save JSON through API.
 * Validation is enforced BEFORE writing.
 */
export async function saveJson<T>(
  fileName: string,
  data: T,
  validate?: Validator<T>
): Promise<void> {
  const validateFn: ValidatorFn | undefined = validate as ValidatorFn | undefined;
  if (validateFn) {
    validateFn(data);
  }

  const response = await fetch(resolveApiPath(fileName), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    let message = `Failed to save ${fileName}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

/**
 * Export JSON client-side as a downloadable file.
 */
export function exportJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Import JSON from a local file (no validation here).
 * Caller is responsible for validating the result.
 */
export function importJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
