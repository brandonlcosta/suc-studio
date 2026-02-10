import type { StrengthWorkoutType } from "../../types";

export type StrengthExerciseLibraryEntry = {
  id: string;
  name: string;
  categories: StrengthWorkoutType[];
};

export const strengthWorkoutTypeOptions: Array<{ id: StrengthWorkoutType; label: string }> = [
  { id: "strength_lower", label: "Lower Body" },
  { id: "strength_upper", label: "Upper Body" },
  { id: "strength_general", label: "General Strength" },
  { id: "mobility", label: "Mobility" },
  { id: "circuit", label: "Circuits" },
  { id: "crosstrain", label: "Crosstrain" },
];

export const strengthExerciseLibrary: StrengthExerciseLibraryEntry[] = [
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "weighted-step-up-high-box",
    name: "Weighted Step-up (high box)",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "kettlebell-deadlift",
    name: "Kettlebell Deadlift",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "heavy-sled-push",
    name: "Heavy Sled Push",
    categories: ["strength_lower", "circuit"],
  },
  {
    id: "lateral-bound",
    name: "Lateral Bound (Skater Jump)",
    categories: ["strength_lower", "circuit"],
  },
  {
    id: "single-arm-farmer-carry",
    name: "Single-arm Farmer Carry",
    categories: ["strength_general", "circuit"],
  },
  {
    id: "hanging-knee-tucks",
    name: "Hanging Knee Tucks",
    categories: ["strength_upper", "strength_general"],
  },
  {
    id: "back-squat",
    name: "Back Squat",
    categories: ["strength_lower"],
  },
  {
    id: "front-squat",
    name: "Front Squat",
    categories: ["strength_lower"],
  },
  {
    id: "deadlift",
    name: "Deadlift",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "bench-press",
    name: "Bench Press",
    categories: ["strength_upper"],
  },
  {
    id: "pull-up",
    name: "Pull-up",
    categories: ["strength_upper", "strength_general"],
  },
  {
    id: "push-up",
    name: "Push-up",
    categories: ["strength_upper", "strength_general", "circuit"],
  },
  {
    id: "plank",
    name: "Plank",
    categories: ["strength_general", "mobility"],
  },
  {
    id: "hip-thrust",
    name: "Hip Thrust",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    categories: ["strength_lower", "strength_general"],
  },
  {
    id: "single-leg-rdl",
    name: "Single-leg RDL",
    categories: ["strength_lower", "strength_general"],
  },
];
