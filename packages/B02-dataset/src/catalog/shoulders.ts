import type { Movement } from "../movement";

export const SHOULDERS: Movement[] = [
  {
    id: "overhead_press",
    name: "Overhead Press",
    primary: ["front_delts"],
    secondary: ["side_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith", "kettlebell", "cable"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "arnold_press",
    name: "Arnold Press",
    primary: ["front_delts"],
    secondary: ["side_delts", "triceps"],
    equipment: ["dumbbell"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "pike_push_up",
    name: "Pike Push-Up",
    primary: ["front_delts"],
    secondary: ["triceps"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Pike Push-Up" },
  },
  {
    id: "lateral_raise",
    name: "Lateral Raise",
    primary: ["side_delts"],
    secondary: [],
    equipment: ["dumbbell", "cable", "bands", "machine"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "front_raise",
    name: "Front Raise",
    primary: ["front_delts"],
    secondary: [],
    equipment: ["dumbbell", "cable", "barbell", "bands"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "rear_delt_fly",
    name: "Rear Delt Fly",
    primary: ["rear_delts"],
    secondary: ["rhomboids"],
    equipment: ["dumbbell", "cable", "machine", "bands"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: { machine: "Reverse Pec Deck" },
  },
];
