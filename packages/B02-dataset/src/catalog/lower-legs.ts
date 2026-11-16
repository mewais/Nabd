import type { Movement } from "../movement";

export const LOWER_LEGS: Movement[] = [
  // Calves
  {
    id: "calf_raise",
    name: "Calf Raise",
    primary: ["calves"],
    secondary: [],
    equipment: ["machine", "dumbbell", "barbell", "bodyweight"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: {
      machine: "Calf Raise",
      bodyweight: "Calf Raise",
    },
  },
  {
    id: "seated_calf_raise",
    name: "Seated Calf Raise",
    primary: ["calves"],
    secondary: [],
    equipment: ["machine", "dumbbell"],
    laterality: ["bilateral"],
  },
  {
    id: "jump_rope",
    name: "Jump Rope",
    primary: ["calves"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Jump Rope" },
    tracking: "duration",
  },

  // Tibialis
  {
    id: "tibialis_raise",
    name: "Tibialis Raise",
    primary: ["tibialis"],
    secondary: [],
    equipment: ["bodyweight", "bands"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Tibialis Raise" },
  },
  {
    id: "toe_raise",
    name: "Toe Raise",
    primary: ["tibialis"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Toe Raise" },
  },
];
