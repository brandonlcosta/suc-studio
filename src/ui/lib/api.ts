let warnedMissingBase = false;

export function getStudioApiBase(): string {
  const base = import.meta.env.VITE_API_BASE;

  if (!base) {
    if (!warnedMissingBase) {
      console.warn(
        "[SUC Studio] VITE_API_BASE undefined, using fallback http://localhost:3000"
      );
      warnedMissingBase = true;
    }
    return "http://localhost:3000";
  }

  return base;
}

export function apiUrl(path: string): string {
  const base = getStudioApiBase().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api${normalizedPath}`;
}
