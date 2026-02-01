import type { RosterMember, RosterTier } from "../ui/types/studio";

const isEmptyRow = (row: string[]): boolean => row.every((value) => value.trim() === "");

const clean = (value: string): string =>
  String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^"(.*)"$/, "$1");

const normalizeHeader = (header: string): string =>
  clean(header)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const parseDelimited = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = text[i + 1];
        if (nextChar === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      const nextChar = text[i + 1];
      if (nextChar === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("Unterminated quoted field in CSV input.");
  }

  if (row.length > 0 || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((parsedRow) => !isEmptyRow(parsedRow));
};

const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  let commaCount = 0;
  let tabCount = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];
    if (char === '"') {
      const nextChar = firstLine[i + 1];
      if (inQuotes && nextChar === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) {
      continue;
    }
    if (char === ",") {
      commaCount += 1;
    } else if (char === "\t") {
      tabCount += 1;
    }
  }

  return tabCount > commaCount ? "\t" : ",";
};

const toTier = (value: string): RosterTier => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "XL") {
    return "XL";
  }
  if (normalized === "MED") {
    return "MED";
  }
  if (normalized === "" || normalized === "NONE") {
    return "MED";
  }
  return "MED";
};

const parseTimestamp = (value: string): number => {
  if (!clean(value)) {
    return 0;
  }
  const parsed = Date.parse(clean(value));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const HEADER_MAP: Record<string, keyof RosterMember | "timestamp"> = {
  "timestamp": "timestamp",
  "full name": "name",
  "email": "email",
  "which tier are you starting with? - choose your level - you can switch later if needed.": "tier",
  "what are you training for? next race or event?": "trainingGoal",
  "typical weekly mileage?": "weeklyMileageRange",
};

const REQUIRED_HEADERS: Array<keyof RosterMember> = ["name", "email", "tier"];

export const parseRosterCsv = (text: string): RosterMember[] => {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (rows.length === 0) {
    throw new Error("CSV input is empty.");
  }

  const rawHeaders = rows[0];
  const normalizedHeaders = rawHeaders.map((header) => {
    const mapped = HEADER_MAP[normalizeHeader(header)];
    return mapped ?? null;
  });

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !normalizedHeaders.includes(header)
  );
  if (missingHeaders.length > 0) {
    throw new Error(`CSV missing required headers: ${missingHeaders.join(", ")}`);
  }

  const deduped = new Map<
    string,
    { member: RosterMember; timestamp: number; rowIndex: number }
  >();

  rows.slice(1).forEach((row, rowIndex) => {
    if (isEmptyRow(row)) return;

    const displayRowIndex = rowIndex + 2;
    const parsedRow: Record<string, string> = {};

    normalizedHeaders.forEach((header, index) => {
      if (!header) return;
      parsedRow[header] = clean(String(row[index] ?? ""));
    });

    const timestampRaw = parsedRow.timestamp ?? "";
    const nameRaw = parsedRow.name ?? "";
    const emailRaw = parsedRow.email ?? "";

    const trainingGoalRaw = parsedRow.trainingGoal ?? "";
    const weeklyMileageRaw = parsedRow.weeklyMileageRange ?? "";
    const tierRaw = parsedRow.tier ?? "";

    const trimmedName = clean(nameRaw);
    const trimmedEmail = clean(emailRaw).toLowerCase();

    // 🔒 HARD ROW GATE — skip bad rows silently
    if (!trimmedName || !trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      throw new Error(`Invalid email at row ${displayRowIndex}: ${emailRaw}`);
    }

    const timestamp = parseTimestamp(timestampRaw);

    const member: RosterMember = {
      id: trimmedEmail,
      name: trimmedName,
      email: trimmedEmail,
      status: "active",
      tier: toTier(tierRaw),
      joinedDate: "",
      trainingGoal: clean(trainingGoalRaw),
      weeklyMileageRange: clean(weeklyMileageRaw),
      consent: {
        publicName: false,
        publicStory: false,
        publicPhotos: false,
        publicMetrics: false,
      },
    };

    const existing = deduped.get(trimmedEmail);
    if (!existing) {
      deduped.set(trimmedEmail, { member, timestamp, rowIndex });
      return;
    }

    if (
      timestamp > existing.timestamp ||
      (timestamp === existing.timestamp && rowIndex > existing.rowIndex)
    ) {
      deduped.set(trimmedEmail, { member, timestamp, rowIndex });
    }
  });

  return Array.from(deduped.values()).map((entry) => entry.member);
};
