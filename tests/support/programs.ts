// The standard small programs the suites train on, each defined once:
//  - `mondayProgram` / `pushDay` (+ `lastWeek`): one Monday of made-up
//    exercises, for the Today, logger and toast suites;
//  - `pushPull`, `floatingPushPull`, `cycledPlan`: a two-day plan of made-up
//    exercises on weekdays, floating, and cycled, for the scheduling engine;
//  - `catalogPushPull`: a floating two-day plan of built-in exercises, for the store;
//  - `officeStrength`, `rotationPlan`: a fuller fixed and a cycled plan of
//    built-in exercises, for the planner.

import type { ExercisePrescription, LoggedSet, Program, SetSpec } from "@nabd/domain";
import { logged, nov, prescription, row, threeSets, warmup, working } from "./builders";
import { CATALOG, EX } from "./exercises";
import type { ExKey } from "./exercises";

/** The previous Monday: the last time the Monday plan was trained. */
const LAST_WEEK = nov(9, 10, 0);

/** A planned exercise row; its id doubles as the plan-item id. */
export function planRow(
  id: string,
  ex: ExKey,
  sets: SetSpec[],
  overrides: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return row(EX[ex].id, sets, { id, ...overrides });
}

/** A weekday program whose only training day is Monday. */
export function mondayProgram(rows: ExercisePrescription[], dayName = "Push"): Program {
  return {
    name: "Test Plan",
    type: "fixed",
    schedule: "weekday",
    days: [{ id: "mon", name: dayName, weekday: 1, exercises: rows, slots: [] }],
  };
}

/** A set of `ex` logged against plan item `itemId` (today at 10:00 unless `at` is given). */
export function did(
  itemId: string | null,
  ex: ExKey,
  reps: number,
  weight: number | null,
  overrides: Partial<LoggedSet> & { at?: Date } = {},
): LoggedSet {
  const { at = nov(16, 10, 0), ...rest } = overrides;
  return logged(EX[ex], at, reps, weight, { planItemId: itemId, ...rest });
}

/** Monday's plan: bench (warm-up + 2 working sets at RPE 8), rows, a plank hold. */
export const pushDay = (): Program =>
  mondayProgram([
    planRow("p-bench", "bench", [warmup(10), working(8, 12, 8), working(8, 12, 8)], {
      intensity: "rpe",
      notes: "Pause at the chest",
    }),
    planRow("p-row", "row", [working(8, 12), working(8, 12)]),
    planRow("p-plank", "plank", [working(30)], { repMode: "time" }),
  ]);

/** The same day trained a week ago. */
export const lastWeek = (): LoggedSet[] => [
  did("p-bench", "bench", 10, 40, { at: LAST_WEEK, setType: "warmup" }),
  did("p-bench", "bench", 8, 60, { at: LAST_WEEK }),
  did("p-bench", "bench", 7, 60, { at: LAST_WEEK }),
  did("p-row", "row", 12, 50, { at: LAST_WEEK }),
  did("p-row", "row", 12, 50, { at: LAST_WEEK }),
  did("p-plank", "plank", 30, null, { at: LAST_WEEK }),
];

export const benchRow = row(EX.bench.id, [warmup(12), ...threeSets()]);
export const flyRow = row(EX.fly.id, threeSets(), { supersetId: "ss" });
export const raiseRow = row(EX.raise.id, threeSets(), { supersetId: "ss" });

/** Push on Monday (bench, then fly and raise as a superset), Pull on Wednesday (dips). */
export const pushPull: Program = {
  name: "P",
  type: "fixed",
  schedule: "weekday",
  days: [
    { id: "mon", name: "Push", weekday: 1, exercises: [benchRow, flyRow, raiseRow], slots: [] },
    { id: "wed", name: "Pull", weekday: 3, exercises: [row(EX.dip.id, threeSets())], slots: [] },
  ],
};

/** The same plan with its days in order instead of on weekdays. */
export const floatingPushPull: Program = { ...pushPull, schedule: "floating" };

/** What a cycled slot prescribes in these tests. */
export const slotSets = () => prescription(threeSets(), { rest: 60 });

