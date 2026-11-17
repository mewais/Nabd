import type { Movement } from "../movement";

export const CHEST: Movement[] = [
  {
    id: "bench_press",
    name: "Bench Press",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith"],
  },
  {
    id: "incline_bench_press",
    name: "Incline Bench Press",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith"],
  },
  {
    id: "decline_bench_press",
    name: "Decline Bench Press",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: ["barbell", "dumbbell"],
  },
  {
    id: "push_up",
    name: "Push-Up",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["bodyweight"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "chest_dip",
    name: "Chest Dip",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: ["bodyweight"],
  },
  {
    id: "fly",
    name: "Fly",
    primary: ["chest"],
    secondary: [],
    equipment: ["dumbbell", "cable", "machine"],
    nameOverride: { machine: "Pec Deck" },
  },
  {
    id: "incline_fly",
    name: "Incline Fly",
    primary: ["chest"],
    secondary: [],
    equipment: ["dumbbell", "cable"],
  },
  {
    id: "cable_crossover",
    name: "Cable Crossover",
    primary: ["chest"],
    secondary: [],
    equipment: ["cable"],
  },
];
