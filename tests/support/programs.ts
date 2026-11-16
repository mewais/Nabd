// The standard small programs the suites train on, each defined once:
//  - `mondayProgram` / `pushDay` (+ `lastWeek`), `fullBodyMonday`: one
//    Monday of made-up exercises, fixed or cycled, for the Today, logger and
//    toast suites;
//  - `pushPull`, `floatingPushPull`, `cycledPlan`: a two-day plan of made-up
//    exercises on weekdays, floating, and cycled, for the scheduling engine;
//  - `catalogPushPull`: a floating two-day plan of built-in exercises, for the store;
//  - `officeStrength`, `rotationPlan`: a fuller fixed and a cycled plan of
//    built-in exercises, for the planner.

import type {
  CycledSlot,
  ExercisePrescription,
  Intensity,
  LoggedSet,
  MuscleKey,
  Program,
  SetSpec,
} from "@nabd/domain";
import { day, logged, nov, plan, row, slot, warmup, working, workingSets } from "./builders";
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
  return plan([day(dayName, { id: "mon", weekday: 1, exercises: rows })], {
    name: "Test Plan",
    schedule: "weekday",
  });
}

/** A cycled weekday program whose only training day is Monday's "Full body", of these `slots`. */
export function fullBodyMonday(slots: CycledSlot[]): Program {
  const fullBody = day("Full body", { id: "mon", weekday: 1, slots });
  return { ...mondayProgram([]), type: "cycled", days: [fullBody] };
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

/**
 * Monday's plan: bench (warm-up + 2 working sets at RPE 8, or at no intensity
 * when `intensity` says "none"), rows, a plank hold.
 */
export const pushDay = (intensity: Intensity = "rpe"): Program =>
  mondayProgram([
    planRow("p-bench", "bench", [warmup(10), working(8, 12, 8), working(8, 12, 8)], {
      intensity,
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

export const benchRow = row(EX.bench.id, [warmup(12), ...workingSets(3)]);
export const flyRow = row(EX.fly.id, workingSets(3), { supersetId: "ss" });
export const raiseRow = row(EX.raise.id, workingSets(3), { supersetId: "ss" });

/** Push on Monday (bench, then fly and raise as a superset), Pull on Wednesday (dips). */
export const pushPull: Program = plan(
  [
    day("Push", { id: "mon", weekday: 1, exercises: [benchRow, flyRow, raiseRow] }),
    day("Pull", { id: "wed", weekday: 3, exercises: [row(EX.dip.id, workingSets(3))] }),
  ],
  { name: "P", schedule: "weekday" },
);

/** The same plan with its days in order instead of on weekdays. */
export const floatingPushPull: Program = { ...pushPull, schedule: "floating" };

/** A cycled slot of these tests, called `id`: three sets of 8–12 with a minute's rest. */
const cycledSlot = (id: string, muscle: MuscleKey, pool: string[]) =>
  slot(muscle, pool, workingSets(3), { id, rest: 60 });

/** A floating cycled plan: day A has a two-exercise pool, a one-exercise pool and an empty one; day B is empty. */
export const cycledPlan: Program = plan(
  [
    day("A", {
      // Left over from a fixed plan: must be ignored while the plan is cycled.
      exercises: [benchRow],
      slots: [
        cycledSlot("chest", "chest", [EX.bench.id, EX.fly.id]),
        cycledSlot("delts", "side_delts", [EX.raise.id]),
        cycledSlot("empty", "lats", []),
      ],
    }),
    day("B"),
  ],
  { name: "C", type: "cycled" },
);

/** `program` with the pool of its "chest" slot set to `pool`. */
export const withChestPool = (program: Program, pool: string[]): Program => ({
  ...program,
  days: program.days.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
  })),
});

/** The rows of {@link catalogPushPull}'s Push day. */
export const catalogBenchRow = row(CATALOG.bench, workingSets(3));
export const catalogFlyRow = row(CATALOG.fly, workingSets(3));

/** A floating two-day plan of built-in exercises: Push (bench, fly) then Pull (row). */
export const catalogPushPull: Program = plan([
  day("Push", { exercises: [catalogBenchRow, catalogFlyRow] }),
  day("Pull", { exercises: [row(CATALOG.row, workingSets(3))] }),
]);

/**
 * Fixed plan on weekdays.
 *   Mon "Push": bench (range + RPE, W/1/2/D), overhead press (fixed + %1RM), plank (time).
 *   Wed "Pull": pull-up + pulldown as a superset, then deadlift.
 */
export function officeStrength(): Program {
  const bench = row(
    CATALOG.bench,
    [
      { ...working(10, 12, 6), type: "warmup" },
      working(8, 10, 8),
      working(6, 8, 8.5),
      { ...working(12, 15, 9), type: "drop" },
    ],
    { id: "e-bench", intensity: "rpe", rest: 150, notes: "Pause on the chest" },
  );
  const press = row(
    CATALOG.overheadPress,
    [working(5, undefined, 70), working(5, undefined, 72.5), working(5, undefined, 75)],
    {
      id: "e-ohp",
      repMode: "fixed",
      intensity: "pct",
    },
  );
  const plank = row(CATALOG.plank, [working(45), working(60)], {
    id: "e-plank",
    repMode: "time",
    rest: 45,
  });
  const superset = { supersetId: "ss-1", rest: 90 };
  return plan(
    [
      day("Push", { id: "d-push", weekday: 1, exercises: [bench, press, plank] }),
      day("Pull", {
        id: "d-pull",
        weekday: 3,
        exercises: [
          row(CATALOG.pullUp, workingSets(2, 6, 10), { id: "e-pullup", ...superset }),
          row(CATALOG.pulldown, workingSets(2, 10, 12), { id: "e-pulldown", ...superset }),
          row(CATALOG.deadlift, [working(5)], { id: "e-deadlift", repMode: "fixed", rest: 180 }),
        ],
      }),
    ],
    { name: "Office Strength", schedule: "weekday" },
  );
}

/** Cycled plan on weekdays: Mon "Upper" (chest + lats slots), Thu "Core" (abs slot). */
export function rotationPlan(): Program {
  return plan(
    [
      day("Upper", {
        id: "d-upper",
        weekday: 1,
        slots: [
          slot("chest", [CATALOG.bench, CATALOG.dumbbellBench, CATALOG.pushUp], workingSets(3), {
            id: "s-chest",
          }),
          slot("lats", [CATALOG.pullUp, CATALOG.pulldown], workingSets(2, 6, 10), {
            id: "s-lats",
            rest: 105,
          }),
        ],
      }),
      day("Core", {
        id: "d-core",
        weekday: 4,
        slots: [slot("abs", [CATALOG.plank], [working(45)], { id: "s-abs", repMode: "time" })],
      }),
    ],
    { name: "Rotation", type: "cycled", schedule: "weekday" },
  );
}

export const asFloating = (program: Program): Program => ({
  ...program,
  schedule: "floating",
  days: program.days.map((day) => ({ ...day, weekday: null })),
});
