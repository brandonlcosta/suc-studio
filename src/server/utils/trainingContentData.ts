import fs from "fs/promises";
import path from "path";
import { TRAINING_CONTENT_MASTER_PATH, TRAINING_CONTENT_ROOT } from "./paths.js";

export type TrainingContent = {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  topics: string[];
  tier: string;
  series?: string | null;
  part?: number | null;
  author?: string;
  publishedAt?: string;
  status?: "draft" | "published";
};

type TrainingContentMaster = {
  version: number;
  items: TrainingContent[];
};

async function ensureTrainingContentFile(): Promise<void> {
  await fs.mkdir(TRAINING_CONTENT_ROOT, { recursive: true });
  try {
    await fs.access(TRAINING_CONTENT_MASTER_PATH);
  } catch {
    const initialData: TrainingContentMaster = {
      version: 1,
      items: [],
    };
    await fs.writeFile(
      TRAINING_CONTENT_MASTER_PATH,
      JSON.stringify(initialData, null, 2) + "\n",
      "utf8"
    );
  }
}

export async function readTrainingContent(): Promise<TrainingContent[]> {
  await ensureTrainingContentFile();
  const raw = await fs.readFile(TRAINING_CONTENT_MASTER_PATH, "utf8");
  const data = JSON.parse(raw) as TrainingContentMaster;
  return data.items || [];
}

export async function writeTrainingContent(items: TrainingContent[]): Promise<void> {
  await ensureTrainingContentFile();
  const data: TrainingContentMaster = {
    version: 1,
    items,
  };
  await fs.writeFile(
    TRAINING_CONTENT_MASTER_PATH,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
}

export async function upsertTrainingContent(item: TrainingContent): Promise<void> {
  const items = await readTrainingContent();
  const existingIndex = items.findIndex((t) => t.id === item.id);

  const updatedItem = {
    ...item,
    publishedAt: item.publishedAt || new Date().toISOString(),
  };

  const nextItems =
    existingIndex >= 0
      ? items.map((t) => (t.id === item.id ? updatedItem : t))
      : [...items, updatedItem];

  await writeTrainingContent(nextItems);
}

export async function archiveTrainingContent(id: string): Promise<void> {
  const items = await readTrainingContent();
  const nextItems = items.filter((t) => t.id !== id);
  await writeTrainingContent(nextItems);
}
