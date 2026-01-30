type Validator<T> = (value: unknown) => asserts value is T;

const DATA_ROOT = "/data";
const API_ROOT = "/api/studio-data";

export async function loadJson<T>(fileName: string, validate?: Validator<T>): Promise<T> {
  let response: Response | null = null;
  try {
    response = await fetch(`${API_ROOT}/${fileName}`);
  } catch {
    response = null;
  }

  if (!response || !response.ok) {
    response = await fetch(`${DATA_ROOT}/${fileName}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}`);
  }

  const data = (await response.json()) as unknown;
  if (validate) {
    validate(data);
  }
  return data as T;
}

export async function saveJson<T>(
  fileName: string,
  data: T,
  validate?: Validator<T>
): Promise<void> {
  if (validate) {
    validate(data);
  }

  const response = await fetch(`${API_ROOT}/${fileName}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error ?? `Failed to save ${fileName}`;
    throw new Error(message);
  }
}

export function exportJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
