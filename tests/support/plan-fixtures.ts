// A small, real training "world" for the UI view-model suites: a handful of
// exercises, a Monday program, and the engines (plan, coach, stats) built from
// them the same way the app does.

import type {
  DayRecord,
  ExercisePrescription,
  ExtraItem,
  LoggedSet,
  Program,
  SetSpec,
} from "@nabd/domain";
import { dateKey, freshDayState } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { TodayPlan } from "@nabd/scheduling";
import { ProgressionAdvisor } from "@nabd/progression";
import { Coach } from "@nabd/session";
import { TrainingStats } from "@nabd/analytics";
import { exercise, logged, nov, row, warmup, working } from "./domain-factories";

/** Monday 16 Nov 2026, 10:30 local — "now" unless a test says otherwise. */
export const NOW = nov(16, 10, 30);
/** The previous Monday: the last time this day's plan was trained. */
export const LAST_WEEK = nov(9, 10, 0);

export const EX = {
  bench: exercise({
    id: "bench",
    name: "Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: "barbell",
    tracking: "weight_reps",
  }),
  row: exercise({
    id: "row",
    name: "Barbell Row",
    group: "Back",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps"],
    equipment: "barbell",
    tracking: "weight_reps",
  }),
  pushup: exercise({
    id: "pushup",
    name: "Push-Up",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps"],
    equipment: "bodyweight",
    tracking: "bodyweight_reps",
  }),
  plank: exercise({
    id: "plank",
    name: "Plank",
    group: "Abs",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: "bodyweight",
    tracking: "duration",
  }),
  pullup: exercise({
    id: "pullup",
    name: "Assisted Pull-Up",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps"],
    equipment: "machine",
    tracking: "assisted_bodyweight",
  }),
  dip: exercise({
    id: "dip",
    name: "Weighted Dip",
    group: "Triceps",
    primary: ["triceps"],
    secondary: ["chest"],
    equipment: "bodyweight",
    tracking: "weighted_bodyweight",
  }),
  curl: exercise({
    id: "curl",
    name: "Dumbbell Curl",
    group: "Biceps",
    primary: ["biceps"],
    secondary: ["forearms"],
    equipment: "dumbbell",
    tracking: "weight_reps",
  }),
};
export type ExKey = keyof typeof EX;

export const LIBRARY = new ExerciseLibrary(Object.values(EX));

export { warmup };
/** {@link working}, under the name the view-model suites use. */
export const work = working;

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
    planRow("p-bench", "bench", [warmup(10), work(8, 12, 8), work(8, 12, 8)], {
      intensity: "rpe",
      notes: "Pause at the chest",
    }),
    planRow("p-row", "row", [work(8, 12), work(8, 12)]),
    planRow("p-plank", "plank", [work(30)], { repMode: "time" }),
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

export interface WorldInput {
  program: Program;
  history?: LoggedSet[];
  skipped?: string[];
  extras?: ExtraItem[];
  now?: Date;
  /** Smallest load change, in kg. */
  loadStepKg?: number;
  dayLog?: DayRecord[];
}

/** Today's plan, the coach and the stats, derived from a program and a history. */
export function buildWorld(input: WorldInput) {
  const { program, history = [], skipped = [], extras = [], now = NOW, loadStepKg = 2.5 } = input;
  const today = dateKey(now);
  const plan = TodayPlan.build({
    program,
    date: now,
    dayState: { ...freshDayState(now), skipped, extras },
    rotation: {},
    history,
    lookup: LIBRARY.lookup,
  });
  const coach = new Coach(history, new ProgressionAdvisor(loadStepKg), today);
  const stats = new TrainingStats(history, input.dayLog ?? [], now);
  return { plan, coach, stats, now, today, history };
}
