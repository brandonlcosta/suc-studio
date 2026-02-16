export type TimelineKeyboardInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  hasSelection: boolean;
  laneLocked: boolean;
  editableTarget: boolean;
  nudgeStepMi?: number;
};

export type TimelineKeyboardAction =
  | { kind: "delete" }
  | { kind: "split" }
  | { kind: "duplicate" }
  | { kind: "nudge"; startDeltaMi: number; endDeltaMi: number };

export function resolveTimelineKeyboardAction(
  input: TimelineKeyboardInput
): TimelineKeyboardAction | null {
  if (!input.hasSelection) return null;
  if (input.editableTarget) return null;
  if (input.laneLocked) return null;

  const key = String(input.key || "");
  const step = Math.max(0.0001, Number(input.nudgeStepMi) || 0.01);

  if (key === "Delete") {
    return { kind: "delete" };
  }

  if ((key === "s" || key === "S") && !input.metaKey && !input.ctrlKey) {
    return { kind: "split" };
  }

  if ((key === "d" || key === "D") && !input.metaKey && !input.ctrlKey) {
    return { kind: "duplicate" };
  }

  if (key === "ArrowLeft" || key === "ArrowRight") {
    const direction = key === "ArrowLeft" ? -1 : 1;
    if (input.shiftKey) {
      return { kind: "nudge", startDeltaMi: 0, endDeltaMi: direction * step };
    }
    if (input.altKey) {
      return { kind: "nudge", startDeltaMi: direction * step, endDeltaMi: 0 };
    }
    return {
      kind: "nudge",
      startDeltaMi: direction * step,
      endDeltaMi: direction * step,
    };
  }

  return null;
}
