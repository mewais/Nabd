// Shared fixtures for the planner suites: two realistic programs and the
// view-model built from them the way the app does it.

import { MuscleVolume } from "@nabd/coverage";
import type { Program } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import type { ExerciseLookup } from "@nabd/program-editor";
import { buildPlannerVM } from "@nabd/planner";
import type { PlannerVM } from "@nabd/planner";

export const lookup: ExerciseLookup = (exId) => ExerciseLibrary.catalog.byId(exId);

export const BENCH = "bench_press__barbell";
export const DB_BENCH = "bench_press__dumbbell";
export const PUSH_UP = "push_up__bodyweight";
export const OHP = "overhead_press__barbell";
export const PLANK = "plank__bodyweight";
export const PULL_UP = "pull_up__pullupbar";
export const PULLDOWN = "lat_pulldown__cable";
export const DEADLIFT = "deadlift__barbell";

/** Every catalog id the fixtures rely on (guarded by a test). */
export const FIXTURE_EXERCISE_IDS = [
  BENCH,
  DB_BENCH,
  PUSH_UP,
  OHP,
  PLANK,
  PULL_UP,
  PULLDOWN,
  DEADLIFT,
];

/**
 * Fixed plan on weekdays.
 *   Mon "Push": bench (range + RPE, W/1/2/D), overhead press (fixed + %1RM), plank (time).
 *   Wed "Pull": pull-up + pulldown as a superset, then deadlift.
 */
export function fixedProgram(): Program {
  return {
    name: "Office Strength",
    type: "fixed",
    schedule: "weekday",
    days: [
      {
        id: "d-push",
        name: "Push",
        weekday: 1,
        slots: [],
        exercises: [
          {
            id: "e-bench",
            exId: BENCH,
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            notes: "Pause on the chest",
            sets: [
              { type: "warmup", a: 10, b: 12, val: 6 },
              { type: "working", a: 8, b: 10, val: 8 },
              { type: "working", a: 6, b: 8, val: 8.5 },
              { type: "drop", a: 12, b: 15, val: 9 },
            ],
          },
          {
            id: "e-ohp",
            exId: OHP,
            repMode: "fixed",
            intensity: "pct",
            rest: 120,
            sets: [
              { type: "working", a: 5, val: 70 },
              { type: "working", a: 5, val: 72.5 },
              { type: "working", a: 5, val: 75 },
            ],
          },
          {
            id: "e-plank",
            exId: PLANK,
            repMode: "time",
            intensity: "none",
            rest: 45,
            sets: [
              { type: "working", a: 45 },
              { type: "working", a: 60 },
            ],
          },
        ],
      },
      {
        id: "d-pull",
        name: "Pull",
        weekday: 3,
        slots: [],
        exercises: [
          {
            id: "e-pullup",
            exId: PULL_UP,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", a: 6, b: 10 },
              { type: "working", a: 6, b: 10 },
            ],
          },
          {
            id: "e-pulldown",
            exId: PULLDOWN,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", a: 10, b: 12 },
              { type: "working", a: 10, b: 12 },
            ],
          },
          {
            id: "e-deadlift",
            exId: DEADLIFT,
            repMode: "fixed",
            intensity: "none",
            rest: 180,
            sets: [{ type: "working", a: 5 }],
          },
        ],
      },
    ],
  };
}

/** Cycled plan on weekdays: Mon "Upper" (chest + lats slots), Thu "Core" (abs slot). */
export function cycledProgram(): Program {
  return {
    name: "Rotation",
    type: "cycled",
    schedule: "weekday",
    days: [
      {
        id: "d-upper",
        name: "Upper",
        weekday: 1,
        exercises: [],
        slots: [
          {
            id: "s-chest",
            muscle: "chest",
            pool: [BENCH, DB_BENCH, PUSH_UP],
            repMode: "range",
            intensity: "none",
            rest: 120,
            sets: [
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
            ],
          },
          {
            id: "s-lats",
            muscle: "lats",
            pool: [PULL_UP, PULLDOWN],
            repMode: "range",
            intensity: "none",
            rest: 105,
            sets: [
              { type: "working", a: 6, b: 10 },
              { type: "working", a: 6, b: 10 },
            ],
          },
        ],
      },
      {
        id: "d-core",
        name: "Core",
        weekday: 4,
        exercises: [],
        slots: [
          {
            id: "s-abs",
            muscle: "abs",
            pool: [PLANK],
            repMode: "time",
            intensity: "none",
            rest: 60,
            sets: [{ type: "working", a: 45 }],
          },
        ],
      },
    ],
  };
}

export const floating = (program: Program): Program => ({
  ...program,
  schedule: "floating",
  days: program.days.map((day) => ({ ...day, weekday: null })),
});

/** The planner view-model for a program, built the way the app builds it. */
export function vmOf(program: Program, editDayId: string | null = null): PlannerVM {
  return buildPlannerVM({
    program,
    editDayId,
    lookup,
    volume: MuscleVolume.ofProgram(program, lookup),
  });
}

/** The editor of a program that has days. */
export function editorOf(program: Program, editDayId: string | null = null) {
  const { editor } = vmOf(program, editDayId);
  if (!editor) throw new Error("the program has no day to edit");
  return editor;
}

/** Find a day by id, failing loudly if it is gone. */
export function dayOf(program: Program, dayId: string) {
  const day = program.days.find((d) => d.id === dayId);
  if (!day) throw new Error(`day ${dayId} not in program`);
  return day;
}

/** The set table of one exercise row or slot of a day. */
export function blockOf(program: Program, dayId: string, id: string) {
  for (const row of editorOf(program, dayId).rows) {
    if (row.kind === "slot" && row.id === id) return row.slot.block;
    const cards =
      row.kind === "exercise" ? [row.exercise] : row.kind === "superset" ? row.members : [];
    const found = cards.find((exercise) => exercise.id === id);
    if (found) return found.block;
  }
  throw new Error(`no prescription ${id} in day ${dayId}`);
}
