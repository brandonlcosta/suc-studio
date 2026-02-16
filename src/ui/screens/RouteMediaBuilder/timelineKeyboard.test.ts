import assert from "assert/strict";
import { resolveTimelineKeyboardAction } from "./timelineKeyboard";

assert.equal(
  resolveTimelineKeyboardAction({
    key: "Delete",
    hasSelection: false,
    laneLocked: false,
    editableTarget: false,
  }),
  null,
  "shortcuts should no-op when no entry is selected"
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "Delete",
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "delete" }
);

assert.equal(
  resolveTimelineKeyboardAction({
    key: "s",
    ctrlKey: true,
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  null,
  "split should ignore ctrl/meta modifier combinations"
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "s",
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "split" }
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "D",
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "duplicate" }
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "ArrowLeft",
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "nudge", startDeltaMi: -0.01, endDeltaMi: -0.01 }
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "ArrowRight",
    shiftKey: true,
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "nudge", startDeltaMi: 0, endDeltaMi: 0.01 }
);

assert.deepEqual(
  resolveTimelineKeyboardAction({
    key: "ArrowRight",
    altKey: true,
    hasSelection: true,
    laneLocked: false,
    editableTarget: false,
  }),
  { kind: "nudge", startDeltaMi: 0.01, endDeltaMi: 0 }
);

assert.equal(
  resolveTimelineKeyboardAction({
    key: "Delete",
    hasSelection: true,
    laneLocked: true,
    editableTarget: false,
  }),
  null,
  "locked lanes should block editing shortcuts"
);

console.log("timelineKeyboard tests passed");
