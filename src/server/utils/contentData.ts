import fs from "fs/promises";
import {
  FOOTWEAR_REVIEWS_ROOT,
  FOOTWEAR_REVIEWS_MASTER_PATH,
  GEAR_REVIEWS_ROOT,
  GEAR_REVIEWS_MASTER_PATH,
  RACE_RECAPS_ROOT,
  RACE_RECAPS_MASTER_PATH,
  CREW_RUN_RECAPS_ROOT,
  CREW_RUN_RECAPS_MASTER_PATH,
} from "./paths.js";

type ContentMaster<T> = {
  version: number;
  items: T[];
};

type ContentConfig = {
  root: string;
  masterPath: string;
};

const CONTENT_CONFIGS: Record<string, ContentConfig> = {
  "footwear-reviews": {
    root: FOOTWEAR_REVIEWS_ROOT,
    masterPath: FOOTWEAR_REVIEWS_MASTER_PATH,
  },
  "gear-reviews": {
    root: GEAR_REVIEWS_ROOT,
    masterPath: GEAR_REVIEWS_MASTER_PATH,
  },
  "race-recaps": {
    root: RACE_RECAPS_ROOT,
    masterPath: RACE_RECAPS_MASTER_PATH,
  },
  "crew-run-recaps": {
    root: CREW_RUN_RECAPS_ROOT,
    masterPath: CREW_RUN_RECAPS_MASTER_PATH,
  },
};

async function ensureContentFile(config: ContentConfig): Promise<void> {
  await fs.mkdir(config.root, { recursive: true });
  try {
    await fs.access(config.masterPath);
  } catch {
    const initialData: ContentMaster<any> = {
      version: 1,
      items: [],
    };
    await fs.writeFile(
      config.masterPath,
      JSON.stringify(initialData, null, 2) + "\n",
      "utf8"
    );
  }
}

export async function readContent<T>(contentType: string): Promise<T[]> {
  const config = CONTENT_CONFIGS[contentType];
  if (!config) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  await ensureContentFile(config);
  const raw = await fs.readFile(config.masterPath, "utf8");
  const data = JSON.parse(raw) as ContentMaster<T>;
  return data.items || [];
}

export async function writeContent<T>(contentType: string, items: T[]): Promise<void> {
  const config = CONTENT_CONFIGS[contentType];
  if (!config) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  await ensureContentFile(config);
  const data: ContentMaster<T> = {
    version: 1,
    items,
  };
  await fs.writeFile(
    config.masterPath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

export async function upsertContent<T extends { id: string; publishedAt?: string }>(
  contentType: string,
  item: T
): Promise<void> {
  const items = await readContent<T>(contentType);
  const existingIndex = items.findIndex((i) => i.id === item.id);

  const updatedItem = {
    ...item,
    publishedAt: item.publishedAt || new Date().toISOString(),
  };

  const nextItems =
    existingIndex >= 0
      ? items.map((i) => (i.id === item.id ? updatedItem : i))
      : [...items, updatedItem];

  await writeContent(contentType, nextItems);
}

export async function archiveContent<T extends { id: string }>(
  contentType: string,
  id: string
): Promise<void> {
  const items = await readContent<T>(contentType);
  const nextItems = items.filter((i) => i.id !== id);
  await writeContent(contentType, nextItems);
}
