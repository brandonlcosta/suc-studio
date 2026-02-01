import type { BlockInstance, Season, WeekInstance } from "./types";

export type SeasonMutation =
  | {
      action: "addBlockAfter";
      args: {
        targetBlockId: string;
        blockTemplate?: BlockInstance;
      };
    }
  | {
      action: "removeBlock";
      args: {
        blockId: string;
      };
    }
  | {
      action: "moveBlock";
      args: {
        blockId: string;
        newIndex: number;
      };
    }
  | {
      action: "addWeekToBlock";
      args: {
        blockId: string;
        position?: number;
      };
    }
  | {
      action: "removeWeekFromBlock";
      args: {
        blockId: string;
        weekId: string;
      };
    }
  | {
      action: "updateBlock";
      args: {
        blockId: string;
        partialUpdate: Partial<Pick<BlockInstance, "name" | "tags" | "raceAnchorId">>;
      };
    }
  | {
      action: "updateWeek";
      args: {
        blockId: string;
        weekId: string;
        partialUpdate: Partial<WeekInstance>;
      };
    }
  | {
      action: "extendBlock";
      args: {
        blockId: string;
        count?: number;
      };
    }
  | {
      action: "shrinkBlock";
      args: {
        blockId: string;
        count?: number;
      };
    }
  | {
      action: "addSeasonMarker";
      args: {
        weekIndex: number;
        label: string;
      };
    }
  | {
      action: "moveSeasonMarker";
      args: {
        markerId: string;
        newWeekIndex: number;
      };
    }
  | {
      action: "removeSeasonMarker";
      args: {
        markerId: string;
      };
    };

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string } | undefined;
    if (payload && typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // ignore
  }

  try {
    const text = await response.text();
    if (text) {
      return text;
    }
  } catch {
    // ignore
  }

  return `Request failed with status ${response.status}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getDraftSeason(): Promise<Season | null> {
  const response = await fetch("/api/season/draft");
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
  return (await response.json()) as Season;
}

export async function getPublishedSeason(): Promise<Season | null> {
  const response = await fetch("/api/season/published");
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }
  return (await response.json()) as Season;
}

export async function createDraftSeason(): Promise<Season> {
  return requestJson<Season>("/api/season/draft/create", {
    method: "POST",
  });
}

export async function publishSeason(): Promise<Season> {
  return requestJson<Season>("/api/season/publish", {
    method: "POST",
  });
}

export async function mutateDraftSeason(mutation: SeasonMutation): Promise<Season> {
  return requestJson<Season>("/api/season/draft/mutate", {
    method: "POST",
    body: JSON.stringify(mutation),
  });
}