/** A floating cycled plan: day A has a two-exercise pool, a one-exercise pool and an empty one; day B is empty. */
export const cycledPlan: Program = {
  name: "C",
  type: "cycled",
  schedule: "floating",
  days: [
    {
      id: "a",
      name: "A",
      weekday: null,
      // Left over from a fixed plan: must be ignored while the plan is cycled.
      exercises: [benchRow],
      slots: [
        { id: "chest", muscle: "chest", pool: [EX.bench.id, EX.fly.id], ...slotSets() },
        { id: "delts", muscle: "side_delts", pool: [EX.raise.id], ...slotSets() },
        { id: "empty", muscle: "lats", pool: [], ...slotSets() },
      ],
    },
    { id: "b", name: "B", weekday: null, exercises: [], slots: [] },
  ],
};

/** The rows of {@link catalogPushPull}'s Push day. */
export const catalogBenchRow = row(CATALOG.bench, threeSets());
export const catalogFlyRow = row(CATALOG.fly, threeSets());

/** A floating two-day plan of built-in exercises: Push (bench, fly) then Pull (row). */
export const catalogPushPull: Program = {
  name: "Test plan",
  type: "fixed",
  schedule: "floating",
  days: [
    {
      id: "push",
      name: "Push",
      weekday: null,
      exercises: [catalogBenchRow, catalogFlyRow],
      slots: [],
    },
    {
      id: "pull",
      name: "Pull",
      weekday: null,
      exercises: [row(CATALOG.row, threeSets())],
      slots: [],
    },
  ],
};

/**
 * Fixed plan on weekdays.
 *   Mon "Push": bench (range + RPE, W/1/2/D), overhead press (fixed + %1RM), plank (time).
 *   Wed "Pull": pull-up + pulldown as a superset, then deadlift.
 */
export function officeStrength(): Program {
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
            exId: CATALOG.bench,
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            notes: "Pause on the chest",
            sets: [
              { type: "warmup", amount: 10, upTo: 12, intensity: 6 },
              { type: "working", amount: 8, upTo: 10, intensity: 8 },
              { type: "working", amount: 6, upTo: 8, intensity: 8.5 },
              { type: "drop", amount: 12, upTo: 15, intensity: 9 },
            ],
          },
          {
            id: "e-ohp",
            exId: CATALOG.overheadPress,
            repMode: "fixed",
            intensity: "pct",
            rest: 120,
            sets: [
              { type: "working", amount: 5, intensity: 70 },
              { type: "working", amount: 5, intensity: 72.5 },
              { type: "working", amount: 5, intensity: 75 },
            ],
          },
          {
            id: "e-plank",
            exId: CATALOG.plank,
            repMode: "time",
            intensity: "none",
            rest: 45,
            sets: [
              { type: "working", amount: 45 },
              { type: "working", amount: 60 },
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
            exId: CATALOG.pullUp,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", amount: 6, upTo: 10 },
              { type: "working", amount: 6, upTo: 10 },
            ],
          },
          {
            id: "e-pulldown",
            exId: CATALOG.pulldown,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", amount: 10, upTo: 12 },
              { type: "working", amount: 10, upTo: 12 },
            ],
          },
          {
            id: "e-deadlift",
            exId: CATALOG.deadlift,
            repMode: "fixed",
            intensity: "none",
            rest: 180,
            sets: [{ type: "working", amount: 5 }],
          },
        ],
      },
    ],
  };
}

/** Cycled plan on weekdays: Mon "Upper" (chest + lats slots), Thu "Core" (abs slot). */
export function rotationPlan(): Program {
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
            pool: [CATALOG.bench, CATALOG.dumbbellBench, CATALOG.pushUp],
            repMode: "range",
            intensity: "none",
            rest: 120,
            sets: [
              { type: "working", amount: 8, upTo: 12 },
              { type: "working", amount: 8, upTo: 12 },
              { type: "working", amount: 8, upTo: 12 },
            ],
          },
          {
            id: "s-lats",
            muscle: "lats",
            pool: [CATALOG.pullUp, CATALOG.pulldown],
            repMode: "range",
            intensity: "none",
            rest: 105,
            sets: [
              { type: "working", amount: 6, upTo: 10 },
              { type: "working", amount: 6, upTo: 10 },
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
            pool: [CATALOG.plank],
            repMode: "time",
            intensity: "none",
            rest: 60,
            sets: [{ type: "working", amount: 45 }],
          },
        ],
      },
    ],
  };
}

export const asFloating = (program: Program): Program => ({
  ...program,
  schedule: "floating",
  days: program.days.map((day) => ({ ...day, weekday: null })),
});
