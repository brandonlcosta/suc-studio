import assert from "assert/strict";
import { formatWorkoutPreview } from "../public/workoutPreview.js";

const preview1 = formatWorkoutPreview({
  workoutId: "w1",
  name: "Intervals",
  structure: [
    { type: "warmup", duration: "10min", target: { type: "pace", zone: "EZ" } },
    {
      type: "interval",
      reps: 6,
      work: { duration: "3min", target: { type: "hr", zone: "Z4", percentMax: [0.8, 0.9] } },
      rest: { duration: "2min", target: { type: "pace", zone: "EZ" } }
    },
    { type: "cooldown", duration: "10min", target: { type: "pace", zone: "EZ" } }
  ]
});

assert.equal(preview1.text, "WU 10:00 → 6 × (3:00 @ Z4 / 2:00 EZ) → CD 10:00");

const preview2 = formatWorkoutPreview({
  workoutId: "w2",
  name: "Progression",
  structure: [
    {
      type: "progression",
      duration: "30min",
      startTarget: { type: "pace", zone: "Z2" },
      endTarget: { type: "pace", zone: "Z4" }
    },
    {
      type: "steady",
      duration: "20min",
      target: { type: "percent", range: [0.85, 0.9], basis: "custom" }
    }
  ]
});

assert.equal(preview2.text, "30:00 progression Z2 → Z4 → 20:00 @ 85–90%");

const preview3 = formatWorkoutPreview({
  workoutId: "w3",
  name: "Nested",
  structure: [
    {
      type: "interval",
      reps: 5,
      work: { duration: "1min", target: { type: "pace", zone: "Z5" } },
      rest: { duration: "1min", target: { type: "pace", zone: "EZ" } }
    },
    {
      type: "interval",
      reps: 5,
      work: { duration: "1min", target: { type: "pace", zone: "Z5" } },
      rest: { duration: "1min", target: { type: "pace", zone: "EZ" } }
    }
  ]
});

assert.equal(preview3.text, "2 × (5 × 1:00 @ Z5 / 1:00 EZ)");

const preview4 = formatWorkoutPreview({
  workoutId: "w4",
  name: "Notes",
  structure: [{ type: "free", label: "strides optional" }]
});

assert.equal(preview4.text, "(strides optional)");

console.log("workoutPreview tests passed");
